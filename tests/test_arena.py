"""Checks for the single-match runner. Needs Node: uv run pytest tests/test_arena.py"""
from __future__ import annotations

import json

import numpy as np
import pytest

from gtbots.arena import play_match, play_matches
from gtbots.env import GameEnv


class Const:
    def __init__(self, action):
        self.action = action
        self.resets = 0
        self.seen = []

    def reset(self):
        self.resets += 1
        self.seen = []
        self.log = []

    def observe(self, opponent_action):
        self.seen.append(opponent_action)

    def act(self, seat, obs):
        self.log.append({"decision": len(self.log), "action": self.action})
        return self.action


def test_play_match_records_one_match():
    a, b = Const(8), Const(8)
    with GameEnv(num_envs=1, num_procs=1, seed=3, powerUps=False) as env:
        r = play_match(env, a, b, target=1, max_decisions=3000)
    assert r["ended_by"] == "target"
    assert r["winner"] == ("p1" if r["goals1"] > r["goals2"] else "p2")
    assert max(r["goals1"], r["goals2"]) >= 1
    assert r["ticks"] == r["decisions"] * 2
    assert r["seconds1"] >= 0 and r["seconds2"] >= 0
    assert a.resets == b.resets == 1


def test_observe_gets_the_opponents_previous_action():
    a, b = Const(8), Const(0)
    with GameEnv(num_envs=1, num_procs=1, seed=5, powerUps=False) as env:
        play_match(env, a, b, target=7, max_decisions=2)
    assert a.seen[0] is None and b.seen[0] is None
    assert a.seen[1] == 0 and b.seen[1] == 8
    assert a.seen[-1] == 0 and b.seen[-1] == 8


def test_time_cutoff_and_draw():
    a, b = Const(0), Const(0)
    with GameEnv(num_envs=1, num_procs=1, seed=7, powerUps=False, maxEpisodeTicks=10) as env:
        r = play_match(env, a, b, target=7, max_decisions=100)
    assert r["ended_by"] == "time"
    assert r["winner"] == "draw"
    assert r["decisions"] == 5  # 10 ticks / 2 per decision


def make_runner(layout, seed):
    return Const(8)


def make_idle(layout, seed):
    return Const(0)


def test_play_matches_alternates_ends_and_is_reproducible():
    kw = dict(matches=4, seed=2, target=1, max_decisions=3000, env_config={"powerUps": False})
    res, recs = play_matches(make_runner, make_idle, **kw)
    assert res.matches == 4
    assert [r["a_on_p1"] for r in recs] == [1, 0, 1, 0]
    assert len({r["seed"] for r in recs}) == 4
    assert res.per_side["p1"][1] == res.per_side["p2"][1] == 2
    assert res.a_wins + res.b_wins + res.draws == 4
    assert all(r["ended_by"] in {"target", "time", "decisions"} for r in recs)
    _, again = play_matches(make_runner, make_idle, **kw)
    assert [(r["seed"], r["winner"], r["goals_a"], r["goals_b"]) for r in recs] == [
        (r["seed"], r["winner"], r["goals_a"], r["goals_b"]) for r in again
    ]


def test_play_matches_rejects_zero_matches():
    with pytest.raises(ValueError):
        play_matches(make_runner, make_idle, matches=0)


def test_play_matches_saves_replays_logs_and_csv(tmp_path):
    _, recs = play_matches(
        make_runner, make_idle, matches=2, seed=9, target=1, max_decisions=3000,
        env_config={"powerUps": False}, out=tmp_path, tag="t",
    )
    assert (tmp_path / "t_matches.csv").exists() and (tmp_path / "t_summary.csv").exists()
    assert all(r["replay"] and (tmp_path / r["replay"]).exists() for r in recs)
    assert all(r["bot_log"] and (tmp_path / r["bot_log"]).exists() for r in recs)
    assert json.loads((tmp_path / recs[0]["bot_log"]).read_text())[0]["decision"] == 0


def test_log_bot_must_be_a_or_b():
    with pytest.raises(ValueError):
        play_matches(make_runner, make_idle, matches=1, log_bot="c")
