# Contributing

## Rules

- One branch per task: `<name>/<task>`, for example `saim/lp-solver`.
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
| Abdullah (game owner) | `gtbots/env.py`, `gtbots/evaluator.py`, `gtbots/bots/nash.py`, `gtbots/scoring/`, `game/` | Problem statement, design, lookahead |
| Saim (game owner) | `gtbots/bots/ppo.py`, `gtbots/bots/scripted.py`, match runner | Repeated games |
| Shahmeer | `gtbots/solvers/` | Normal form, one snapshot solved by hand |
| Hasaan | `gtbots/bots/bayesian.py` | Bayesian payoffs and equilibrium check |
| Ali | `gtbots/tournament.py`, `gtbots/replicator.py`, results screen; runs the tournaments (14-core machine), including the commitment-length experiment in `experiments/README.md` | Evolutionary; information sets, recall, mixed vs behavioral |

## Interfaces

- A bot (`gtbots/bots/base.py`): `act(seat, obs) -> action`, with `action` an
  integer 0..11 (`env.encode(move, jump, kick)`). `obs` is the bot's own
  198-float view; `seat` (`env.Seat`) is its match and end, which only the
  Nash bot needs (`seat.lookahead(ticks, follow)`).
- The evaluator (`gtbots/evaluator.py`): `payoff_matrix(seat, score, ticks, follow) -> 12x12 array`,
  with `score` from `gtbots/scoring/` (`HeuristicScore` or `CriticScore`), entry `[i, j]` is the
  score for **the deciding player** when they play `i` and the opponent plays
  `j`. Zero-sum: the opponent's score is the negative. `seat.lookahead`
  already returns everything in that orientation, so no bot has to care
  which end it is on.
- Reading an observation: `env.Fields(env.layout)`, e.g. `f.ball(obs, "x")`.
  Never hard-code an index.

## Contributions log

| Date | Person | What | Pull request |
|---|---|---|---|
