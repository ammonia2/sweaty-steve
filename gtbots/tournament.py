"""Round-robin between bots -> payoff matrix of mean goal difference.

    names, A, matches = round_robin(entries, matches_per_pair=20, seed=1)

`entries` is a list of ``(name, make)`` pairs, where ``make(layout, seed)``
builds a fresh bot (so a bot never carries state or a random stream from one
match into the next). ``A[i, j]`` is the mean over matches of
``goals_i - goals_j``, with ``i`` playing P1 in half of its matches and P2 in
the other half, so the matrix is antisymmetric (a zero-sum game between the
bots; the diagonal is 0 by definition). Feed it straight to
``gtbots.replicator.simulate``.

A match is played to the game's own end (first to ``target`` goals) in its own
env, one match per process (``num_envs == num_procs == 1``), and ``workers``
such matches run at once. Seeds are derived from ``seed``, the pair and the
match number, so a run is reproducible from its config.

Output (``save``): ``<out>/<tag>_matrix.csv`` and ``<tag>_matches.csv``.
"""
from __future__ import annotations

import csv
import itertools
import multiprocessing as mp
import time
from pathlib import Path
from typing import Callable, Sequence

import numpy as np

from gtbots.env import GameEnv, Seat

Entry = tuple[str, Callable[[dict, int], object]]

# Set before the worker pool forks, so workers inherit the (possibly
# unpicklable) bot factories instead of receiving them as arguments.
_ENTRIES: Sequence[Entry] = ()


def play_match(env: GameEnv, bot1, bot2, target: int = 7, max_decisions: int = 20000) -> dict:
    """Play one whole match in env 0: ``bot1`` as P1, ``bot2`` as P2.

    Ends when a side reaches ``target`` goals, when the env cuts the episode
    off (time limit), or after ``max_decisions`` decisions (a safety stop).
    Returns goals, decisions, ticks, and seconds of compute for each bot.
    """
    seats = (Seat(env, 0, 0), Seat(env, 0, 1))
    bots = (bot1, bot2)
    for b in bots:
        if hasattr(b, "reset"):
            b.reset()
    obs = env.reset()
    goals = [0, 0]
    seconds = [0.0, 0.0]
    decisions = 0
    ended_by = "decisions"
    while decisions < max_decisions:
        actions = np.zeros((1, 2), dtype=np.uint8)
        for k in (0, 1):
            t0 = time.perf_counter()
            actions[0, k] = bots[k].act(seats[k], obs[0, k])
            seconds[k] += time.perf_counter() - t0
        obs, reward, terminated, truncated, _ = env.step(actions)
        decisions += 1
        for k in (0, 1):
            goals[k] += int(reward[0, k] > 0)
        if max(goals) >= target:
            ended_by = "target"
            break
        if truncated[0]:
            ended_by = "time"
            break
    return {
        "goals1": goals[0], "goals2": goals[1], "decisions": decisions,
        "ticks": decisions * int(env.config.get("actionRepeat", 2)),
        "seconds1": seconds[0], "seconds2": seconds[1], "ended_by": ended_by,
    }


def _job(job: tuple) -> dict:
    i, j, k, i_first, seed, env_config, target, max_decisions = job
    first, second = (i, j) if i_first else (j, i)
    cfg = dict(env_config)
    cfg["seed"] = seed
    with GameEnv(num_envs=1, num_procs=1, **cfg) as env:
        bots = [_ENTRIES[x][1](env.layout, seed + n) for n, x in enumerate((first, second))]
        r = play_match(env, bots[0], bots[1], target, max_decisions)
    g_i, g_j = (r["goals1"], r["goals2"]) if i_first else (r["goals2"], r["goals1"])
    s_i, s_j = (r["seconds1"], r["seconds2"]) if i_first else (r["seconds2"], r["seconds1"])
    return {
        "i": i, "j": j, "match": k, "i_is_p1": int(i_first), "seed": seed,
        "goals_i": g_i, "goals_j": g_j, "decisions": r["decisions"],
        "ticks": r["ticks"], "seconds_i": s_i, "seconds_j": s_j,
        "ended_by": r["ended_by"],
    }


def matrix_from_matches(n: int, matches: Sequence[dict]) -> np.ndarray:
    """Mean goal difference ``A[i, j]`` from match records (antisymmetric, zero diagonal)."""
    total = np.zeros((n, n))
    count = np.zeros((n, n))
    for m in matches:
        i, j, d = m["i"], m["j"], m["goals_i"] - m["goals_j"]
        total[i, j] += d
        total[j, i] -= d
        count[i, j] += 1
        count[j, i] += 1
    return np.divide(total, count, out=np.zeros((n, n)), where=count > 0)


def round_robin(
    entries: Sequence[Entry],
    matches_per_pair: int = 20,
    seed: int = 1,
    workers: int = 1,
    target: int = 7,
    max_decisions: int = 20000,
    env_config: dict | None = None,
):
    """Every pair of entries plays ``matches_per_pair`` matches, ends swapped each time.

    Returns ``(names, A, matches)``: names in entry order, the payoff matrix,
    and one dict per match (see ``save``). ``env_config`` is passed to
    ``GameEnv`` (e.g. ``powerUps``, ``replayDir``); its ``match.target`` is
    set from ``target``.
    """
    global _ENTRIES
    _ENTRIES = list(entries)
    names = [name for name, _ in _ENTRIES]
    if len(set(names)) != len(names):
        raise ValueError(f"bot names must be unique: {names}")
    cfg = {**(env_config or {})}
    cfg["match"] = {**cfg.get("match", {}), "target": target}
    jobs = []
    for i, j in itertools.combinations(range(len(names)), 2):
        for k in range(matches_per_pair):
            s = seed * 1_000_003 + (i * len(names) + j) * 1009 + k
            jobs.append((i, j, k, k % 2 == 0, s, cfg, target, max_decisions))
    if workers > 1:
        with mp.get_context("fork").Pool(workers) as pool:
            matches = pool.map(_job, jobs, chunksize=1)
    else:
        matches = [_job(job) for job in jobs]
    return names, matrix_from_matches(len(names), matches), matches


def save(names: Sequence[str], A: np.ndarray, matches: Sequence[dict], out: str | Path, tag: str) -> None:
    """Write ``<tag>_matrix.csv`` (names on both axes) and ``<tag>_matches.csv``."""
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    with open(out / f"{tag}_matrix.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([""] + list(names))
        for name, row in zip(names, A):
            w.writerow([name] + [f"{v:.6f}" for v in row])
    with open(out / f"{tag}_matches.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["bot_i", "bot_j", "match", "i_is_p1", "seed", "goals_i", "goals_j",
                    "decisions", "ticks", "seconds_i", "seconds_j", "ended_by"])
        for m in matches:
            w.writerow([names[m["i"]], names[m["j"]], m["match"], m["i_is_p1"], m["seed"],
                        m["goals_i"], m["goals_j"], m["decisions"], m["ticks"],
                        f"{m['seconds_i']:.4f}", f"{m['seconds_j']:.4f}", m["ended_by"]])
