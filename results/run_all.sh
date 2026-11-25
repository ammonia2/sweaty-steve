#!/bin/bash
# Resumable: rerun this script after an interruption and finished matches are skipped.
cd "$(dirname "$0")/.."
uv run python -m experiments.commitment --matches 100 --workers 28 >> results/commitment.log 2>&1
uv run python -m experiments.tournament_run --matches 100 --workers 28 >> results/tournament.log 2>&1
