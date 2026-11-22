"""The trained PPO actor, loaded from the exported .bin file.

The game repo exports the actor as three layers with tanh between them,
little-endian float32, in this order (see game/README.md):

    W1 [256 x 198], b1 [256], W2 [256 x 256], b2 [256], W3 [12 x 256], b3 [12]

W3 has one output per action, so `logits` are the 12 unnormalised scores the
PPO bot assigns to the actions. `act` takes the argmax (the same deterministic
choice the game server makes in `follow="policy"`). `probabilities` applies a
softmax to the same logits: Hasaan's Bayesian bot uses that distribution as
the likelihood of each action under this opponent type.

The observation is already mirrored into the bot's own view by the runner, so
this bot ignores its seat.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from gtbots.env import NUM_ACTIONS, ROOT

# The repo ships two actors: stage1-open (open pitch) and stage2 (all pitches).
# The experiments use stage2; pass `path=` to load stage1-open instead.
DEFAULT = ROOT / "game" / "policies" / "stage2.bin"
OBS_DIM = 198


class PpoBot:
    """A frozen PPO actor: `act(seat, obs) -> 0..11`, plus its action distribution."""

    def __init__(
        self,
        path: str | Path = DEFAULT,
        obs_dim: int = OBS_DIM,
        num_actions: int = NUM_ACTIONS,
    ):
        path = Path(path)
        w = np.fromfile(path, "<f4")
        # Six blocks: h*obs + h + h*h + h + out*h + out.
        # Solve h^2 + (obs + out + 3) h + (out - len) = 0 for its positive root.
        b = obs_dim + num_actions + 3
        c = num_actions - w.size
        h = int(round((-b + np.sqrt(b * b - 4 * c)) / 2))
        if h < 1:
            raise ValueError(f"{path}: {w.size} floats is too short for a policy")

        o = 0

        def take(*shape):
            nonlocal o
            n = int(np.prod(shape))
            a = w[o : o + n].reshape(shape)
            o += n
            return a

        self.W1, self.b1 = take(h, obs_dim), take(h)
        self.W2, self.b2 = take(h, h), take(h)
        self.W3, self.b3 = take(num_actions, h), take(num_actions)
        if o != w.size:
            raise ValueError(
                f"{path}: {w.size} floats is not a {obs_dim} -> {h} -> {h} -> {num_actions} network"
            )
        self.name = f"ppo-{path.stem}"

    def logits(self, obs: np.ndarray) -> np.ndarray:
        """[..., 198] -> [..., 12] raw actor outputs."""
        x = np.tanh(np.asarray(obs) @ self.W1.T + self.b1)
        x = np.tanh(x @ self.W2.T + self.b2)
        return x @ self.W3.T + self.b3

    def probabilities(self, obs: np.ndarray) -> np.ndarray:
        """[..., 198] -> [..., 12] softmax probabilities over the actions."""
        z = self.logits(obs)
        e = np.exp(z - np.max(z, axis=-1, keepdims=True))
        return e / e.sum(axis=-1, keepdims=True)

    def act(self, seat, obs: np.ndarray) -> int:
        """Poll the policy once: the most likely action, 0..11."""
        return int(np.argmax(self.logits(obs)))
