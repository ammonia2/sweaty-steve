"""First-to-7 matches between two bots, with replays and per-match logs.

`play_matches(a, b, ...)` is the Python-side counterpart of the game repo's
`rl/arena.py`. Each match gets its own seed and its own env, and the bots are
built fresh for it (so a Nash bot's `log` holds only that match). Ends are
alternated: `a` is P1 in even-numbered matches and P2 in the odd ones.

`play_match` is the single-match loop: it resets both bots, calls the optional
`observe(opponent_action)` hook before each decision, counts goals from the
env's rewards, and stops at the target, at a time cut-off, or at a safety cap.
"""
from __future__ import annotations

import csv
import json
import shutil
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable

import numpy as np

from gtbots.env import ROOT, GameEnv, Seat

# A fresh bot for each match: `make(layout, seed) -> bot`.
BotFactory = Callable[[dict, int], object]


@dataclass
class Result:
    """Aggregate over matches, from `a`'s point of view."""

    matches: int = 0
    a_wins: int = 0
    b_wins: int = 0
    draws: int = 0
    a_goals: int = 0
    b_goals: int = 0
    cut_off: int = 0
    ticks: int = 0
    seconds_a: float = 0.0
    seconds_b: float = 0.0
    per_side: dict = field(default_factory=lambda: {"p1": [0, 0], "p2": [0, 0]})

    @property
    def win_rate(self) -> float:
        return self.a_wins / max(1, self.matches)

    @property
    def goal_share(self) -> float:
        return self.a_goals / max(1, self.a_goals + self.b_goals)


def play_match(env: GameEnv, bot1, bot2, target: int = 7, max_decisions: int = 20000) -> dict:
    """Play one whole match in env 0: `bot1` as P1, `bot2` as P2.

    Returns goals, decisions, ticks, compute seconds per bot, how it ended,
    and the winner ("p1", "p2" or "draw"). A time cut-off keeps the goals
    counted so far: the env starts a fresh 0-0 match in the same slot, so we
    stop there rather than carry on with the wrong score.
    """
    seats = (Seat(env, 0, 0), Seat(env, 0, 1))
    bots = (bot1, bot2)
    for b in bots:
        if hasattr(b, "reset"):
            b.reset()

    obs = env.reset()
    goals = [0, 0]
    seconds = [0.0, 0.0]
    prev = [None, None]  # the action each player pressed on the previous decision
    decisions = 0
    ended_by = "decisions"
    while decisions < max_decisions:
        actions = np.zeros((1, 2), dtype=np.uint8)
        for k, bot in enumerate(bots):
            # Pass the opponent's previous action to bots that want it.
            if hasattr(bot, "observe"):
                bot.observe(prev[1 - k])
            t0 = time.perf_counter()
            actions[0, k] = bot.act(seats[k], obs[0, k])
            seconds[k] += time.perf_counter() - t0

        obs, reward, _, truncated, _ = env.step(actions)
        prev = [int(actions[0, 0]), int(actions[0, 1])]
        decisions += 1
        for k in (0, 1):
            goals[k] += int(reward[0, k] > 0)

        if max(goals) >= target:
            ended_by = "target"
            break
        if truncated[0]:
            ended_by = "time"
            break

    winner = "p1" if goals[0] > goals[1] else ("p2" if goals[1] > goals[0] else "draw")
    return {
        "goals1": goals[0], "goals2": goals[1], "winner": winner,
        "decisions": decisions,
        "ticks": decisions * int(env.config.get("actionRepeat", 2)),
        "seconds1": seconds[0], "seconds2": seconds[1],
        "ended_by": ended_by,
    }


def _write_csv(path: Path, rows: list[dict], columns: list[str]) -> None:
    """Write a CSV with a fixed column order (missing keys are left blank)."""
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        for row in rows:
            w.writerow({c: row.get(c, "") for c in columns})


