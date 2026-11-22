"""Scripted opponents, played from the canonical (mirrored) view.

`Baseline` is a port of the game repo's `rl/baseline.py`: the fixed yardstick
used throughout training. It works from either end unchanged because every
bot's observation is mirrored so it always attacks to the right. Its back-off
and hop are what stop it scoring own goals -- running straight at the ball
lets it ride up over the head and drop behind.

`Rusher` and `Camper` are the two simple styles Hasaan's Bayesian bot needs as
opponent types: one always runs at the ball, one holds a spot near its own
goal. Both read named fields, never hard-coded indices.
"""
from __future__ import annotations

import numpy as np

from gtbots.env import BACK, FORWARD, STAND, Fields, encode

# The game's position units: x = px / 400 - 1, y = px / 240 - 1.
PX = 1 / 400
PY = 1 / 240


class Baseline:
    """The game repo's scripted baseline, as a `Bot`.

    With the ball ahead, run at it -- except when it is right on top of the
    head (`gap` px), then back off so the boot meets it. Kick when the ball is
    0..`kick_reach` px ahead and not well above head height. Get back past a
    ball behind us, hopping over it when close, and head a ball dropping on us.
    """

    name = "baseline"

    def __init__(self, layout: dict, gap: float = 10, kick_reach: float = 60, hop: float = 70):
        self.f = Fields(layout)
        self.gap, self.kick_reach, self.hop = gap, kick_reach, hop

    def act(self, seat, obs: np.ndarray) -> int:
        f = self.f
        ahead = (float(f.ball(obs, "x")) - float(f.me(obs, "x"))) / PX
        below = (float(f.ball(obs, "y")) - float(f.me(obs, "y"))) / PY
        grounded = float(f.me(obs, "grounded")) > 0.5
        behind = ahead < 0

        move = BACK if (behind or ahead < self.gap) else FORWARD
        jump = grounded and (
            (behind and abs(ahead) < self.hop) or (below < -30 and abs(ahead) < 40)
        )
        kick = (0 < ahead < self.kick_reach) and below > -25
        return encode(move, jump, kick)


class Rusher:
    """Always runs at the ball and kicks it when it is just in front."""

    name = "rusher"

    def __init__(self, layout: dict, kick_reach: float = 60):
        self.f = Fields(layout)
        self.kick_reach = kick_reach

    def act(self, seat, obs: np.ndarray) -> int:
        f = self.f
        dx = (float(f.ball(obs, "x")) - float(f.me(obs, "x"))) / PX
        below = (float(f.ball(obs, "y")) - float(f.me(obs, "y"))) / PY
        move = FORWARD if dx >= 0 else BACK
        kick = (0 < dx < self.kick_reach) and below > -25
        return encode(move, False, kick)


class Camper:
    """Holds a spot near its own goal (x = -1 in its own view)."""

    name = "camper"

    def __init__(self, layout: dict, spot: float = -0.75, slack: float = 0.05, kick_reach: float = 60):
        self.f = Fields(layout)
        self.spot, self.slack, self.kick_reach = spot, slack, kick_reach

    def act(self, seat, obs: np.ndarray) -> int:
        f = self.f
        x = float(f.me(obs, "x"))
        move = BACK if x > self.spot + self.slack else (FORWARD if x < self.spot - self.slack else STAND)
        dx = (float(f.ball(obs, "x")) - x) / PX
        below = (float(f.ball(obs, "y")) - float(f.me(obs, "y"))) / PY
        kick = (0 < dx < self.kick_reach) and below > -25
        return encode(move, False, kick)
