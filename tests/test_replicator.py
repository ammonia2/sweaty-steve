import numpy as np
import pytest

from gtbots import replicator

# Rock-paper-scissors as goal differences: antisymmetric, zero-sum.
RPS = np.array([[0, -1, 1], [1, 0, -1], [-1, 1, 0]], dtype=float)


@pytest.mark.parametrize("rule", ["euler", "discrete"])
def test_shares_stay_on_simplex(rule):
    traj = replicator.simulate(RPS, [0.6, 0.3, 0.1], steps=500, rule=rule)
    assert traj.shape == (501, 3)
    assert np.allclose(traj.sum(axis=1), 1)
    assert (traj >= 0).all()


@pytest.mark.parametrize("rule", ["euler", "discrete"])
def test_dominant_type_takes_over(rule):
    # Type 0 beats both others; the others tie each other.
    A = np.array([[0, 1, 1], [-1, 0, 0], [-1, 0, 0]], dtype=float)
    traj = replicator.simulate(A, steps=3000, dt=0.1, rule=rule)
    assert traj[-1, 0] > 0.99


def test_uniform_fixed_point_of_rps():
    traj = replicator.simulate(RPS, steps=100)
    assert np.allclose(traj, 1 / 3)


def test_extinct_type_stays_extinct():
    traj = replicator.simulate(RPS, [0.5, 0.5, 0.0], steps=200)
    assert (traj[:, 2] == 0).all()


def test_bad_x0_rejected():
    with pytest.raises(ValueError):
        replicator.simulate(RPS, [0.5, 0.5, 0.5])


def test_plot_saves(tmp_path):
    pytest.importorskip("matplotlib")
    out = tmp_path / "shares.png"
    replicator.plot(replicator.simulate(RPS, [0.6, 0.3, 0.1]), ["a", "b", "c"], out)
    assert out.exists()


def test_rps_cycle_does_not_drift_at_default_dt():
    # The exact dynamics circle the uniform mix forever; Euler spirals out,
    # so a coarse dt would show one type taking over.
    x0 = [0.4, 0.35, 0.25]
    traj = replicator.simulate(RPS, x0)
    assert traj.max() < 0.6 and traj.min() > 0.1
    coarse = replicator.simulate(RPS, x0, steps=1000, dt=0.1)
    assert coarse.max() > traj.max()  # the larger step drifts further
