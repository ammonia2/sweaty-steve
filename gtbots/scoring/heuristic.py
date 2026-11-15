"""Hand-written position score.

A starting point to tune, not a finished design. It rates a position by where
the ball is and where it is going, both seen from my side:

    ball far towards their goal, moving that way   -> good for me
    ball near my goal, moving towards it           -> bad for me

    score = 0.5 * tanh(BALL_X * ball.x + BALL_VX * ball.vx)

ball.x runs -1 (my goal's end) .. +1 (theirs); ball.vx > 0 is towards their
goal (see the units in env.py). The weights are a first guess.

The 0.5 keeps every score inside -0.5..0.5, so any cell where a goal is
actually scored (worth +-1 in the evaluator) always outranks it.

Every term is something that flips sign when the pitch is mirrored, so the
score is zero-sum on its own: from their side it is exactly the negative.
"""
from __future__ import annotations

import numpy as np

from gtbots.env import Fields

BALL_X = 1.5
BALL_VX = 1.0


class HeuristicScore:
    """score(mine, theirs) -> how good the position is for me, -0.5..0.5."""

    def __init__(self, layout: dict):
        self.f = Fields(layout)

    def __call__(self, mine: np.ndarray, theirs: np.ndarray) -> np.ndarray:
        x = self.f.ball(mine, "x")
        vx = self.f.ball(mine, "vx")
        return 0.5 * np.tanh(BALL_X * x + BALL_VX * vx)
