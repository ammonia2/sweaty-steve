"""Best-responds to a belief over opponent types.

The game has imperfect information: the bot does not know which kind of
opponent it faces (PPO, Rusher or Camper), only the moves it makes. So it

  1. keeps a belief: one probability per type, starting from a prior,
  2. after each opponent move, updates it with Bayes' rule,
         belief[t] <- belief[t] * P(move | t)   then normalise,
  3. predicts the opponent's next move as the belief-weighted mix of what
     each type would do,  q = sum_t belief[t] * P(. | t),
  4. plays the action that does best against that mix, argmax(M @ q).

This module holds the maths as small pure functions (no game needed).
"""
from __future__ import annotations

import numpy as np

from gtbots.env import NUM_ACTIONS

# Opponent types the belief is over, in this order everywhere.
TYPES = ("ppo", "rusher", "camper")


def uniform_prior(n: int = len(TYPES)) -> np.ndarray:
    """1/n on each type."""
    return np.full(n, 1.0 / n)


def scripted_likelihood(action: int, eps: float = 0.05) -> np.ndarray:
    """P(. | a scripted type that would play `action`), over the 12 actions.

    A scripted bot is deterministic, but a belief of exactly 0 can never come
    back, so one surprise move would rule the type out forever. Smoothing:
    1 - eps on its action, eps spread evenly over the other 11.
    """
    if not 0.0 < eps < 1.0:
        raise ValueError(f"eps must be in (0, 1), got {eps}")
    p = np.full(NUM_ACTIONS, eps / (NUM_ACTIONS - 1))
    p[action] = 1.0 - eps
    return p


def update_belief(belief: np.ndarray, likelihoods: np.ndarray) -> np.ndarray:
    """Bayes' rule: posterior[t] proportional to belief[t] * likelihoods[t].

    likelihoods[t] = P(the move the opponent actually made | type t).
    """
    post = np.asarray(belief, dtype=np.float64) * np.asarray(likelihoods, dtype=np.float64)
    total = post.sum()
    if not total > 0:
        raise ValueError(f"every type gives the move probability 0: {likelihoods}")
    return post / total


def predict(belief: np.ndarray, type_probs: np.ndarray) -> np.ndarray:
    """q: the opponent's predicted mix over the 12 actions.

    type_probs[t] = P(. | type t), shape [types, 12]. q = belief @ type_probs.
    """
    q = np.asarray(belief, dtype=np.float64) @ np.asarray(type_probs, dtype=np.float64)
    return q / q.sum()


def best_response(M: np.ndarray, q: np.ndarray) -> tuple[int, np.ndarray]:
    """My best action against mix q, and the expected payoff of every action.

    M: [12, 12], rows mine, columns theirs. Expected payoff of row i is
    (M @ q)[i]. Ties go to the lowest action number (np.argmax).
    """
    expected = np.asarray(M, dtype=np.float64) @ np.asarray(q, dtype=np.float64)
    return int(np.argmax(expected)), expected
