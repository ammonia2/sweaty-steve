"""Tune the heuristic's player terms against the scripted baseline.

For each candidate weight vector, play first-to-1 matches with Nash + that
heuristic against the baseline, other end swapped, using gtbots.arena. The
objective is mean goal difference per match (a_goals - b_goals). Everything is
seeded from CONFIG and written under results/, so the table is reproducible.

Run from the repository root:  uv run python -m experiments.tune_heuristic
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

from gtbots.arena import play_matches
from gtbots.bots.nash import NashBot
from gtbots.bots.scripted import Baseline
from gtbots.env import ROOT
from gtbots.scoring.heuristic import HeuristicScore
from gtbots.solvers.lp import lp

CONFIG = {
    "matches": 4,        # 2 with Nash on P1, 2 on P2
    "seed": 11,
    "target": 1,         # cheap proxy for first-to-7; validates faster
    "max_decisions": 3000,
    "ticks": 30,
    "follow": "hold",
    "commit": 3,
    "out": ROOT / "results",
}

# ball_x, ball_vx, pair_x, ball_lead, pair_vx
CANDIDATES = {
    "start": dict(ball_x=1.5, ball_vx=1.0, pair_x=0.4, ball_lead=0.6, pair_vx=0.2),
    "ball-only": dict(ball_x=1.5, ball_vx=1.0, pair_x=0.0, ball_lead=0.0, pair_vx=0.0),
    "ball-heavy": dict(ball_x=2.0, ball_vx=1.5, pair_x=0.0, ball_lead=0.0, pair_vx=0.0),
    "players": dict(ball_x=1.0, ball_vx=0.5, pair_x=1.0, ball_lead=1.2, pair_vx=0.4),
    "lead": dict(ball_x=1.0, ball_vx=0.8, pair_x=0.3, ball_lead=1.5, pair_vx=0.2),
    "defensive": dict(ball_x=1.2, ball_vx=0.8, pair_x=-0.5, ball_lead=0.8, pair_vx=-0.2),
}


def make_baseline(layout, seed):
    return Baseline(layout)


def main() -> None:
    out = Path(CONFIG["out"])
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, weights in CANDIDATES.items():
        def make_nash(layout, seed, w=weights):
            return NashBot(
                HeuristicScore(layout, w), lp, layout,
                ticks=CONFIG["ticks"], follow=CONFIG["follow"], commit=CONFIG["commit"], seed=seed,
            )

        res, _ = play_matches(
            make_nash, make_baseline,
            matches=CONFIG["matches"], seed=CONFIG["seed"], target=CONFIG["target"],
            max_decisions=CONFIG["max_decisions"],
            env_config={"powerUps": False}, out=out, tag=f"tune_{name}", log_bot="a",
        )
        gd = res.a_goals - res.b_goals
        rows.append({
            "name": name, **weights,
            "goal_diff": gd, "win_rate": res.win_rate, "goal_share": res.goal_share,
            "a_goals": res.a_goals, "b_goals": res.b_goals,
            "a_wins": res.a_wins, "b_wins": res.b_wins, "draws": res.draws,
            "cut_off": res.cut_off, "seconds_a": round(res.seconds_a, 3),
        })
        print(f"{name:10s} goals {res.a_goals}-{res.b_goals}  win {res.win_rate:.2f}  gd {gd:+d}")

    columns = ["name", *CANDIDATES["start"], "goal_diff", "win_rate", "goal_share",
               "a_goals", "b_goals", "a_wins", "b_wins", "draws", "cut_off", "seconds_a"]
    with (out / "heuristic_tuning.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        w.writerows(rows)

    best = max(rows, key=lambda r: (r["goal_diff"], r["win_rate"]))
    weights = {k: best[k] for k in CANDIDATES["start"]}
    (out / "heuristic_best.json").write_text(json.dumps(weights, indent=2) + "\n")
    print(f"best: {best['name']}  {weights}")


if __name__ == "__main__":
    main()
