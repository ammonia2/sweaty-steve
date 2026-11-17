"""Mixed equilibrium of a zero-sum matrix game, by linear programming.

The game: M is [m, n], rows are my actions, columns the opponent's, and
M[i, j] is what I get (the opponent gets -M[i, j]).

My side (the row player) picks a mix x over the rows. Whatever column j the
opponent answers with, I get on average (x^T M)[j]. A careful opponent picks
the column that is worst for me, so I want the x whose worst column is as
good as possible:

    maximise   v
    subject to sum_i x[i] * M[i, j] >= v     for every column j
               sum_i x[i] = 1
               x[i] >= 0

v is the value of the game: the most I can guarantee, whatever they do.

The opponent's mix y comes from the same LP with the roles swapped (they are
the row player of -M^T). By the minimax theorem (von Neumann) both LPs give
the same value, up to the solver's tolerance, and (x, y) is a Nash
equilibrium: neither side gains by changing their mix alone.

scipy's linprog minimises and wants "<=" rows, so the LP above is written as

    minimise   -v
    subject to v - sum_i x[i] * M[i, j] <= 0  for every column j
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import linprog


def _maximin(M: np.ndarray) -> tuple[np.ndarray, float]:
    """The row player's safest mix of M and what it guarantees."""
    m, n = M.shape
    # Variables: x[0..m-1], then v.
    c = np.zeros(m + 1)
    c[-1] = -1.0  # minimise -v = maximise v
    # One row per opponent column j:  -M[:, j] . x + v <= 0
    A_ub = np.hstack([-M.T, np.ones((n, 1))])
    b_ub = np.zeros(n)
    # The mix sums to 1 (v takes no part).
    A_eq = np.append(np.ones(m), 0.0)[None, :]
    b_eq = np.array([1.0])
    # x >= 0; v can be anything (the game's payoffs can be negative).
    bounds = [(0, None)] * m + [(None, None)]
    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method="highs")
    if not res.success:
        raise RuntimeError(f"LP failed: {res.message}")
    x = np.clip(res.x[:m], 0.0, None)  # HiGHS can return -1e-17
    return x / x.sum(), float(res.x[-1])


def lp(M: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """(my_mix, their_mix, value) of the zero-sum game M, from the row player's side.

    my_mix [m]     how often I should play each row
    their_mix [n]  how often the opponent should play each column
    value          what I get when both play these mixes (the game's value)
    """
    M = np.asarray(M, dtype=np.float64)
    if M.ndim != 2 or M.size == 0:
        raise ValueError(f"expected a non-empty 2-D payoff matrix, got shape {M.shape}")
    x, v = _maximin(M)
    # The opponent's problem is the same one, seen from their side: they
    # are the rows of -M^T, and their value is -v.
    y, _ = _maximin(-M.T)
    return x, y, v
