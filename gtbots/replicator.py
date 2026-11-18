"""Replicator dynamics over a payoff matrix.

Types are the bots of the round-robin; ``A[i, j]`` is the mean payoff (goal
difference) of type ``i`` against type ``j`` (see ``gtbots.tournament``).
With population shares ``x`` the fitness of type ``i`` is ``f_i = (A x)_i``
and the mean fitness is ``f_bar = x . f``.

Two update rules are offered:

* ``"euler"``: ``x_i += dt * x_i * (f_i - f_bar)``, the continuous replicator
  equation, integrated with step ``dt``.
* ``"discrete"``: ``x_i <- x_i * (f_i + c) / (f_bar + c)``, the discrete-time
  replicator; the constant ``c`` shifts the payoffs so every fitness is
  positive (goal differences can be negative). Both rules keep the shares on
  the simplex and agree in the limit of small steps.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np


def step(A, x, dt: float = 0.1, rule: str = "euler") -> np.ndarray:
    """One replicator update of the share vector ``x`` under payoffs ``A``."""
    A = np.asarray(A, dtype=float)
    x = np.asarray(x, dtype=float)
    f = A @ x
    f_bar = x @ f
    if rule == "euler":
        new = x + dt * x * (f - f_bar)
    elif rule == "discrete":
        c = max(0.0, 1.0 - A.min())  # makes every shifted payoff >= 1
        new = x * (f + c) / (f_bar + c)
    else:
        raise ValueError(f"unknown rule {rule!r}")
    new = np.clip(new, 0.0, None)
    return new / new.sum()  # absorbs rounding drift


def simulate(A, x0=None, steps: int = 1000, dt: float = 0.1,
             rule: str = "euler") -> np.ndarray:
    """Shares over time: array of shape ``(steps + 1, N)``, row 0 is ``x0``.

    ``x0`` defaults to the uniform population.
    """
    A = np.asarray(A, dtype=float)
    n = A.shape[0]
    if A.shape != (n, n):
        raise ValueError("A must be square")
    x = np.full(n, 1.0 / n) if x0 is None else np.asarray(x0, dtype=float)
    if x.shape != (n,) or (x < 0).any() or not np.isclose(x.sum(), 1.0):
        raise ValueError("x0 must be a share vector (non-negative, sums to 1)")
    traj = np.empty((steps + 1, n))
    traj[0] = x
    for t in range(steps):
        x = step(A, x, dt, rule)
        traj[t + 1] = x
    return traj


def plot(traj, names=None, path=None, dt: float | None = None):
    """Plot shares over time; save to ``path`` if given. Returns the figure."""
    import matplotlib

    if path is not None:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    traj = np.asarray(traj)
    t = np.arange(len(traj)) * (dt if dt is not None else 1)
    names = names or [f"type {i}" for i in range(traj.shape[1])]
    fig, ax = plt.subplots(figsize=(7, 4))
    for i, name in enumerate(names):
        ax.plot(t, traj[:, i], label=name)
    ax.set_xlabel("time" if dt is not None else "step")
    ax.set_ylabel("population share")
    ax.set_ylim(0, 1)
    ax.legend()
    fig.tight_layout()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(path, dpi=150)
    return fig
