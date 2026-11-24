"""Checks for gtbots/bots/bayesian.py. Run: uv run pytest tests/test_bayesian.py

The belief and best-response checks need no Node; the mirror() checks do."""
from __future__ import annotations

import numpy as np
import pytest

from gtbots.bots.bayesian import (
    TYPES,
    BayesianBot,
    OpponentTypes,
    best_response,
    mirror,
    predict,
    scripted_likelihood,
    uniform_prior,
    update_belief,
)
from gtbots.bots.ppo import PpoBot
from gtbots.bots.scripted import Camper, Rusher
from gtbots.env import NUM_ACTIONS, ROOT, GameEnv, Seat
from gtbots.scoring.heuristic import HeuristicScore


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


def test_floor_keeps_a_type_alive():
    """A move with probability exactly 0 under type 0 (PPO's softmax can round
    to that): plain Bayes sets it to 0 for good, the floor keeps it and lets
    it win back the lead once the evidence turns."""
    assert update_belief(uniform_prior(), [0.0, 0.5, 0.5])[0] == 0
    belief = update_belief(uniform_prior(), [0.0, 0.5, 0.5], floor=1e-6)
    assert belief[0] == pytest.approx(1e-6, rel=1e-3) and belief.sum() == pytest.approx(1)
    for _ in range(10):
        belief = update_belief(belief, [0.9, 0.01, 0.01], floor=1e-6)
    assert np.argmax(belief) == 0


def test_floor_stops_underflow():
    """500 moves that type 2 explains badly: without a floor its belief
    underflows to 0.0, with one it stays at the floor."""
    lik = [0.5, 0.5, 0.05 / 11]
    plain, floored = uniform_prior(), uniform_prior()
    for _ in range(500):
        plain = update_belief(plain, lik)
        floored = update_belief(floored, lik, floor=1e-6)
    assert plain[2] == 0.0
    assert floored[2] == pytest.approx(1e-6, rel=1e-3)


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


# ---------------------------------------------------------------------------
# mirror(): checked against the server's own two views. Needs Node.
# ---------------------------------------------------------------------------


def views(steps: int, seed: int, **config) -> tuple[np.ndarray, dict]:
    """Both players' views over `steps` random decisions in 8 matches: [n, 2, 198]."""
    with GameEnv(num_envs=8, num_procs=1, seed=seed, **config) as env:
        rng = np.random.default_rng(seed)
        seen = [env.reset()]
        for _ in range(steps):
            obs, *_ = env.step(rng.integers(0, NUM_ACTIONS, (env.num_envs, 2)))
            seen.append(obs)
        return np.concatenate(seen), env.layout


def test_mirror_default_game():
    """The game the experiments play: power-ups off, pitch 1."""
    obs, layout = views(400, seed=3, powerUps=False)
    assert np.allclose(mirror(obs[:, 0], layout), obs[:, 1], atol=1e-6)
    assert np.allclose(mirror(obs[:, 1], layout), obs[:, 0], atol=1e-6)


def test_mirror_with_power_ups_and_props():
    """Power-ups on, every pitch: power-up drops and pitch props show up.
    The streaker and bombs need a power-up to be collected, which random play
    never does here; their rules follow the server code the same way."""
    obs, layout = views(1500, seed=5, powerUps=True, pitches=list(range(1, 23)))
    sec = layout["sections"]
    starts = sorted(sec.values())
    # The check only means something if these sections were ever non-empty.
    for name in ("drops", "props"):
        end = starts[starts.index(sec[name]) + 1]
        assert obs[:, 0, sec[name]:end].any(), f"no {name} seen"
    assert np.allclose(mirror(obs[:, 0], layout), obs[:, 1], atol=1e-6)
    assert np.allclose(mirror(obs[:, 1], layout), obs[:, 0], atol=1e-6)


# ---------------------------------------------------------------------------
# OpponentTypes: P(. | type, view). Needs Node for real views.
# ---------------------------------------------------------------------------


def test_type_probs_rows():
    """Each row is a distribution: PPO's exact softmax, the scripted types
    0.95 on the action their bot would pick."""
    obs, layout = views(50, seed=11, powerUps=False)
    types = OpponentTypes(layout)
    ppo, rusher, camper = PpoBot(), Rusher(layout), Camper(layout)
    for view in obs[::7, 1]:
        P = types.probs(view)
        assert P.shape == (len(TYPES), NUM_ACTIONS)
        assert np.allclose(P.sum(axis=1), 1)
        assert np.allclose(P[0], ppo.probabilities(view))
        assert P[1, rusher.act(None, view)] == pytest.approx(0.95)
        assert P[2, camper.act(None, view)] == pytest.approx(0.95)


