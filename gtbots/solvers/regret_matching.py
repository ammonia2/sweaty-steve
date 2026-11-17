"""Mixed equilibrium of a zero-sum matrix game, by regret matching.

The same answer as lp.py, found a different way: instead of solving for the
equilibrium in one go, both players play the game against each other many
times and learn.

Each round t, each player:

  1. plays a mix: each action in proportion to its positive regret
     (uniform when no action has any),
  2. sees what every one of its actions would have earned against the
     opponent's mix this round,
  3. adds to each action's regret: (what that action would have earned)
     - (what my mix actually earned).

Regret = "how much better I'd have done by always playing this action".
In a two-player zero-sum game, the **average** of the mixes played over the
rounds converges to a Nash equilibrium (Hart & Mas-Colell 2000): the
exploitability (how much a best response gains against it) falls like
1/sqrt(T). The mix of the last round alone does not converge; it can cycle.

Updates are deterministic (expected payoffs, no sampling), so the same M
always gives the same answer.

The early rounds, before the regrets point anywhere, put a little weight on
every action. That leftover shrinks with T but never reaches 0 (~0.0003 at
the defaults); nash.py ignores moves under 1% when it counts support.
"""
from __future__ import annotations

import numpy as np

ITERATIONS = 2000


def _mix(regret: np.ndarray) -> np.ndarray:
    """Play each action in proportion to its positive regret."""
    pos = np.maximum(regret, 0.0)
    total = pos.sum()
    return pos / total if total > 0 else np.full(len(regret), 1.0 / len(regret))


def regret_matching(M: np.ndarray, iterations: int = ITERATIONS) -> tuple[np.ndarray, np.ndarray, float]:
    """(my_mix, their_mix, value) of the zero-sum game M, from the row player's side.

    Same contract as lp.lp. value is what the average mixes earn against each
    other, so it is within the exploitability of the true game value.
    """
    M = np.asarray(M, dtype=np.float64)
    if M.ndim != 2 or M.size == 0:
        raise ValueError(f"expected a non-empty 2-D payoff matrix, got shape {M.shape}")
    if iterations < 1:
        raise ValueError("iterations must be at least 1")
    m, n = M.shape
    regret_x, regret_y = np.zeros(m), np.zeros(n)
    sum_x, sum_y = np.zeros(m), np.zeros(n)
    for _ in range(iterations):
        x, y = _mix(regret_x), _mix(regret_y)
        sum_x += x
        sum_y += y
        # What each of my rows earns against their mix, and each of their
        # columns against mine (they receive -M).
        row_payoff = M @ y
        col_payoff = -(x @ M)
        # Both update at once, from the same round's mixes.
        regret_x += row_payoff - x @ row_payoff
        regret_y += col_payoff - y @ col_payoff
    x_bar, y_bar = sum_x / iterations, sum_y / iterations
    return x_bar, y_bar, float(x_bar @ M @ y_bar)


def exploitability(M: np.ndarray, x: np.ndarray, y: np.ndarray) -> float:
    """How far (x, y) is from an equilibrium of M; 0 exactly at one.

    max_i (M y)[i]  - what my best row earns against their mix
    min_j (x M)[j]  - what their best column holds my mix to
    The difference is what the two best responses gain together. It is >= 0,
    and 0 only when neither side can do better by switching alone.
    """
    M = np.asarray(M, dtype=np.float64)
    return float((M @ y).max() - (x @ M).min())
