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

A bot may also implement `observe(opponent_action)`. The match runner calls it
before each `act` when the method is present, with the action the opponent
played on the previous decision (an int 0..11, or `None` before the first).
This is how a history-dependent bot (Hasaan's Bayesian bot) learns about its
opponent without changing the basic `act` interface.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np

from gtbots.env import Seat


@runtime_checkable
class Bot(Protocol):
    name: str  # shown in tournament tables and file names

    def act(self, seat: Seat, obs: np.ndarray) -> int: ...


@runtime_checkable
class ObservesOpponent(Protocol):
    """Optional extension: a bot that uses the opponent's previous action."""

    def observe(self, opponent_action: int | None) -> None: ...
