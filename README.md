# sweaty-steve

Game Theory semester project: a **Nash bot** against a trained PPO bot in a 1v1
football game, plus a Bayesian bot, a round-robin tournament and replicator
dynamics over the results.

At every decision the Nash bot builds a 12×12 zero-sum game from the current
match state (every pair of actions played forward and scored), solves it for
the mixed equilibrium and samples its action from that mix.

**Status:** the game is in (`game/`: the env server, with the 144-cell look-ahead the Nash bot needs, and the PPO actor and critic). The Python package is still a skeleton.

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

## Game server

The game server is **not an HTTP server**, so requests are not sent with a
browser or `curl`. It reads binary commands from standard input and writes
binary responses to standard output.

Start it from the repository root with:

```bash
node game/envserver.cjs '{"numEnvs":1,"seed":1}'
```

The server first prints a JSON description of its protocol, observation size
and available actions. It then accepts these single-byte commands:

| Request | Meaning |
|---|---|
| `R` | Reset and start a new match |
| `S` + action bytes | Play one turn |
| `E` + binary data | Evaluate action pairs |
| `Q` | Quit |

For one environment, an `S` request contains one action byte for each player.
For example, `S 0 0` means both players choose action `0`; valid actions are
`0` through `11`.

These requests must be sent as bytes by a client program rather than typed
into the terminal. This small Node.js example starts the server, resets it,
plays one turn, and quits:

```js
const { spawn } = require("node:child_process");

const server = spawn("node", [
  "game/envserver.cjs",
  JSON.stringify({ numEnvs: 1, seed: 1 })
]);

server.stdout.on("data", (data) => {
  console.log("Received", data.length, "bytes");
});

server.stderr.on("data", (data) => {
  console.error(data.toString());
});

setTimeout(() => {
  server.stdin.write(Buffer.from([0x52]));       // R: reset
  server.stdin.write(Buffer.from([0x53, 0, 0])); // S: both choose action 0
  server.stdin.write(Buffer.from([0x51]));       // Q: quit
}, 100);
```

The Python wrapper is intended to automate this communication in `gtbots/env.py`.

## Setup

The Python side is managed with [uv](https://docs.astral.sh/uv/). It installs
the right Python (3.12, from `.python-version`) and the exact package versions
in `uv.lock`, so everyone runs the same thing.

1. Install uv, once per machine:

   ```bash
   # Linux / macOS
   curl -LsSf https://astral.sh/uv/install.sh | sh
   # Windows (PowerShell)
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

2. From the repository root, create `.venv/` and install everything:

   ```bash
   uv sync
   ```

3. Run things through uv; it uses `.venv/` without activating anything:

   ```bash
   uv run python experiments/some_script.py
   uv run pytest
   ```

   Or activate it yourself: `source .venv/bin/activate` (Linux / macOS),
   `.venv\Scripts\activate` (Windows).

Adding a package: `uv add scipy` (or `uv add --dev <name>` for tools only
used in development). It updates `pyproject.toml` and `uv.lock`; commit both
in the same pull request as the code that needs it. Don't `pip install` into
`.venv/`, since `uv sync` removes anything not in the lock file.

Running matches also needs [Node](https://nodejs.org/) for `game/envserver.cjs`
(tested on Node 26; if an older one fails, update Node first). Check that the game starts:

```bash
uv run python -c "from gtbots.env import GameEnv; GameEnv(num_envs=1, num_procs=1).close(); print('ok')"
```

Solver, Bayesian and replicator work can start from `fixtures/` without Node.

See `CONTRIBUTING.md` for who owns what and how to submit work.
