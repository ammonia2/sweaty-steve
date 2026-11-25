"""Shared by the experiment scripts: bots from short spec strings, config, stats.

A bot spec is one string, so a config file can list the bots of a run:

    ppo | baseline | rusher | camper
    nash:<scorer>:<hold_ticks>      scorer: heuristic | critic
    bayes:<scorer>:<hold_ticks>

`hold_ticks` is how long the bot keeps pressing the same buttons (it plans
every `hold_ticks` ticks). The game asks for buttons every 2 ticks, so it must
be even: commit = hold_ticks / 2 (6 -> commit 3, 14 -> commit 7).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from gtbots.bots.bayesian import BayesianBot
from gtbots.bots.nash import NashBot
from gtbots.bots.ppo import PpoBot
from gtbots.bots.scripted import Baseline, Camper, Rusher
from gtbots.env import ROOT
from gtbots.scoring.critic import CriticScore
from gtbots.scoring.heuristic import HeuristicScore
from gtbots.solvers.lp import lp
from gtbots.solvers.regret_matching import regret_matching

SOLVERS = {"lp": lp, "regret_matching": regret_matching}
SCRIPTED = {"baseline": Baseline, "rusher": Rusher, "camper": Camper}
Z95 = 1.959964


def commit_for(ticks: int) -> int:
    """Hold length in ticks -> the bot's `commit` (decisions of 2 ticks each)."""
    if ticks < 2 or ticks % 2:
        raise ValueError(f"hold length must be an even number of ticks, got {ticks}")
    return ticks // 2


def make_entry(spec: str, cfg: dict):
    """``(name, make)`` for a bot spec; ``make(layout, seed)`` builds a fresh bot."""
    kind, *rest = spec.split(":")
    if kind == "ppo":
        return "ppo", lambda layout, seed: PpoBot()
    if kind in SCRIPTED:
        return kind, lambda layout, seed: SCRIPTED[kind](layout)
    if kind in ("nash", "bayes") and len(rest) == 2:
        scorer, ticks = rest[0], int(rest[1])
        commit = commit_for(ticks)
        if scorer not in ("heuristic", "critic"):
            raise ValueError(f"unknown scorer {scorer!r} in {spec!r}")

        def make(layout, seed):
            score = HeuristicScore(layout) if scorer == "heuristic" else CriticScore()
            kw = dict(ticks=cfg["lookahead_ticks"], follow=cfg["follow"], commit=commit, seed=seed)
            if kind == "nash":
                return NashBot(score, SOLVERS[cfg["solver"]], layout, **kw)
            return BayesianBot(score, layout, **kw)

        return spec.replace(":", "-"), make
    raise ValueError(f"unknown bot spec {spec!r}")


def load_config(path: str | Path, **overrides) -> dict:
    cfg = json.loads(Path(path).read_text())
    cfg.update({k: v for k, v in overrides.items() if v is not None})
    return cfg


def out_dir(cfg: dict, override: str | None = None) -> Path:
    out = Path(override or cfg["out"])
    return out if out.is_absolute() else ROOT / out


def wilson(k: int, n: int, z: float = Z95) -> tuple[float, float, float]:
    """(estimate, low, high): the Wilson 95% interval for k successes in n trials."""
    if n == 0:
        return float("nan"), float("nan"), float("nan")
    p = k / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return p, max(0.0, centre - half), min(1.0, centre + half)
