import numpy as np
import pytest

from experiments import commitment, tournament_run
from experiments.common import commit_for, make_entry, wilson

CFG = {"solver": "lp", "lookahead_ticks": 6, "follow": "hold"}


def test_commit_for():
    assert commit_for(6) == 3 and commit_for(14) == 7
    for bad in (15, 1, 0, -2):
        with pytest.raises(ValueError):
            commit_for(bad)


def test_wilson():
    p, lo, hi = wilson(50, 100)
    assert p == 0.5 and lo < 0.5 < hi and abs((hi - 0.5) - (0.5 - lo)) < 1e-9
    assert wilson(0, 10)[1] == 0 and wilson(10, 10)[2] == pytest.approx(1)
    assert np.isnan(wilson(0, 0)[0])


def test_make_entry_names_and_errors():
    assert make_entry("ppo", CFG)[0] == "ppo"
    assert make_entry("rusher", CFG)[0] == "rusher"
    assert make_entry("nash:critic:14", CFG)[0] == "nash-critic-14"
    for bad in ("nash:critic:15", "nash:oops:6", "wat", "nash:critic"):
        with pytest.raises(ValueError):
            make_entry(bad, CFG)


def test_summarise_orientation_and_cut_off():
    ms = [
        {"i": 0, "j": 1, "goals_i": 7, "goals_j": 3, "seconds_i": 2.0, "ticks": 100, "ended_by": "target"},
        {"i": 1, "j": 0, "goals_i": 2, "goals_j": 2, "seconds_i": 0.0, "seconds_j": 4.0, "ticks": 200, "ended_by": "time"},
        {"i": 0, "j": 2, "goals_i": 0, "goals_j": 0, "seconds_i": 9.0, "ticks": 9, "ended_by": "target"},
    ]
    s = commitment.summarise(ms, nash=0, opp=1)
    assert (s["matches"], s["wins"], s["draws"], s["losses"], s["cut_off"]) == (2, 1, 1, 0, 1)
    assert (s["goals_for"], s["goals_against"]) == (9, 5)
    assert s["mean_compute_s"] == 3.0 and s["mean_match_ticks"] == 150


def test_commitment_end_to_end_real_bots(tmp_path):
    cfg = {"seed": 1, "hold_ticks": [6], "scorers": ["heuristic"], "opponents": ["ppo", "baseline"],
           "solver": "lp", "lookahead_ticks": 6, "follow": "hold", "target": 1,
           "matches_per_pair": 2, "workers": 1, "max_decisions": 80, "out": str(tmp_path)}
    rows = commitment.run(cfg, out=tmp_path)
    assert [r["opponent"] for r in rows] == ["ppo", "baseline"]
    assert all(r["matches"] == 2 and r["commit"] == 3 and r["mean_compute_s"] > 0 for r in rows)
    assert (tmp_path / "summary.csv").exists()


def test_tournament_run_end_to_end(tmp_path):
    cfg = {"seed": 1, "bots": ["nash:heuristic:6", "baseline", "camper"], "solver": "lp",
           "lookahead_ticks": 6, "follow": "hold", "target": 1, "matches_per_pair": 2, "workers": 1,
           "max_decisions": 60, "replicator_rule": "euler", "replicator_dt": 0.01,
           "replicator_steps": 200, "out": str(tmp_path)}
    names, A, traj = tournament_run.run(cfg, out=tmp_path, figure=tmp_path / "r.png")
    assert A.shape == (3, 3) and np.allclose(A, -A.T)
    assert np.allclose(traj.sum(axis=1), 1)
    assert (tmp_path / "r.png").exists() and (tmp_path / "shares.csv").exists()
