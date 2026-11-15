"""The interface every bot implements.

A bot is anything with an `act` method of this shape. Each decision, the
match runner calls it with:

    seat  the bot's Seat (gtbots/env.py): which match and which end it is on.
          Most bots ignore it. The Nash bot calls seat.lookahead(...) on it.
    obs   the bot's own observation, 198 floats, already from its point of
          view (it always attacks to the right). Read it with env.Fields.

and it returns one action, 0..11 (env.encode builds one).

    class AlwaysForward:
        name = "forward"
        def act(self, seat, obs):
            return encode(FORWARD, 0, 0)
"""
from __future__ import annotations

from typing import Protocol

import numpy as np

from gtbots.env import Seat


class Bot(Protocol):
    name: str  # shown in tournament tables and file names

    def act(self, seat: Seat, obs: np.ndarray) -> int: ...
