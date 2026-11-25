"""Commitment length: how long the Nash bot holds an action (experiments/README.md).

For each hold length (ticks) and scorer, the Nash bot plays whole first-to-7
matches against each opponent (PPO stage2 and the scripted baseline), on each
end for half of the matches. Look-ahead (30 ticks) and follow ("hold") are the
same everywhere, so the hold length is the only thing that changes.

Everything comes from a JSON config (default experiments/commitment.json),
seed included, so any number in the report can be rebuilt:

    uv run python -m experiments.commitment [--config FILE] [--matches N] [--out DIR]

Writes to `<out>/`:
    summary.csv                              one row per (hold, scorer, opponent)
    commit<ticks>t_<scorer>_matrix.csv       the run's payoff matrix
    commit<ticks>t_<scorer>_matches.csv      one row per match
    replays/<run>/                           replay .json files (drag onto the game site)

Statistics: win rate and goal share with 95% Wilson (binomial) intervals;
compute is the Nash bot's seconds per match. A match cut off by the env's time
limit keeps the score counted so far (a level score is a draw, otherwise the
leader wins) and is counted in `cut_off`, since it is not a finished match.
The goal-share interval treats each goal as a trial, so it is approximate.
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

from experiments.common import commit_for, load_config, make_entry, out_dir, wilson
from gtbots import tournament

HERE = Path(__file__).parent


def summarise(matches, nash: int, opp: int) -> dict:
    """Nash's results against one opponent from tournament match records."""
    wins = draws = cut_off = goals_n = goals_o = n = 0
    secs = ticks = 0.0
    for m in matches:
        if {m["i"], m["j"]} != {nash, opp}:
            continue
        side = "i" if m["i"] == nash else "j"
        gn, go = m[f"goals_{side}"], m[f"goals_{'j' if side == 'i' else 'i'}"]
        n += 1
        wins += gn > go
        draws += gn == go
        cut_off += m["ended_by"] == "time"
        goals_n += gn
        goals_o += go
        secs += m[f"seconds_{side}"]
        ticks += m["ticks"]
    wr = wilson(wins, n)
    gs = wilson(goals_n, goals_n + goals_o)
    nan = float("nan")
    return {
        "matches": n, "wins": wins, "draws": draws, "losses": n - wins - draws, "cut_off": cut_off,
        "win_rate": wr[0], "win_lo": wr[1], "win_hi": wr[2],
        "goals_for": goals_n, "goals_against": goals_o,
        "goal_share": gs[0], "share_lo": gs[1], "share_hi": gs[2],
        "mean_match_ticks": ticks / n if n else nan,
        "mean_compute_s": secs / n if n else nan,
    }


def run(cfg: dict, out: str | Path | None = None, entry=make_entry) -> list[dict]:
    """Run every (hold, scorer) combination; returns the summary rows.

    `entry(spec, cfg)` builds a bot from its spec; tests replace it.
    """
    out = out_dir(cfg, out)
    rows = []
    for ticks in cfg["hold_ticks"]:
        for scorer in cfg["scorers"]:
            specs = [f"nash:{scorer}:{ticks}"] + list(cfg["opponents"])
            entries = [entry(s, cfg) for s in specs]
            tag = f"commit{ticks}t_{scorer}"
            names, A, matches = tournament.round_robin(
                entries,
                matches_per_pair=cfg["matches_per_pair"],
                seed=cfg["seed"],
                workers=cfg["workers"],
                target=cfg["target"],
                max_decisions=cfg["max_decisions"],
                env_config={"replayDir": str(out / "replays" / tag)},
                pairs=[(0, k) for k in range(1, len(entries))],
            )
            tournament.save(names, A, matches, out, tag)
            for k, opp in enumerate(cfg["opponents"], start=1):
                rows.append({"hold_ticks": ticks, "commit": commit_for(ticks), "scorer": scorer,
                             "opponent": opp, **summarise(matches, 0, k)})
            print(f"done {tag}", flush=True)
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "summary.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        for r in rows:
            w.writerow({k: (f"{v:.4f}" if isinstance(v, float) else v) for k, v in r.items()})
    return rows


def main() -> None:
    ap = argparse.ArgumentParser(description="Commitment-length experiment")
    ap.add_argument("--config", default=str(HERE / "commitment.json"))
    ap.add_argument("--matches", type=int, help="override matches_per_pair (e.g. 20 for the timing check)")
    ap.add_argument("--out", help="override the output directory")
    ap.add_argument("--workers", type=int, help="override workers")
    a = ap.parse_args()
    cfg = load_config(a.config, matches_per_pair=a.matches, workers=a.workers)
    for r in run(cfg, out=a.out):
        print(f"hold {r['hold_ticks']:>2}t {r['scorer']:<9} vs {r['opponent']:<9} "
              f"win {r['win_rate']:.2f} [{r['win_lo']:.2f}, {r['win_hi']:.2f}]  "
              f"goal share {r['goal_share']:.2f}  cut-off {r['cut_off']}/{r['matches']}  "
              f"compute {r['mean_compute_s']:.1f}s/match")


if __name__ == "__main__":
    main()
