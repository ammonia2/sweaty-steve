"""Node-free checks for the heuristic's zero-sum and range guarantees."""
from __future__ import annotations

import numpy as np
import pytest

from gtbots.scoring.heuristic import HeuristicScore

LAYOUT = {
    "sections": {"me": 0, "foe": 20, "ball": 40, "match": 60},
    "player": {"x": 0, "y": 1, "vx": 2, "vy": 3, "grounded": 4},
    "ball": {"x": 0, "y": 1, "vx": 2, "vy": 3},
    "match": {"myNeeded": 0},
}


def mirrored(mine: np.ndarray) -> np.ndarray:
    """The same moment seen from the other end: x and vx negate, y does not."""
    theirs = mine.copy()
    at = LAYOUT["sections"]["ball"]
    for name in ("x", "vx"):
        theirs[..., at + LAYOUT["ball"][name]] *= -1
    # My player is their foe and vice versa, with x and vx negated.
    for name in ("x", "vx"):
        a = LAYOUT["sections"]["me"] + LAYOUT["player"][name]
        b = LAYOUT["sections"]["foe"] + LAYOUT["player"][name]
        theirs[..., a], theirs[..., b] = -mine[..., b], -mine[..., a]
    return theirs


def test_score_is_zero_sum_and_bounded():
    score = HeuristicScore(LAYOUT)
    rng = np.random.default_rng(0)
    mine = rng.normal(size=(8, 198))
    s = score(mine, mirrored(mine))
    assert np.allclose(s, -score(mirrored(mine), mine))
    assert (np.abs(s) <= 0.5).all()


def test_player_terms_change_the_score():
    base = np.zeros(198, dtype=np.float32)
    base[LAYOUT["sections"]["ball"]] = 0.2
    ahead = base.copy()
    ahead[LAYOUT["sections"]["me"] + LAYOUT["player"]["x"]] = -0.5
    score = HeuristicScore(LAYOUT)
    assert score(ahead, mirrored(ahead)) != score(base, mirrored(base))

    old = HeuristicScore(LAYOUT, {"ball_x": 1.5, "ball_vx": 1.0, "pair_x": 0.0,
                                  "ball_lead": 0.0, "pair_vx": 0.0})
    assert np.allclose(old(ahead, mirrored(ahead)), old(base, mirrored(base)))


def test_unknown_term_rejected():
    with pytest.raises(ValueError):
        HeuristicScore(LAYOUT, {"nonsense": 1})
