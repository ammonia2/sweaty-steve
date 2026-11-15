"""Plays the equilibrium of the current 12x12 game.

Each time it plans, the bot:

  1. builds the payoff matrix for this moment (evaluator.payoff_matrix: every
     pair of actions played forward `ticks` ticks, each end scored),
  2. solves it as a zero-sum game (a solver from gtbots/solvers/),
  3. samples one action from its own equilibrium mix (the rows),
  4. commits: holds that action for `commit` decisions before planning again.

What it is built from is passed in, so the same class makes every variant in
the tournament (heuristic or critic scoring, LP or regret matching).
"""
from __future__ import annotations

import time
from typing import Callable

import numpy as np

from gtbots.env import Fields, Seat
from gtbots.evaluator import Score, payoff_matrix

# solver(M [12, 12]) -> (my_mix [12], their_mix [12], value), M from the row
# player's side.
Solver = Callable[[np.ndarray], tuple[np.ndarray, np.ndarray, float]]


class NashBot:
    name = "nash"

    def __init__(
        self,
        score: Score,
        solver: Solver,
        layout: dict,
        ticks: int = 30,
        follow: str = "hold",
        commit: int = 3,
        seed: int = 0,
    ):
        """
        score:   from gtbots/scoring/ (HeuristicScore, CriticScore, ...)
        solver:  from gtbots/solvers/ (LP, regret matching)
        layout:  env.layout, to read the observation by name (kick-off check)
        ticks:   look-ahead length per cell (30 ticks = 1 s)
        follow:  what both players do after the first decision in a look-ahead
        commit:  how long the bot keeps pressing the same buttons before it
                 thinks again. The game asks the bot for buttons every 2
                 ticks. commit=3 means: think once, then give the same
                 answer 3 times in a row = 6 ticks = 0.2 seconds.
                     commit=3 -> same buttons for 6 ticks  (0.2 s)
                     commit=7 -> same buttons for 14 ticks (0.47 s)
                     commit=8 -> same buttons for 16 ticks (0.53 s)
                 15 ticks is not possible (it would be 7.5); use 7 or 8.
        seed:    for sampling from the mix, so a match is reproducible
        """
        if commit < 1:
            raise ValueError("commit must be at least 1 decision")
        # Settings: fixed for the whole match.
        self.score = score
        self.solver = solver
        self.ticks = ticks
        self.follow = follow
        self.commit = commit
        self.f = Fields(layout)
        # Own random generator, seeded: the same seed replays the same match.
        # The global np.random would be shared with every other bot.
        self.rng = np.random.default_rng(seed)
        # Tournament tables need to tell the variants apart.
        scorer = type(score).__name__.removesuffix("Score").lower()
        solve = getattr(solver, "__name__", type(solver).__name__)
        self.name = f"nash-{scorer}-{solve}-c{commit}"
        # One plan per entry, for the report (see _record).
        self.log: list[dict] = []
        # Per-match state, set by reset().
        self.reset()

    def act(self, seat: Seat, obs: np.ndarray) -> int:
        """One decision: the held action, or a fresh plan."""
        # A goal was just scored: the players are back at kick-off, so the
        # held buttons were chosen for a position that no longer exists.
        if self._kickoff(obs):
            self.left = 0

        # Still holding: give the same buttons again, no thinking.
        if self.left > 0:
            self.left -= 1
            return self.held

        # Time to think: pick new buttons and hold them.
        self.held = self._plan(seat)
        self.left = self.commit - 1  # this call is the first of `commit`
        return self.held

    def _plan(self, seat: Seat) -> int:
        """Build the game for this moment, solve it, sample my action."""
        start = time.perf_counter()

        # 1. The table: 12 rows (my buttons) x 12 columns (theirs). Each cell
        #    is how good things look for me `ticks` ticks later if we both
        #    press those buttons. This is the slow part (144 look-aheads).
        M = payoff_matrix(seat, self.score, self.ticks, self.follow)

        # 2. Solve the zero-sum game: how often to pick each row so that the
        #    opponent can't do better than `value` against me, whatever they do.
        my_mix, _their_mix, value = self.solver(M)

        # 3. Clean the mix. A solver's floats can come out as -1e-12 or sum
        #    to 0.9999999, and rng.choice refuses those.
        p = np.clip(np.asarray(my_mix, dtype=np.float64), 0.0, None)
        if p.sum() <= 0:
            raise ValueError(f"solver returned an empty mix: {my_mix}")
        p /= p.sum()

        # 4. Roll the dice: pick one row, with the mix's chances.
        action = int(self.rng.choice(len(p), p=p))

        self._record(M, p, float(value), action, time.perf_counter() - start)
        return action

    def _kickoff(self, obs: np.ndarray) -> bool:
        """True when the score changed since the last call (a goal, so a kick-off)."""
        # Goals each side still needs to win. A goal makes one of them drop.
        score = (float(self.f.match(obs, "myNeeded")), float(self.f.match(obs, "theirNeeded")))
        # First call of a match: nothing to compare with yet.
        changed = self.last_score is not None and score != self.last_score
        self.last_score = score
        return changed

    def _record(self, M: np.ndarray, my_mix: np.ndarray, value: float, action: int, seconds: float) -> None:
        """Keep what the report needs from each plan."""
        self.log.append({
            # What the game is worth to me with both sides playing well.
            "value": value,
            # How many DIFFERENT moves the mix uses. Rows that are identical
            # in M are one move under two names (e.g. F and FJ when the jump
            # changes nothing), so they count once. 1 = one clear safest
            # move (pure), 2+ = a real guessing game, the bot had to mix.
            # Moves under 1% don't count: regret matching's average mix keeps
            # tiny leftovers (~0.0003) from its early, random rounds.
            "support": len(np.unique(M[my_mix >= 0.01].round(6), axis=0)),
            # How many different rows the table has. Low = flat table, the
            # look-ahead could not tell the actions apart.
            "distinct_rows": len(np.unique(M.round(6), axis=0)),
            "action": action,
            # Look-ahead + solve, in seconds: the cost of one plan.
            "seconds": seconds,
        })

    def reset(self) -> None:
        """New match: forget the commitment and the last seen score."""
        self.held: int = 0  # the action being held
        self.left: int = 0  # decisions still to hold it; 0 means plan now
        self.last_score: tuple[float, float] | None = None  # for _kickoff
