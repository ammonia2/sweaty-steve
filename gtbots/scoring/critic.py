"""Position score from the PPO critic.

The critic is the half of the PPO network that learned to answer "how good is
this position for me?". It was trained on +1 per goal scored and -1 per goal
conceded, discounted by 0.995 per decision, so its answer is roughly "who
scores next, and how soon": near +1 means I'm about to score, near -1 they are.

The file is three layers with tanh between them, little-endian float32, in
this order (see game/README.md):

    W1 [256 x 198], b1 [256], W2 [256 x 256], b2 [256], W3 [1 x 256], b3 [1]
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from gtbots.env import ROOT

DEFAULT = ROOT / "game" / "policies" / "stage1-open.critic.bin"


class CriticScore:
    """score(mine, theirs) -> how good the position is for me, about -1..1.

    mine, theirs: [..., 198], the same moment seen from my side and from theirs.

    The critic is asked from both sides and the answers combined as
    (V(mine) - V(theirs)) / 2. A learned network is not exactly zero-sum on its
    own (it can think a position is good for both players), and this makes it
    so: swapping the two views exactly negates the score.
    """

    def __init__(self, path: str | Path = DEFAULT, obs_dim: int = 198):
        w = np.fromfile(path, "<f4")
        # The hidden size follows from the file length:
        # h*obs + h + h*h + h + h + 1 = len, so h^2 + (obs + 3) h + 1 - len = 0.
        b = obs_dim + 3
        h = int(round((-b + np.sqrt(b * b - 4 * (1 - w.size))) / 2))
        o = 0

        def take(*shape):
            # Cut the next block off the flat array (same idea as `take` in env.py).
            nonlocal o
            n = int(np.prod(shape))
            a = w[o : o + n].reshape(shape)
            o += n
            return a

        self.W1, self.b1 = take(h, obs_dim), take(h)
        self.W2, self.b2 = take(h, h), take(h)
        self.W3, self.b3 = take(1, h), take(1)
        if o != w.size:
            raise ValueError(f"{path}: {w.size} floats is not a {obs_dim} -> h -> h -> 1 network")

    def value(self, obs: np.ndarray) -> np.ndarray:
        """The raw critic: [..., 198] -> [...]."""
        x = np.tanh(obs @ self.W1.T + self.b1)
        x = np.tanh(x @ self.W2.T + self.b2)
        return (x @ self.W3.T + self.b3)[..., 0]

    def __call__(self, mine: np.ndarray, theirs: np.ndarray) -> np.ndarray:
        return (self.value(mine) - self.value(theirs)) / 2
