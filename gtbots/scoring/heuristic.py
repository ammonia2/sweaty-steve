"""Hand-written position score, with ball and player terms.

A position is rated from my own (mirrored) view. Mirroring swaps the two
players: mine's `me` is theirs' `foe`, and every x / vx negates. So a lone
player field does NOT flip sign under a view swap; only these combinations do:

    ball_x    ball.x                       (their view: -ball.x)
    ball_vx   ball.vx                      (their view: -ball.vx)
    pair_x    me.x + foe.x                 (their view: -(me.x + foe.x))
    pair_vx   me.vx + foe.vx               both players' forward momentum

A "ball ahead of the players" term, 2*ball.x - (me.x + foe.x), was tried and
dropped: it is ball_x and pair_x with fixed weights 2 and -1, so it adds no
direction the weights above cannot already express. Any old vector with a
ball_lead weight L maps exactly to ball_x + 2L, pair_x - L.

y positions do not flip under a mirror, so no y term can appear here. With
only sign-flipping terms,

    score(theirs, mine) == - score(mine, theirs)

exactly: the score is zero-sum on its own, like the critic's difference of
two values.

    score = 0.5 * tanh(sum(weight * term))

The 0.5 keeps every opinion strictly inside -0.5..0.5, so a real goal
(worth +-1 in the evaluator) always outranks it.
"""
from __future__ import annotations

import numpy as np

from gtbots.env import Fields

# Selected by `experiments/tune_heuristic.py` (results/heuristic_tuning.csv);
# the chosen vector is also saved in results/heuristic_best.json.
WEIGHTS = {
    "ball_x": 2.7,
    "ball_vx": 1.0,
    "pair_x": -0.2,
    "pair_vx": 0.2,
}


class HeuristicScore:
    """score(mine, theirs) -> how good the position is for me, -0.5..0.5."""

    def __init__(self, layout: dict, weights: dict | None = None):
        self.f = Fields(layout)
        self.weights = dict(WEIGHTS)
        if weights:
            unknown = set(weights) - set(self.weights)
            if unknown:
                raise ValueError(f"unknown heuristic terms: {sorted(unknown)}")
            self.weights.update(weights)

    def __call__(self, mine: np.ndarray, theirs: np.ndarray) -> np.ndarray:
        f, w = self.f, self.weights
        mx, fx = f.me(mine, "x"), f.foe(mine, "x")
        z = (
            w["ball_x"] * f.ball(mine, "x")
            + w["ball_vx"] * f.ball(mine, "vx")
            + w["pair_x"] * (mx + fx)
            + w["pair_vx"] * (f.me(mine, "vx") + f.foe(mine, "vx"))
        )
        return 0.5 * np.tanh(z)
