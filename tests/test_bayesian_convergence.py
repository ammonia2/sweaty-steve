"""Does the Bayesian bot work out who it is playing? Needs Node; ~1.5 minutes.

Run: uv run pytest tests/test_bayesian_convergence.py -v

Each test plays one capped match with arena.play_match (which calls the bot's
`observe`) at the bot's real settings, against one of the three types, from
both ends of the pitch.
"""
from __future__ import annotations

import pytest

from gtbots.arena import play_match
from gtbots.bots.bayesian import TYPES, BayesianBot
from gtbots.bots.ppo import PpoBot
from gtbots.bots.scripted import Camper, Rusher
from gtbots.env import GameEnv
from gtbots.scoring.heuristic import HeuristicScore

DECISIONS = 120  # 40 plans; the belief settles within the first few


def opponent(kind: str, layout: dict):
    return {"ppo": lambda: PpoBot(), "rusher": lambda: Rusher(layout), "camper": lambda: Camper(layout)}[kind]()


@pytest.mark.parametrize("bayes_first", [True, False], ids=["bayes-p1", "bayes-p2"])
@pytest.mark.parametrize("kind", TYPES)
def test_belief_goes_to_the_true_type(kind, bayes_first):
    with GameEnv(num_envs=1, num_procs=1, seed=21, powerUps=False) as env:
        bot = BayesianBot(HeuristicScore(env.layout), env.layout, seed=21)
        opp = opponent(kind, env.layout)
        pair = (bot, opp) if bayes_first else (opp, bot)
        play_match(env, *pair, max_decisions=DECISIONS)

    true = TYPES.index(kind)
    final = bot.belief
    assert final[true] > 0.99, f"final belief {dict(zip(TYPES, final))}"
    # And it stays there: the true type leads in every plan of the second half.
    for entry in bot.log[len(bot.log) // 2:]:
        assert max(entry["belief"], key=entry["belief"].get) == kind
