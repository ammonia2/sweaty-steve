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

| Date | Person | What | Pull request or commits |
|---|---|---|---|
| 2026-11-17 | Shahmeer | `solvers/lp.py`: zero-sum matrix game solved by linear programming (scipy `linprog`), both players' mixes and the value; adds the scipy dependency | committed to `main`: f3e1e9d, 91107c1, 733fbe1 |
| 2026-11-17 | Shahmeer | `solvers/regret_matching.py`: regret matching with the average strategy as the equilibrium, deterministic updates | committed to `main`: 2499a36 |
| 2026-11-17 | Shahmeer | `tests/test_solvers.py`: checks for both solvers | committed to `main`: 73e5f4d |
| 2026-11-18 | Ali | `replicator.py`: replicator dynamics for N types (euler and discrete rules) with share plot, plus tests | https://github.com/ammonia2/sweaty-steve/pull/1 |
| 2026-11-18 | Ali | `tournament.py`: round-robin between bots (both ends, parallel workers, seeded) -> mean goal-difference payoff matrix and CSV output, plus tests | https://github.com/ammonia2/sweaty-steve/pull/2 |
| 2026-11-22 | Saim | `bots/ppo.py`: exported actor loader, argmax and softmax probabilities, plus tests | branch `saim/ppo-bot`, merged in d59dfc0 |
| 2026-11-22 | Saim | `bots/scripted.py`: baseline port, rusher and camper; optional `observe(opponent_action)` hook in `bots/base.py` | branch `saim/ppo-bot`, merged in d59dfc0 |
| 2026-11-22 | Saim | `arena.py`: first-to-7 match runner with one seed/match, alternating ends, replays, per-match Nash logs and CSV results, plus tests | branch `saim/ppo-bot`, merged in d59dfc0 |
| 2026-11-22 | Saim | heuristic player terms and tuning experiment; repeated-games report section | branch `saim/ppo-bot`, merged in d59dfc0 |
| 2026-11-24 | Hasaan | `bots/bayesian.py`: belief over opponent types (PPO, rusher, camper), Bayes' update with smoothing and a belief floor, best reply `argmax(M @ q)` on the Nash bot's payoff matrix and commitment, per-plan log; `mirror()` builds the opponent's view (checked against the server's) | branch `hasaan/bayesian-bot`: ea20475, 627489b, 9fa24e3, 20fda8e, d2c5159 |
| 2026-11-24 | Hasaan | `tests/test_bayesian.py`, `tests/test_bayesian_convergence.py`: unit checks, and the belief converging to the true type against PPO, rusher and camper from both ends | branch `hasaan/bayesian-bot`: c5e00ea and the commits above |
