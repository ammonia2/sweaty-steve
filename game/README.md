# game/

The game the bots play, as built files. Nothing here is written by the group:
it is rebuilt from the game's own (private) repository by the game owners and
copied in. Do not edit these files by hand.

| File | What it is |
|---|---|
| `envserver.cjs` | The game simulation as one Node script. `gtbots/env.py` starts it and talks to it. |
| `VERSION` | The game commit `envserver.cjs` was built from. |
| `policies/` | Trained PPO weights. |

None of these are in yet.

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
