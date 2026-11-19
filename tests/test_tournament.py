import numpy as np
import pytest

from gtbots import tournament
from gtbots.env import BACK, FORWARD, STAND, encode


class Const:
    def __init__(self, name, action):
        self.name, self.action = name, action

    def act(self, seat, obs):
        return self.action


def entries():
    return [
        ("forward", lambda layout, seed: Const("forward", encode(FORWARD, 0, 1))),
        ("stand", lambda layout, seed: Const("stand", encode(STAND, 0, 0))),
        ("back", lambda layout, seed: Const("back", encode(BACK, 0, 0))),
    ]


def test_matrix_from_matches_is_antisymmetric_mean():
    ms = [
        {"i": 0, "j": 1, "goals_i": 3, "goals_j": 1},
        {"i": 0, "j": 1, "goals_i": 0, "goals_j": 2},
        {"i": 1, "j": 2, "goals_i": 1, "goals_j": 1},
    ]
    A = tournament.matrix_from_matches(3, ms)
    assert A[0, 1] == 0 and A[1, 0] == 0  # (+2 and -2) / 2
    assert A[1, 2] == 0
    assert np.allclose(A, -A.T)
    ms.append({"i": 0, "j": 2, "goals_i": 4, "goals_j": 0})
    A = tournament.matrix_from_matches(3, ms)
    assert A[0, 2] == 4 and A[2, 0] == -4


def test_round_robin_with_dummy_bots(tmp_path):
    kw = dict(matches_per_pair=2, seed=3, target=1, max_decisions=400,
              env_config={"powerUps": False})
    names, A, matches = tournament.round_robin(entries(), **kw)
    assert names == ["forward", "stand", "back"]
    assert A.shape == (3, 3)
    assert np.allclose(A, -A.T) and np.allclose(np.diag(A), 0)
    assert len(matches) == 3 * 2  # pairs x matches
    # both ends are used
    assert {m["i_is_p1"] for m in matches} == {0, 1}
    # reproducible from the seed
    _, A2, _ = tournament.round_robin(entries(), **kw)
    assert np.array_equal(A, A2)
    tournament.save(names, A, matches, tmp_path, "t")
    assert (tmp_path / "t_matrix.csv").exists() and (tmp_path / "t_matches.csv").exists()


def test_parallel_matches_serial():
    kw = dict(matches_per_pair=2, seed=5, target=1, max_decisions=300)
    _, A1, _ = tournament.round_robin(entries(), workers=1, **kw)
    _, A2, _ = tournament.round_robin(entries(), workers=2, **kw)
    assert np.array_equal(A1, A2)


def test_duplicate_names_rejected():
    e = entries()[:1] * 2
    with pytest.raises(ValueError):
        tournament.round_robin(e, matches_per_pair=1)


def test_match_ends_at_target_with_goals():
    class Rand:
        def __init__(self, seed):
            self.r = np.random.default_rng(seed)

        def act(self, seat, obs):
            return int(self.r.integers(12))

    e = [("rand", lambda l, s: Rand(s)), ("stand", lambda l, s: Const("stand", 0))]
    _, A, ms = tournament.round_robin(e, matches_per_pair=2, seed=1, target=2, max_decisions=3000)
    assert all(m["ended_by"] == "target" for m in ms)
    assert all(max(m["goals_i"], m["goals_j"]) == 2 for m in ms)
    assert A[0, 1] != 0
