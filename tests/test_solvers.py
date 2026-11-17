"""Checks for gtbots/solvers/. No Node needed. Run: uv run pytest tests/test_solvers.py"""
from __future__ import annotations

import numpy as np
import pytest

from gtbots.env import ROOT
from gtbots.solvers.lp import lp
from gtbots.solvers.regret_matching import exploitability, regret_matching

SOLVERS = [lp, regret_matching]
# Regret matching only converges, so it is checked looser than the LP.
TOL = {lp: 1e-7, regret_matching: 5e-3}
# Its mixes converge slower than its value: after 2000 rounds on the 2x2
# below, the value is off by 5e-4 but a mix by ~0.02. What it guarantees is
# low exploitability, not the exact mix.
MIX_TOL = {lp: 1e-7, regret_matching: 0.03}


@pytest.mark.parametrize("solve", SOLVERS)
def test_rock_paper_scissors(solve):
    """The textbook mixed game: 1/3 each, value 0."""
    M = np.array([[0, -1, 1], [1, 0, -1], [-1, 1, 0]], float)
    x, y, v = solve(M)
    assert np.allclose(x, 1 / 3, atol=MIX_TOL[solve]) and np.allclose(y, 1 / 3, atol=MIX_TOL[solve])
    assert abs(v) < TOL[solve]


@pytest.mark.parametrize("solve", SOLVERS)
def test_two_by_two_by_hand(solve):
    """[[3, -1], [-2, 1]] has no saddle point. Making the column player
    indifferent: 3p - 2(1-p) = -p + (1-p)  ->  p = 3/7, value 1/7.
    Making the row player indifferent: 3q - (1-q) = -2q + (1-q)  ->  q = 2/7."""
    M = np.array([[3, -1], [-2, 1]], float)
    x, y, v = solve(M)
    assert np.allclose(x, [3 / 7, 4 / 7], atol=MIX_TOL[solve])
    assert np.allclose(y, [2 / 7, 5 / 7], atol=MIX_TOL[solve])
    assert v == pytest.approx(1 / 7, abs=TOL[solve])


@pytest.mark.parametrize("solve", SOLVERS)
def test_saddle_point_is_pure(solve):
    """Row 1 is safest for me (worst case 2), column 0 for them: a pure equilibrium."""
    M = np.array([[1, 5], [2, 3], [0, 4]], float)
    x, y, v = solve(M)
    assert x.argmax() == 1 and y.argmax() == 0
    assert v == pytest.approx(2, abs=TOL[solve])


@pytest.mark.parametrize("solve", SOLVERS)
def test_mixes_are_distributions(solve):
    """Any game, any shape: both mixes are valid probabilities, and the value
    lies between the safest row's worst case and the safest column's worst case."""
    rng = np.random.default_rng(0)
    for shape in [(12, 12), (5, 9), (9, 5), (1, 4)]:
        M = rng.uniform(-1, 1, shape)
        x, y, v = solve(M)
        assert x.shape == (shape[0],) and y.shape == (shape[1],)
        for p in (x, y):
            assert (p >= -1e-12).all() and p.sum() == pytest.approx(1)
        assert M.min(axis=1).max() - TOL[solve] <= v <= M.max(axis=0).min() + TOL[solve]


def test_lp_is_an_equilibrium():
    """The LP's answer cannot be improved on by either side, and the opponent's
    LP gives the same value (the minimax theorem)."""
    rng = np.random.default_rng(1)
    for _ in range(20):
        M = rng.uniform(-1, 1, (12, 12))
        x, y, v = lp(M)
        assert exploitability(M, x, y) < 1e-7
        assert x @ M @ y == pytest.approx(v, abs=1e-7)


@pytest.mark.parametrize("n", [10, 20, 30])
@pytest.mark.parametrize("scorer", ["heuristic", "critic"])
def test_solvers_agree_on_real_snapshots(n, scorer):
    """The real 12x12 games in fixtures/: both solvers find the same value,
    and regret matching gets close to an equilibrium."""
    M = np.load(ROOT / "fixtures" / f"snapshot_{n}.npz")[scorer]
    _, _, v_lp = lp(M)
    x, y, v_rm = regret_matching(M)
    assert v_rm == pytest.approx(v_lp, abs=TOL[regret_matching])
    assert exploitability(M, x, y) < TOL[regret_matching]


def test_bad_input():
    for solve in SOLVERS:
        with pytest.raises(ValueError):
            solve(np.zeros(4))
        with pytest.raises(ValueError):
            solve(np.zeros((0, 3)))
