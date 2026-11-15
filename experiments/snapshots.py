"""Rebuild the real payoff matrices the report shows.

Three moments from the start of one match (seed 7, simple map, no power-ups).
P1 runs forward, P2 stands still, and a snapshot is taken after 10, 20 and 30
decisions. At each one the 12x12 game is built from P1's side with a 30-tick
`hold` look-ahead, once per scorer.

Writes fixtures/snapshot_<decisions>.npz with:
    heuristic, critic   [12, 12] payoff matrices (rows P1's actions)
    ticks, follow       the look-ahead used
    state               P1 x, P2 x, ball x, ball y, ball vx (P1's view)
    version             the game commit (game/VERSION)

Run from the repository root:  uv run python -m experiments.snapshots
"""
from __future__ import annotations

import numpy as np

from gtbots.env import FORWARD, ROOT, STAND, Fields, GameEnv, Seat, encode
from gtbots.evaluator import payoff_matrix
from gtbots.scoring.critic import CriticScore
from gtbots.scoring.heuristic import HeuristicScore

SEED = 7
SNAPSHOTS = (10, 20, 30)  # decisions into the match
TICKS = 30
FOLLOW = "hold"


def main() -> None:
    version = (ROOT / "game" / "VERSION").read_text().strip()
    with GameEnv(num_envs=1, num_procs=1, seed=SEED, powerUps=False) as env:
        f = Fields(env.layout)
        heuristic, critic = HeuristicScore(env.layout), CriticScore()
        seat = Seat(env, 0, 0)
        moves = np.array([[encode(FORWARD, 0, 0), encode(STAND, 0, 0)]])
        obs = env.reset()
        done = 0
        for n in SNAPSHOTS:
            for _ in range(n - done):
                obs, *_ = env.step(moves)
            done = n
            me = obs[0, 0]
            state = np.array([f.me(me, "x"), f.foe(me, "x"), f.ball(me, "x"), f.ball(me, "y"), f.ball(me, "vx")])
            out = ROOT / "fixtures" / f"snapshot_{n}.npz"
            np.savez(
                out,
                heuristic=payoff_matrix(seat, heuristic, TICKS, FOLLOW),
                critic=payoff_matrix(seat, critic, TICKS, FOLLOW),
                ticks=TICKS,
                follow=FOLLOW,
                state=state,
                version=version,
            )
            print(f"{out.relative_to(ROOT)}  P1 x {state[0]:.2f}  ball ({state[2]:.2f}, {state[3]:.2f})")


if __name__ == "__main__":
    main()
