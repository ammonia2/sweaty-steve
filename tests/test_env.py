"""Checks for gtbots/env.py and gtbots/evaluator.py. Needs Node. Run: uv run pytest"""
from __future__ import annotations

import numpy as np
import pytest

from gtbots.env import BACK, FORWARD, NUM_ACTIONS, Fields, GameEnv, Seat, decode, encode
from gtbots.evaluator import payoff_matrix
from gtbots.scoring.critic import CriticScore
from gtbots.scoring.heuristic import HeuristicScore

TICKS = 10  # short look-aheads keep the tests fast


def play(env: GameEnv, steps: int, seed: int) -> np.ndarray:
    """Step every match `steps` times with random actions; returns the last obs."""
    rng = np.random.default_rng(seed)
    obs = None
    for _ in range(steps):
        obs, *_ = env.step(rng.integers(0, NUM_ACTIONS, (env.num_envs, 2)))
    return obs


@pytest.fixture
def env():
    with GameEnv(num_envs=1, num_procs=1, seed=7) as e:
        e.reset()
        play(e, 60, seed=1)  # get away from the kick-off, where everything is symmetric
        yield e


def test_actions_round_trip():
    assert [encode(*decode(a)) for a in range(NUM_ACTIONS)] == list(range(NUM_ACTIONS))
    assert encode(FORWARD, 0, 1) == 9
    assert decode(encode(BACK, 1, 0)) == (BACK, 1, 0)


def test_shapes():
    with GameEnv(num_envs=2, num_procs=2, seed=1) as e:
        obs = e.reset()
        assert obs.shape == (2, 2, e.obs_dim)
        obs, reward, term, trunc, infos = e.step(np.zeros((2, 2), int))
        assert obs.shape == (2, 2, e.obs_dim) and reward.shape == (2, 2)
        r = e.evaluate(1, TICKS)
        assert r["obs"].shape == (12, 12, 2, e.obs_dim)
        assert r["ticks"].shape == r["goal"].shape == (12, 12)


def test_lookahead_leaves_the_match_untouched():
    """The Nash bot looks ahead from the live match on every decision. If that
    changed the match even slightly, every match it plays would be wrong.

    Two envs with the same seed play the same actions; one of them looks ahead
    halfway through. Afterwards they must still be identical, bit for bit."""
    with GameEnv(num_envs=1, num_procs=1, seed=3) as a, GameEnv(num_envs=1, num_procs=1, seed=3) as b:
        a.reset(), b.reset()
        rng = np.random.default_rng(0)
        for step in range(120):
            if step == 50:
                Seat(a, 0, 0).lookahead(30)
                Seat(a, 0, 1).lookahead(30, "idle")
            acts = rng.integers(0, NUM_ACTIONS, (1, 2))
            oa, ra, *_ = a.step(acts)
            ob, rb, *_ = b.step(acts)
            assert np.array_equal(oa, ob), f"diverged at step {step}"
            assert np.array_equal(ra, rb)


def test_p2_seat_is_the_server_reply_turned_around(env):
    raw = env.evaluate(0, TICKS)
    p1 = Seat(env, 0, 0).lookahead(TICKS)
    p2 = Seat(env, 0, 1).lookahead(TICKS)
    assert np.array_equal(p1["goal"], raw["goal"])
    for i, j in [(0, 0), (4, 9), (11, 2)]:
        # P2 playing i against P1's j is the server's cell [j, i], with the views swapped.
        assert np.array_equal(p2["obs"][i, j, 0], raw["obs"][j, i, 1])
        assert np.array_equal(p2["obs"][i, j, 1], raw["obs"][j, i, 0])
        assert p2["goal"][i, j] == -raw["goal"][j, i]
        assert p2["ticks"][i, j] == raw["ticks"][j, i]


def test_fields_read_mirrored_views(env):
    """Each player sees the pitch mirrored: my x is minus my x in their view."""
    obs = play(env, 1, seed=2)[0]
    f = Fields(env.layout)
    assert f.me(obs[0], "x") == pytest.approx(-f.foe(obs[1], "x"), abs=1e-6)
    assert f.ball(obs[0], "x") == pytest.approx(-f.ball(obs[1], "x"), abs=1e-6)
    assert f.ball(obs[0], "y") == pytest.approx(f.ball(obs[1], "y"), abs=1e-6)
    assert (f.match(obs[0], "side"), f.match(obs[1], "side")) == (0, 1)


@pytest.mark.parametrize("make_score", [lambda e: HeuristicScore(e.layout), lambda e: CriticScore()])
def test_payoff_matrix_is_zero_sum_across_seats(env, make_score):
    """P2's matrix must be exactly the negative of P1's, turned around."""
    score = make_score(env)
    m1 = payoff_matrix(Seat(env, 0, 0), score, TICKS)
    m2 = payoff_matrix(Seat(env, 0, 1), score, TICKS)
    assert m1.shape == (12, 12)
    assert np.allclose(m2, -m1.T, atol=1e-6)
    assert np.all(np.abs(m1) <= 1)


def test_goal_cells_are_worth_one():
    """Find a moment where some look-ahead cells score, then check those cells are exactly +-1."""
    with GameEnv(num_envs=1, num_procs=1, seed=11) as e:
        e.reset()
        rng = np.random.default_rng(5)
        score = HeuristicScore(e.layout)
        f = Fields(e.layout)
        obs = e.reset()
        for _ in range(5000):
            # Looking ahead costs ~0.7 s, so only do it once the ball is near either goal.
            if abs(f.ball(obs[0, 0], "x")) < 0.6:
                obs, *_ = e.step(rng.integers(0, NUM_ACTIONS, (1, 2)))
                continue
            r = e.evaluate(0, 30)
            if np.any(r["goal"]):
                m = payoff_matrix(Seat(e, 0, 0), score, 30)
                assert np.array_equal(m[r["goal"] != 0], r["goal"][r["goal"] != 0])
                assert np.all(np.abs(m[r["goal"] == 0]) < 1)
                return
            obs, *_ = e.step(rng.integers(0, NUM_ACTIONS, (1, 2)))
        pytest.skip("no look-ahead reached a goal; nothing to check")
