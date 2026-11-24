"""Checks for gtbots/bots/bayesian.py. No Node needed. Run: uv run pytest tests/test_bayesian.py"""
from __future__ import annotations

import numpy as np
import pytest

from gtbots.bots.bayesian import (
    TYPES,
    best_response,
    predict,
    scripted_likelihood,
    uniform_prior,
    update_belief,
)
from gtbots.env import NUM_ACTIONS, ROOT


def test_uniform_prior():
    p = uniform_prior()
    assert len(p) == len(TYPES)
    assert np.allclose(p, 1 / 3)


def test_scripted_likelihood_is_a_distribution():
    p = scripted_likelihood(4, eps=0.05)
    assert p.shape == (NUM_ACTIONS,)
    assert p.sum() == pytest.approx(1.0)
    assert p[4] == pytest.approx(0.95)
    assert np.allclose(np.delete(p, 4), 0.05 / 11)


@pytest.mark.parametrize("eps", [0.0, 1.0, -0.1])
def test_scripted_likelihood_rejects_bad_eps(eps):
    with pytest.raises(ValueError):
        scripted_likelihood(0, eps=eps)


def test_update_by_hand():
    """Prior 1/3 each; the move has P 0.95 under type 1 and 0.05/11 under the
    others. Posterior for type 1 = 0.95 / (0.95 + 2 * 0.05/11)."""
    small = 0.05 / 11
    post = update_belief(uniform_prior(), [small, 0.95, small])
    assert post.sum() == pytest.approx(1.0)
    assert post[1] == pytest.approx(0.95 / (0.95 + 2 * small))
    assert post[0] == pytest.approx(post[2])


def test_one_surprise_does_not_rule_a_type_out():
    """A type that predicted a different move keeps a belief above 0."""
    lik = [scripted_likelihood(0)[5], scripted_likelihood(5)[5], scripted_likelihood(0)[5]]
    post = update_belief(uniform_prior(), lik)
    assert np.all(post > 0)


def test_repeated_evidence_goes_to_the_right_type():
    """The opponent keeps playing 7, which only 'rusher' (index 1) predicts."""
    belief = uniform_prior()
    for _ in range(10):
        lik = [scripted_likelihood(2)[7], scripted_likelihood(7)[7], scripted_likelihood(11)[7]]
        belief = update_belief(belief, lik)
    assert belief[1] > 0.999


def test_type_comes_back_after_a_surprise():
    """Smoothing lets the belief recover: one off move, then the type's own moves."""
    belief = uniform_prior()
    belief = update_belief(belief, [scripted_likelihood(0)[3], scripted_likelihood(3)[3], scripted_likelihood(0)[3]])
    for _ in range(5):
        belief = update_belief(belief, [scripted_likelihood(0)[0], scripted_likelihood(3)[0], scripted_likelihood(9)[0]])
    assert np.argmax(belief) == 0


def test_update_rejects_all_zero():
    with pytest.raises(ValueError):
        update_belief(uniform_prior(), [0.0, 0.0, 0.0])


def test_predict_mixes_by_belief():
    probs = np.stack([scripted_likelihood(a) for a in (0, 1, 2)])
    q = predict([0.5, 0.5, 0.0], probs)
    assert q.sum() == pytest.approx(1.0)
    assert q[0] == pytest.approx(0.5 * 0.95 + 0.5 * 0.05 / 11)
    assert q[2] == pytest.approx(0.05 / 11)


def test_predict_certain_belief_is_that_type():
    probs = np.stack([scripted_likelihood(a) for a in (0, 1, 2)])
    assert np.allclose(predict([0, 0, 1], probs), probs[2])


def test_best_response_by_hand():
    """Rows [3, -1] and [-2, 1]: against q = (0.5, 0.5) they give 1 and -0.5,
    against q = (0, 1) they give -1 and 1."""
    M = np.array([[3, -1], [-2, 1]], float)
    a, exp = best_response(M, [0.5, 0.5])
    assert a == 0 and np.allclose(exp, [1.0, -0.5])
    a, exp = best_response(M, [0.0, 1.0])
    assert a == 1


@pytest.mark.parametrize("n", [10, 20, 30])
@pytest.mark.parametrize("scorer", ["heuristic", "critic"])
def test_best_response_on_real_snapshots(n, scorer):
    """On the real 12x12 games: against a pure column the best response is
    that column's best row, and no row beats the chosen one against any q."""
    M = np.load(ROOT / "fixtures" / f"snapshot_{n}.npz")[scorer]
    for col in range(NUM_ACTIONS):
        q = np.eye(NUM_ACTIONS)[col]
        a, exp = best_response(M, q)
        assert M[a, col] == pytest.approx(M[:, col].max())
    q = np.random.default_rng(0).dirichlet(np.ones(NUM_ACTIONS))
    a, exp = best_response(M, q)
    assert np.all(exp <= exp[a] + 1e-12)
