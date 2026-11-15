"""Wrapper over the game server (game/envserver.cjs).

The game runs in Node, not Python. We start it as a child process and talk to
it through its stdin/stdout pipes with small binary messages:

    we send   one opcode byte (R, S, E or Q), then that request's data
    it sends  a reply made of numbers packed back to back as raw bytes

So most of this file is bookkeeping: packing requests into bytes and cutting
replies back into numpy arrays. The exact byte layout of every message is in
the comment at the top of game/envserver.cjs.

Words used below:
    env      one match. A server process can hold several and steps them all at once.
    obs      an observation: 198 floats describing the match from one player's view.
             Each player's view is mirrored so that player always attacks to the right.
    action   0..11 = move * 4 + jump * 2 + kick (move: 0 none, 1 back, 2 forward).
    tick     one physics step; the game runs at 30 ticks per second.
             One `step` (one decision) is 2 ticks.
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SERVER = ROOT / "game" / "envserver.cjs"
# The message format version. If the game is rebuilt with a different format,
# we refuse to start rather than misread the bytes.
PROTOCOL = 2
# What the players do in `evaluate` after the first decision. The server
# expects a number, and this tuple's order is the numbering: hold=0, idle=1, policy=2.
FOLLOWS = ("hold", "idle", "policy")

# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------
# An action is one number 0..11 that packs three choices:
#     action = move * 4 + jump * 2 + kick
# move: 0 stand still, 1 back (towards your own goal), 2 forward (towards theirs).
# jump, kick: 0 or 1. Every player's action is in their own view, so
# "forward" is right for P1 and left for P2.

NUM_ACTIONS = 12
STAND, BACK, FORWARD = 0, 1, 2  # the three move values


def encode(move: int, jump: int, kick: int) -> int:
    """(move, jump, kick) -> action number. encode(FORWARD, 0, 1) == 9: run forward and kick."""
    return move * 4 + jump * 2 + kick


def decode(action: int) -> tuple[int, int, int]:
    """Action number -> (move, jump, kick). decode(9) == (2, 0, 1)."""
    return action // 4, (action // 2) % 2, action % 2


# ---------------------------------------------------------------------------
# Reading an observation
# ---------------------------------------------------------------------------
# An observation is 198 floats. Fields picks values out of it by name, so no
# one has to remember that the ball's x is float 40:
#
#     f = Fields(env.layout)
#     f.ball(obs, "x")         the ball's x
#     f.me(obs, "grounded")    1.0 if I'm standing on something
#     f.foe(obs, "x")          the opponent's x
#     f.match(obs, "myNeeded") goals I still need, as a fraction of the target
#
# Units, as the server writes them (always from this player's view):
#     x, y     -1..1 across the pitch. x = -1 is my own goal's end, +1 theirs.
#              y = -1 is the top, +1 the bottom (y grows downwards).
#              Pixels: x_px = (x + 1) * 400, y_px = (y + 1) * 240.
#     vx, vy   pixels per second / 500. vx > 0 is towards their goal.
#
# Works on one observation [198] or a whole batch [..., 198]: it always reads
# the last axis.
#
# Names available (from the server's layout):
#     me / foe: x y vx vy legDx legDy legSpin grounded speed jump size frozen bombed legBroken
#     ball:     x y vx vy spin size bouncy mineLast
#     match:    scoreDiff myNeeded theirNeeded timed timeLeft suddenDeath side


class Fields:
    def __init__(self, layout: dict):
        self.layout = layout
        self._sections = layout["sections"]

    def _get(self, obs: np.ndarray, section: str, block: str, name: str) -> np.ndarray:
        # Where it is = where its section starts + where the name sits inside that section.
        return obs[..., self._sections[section] + self.layout[block][name]]

    def me(self, obs: np.ndarray, name: str) -> np.ndarray:
        return self._get(obs, "me", "player", name)

    def foe(self, obs: np.ndarray, name: str) -> np.ndarray:
        return self._get(obs, "foe", "player", name)

    def ball(self, obs: np.ndarray, name: str) -> np.ndarray:
        return self._get(obs, "ball", "ball", name)

    def match(self, obs: np.ndarray, name: str) -> np.ndarray:
        return self._get(obs, "match", "match", name)


class _Proc:
    """One Node process (one running copy of the game) holding several matches."""

    def __init__(self, config: dict, node: str):
        if not SERVER.exists():
            raise FileNotFoundError(f"{SERVER} missing -- the game owners rebuild game/")
        # Start `node game/envserver.cjs '<config as JSON>'` with pipes on stdin/stdout.
        # bufsize=0: no buffering, so every request is sent the moment we write it.
        self.p = subprocess.Popen(
            [node, str(SERVER), json.dumps(config)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            bufsize=0,
        )
        # The server's first output is one line of JSON describing itself.
        # Everything after that line is binary.
        header = json.loads(self.p.stdout.readline())
        if header["protocol"] != PROTOCOL:
            raise RuntimeError(f"server protocol {header['protocol']}, expected {PROTOCOL}")
        self.n = header["numEnvs"]  # matches in this process
        self.d = header["obsDim"]  # floats per observation (198)
        self.num_actions = header["numActions"]  # 12
        self.config = header["config"]  # the full config, defaults filled in
        self.layout = header["layout"]  # where each named value sits inside an observation

    def send(self, op: bytes, body: bytes = b"") -> None:
        """Write one request: the opcode byte, then its data."""
        self.p.stdin.write(op + body)

    def _read(self, n: int) -> bytes:
        """Read exactly `n` bytes of reply.

        A pipe can hand back fewer bytes than asked for (the rest is still on
        its way), so keep reading until we have all `n`. Reading nothing at
        all means the server has died.
        """
        chunks, got = [], 0
        while got < n:
            c = self.p.stdout.read(n - got)
            if not c:
                raise EOFError(f"env server exited (code {self.p.poll()})")
            chunks.append(c)
            got += len(c)
        return b"".join(chunks)

    def recv(self):
        """Read the reply to R (reset) or S (step) and cut it into arrays."""
        n, d = self.n, self.d
        # The first 4 bytes: k, how many matches had an episode end this step
        # (a goal, or the time limit). Needed first, because the size of the
        # rest of the reply depends on it.
        k = int(np.frombuffer(self._read(4), "<u4")[0])
        # The rest of the reply in one read. The size is the sections below
        # added up: 4 bytes per float/int, 1 byte per u8 flag.
        body = self._read(4 * (n * 2 * d + n * 2 + k * 2 * d + k) + n + n + 2 * n)
        o = 0  # read position inside `body`: how many bytes are used up so far

        def take(dtype, count, shape):
            """Cut the next section off `body`: read `count` numbers of type
            `dtype` starting at position `o`, shape them into an array, and
            move `o` past them so the next `take` starts where this one ended.

            dtype codes: "<f4" float32, "<i4" int32, "<u4" uint32, "u1" uint8
            ("<" means little-endian, the byte order the server writes in).
            .copy() because frombuffer only views the bytes, read-only.
            """
            nonlocal o
            size = np.dtype(dtype).itemsize * count
            a = np.frombuffer(body, dtype, count, o).reshape(shape).copy()
            o += size
            return a

        # The sections, in the order the server writes them. [i, 0] is P1, [i, 1] is P2.
        obs = take("<f4", n * 2 * d, (n, 2, d))  # both players' observations, every match
        reward = take("<f4", n * 2, (n, 2))  # +1 scored / -1 conceded / 0
        # A match whose episode ended was already reset, so `obs` holds its new
        # start. Its last observation before the reset is in final_obs, and
        # final_idx says which matches those k rows belong to.
        final_obs = take("<f4", k * 2 * d, (k, 2, d))
        final_idx = take("<i4", k, (k,))
        terminated = take("u1", n, (n,)).astype(bool)  # episode ended by a goal
        truncated = take("u1", n, (n,)).astype(bool)  # episode cut off by the time limit
        touched = take("u1", n * 2, (n, 2)).astype(bool)  # each player touched the ball
        return obs, reward, terminated, truncated, touched, final_idx, final_obs

    def evaluate(self, env: int, ticks: int, follow: str) -> dict:
        """Ask the server for the 144-cell look-ahead at match `env` (see GameEnv.evaluate)."""
        # Request: 'E', then env and ticks as uint32, then follow as one byte.
        self.send(b"E", np.array([env, ticks], "<u4").tobytes() + bytes([FOLLOWS.index(follow)]))
        a, d = self.num_actions, self.d
        cells = a * a  # 12 x 12 = 144 action pairs
        # Reply: obs (float32, 4 bytes each), then ticks (uint16, 2 bytes each),
        # then goal (int8, 1 byte each) for every cell.
        body = self._read(4 * cells * 2 * d + 2 * cells + cells)
        o = 4 * cells * 2 * d  # where the obs section ends and ticks begins
        obs = np.frombuffer(body, "<f4", cells * 2 * d, 0).reshape(a, a, 2, d).copy()
        steps = np.frombuffer(body, "<u2", cells, o).reshape(a, a).copy()
        goal = np.frombuffer(body, "i1", cells, o + 2 * cells).reshape(a, a).copy()
        return {"obs": obs, "ticks": steps, "goal": goal}

    def close(self) -> None:
        """Tell the server to quit and wait for it, unless it has already exited."""
        if self.p.poll() is None:
            try:
                self.send(b"Q")
                self.p.stdin.close()
            except (BrokenPipeError, OSError):
                pass  # it died on its own in the meantime; nothing to tell it
            self.p.wait(timeout=5)


class GameEnv:
    """
    A Gymnasium style env wrapper for the game.

    _Proc is used for simulation processing and binary conversion.

    `num_envs` two-player matches spread over `num_procs` Node processes.

    You control both players in every match: `step` takes one action per
    player per match, so a bot can play either end or both.

    Matches are numbered 0..num_envs-1 across all processes; process i holds
    matches i*per .. i*per+per-1. Processes run in parallel: `step` sends to
    every process first and only then reads the replies, so all of them
    compute at the same time.

    Config keys (all optional): seed, pitches, powerUps, actionRepeat,
    maxEpisodeTicks, match. Plus `policy`: a path to an actor file in
    game/policies/, needed only for `evaluate(follow="policy")`.
    """

    def __init__(self, num_envs: int = 64, num_procs: int | None = None, node: str = "node", **config):
        # Default: one process per CPU core, but never more processes than matches.
        num_procs = num_procs or min(num_envs, os.cpu_count() or 1)
        if num_envs % num_procs:
            raise ValueError("num_envs must divide evenly over num_procs")
        per = num_envs // num_procs  # matches in each process
        # Each process gets its own seed, or they would all play identical matches.
        seed = int(config.pop("seed", 1))
        self.procs = [
            _Proc({**config, "numEnvs": per, "seed": seed * 1000 + i}, node) for i in range(num_procs)
        ]
        self.num_envs = num_envs
        self.obs_dim = self.procs[0].d
        self.num_actions = self.procs[0].num_actions
        self.config = self.procs[0].config
        # Named offsets into an observation: where the ball's x is, each player's x, and so on.
        self.layout = self.procs[0].layout
        self._per = per

    def reset(self) -> np.ndarray:
        """Start a fresh match everywhere. Returns obs [num_envs, 2, 198]."""
        for p in self.procs:
            p.send(b"R")
        return np.concatenate([p.recv()[0] for p in self.procs])

    def step(self, actions: np.ndarray):
        """Play one decision (2 ticks) in every match.

        actions: int array [num_envs, 2], each player's own action 0..11.
        Returns obs [N, 2, 198], reward [N, 2], terminated [N], truncated [N],
        infos (touched [N, 2], final_idx, final_obs).
        """
        a = np.asarray(actions, dtype=np.uint8).reshape(self.num_envs, 2)
        # Send each process the rows for its own matches...
        for i, p in enumerate(self.procs):
            p.send(b"S", a[i * self._per : (i + 1) * self._per].tobytes())
        # ...then collect the replies and glue them back into one batch, in match order.
        parts = [p.recv() for p in self.procs]
        obs = np.concatenate([q[0] for q in parts])
        reward = np.concatenate([q[1] for q in parts])
        terminated = np.concatenate([q[2] for q in parts])
        truncated = np.concatenate([q[3] for q in parts])
        touched = np.concatenate([q[4] for q in parts])
        # Each process numbers its matches from 0; shift to the global numbering.
        final_idx = np.concatenate([q[5] + i * self._per for i, q in enumerate(parts)])
        final_obs = np.concatenate([q[6] for q in parts])
        infos = {"touched": touched, "final_idx": final_idx, "final_obs": final_obs}
        return obs, reward, terminated, truncated, infos

    def evaluate(self, env: int, ticks: int, follow: str = "hold") -> dict:
        """Every action pair played forward `ticks` ticks from env `env`'s current
        state; the env is left exactly as it was. For the Nash bot.

        follow: what both players do after the first decision -- "hold" the
        pair, "idle", or "policy" (the actor's most likely action; needs
        `policy=<actor .bin>` in the config).

        Returns, indexed [p1_action, p2_action] (each player's own action, as in
        `step`): obs [12, 12, 2, D] (both views at the end), ticks [12, 12] (fewer
        than asked when a goal ended it), goal [12, 12] (+1 P1 scored, -1 P2, 0).
        """
        # Find the process holding match `env`, and its number inside that process.
        return self.procs[env // self._per].evaluate(env % self._per, ticks, follow)

    def close(self) -> None:
        for p in self.procs:
            p.close()

    # `with GameEnv(...) as env:` closes the Node processes even if the code inside crashes.
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()


# ---------------------------------------------------------------------------
# The handle a bot gets
# ---------------------------------------------------------------------------


class Seat:
    """One player's seat in one match: what a bot is handed on every decision.

    A bot only needs its own observation to decide. The Nash bot also needs to
    look ahead from the *current* match state, which lives in the game server,
    not in Python. A Seat is how it reaches that: it knows which env holds the
    match and which end this bot is playing.

        seat = Seat(env, index=3, player=1)    # P2 in match 3
        seat.lookahead(ticks=10)               # the 12x12 game, from P2's point of view

    player: 0 = P1, 1 = P2.
    """

    def __init__(self, env: GameEnv, index: int, player: int):
        self.env = env
        self.index = index
        self.player = player

    def lookahead(self, ticks: int, follow: str = "hold") -> dict:
        """Every pair of actions (mine, theirs) played forward `ticks` ticks from now.

        Same as GameEnv.evaluate, but turned around to this seat's point of view,
        so a bot never has to care which end it is on:

            obs [12, 12, 2, 198]  [my action, their action]; [..., 0, :] is my view
            ticks [12, 12]        ticks each cell ran (fewer if a goal ended it)
            goal [12, 12]         +1 I scored, -1 they scored, 0 nobody

        The match itself is not changed.
        """
        r = self.env.evaluate(self.index, ticks, follow)
        if self.player == 0:
            return r  # the server's order is already P1's point of view
        # P2: swap the action axes so rows are P2's actions, swap the two views
        # so index 0 is P2's, and flip goal signs so +1 means P2 scored.
        return {
            "obs": r["obs"].transpose(1, 0, 2, 3)[:, :, ::-1, :].copy(),
            "ticks": r["ticks"].T.copy(),
            "goal": -r["goal"].T,
        }
