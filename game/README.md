# game/

The game the bots play, as built files. Nothing here is written by the group:
it is rebuilt from the game's own (private) repository by the game owners and
copied in (`npm run gt:bundle -- <path to this folder>` there). Do not edit
these files by hand.

| File | What it is |
|---|---|
| `envserver.cjs` | The game simulation as one Node script. `gtbots/env.py` starts it and talks to it. |
| `VERSION` | The game commit `envserver.cjs` was built from. |
| `policies/stage1-open.bin` | The trained PPO bot's actor (picks actions). |
| `policies/stage1-open.critic.bin` | The same run's critic (rates a position), for scoring payoff cells. |

## The server

Start it with Node and a JSON config as its one argument, for example
`node game/envserver.cjs '{"numEnvs": 4, "seed": 1, "policy": "game/policies/stage1-open.bin"}'`.
It prints one JSON line describing itself (protocol 2, observation size,
actions, the observation layout), then talks binary over stdin/stdout. The
full byte layout is in the comment at the top of `envserver.cjs`.

| Request | What it does |
|---|---|
| `R` | Start a fresh match in every env. |
| `S` + both players' actions for every env | Play one decision (2 ticks). |
| `E` + env, ticks, follow | The Nash bot's 12x12 game: every action pair played forward from that env's current state. The env is left exactly as it was. |
| `Q` | Quit. |

`E` in detail:

- Cells are `[p1_action, p2_action]`. Each action is that player's own
  (0..11, `move * 4 + jump * 2 + kick`, move 0 none / 1 back / 2 forward), so
  P2's "forward" is towards the left.
- `ticks` is how far ahead each cell looks (30 ticks = 1 second). The pair is
  pressed for the first decision (2 ticks); after that `follow` decides:
  0 `hold` keeps pressing it, 1 `idle` presses nothing, 2 `policy` lets both
  players take the PPO actor's most likely action (needs `policy` in the
  config).
- The reply is, per cell: both players' observations where it ended, the ticks
  it ran, and who scored (+1 P1, -1 P2, 0 nobody). A goal ends that cell early.
- Scoring a cell is our job (`gtbots/scoring/`).

Both policy files are three layers with tanh between them, little-endian
float32 in this order: W1 [256 x 198], b1, W2 [256 x 256], b2, W3 [out x 256],
b3. `out` is 12 for the actor (logits) and 1 for the critic (value). Reading
one is `numpy.fromfile(path, "<f4")` and slicing in that order.

Rough cost of one `E` (one decision): about 0.2 s at 10 ticks and 0.65 to 0.9 s
at 30 ticks. Run matches in parallel processes.

## Watching a match

Every match the runner plays is saved as a replay: a small `.json` file with
the seed and both players' buttons on every tick. The game is deterministic,
so that is the whole match.

1. Open the game: <https://ammonia2.github.io/football-bangers>
2. Drag the replay `.json` from your file manager onto the page.

The match plays back with the real graphics and sound. Refreshing the page
plays it again.

A replay only plays back correctly on the game version that recorded it. At
the end of the match the browser console (F12) says `replay reproduced
exactly` or `replay DID NOT reproduce`. If it did not, the site and `VERSION`
are from different game commits: tell a game owner.
