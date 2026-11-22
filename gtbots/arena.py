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

import time
from dataclasses import dataclass, field
from typing import Callable

import numpy as np

from gtbots.env import GameEnv, Seat

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
