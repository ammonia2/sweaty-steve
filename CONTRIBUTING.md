# Contributing

## Rules

- One branch per task: `<name>/<task>`, for example `sara/lp-solver`.
- Merge to `main` by pull request with one reviewer. No direct pushes to `main`.
- Update the contributions log below in the same pull request as the work.
- Every experiment takes its seeds from a config, and writes its output to
  `results/`, so any figure in the report can be reproduced.
- `game/` is replaced only by the game owners. `game/VERSION` holds the game
  commit the bundle was built from.

## Ownership

Each person owns code and the report section that goes with it.

| Person | Code | Report section |
|---|---|---|
| TBD (game owner) | `gtbots/evaluator.py`, `gtbots/bots/nash.py`, `gtbots/scoring/`, `game/` | Problem statement, design, lookahead |
| TBD (game owner) | `gtbots/env.py`, `gtbots/bots/ppo.py`, `gtbots/bots/scripted.py`, match runner | Repeated games |
| TBD | `gtbots/solvers/` | Normal form, one snapshot solved by hand |
| TBD | `gtbots/bots/bayesian.py` | Bayesian payoffs and equilibrium check |
| TBD | `gtbots/tournament.py`, `gtbots/replicator.py`, results screen | Evolutionary; information sets, recall, mixed vs behavioral |

## Interfaces (draft, to be fixed before work starts)

- A bot: `act(state, obs) -> action`, with `action` an integer 0..11.
- The evaluator: `payoff_matrix(state) -> 12x12 array`, entry `[i, j]` is the
  score for player 1 when player 1 plays `i` and player 2 plays `j`.
  Zero-sum: player 2's score is the negative.

## Contributions log

| Date | Person | What | Pull request |
|---|---|---|---|
