"""Node-free checks for the scripted bots."""
from __future__ import annotations

import numpy as np

from gtbots.bots.scripted import Baseline, Camper, Rusher
from gtbots.env import BACK, FORWARD, STAND, encode

LAYOUT = {
    "sections": {"me": 0, "foe": 100, "ball": 200, "match": 300},
    "player": {"x": 0, "y": 1, "vx": 2, "vy": 3, "grounded": 4},
    "ball": {"x": 0, "y": 1, "vx": 2, "vy": 3},
    "match": {"myNeeded": 0},
}


def obs(me_x=0.0, me_y=0.0, ball_x=0.0, ball_y=0.0, grounded=1.0):
    o = np.zeros(400, dtype=np.float32)
    o[LAYOUT["sections"]["me"] + 0] = me_x
    o[LAYOUT["sections"]["me"] + 1] = me_y
    o[LAYOUT["sections"]["me"] + 4] = grounded
    o[LAYOUT["sections"]["ball"] + 0] = ball_x
    o[LAYOUT["sections"]["ball"] + 1] = ball_y
    return o


PX = 1 / 400
PY = 1 / 240


def test_baseline_runs_kicks_and_backs_off():
    b = Baseline(LAYOUT)
    # Ball 40 px ahead: run at it and kick.
    assert b.act(None, obs(ball_x=40 * PX)) == encode(FORWARD, 0, 1)
    # Ball right on the head: back off so the boot meets it, still kick.
    assert b.act(None, obs(ball_x=5 * PX)) == encode(BACK, 0, 1)
    # Ball behind: get back past it, hopping over when close.
    assert b.act(None, obs(ball_x=-40 * PX)) == encode(BACK, 1, 0)
    # Ball dropping onto the head: jump even when it is ahead.
    assert b.act(None, obs(ball_x=20 * PX, ball_y=-40 * PY)) == encode(FORWARD, 1, 0)


def test_baseline_ignores_the_seat():
    b = Baseline(LAYOUT)
    o = obs(ball_x=20 * PX)
    assert b.act(None, o) == b.act(object(), o)


def test_rusher_always_chases_the_ball():
    r = Rusher(LAYOUT)
    assert r.act(None, obs(ball_x=100 * PX)) == encode(FORWARD, 0, 0)
    assert r.act(None, obs(ball_x=-100 * PX)) == encode(BACK, 0, 0)
    assert r.act(None, obs(ball_x=40 * PX)) == encode(FORWARD, 0, 1)


def test_camper_holds_its_spot():
    c = Camper(LAYOUT, spot=-0.75, slack=0.05)
    far = dict(ball_x=0.9)
    assert c.act(None, obs(me_x=0.0, **far)) == encode(BACK, 0, 0)
    assert c.act(None, obs(me_x=-0.9, **far)) == encode(FORWARD, 0, 0)
    assert c.act(None, obs(me_x=-0.75, **far)) == encode(STAND, 0, 0)