def play_matches(
    make_a: BotFactory,
    make_b: BotFactory,
    matches: int = 8,
    seed: int = 1,
    target: int = 7,
    max_decisions: int = 20000,
    env_config: dict | None = None,
    out: str | Path | None = None,
    tag: str = "matches",
    log_bot: str = "a",
) -> tuple[Result, list[dict]]:
    """Play `matches` first-to-`target` games, one seed and fresh bots each.

    `a` is P1 in even matches and P2 in odd ones, so both bots play both ends.
    Returns the aggregate `Result` (from `a`'s side) and one record per match,
    with the score and seconds already turned into `a`/`b` orientation.

    With `out` set, write `<tag>_matches.csv` and `<tag>_summary.csv` there,
    copy each finished replay to `replays/` and dump the chosen bot's `log`
    (a or b) to `logs/<tag>_<match>_seed<s>_bot.log` after every match.
    """
    if matches < 1:
        raise ValueError("matches must be at least 1")
    if log_bot not in ("a", "b"):
        raise ValueError(f"log_bot must be 'a' or 'b', got {log_bot!r}")
    cfg = dict(env_config or {})
    cfg["match"] = {**cfg.get("match", {}), "target": target}
    root = Path(out) if out is not None else None
    replay_dir = root / "replays" / tag if root else None
    log_dir = root / "logs" / tag if root else None
    if root:
        root.mkdir(parents=True, exist_ok=True)
        replay_dir.mkdir(parents=True, exist_ok=True)
        log_dir.mkdir(parents=True, exist_ok=True)

    res = Result()
    records = []
    for k in range(matches):
        s = seed * 1_000_003 + k
        a_on_p1 = k % 2 == 0
        mcfg = dict(cfg)
        if replay_dir:
            mcfg.update(
                replayDir=str(replay_dir), recordEnvs=1,
                replayMeta={"seed": s, "match": k, "a_on_p1": int(a_on_p1),
                            "a": getattr(make_a, "__name__", "a"),
                            "b": getattr(make_b, "__name__", "b")},
            )
        before = {p.name for p in replay_dir.glob("*.json")} if replay_dir else set()

        with GameEnv(num_envs=1, num_procs=1, seed=s, **mcfg) as env:
            first, second = (make_a, make_b) if a_on_p1 else (make_b, make_a)
            bots = (first(env.layout, s), second(env.layout, s))
            r = play_match(env, bots[0], bots[1], target, max_decisions)
            bot_a = bots[0] if a_on_p1 else bots[1]
            bot_b = bots[1] if a_on_p1 else bots[0]

        replay_path = ""
        if replay_dir:
            # On close the server also emits the match still in progress;
            # pick the one tagged with this match's seed and copy it out.
            for f in sorted(replay_dir.glob("*.json")):
                if f.name in before:
                    continue
                try:
                    meta = json.loads(f.read_text()).get("meta", {})
                except (ValueError, OSError):
                    continue
                if meta.get("seed") != s:
                    continue
                dest = root / "replays" / f"{tag}_{k}_seed{s}.json"
                shutil.copyfile(f, dest)
                replay_path = str(dest.relative_to(root))
                break

        log_path = ""
        if root:
            chosen = bot_a if log_bot == "a" else bot_b
            dest = log_dir / f"{tag}_{k}_seed{s}_bot.log"
            dest.write_text(json.dumps(getattr(chosen, "log", []), indent=2, default=str))
            log_path = str(dest.relative_to(root))

        g1, g2 = r["goals1"], r["goals2"]
        s1, s2 = r["seconds1"], r["seconds2"]
        goals_a, goals_b = (g1, g2) if a_on_p1 else (g2, g1)
        seconds_a, seconds_b = (s1, s2) if a_on_p1 else (s2, s1)
        winner = "a" if goals_a > goals_b else ("b" if goals_b > goals_a else "draw")
        side = "p1" if a_on_p1 else "p2"

        res.matches += 1
        res.a_goals += goals_a
        res.b_goals += goals_b
        res.ticks += r["ticks"]
        res.seconds_a += seconds_a
        res.seconds_b += seconds_b
        res.per_side[side][1] += 1
        if winner == "a":
            res.a_wins += 1
            res.per_side[side][0] += 1
        elif winner == "b":
            res.b_wins += 1
        else:
            res.draws += 1
        if r["ended_by"] == "time":
            res.cut_off += 1

        records.append({
            "match": k, "seed": s, "a_on_p1": int(a_on_p1),
            "a_name": str(getattr(bot_a, "name", getattr(make_a, "__name__", "a"))),
            "b_name": str(getattr(bot_b, "name", getattr(make_b, "__name__", "b"))),
            "winner": winner, "goals_a": goals_a, "goals_b": goals_b,
            "decisions": r["decisions"], "ticks": r["ticks"],
            "seconds_a": seconds_a, "seconds_b": seconds_b,
            "ended_by": r["ended_by"], "replay": replay_path, "bot_log": log_path,
        })

    if root:
        _write_csv(root / f"{tag}_matches.csv", records, [
            "match", "seed", "a_on_p1", "a_name", "b_name", "winner", "goals_a", "goals_b",
            "decisions", "ticks", "seconds_a", "seconds_b", "ended_by", "replay", "bot_log",
        ])
        summary = {**asdict(res), "win_rate": res.win_rate, "goal_share": res.goal_share}
        _write_csv(root / f"{tag}_summary.csv", [summary], list(summary))
    return res, records