@pytest.mark.parametrize("Opp, t", [(Rusher, 1), (Camper, 2)])
def test_types_explain_a_real_opponent_through_mirror(Opp, t):
    """The whole chain on a live match: P2 is a scripted bot. From P1's view
    alone, mirror() + OpponentTypes gives P2's real move probability 0.95
    under its own type, every decision."""
    with GameEnv(num_envs=1, num_procs=1, seed=13, powerUps=False) as env:
        types, opp = OpponentTypes(env.layout), Opp(env.layout)
        rng = np.random.default_rng(13)
        obs = env.reset()
        for _ in range(150):
            p2_action = opp.act(None, obs[0, 1])
            P = types.probs(mirror(obs[0, 0], env.layout))
            assert P[t, p2_action] == pytest.approx(0.95)
            obs, *_ = env.step([[rng.integers(NUM_ACTIONS), p2_action]])


# ---------------------------------------------------------------------------
# BayesianBot. Needs Node.
# ---------------------------------------------------------------------------


def run(bot, opponent, decisions: int, seed: int = 17) -> list[int]:
    """`bot` as P1 against `opponent` as P2, calling observe like arena.play_match.
    Returns the opponent's actions."""
    with GameEnv(num_envs=1, num_procs=1, seed=seed, powerUps=False) as env:
        bot.reset()
        obs, prev, theirs = env.reset(), None, []
        for _ in range(decisions):
            bot.observe(prev)
            a = bot.act(Seat(env, 0, 0), obs[0, 0])
            assert 0 <= a < NUM_ACTIONS
            b = opponent.act(None, obs[0, 1])
            obs, *_ = env.step([[a, b]])
            prev = b
            theirs.append(b)
    return theirs


@pytest.fixture(scope="module")
def layout():
    with GameEnv(num_envs=1, num_procs=1) as env:
        return env.layout


def test_bot_name_and_settings(layout):
    bot = BayesianBot(HeuristicScore(layout), layout)
    assert bot.name == "bayes-heuristic-c3"
    assert bot.ticks == 30 and bot.follow == "hold" and bot.commit == 3
    assert np.allclose(bot.belief, 1 / 3)
    assert bot.floor == 1e-6
    with pytest.raises(ValueError):
        BayesianBot(HeuristicScore(layout), layout, prior=[0.5, 0.5, 0.5])
    with pytest.raises(ValueError):
        BayesianBot(HeuristicScore(layout), layout, commit=0)


def test_bot_plans_every_commit_and_logs(layout):
    """30 decisions with commit=3, no goal that early: 10 plans, each logged
    with a normalised belief, a mix q and 12 expected payoffs."""
    bot = BayesianBot(HeuristicScore(layout), layout, ticks=10)
    run(bot, Rusher(layout), 30)
    assert len(bot.log) == 10
    assert [e["decision"] for e in bot.log] == list(range(1, 31, 3))
    for e in bot.log:
        assert sum(e["belief"].values()) == pytest.approx(1)
        assert sum(e["q"]) == pytest.approx(1)
        assert len(e["expected"]) == NUM_ACTIONS
        assert e["expected"][e["action"]] == pytest.approx(max(e["expected"]))


def test_bot_belief_matches_hand_update(layout):
    """The bot's belief after a match = Bayes' rule applied by hand to the
    same opponent moves on the same (mirrored) views."""
    bot = BayesianBot(HeuristicScore(layout), layout, ticks=10, floor=0.0)
    types = OpponentTypes(layout)
    seen = []
    act = bot.act
    bot.act = lambda seat, obs: (seen.append(obs.copy()), act(seat, obs))[1]
    theirs = run(bot, Camper(layout), 12)
    belief = uniform_prior()
    for obs, a in zip(seen[:-1], theirs[:-1]):
        belief = update_belief(belief, types.probs(mirror(obs, layout))[:, a])
    assert np.allclose(bot.belief, belief)


def test_bot_reset_starts_a_new_match(layout):
    bot = BayesianBot(HeuristicScore(layout), layout, ticks=10)
    run(bot, Rusher(layout), 6)
    assert not np.allclose(bot.belief, 1 / 3)
    run(bot, Rusher(layout), 3)
    assert {e["match"] for e in bot.log} == {0, 1}
    assert bot.decision == 3
