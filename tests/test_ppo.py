"""Checks for the PPO actor loader. No Node needed: uv run pytest tests/test_ppo.py"""
from __future__ import annotations

import numpy as np
import pytest

from gtbots.bots.ppo import PpoBot
from gtbots.env import NUM_ACTIONS, ROOT

POLICIES = ROOT / "game" / "policies"


@pytest.mark.parametrize("name", ["stage1-open", "stage2"])
def test_loads_real_actor(name):
    bot = PpoBot(POLICIES / f"{name}.bin")
    assert bot.W1.shape == (256, 198)
    assert bot.W2.shape == (256, 256)
    assert bot.W3.shape == (NUM_ACTIONS, 256)
    assert bot.name == f"ppo-{name}"

    obs = np.zeros(198, dtype=np.float32)
    z = bot.logits(obs)
    p = bot.probabilities(obs)
    assert z.shape == p.shape == (NUM_ACTIONS,)
    assert np.isfinite(z).all()
    assert (p >= 0).all() and p.sum() == pytest.approx(1)
    assert bot.act(None, obs) == int(z.argmax())


def test_probabilities_are_the_softmax_of_logits():
    bot = PpoBot()
    rng = np.random.default_rng(0)
    obs = rng.normal(size=(5, 198)).astype(np.float32)
    z = bot.logits(obs)
    e = np.exp(z - z.max(axis=-1, keepdims=True))
    assert np.allclose(bot.probabilities(obs), e / e.sum(axis=-1, keepdims=True))
    assert np.allclose(bot.probabilities(obs).sum(axis=-1), 1)


def test_stable_with_large_logits():
    bot = PpoBot()
    bot.W3[:] = 1e4  # overflow without the max-subtraction
    p = bot.probabilities(np.zeros(198, dtype=np.float32))
    assert np.isfinite(p).all() and p.sum() == pytest.approx(1)


def test_bad_file_rejected(tmp_path):
    bad = tmp_path / "bad.bin"
    bad.write_bytes(np.zeros(123, "<f4").tobytes())
    with pytest.raises(ValueError):
        PpoBot(bad)
