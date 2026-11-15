"""Match state -> 12x12 payoff matrix.

For the Nash bot's current decision: every pair of actions (mine, theirs) is
played forward from the live match (`seat.lookahead`), and each cell gets a
number saying how good the end of that look-ahead is for me:

    a goal was scored in that cell   +1 (I scored) or -1 (they scored)
    otherwise                        score(my view, their view), always
                                     strictly between -1 and 1

so an actual goal always outranks any opinion about a position.

The game is zero-sum: the opponent's payoff in each cell is the negative.
"""
from __future__ import annotations

from typing import Callable

import numpy as np

from gtbots.env import Seat

# score(mine [..., 198], theirs [..., 198]) -> [...]. See gtbots/scoring/.
Score = Callable[[np.ndarray, np.ndarray], np.ndarray]
# The most a position without a goal can be worth.
MAX_SCORE = 0.99


def payoff_matrix(seat: Seat, score: Score, ticks: int = 10, follow: str = "hold") -> np.ndarray:
    """[12, 12] payoffs for the player in `seat`; rows are my actions, columns theirs.

    ticks: how far ahead each cell looks (30 ticks = 1 second).
    follow: what both players do after the first decision ("hold", "idle" or
    "policy"); see GameEnv.evaluate.
    """
    r = seat.lookahead(ticks, follow)
    obs = r["obs"]  # [12, 12, 2, 198], already from my side: [..., 0, :] is my view
    # Opinion of every end position, then overwrite the cells where a goal settled it.
    m = np.asarray(score(obs[:, :, 0, :], obs[:, :, 1, :]), dtype=np.float64)
    # Keep opinions strictly below a real goal. The critic's last layer is
    # linear, so it can overshoot +-1 now and then.
    m = np.clip(m, -MAX_SCORE, MAX_SCORE)
    goal = r["goal"]
    return np.where(goal != 0, goal.astype(np.float64), m)
