"""The optional opponent-action hook is discoverable at runtime."""
from __future__ import annotations

from gtbots.bots.base import Bot, ObservesOpponent
from gtbots.bots.ppo import PpoBot
from gtbots.bots.scripted import Baseline

LAYOUT = {
    "sections": {"me": 0, "foe": 100, "ball": 200, "match": 300},
    "player": {"x": 0, "y": 1, "grounded": 4},
    "ball": {"x": 0, "y": 1},
}


def test_bots_satisfy_the_basic_protocol():
    assert isinstance(PpoBot(), Bot)
    assert isinstance(Baseline(LAYOUT), Bot)


def test_observe_is_optional():
    class MemoryBot:
        name = "memory"

        def act(self, seat, obs):
            return 0

        def observe(self, opponent_action):
            self.last = opponent_action

    b = MemoryBot()
    assert isinstance(b, Bot)
    assert isinstance(b, ObservesOpponent)
    assert not isinstance(PpoBot(), ObservesOpponent)
    assert not isinstance(Baseline(LAYOUT), ObservesOpponent)
    b.observe(7)
    assert b.last == 7
