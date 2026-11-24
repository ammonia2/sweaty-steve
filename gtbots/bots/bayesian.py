"""Best-responds to a belief over opponent types.

The game has imperfect information: the bot does not know which kind of
opponent it faces (PPO, Rusher or Camper), only the moves it makes. So it

  1. keeps a belief: one probability per type, starting from a prior,
  2. after each opponent move, updates it with Bayes' rule,
         belief[t] <- belief[t] * P(move | t)   then normalise,
  3. predicts the opponent's next move as the belief-weighted mix of what
     each type would do,  q = sum_t belief[t] * P(. | t),
  4. plays the action that does best against that mix, argmax(M @ q).

The types decide from THEIR OWN view, so the bot first turns its view around
into the opponent's (`mirror`). The rest is small pure functions (no game needed).
"""
from __future__ import annotations

import numpy as np

from gtbots.bots.ppo import PpoBot
from gtbots.bots.scripted import Camper, Rusher
from gtbots.env import NUM_ACTIONS

# Opponent types the belief is over, in this order everywhere.
TYPES = ("ppo", "rusher", "camper")

# ---------------------------------------------------------------------------
# The opponent's view
# ---------------------------------------------------------------------------

# Fields inside the slots the layout gives no names for, in the order the game
# server writes them (writeObservation in game/envserver.cjs). Only the ones
# that change under a mirror are listed.
STREAKER_X, STREAKER_VX = 1, 3  # [present, x, y, vx]
DROP_X = 1                      # [present, x, y, kind one-hot..., armed, blinking]
BOMB_X = 1                      # [present, x, y, fall speed]
PROP_PRESENT, PROP_X, PROP_Y, PROP_SIN = 0, 2, 3, 7  # [present, circle, x, y, half w, half h, cos, sin]


def mirror(obs: np.ndarray, layout: dict) -> np.ndarray:
    """The same moment seen from the other player's side.

    Every view has its player attacking to the right, so turning it around:
      - x positions, x speeds and spins change sign; y values stay,
      - my block and the foe's block swap (so do my goal and theirs),
      - flags about "me" flip: who touched the ball last, which side I'm on,
      - the score: the difference changes sign, the two "needed" swap,
      - pitch props are re-sorted by (x, y), as the server sorts them.
    Exact: tests/test_bayesian.py checks it against the server's own views.
    Works on [198] or [..., 198].
    """
    obs = np.asarray(obs)
    if obs.ndim > 1:
        return np.stack([mirror(o, layout) for o in obs.reshape(-1, obs.shape[-1])]).reshape(obs.shape)

    sec, lengths = layout["sections"], layout["lengths"]
    player, ball, match = layout["player"], layout["ball"], layout["match"]
    out = obs.copy()

    # Players: swap the two blocks, then flip the x-like fields of each.
    n = lengths["player"]
    me, foe = sec["me"], sec["foe"]
    out[me:me + n], out[foe:foe + n] = obs[foe:foe + n], obs[me:me + n]
    for start in (me, foe):
        for name in ("x", "vx", "legDx", "legSpin"):
            out[start + player[name]] *= -1

    # Ball.
    b = sec["ball"]
    for name in ("x", "vx", "spin"):
        out[b + ball[name]] *= -1
    out[b + ball["mineLast"]] = 1 - obs[b + ball["mineLast"]]

    # Goal sizes: [my goal one-hot, their goal one-hot] -> swap the halves.
    g, half = sec["goals"], (sec["streaker"] - sec["goals"]) // 2
    out[g:g + half], out[g + half:g + 2 * half] = obs[g + half:g + 2 * half], obs[g:g + half]

    # Streaker (zeros when there is none, and -0 == 0).
    s = sec["streaker"]
    out[s + STREAKER_X] *= -1
    out[s + STREAKER_VX] *= -1

    # Power-up drops and bombs: only x flips; their slot order doesn't depend on the side.
    for name, field in (("drops", DROP_X), ("bombs", BOMB_X)):
        size = lengths[name[:-1]]
        for slot in range(sec[name], _end(sec, name), size):
            out[slot + field] *= -1

    # Props: flip x and the rotation's sin, then re-sort the present ones by (x, y).
    size, p0 = lengths["prop"], sec["props"]
    slots = out[p0:_end(sec, "props")].reshape(-1, size)  # a view into `out`
    slots[:, PROP_X] *= -1
    slots[:, PROP_SIN] *= -1
    present = slots[slots[:, PROP_PRESENT] > 0]
    order = np.lexsort((present[:, PROP_Y], present[:, PROP_X]))
    slots[: len(present)] = present[order]

    # Match.
    m = sec["match"]
    out[m + match["scoreDiff"]] *= -1
    out[m + match["myNeeded"]], out[m + match["theirNeeded"]] = (
        obs[m + match["theirNeeded"]], obs[m + match["myNeeded"]])
    out[m + match["side"]] = 1 - obs[m + match["side"]]
    return out


def _end(sec: dict, name: str) -> int:
    """Where section `name` ends: where the next section starts."""
    starts = sorted(sec.values())
    return starts[starts.index(sec[name]) + 1]


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


class OpponentTypes:
    """What each opponent type would do from a given view: P(. | type, view).

    The view must be the OPPONENT's (see `mirror`): each type decides from its
    own side, attacking to the right.
    """

    def __init__(self, layout: dict, eps: float = 0.05, ppo: PpoBot | None = None):
        """
        layout: env.layout, for the scripted types to read the view by name
        eps:    smoothing for the scripted types (see scripted_likelihood)
        ppo:    the PPO actor to model; the default actor (stage2) if None
        """
        self.eps = eps
        self.ppo = ppo if ppo is not None else PpoBot()
        self.rusher = Rusher(layout)
        self.camper = Camper(layout)

    def probs(self, view: np.ndarray) -> np.ndarray:
        """[types, 12]: row t is P(. | type t), rows in the order of TYPES."""
        # The scripted bots never use their seat, so None is fine.
        return np.stack([
            self.ppo.probabilities(view).astype(np.float64),
            scripted_likelihood(self.rusher.act(None, view), self.eps),
            scripted_likelihood(self.camper.act(None, view), self.eps),
        ])


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
