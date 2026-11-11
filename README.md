# sweaty-steve

Game Theory semester project: a **Nash bot** against a trained PPO bot in a 1v1
football game, plus a Bayesian bot, a round-robin tournament and replicator
dynamics over the results.

At every decision the Nash bot builds a 12×12 zero-sum game from the current
match state (every pair of actions played forward and scored), solves it for
the mixed equilibrium and samples its action from that mix.

**Status:** skeleton only. Nothing is implemented yet.

## Layout

```
game/                the built game server (envserver.cjs), VERSION, policies/
gtbots/              the Python package
  env.py             wrapper over the game server
  evaluator.py       match state -> 12x12 payoff matrix
  scoring/           heuristic.py, critic.py
  solvers/           lp.py, regret_matching.py
  bots/              base.py, nash.py, bayesian.py, ppo.py, scripted.py
  tournament.py      round-robin -> payoff matrix
  replicator.py      population shares over time
fixtures/            saved real payoff matrices and states, for work without the game
experiments/         one script per result in the report
results/             experiment outputs (CSV) and figures/
tests/
report/sections/     one file per course topic, with the hand calculations
```

## Setup

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Running matches also needs Node and `game/envserver.cjs`. Solver, Bayesian and
replicator work can start from `fixtures/` without either.

See `CONTRIBUTING.md` for who owns what and how to submit work.
