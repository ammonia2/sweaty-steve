"""The real round-robin tournament, then replicator dynamics over its matrix.

    uv run python -m experiments.tournament_run [--config FILE] [--matches N] [--out DIR]

Every bot in the config plays every other for `matches_per_pair` whole
first-to-7 matches (ends alternate). The payoff matrix is the mean goal
difference; the replicator then evolves the population shares from it.

Writes to `<out>/`: tournament_matrix.csv, tournament_matches.csv, replicas of
the replays, `shares.csv` (population shares over time) and
`results/figures/replicator.png`.
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

from experiments.common import load_config, make_entry, out_dir
from gtbots import replicator, tournament
from gtbots.env import ROOT

HERE = Path(__file__).parent


def run(cfg: dict, out: str | Path | None = None, entry=make_entry, figure: str | Path | None = None):
    out = out_dir(cfg, out)
    entries = [entry(s, cfg) for s in cfg["bots"]]
    names, A, matches = tournament.round_robin(
        entries,
        matches_per_pair=cfg["matches_per_pair"],
        seed=cfg["seed"],
        workers=cfg["workers"],
        target=cfg["target"],
        max_decisions=cfg["max_decisions"],
        env_config={"replayDir": str(out / "replays")},
        checkpoint=out / "tournament.ckpt.jsonl",
    )
    tournament.save(names, A, matches, out, "tournament")
    traj = replicator.simulate(A, steps=cfg["replicator_steps"], dt=cfg["replicator_dt"], rule=cfg["replicator_rule"])
    with open(out / "shares.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time"] + names)
        for t in range(0, len(traj), max(1, len(traj) // 1000)):
            w.writerow([f"{t * cfg['replicator_dt']:.4f}"] + [f"{v:.6f}" for v in traj[t]])
    fig = Path(figure) if figure else ROOT / "results" / "figures" / "replicator.png"
    replicator.plot(traj, names, fig, dt=cfg["replicator_dt"])
    return names, A, traj


def main() -> None:
    ap = argparse.ArgumentParser(description="Round-robin tournament and replicator")
    ap.add_argument("--config", default=str(HERE / "tournament.json"))
    ap.add_argument("--matches", type=int, help="override matches_per_pair")
    ap.add_argument("--out", help="override the output directory")
    ap.add_argument("--workers", type=int, help="override workers")
    a = ap.parse_args()
    cfg = load_config(a.config, matches_per_pair=a.matches, workers=a.workers)
    names, A, traj = run(cfg, out=a.out)
    print("payoff matrix (mean goal difference, row vs column):")
    for n, row in zip(names, A):
        print(f"{n:>22} " + " ".join(f"{v:6.2f}" for v in row))
    print("final shares:", {n: round(float(s), 3) for n, s in zip(names, traj[-1])})


if __name__ == "__main__":
    main()
