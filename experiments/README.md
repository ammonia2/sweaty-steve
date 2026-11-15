# Experiments

One script per result in the report. Every script takes its seeds from a
config and writes to `results/`, so any figure can be rebuilt.

## Commitment length: how long the Nash bot holds an action

**Owner:** Ali (runs on the 14-core machine). **Needs first:** `nash.py` with
a `commit` setting (Abdullah) and the match runner (Saim).

### The question

The Nash bot re-plans from a 12x12 game each time it decides. It decides
from a mixed strategy, so if it re-sampled every decision (every 2 ticks) a
50/50 mix of "forward" and "back" would make it shuffle in place: jittery and
obviously a bot. Instead it **commits**: it samples one action and holds it
for `k` ticks before planning again.

Decided values: **k = 6 and k = 15** (30 ticks = 1 second).

| k | Real time | Re-plans per second | Why this value |
|---|---|---|---|
| 6 | 200 ms | 5 | About human reaction time (~250 ms visual; OpenAI Five reacts in ~217 ms) |
| 15 | 500 ms | 2 | Half the 30-tick look-ahead: smoother, cheaper, slower to react |

Not tested: k = 2 (re-sampling every decision, the jitter described above)
and k = 30 (a whole second without reacting; PPO re-decides every 2 ticks
and would punish it).

### What to run

For each k in {6, 15}, and for each scorer (heuristic, critic):

- Nash bot vs `stage1-open` (PPO), Nash on each end for half the matches.
- Nash bot vs the scripted baseline.
- Whole first-to-7 matches. Start with 20 per pairing to check the timing,
  then as many as the machine allows (aim for 100+).
- Look-ahead fixed at 30 ticks, `follow="hold"`, for all runs, so k is the
  only thing that changes.

Record per match: winner, goals each side, match length in ticks, seconds of
compute, and the replay (`replayDir` in the env config).

### What to report

- Win rate and goal share vs k, with 95% confidence intervals
  (the binomial interval over matches).
- Compute per match vs k. The look-ahead runs once per commit, so k = 15
  should cost about 2.5x less than k = 6.
- Watch a few replays of each on the game site (drag the `.json` onto the
  page, see `game/README.md`) and note how each looks. "Less bot-like" is a
  claim the report makes, so it needs someone to have looked.

### Cost estimate

One 30-tick look-ahead is ~0.5 s. At k = 6 that is 5 look-aheads per second
of match, so ~2.5 s of compute per second of play for each Nash bot; at
k = 15, ~1 s. Run one match per core (one env per process, `num_envs ==
num_procs`), not many matches in one process: a process does its envs one at
a time.

### Background (full references in `report/references.bib`)

- **Re-planning often** is the standard in model predictive control: plan
  over a horizon, execute only the start, re-plan (Mayne et al. 2000).
- **Holding an action for several frames** helps learning agents: DQN acts on
  every 4th frame (Mnih et al. 2015); frame skip strongly changes results in
  Atari, larger is sometimes much better (Braylan et al. 2015); the repeat
  length can even be learned (Lakshminarayanan et al. 2017; Sharma et al.
  2017, FiGAR).
- **Executing actions in chunks** gives smoother behaviour and fewer
  compounding errors; ACT executes action chunks and averages overlapping
  ones to avoid jerky motion (Zhao et al. 2023).
- **Human-like timing in game AI:** OpenAI Five acts every 4th frame and
  reacts in ~217 ms, against ~250 ms typical human visual reaction time
  (Berner et al. 2019); AlphaStar's actions were capped at 22 non-duplicate
  actions per 5 seconds, with a ~200 ms delay (Vinyals et al. 2019).
- **Specific to our bot:** with `follow="hold"`, the look-ahead assumes each
  player holds its action. A bot that commits for k ticks makes its own half
  of that assumption true for k ticks.
