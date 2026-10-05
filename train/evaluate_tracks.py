"""Evaluate a model on tracks it has not trained on.
python evaluate_tracks.py runs/run3/best_model.zip [number_of_random_tracks]"""
import sys
import numpy as np
from stable_baselines3 import PPO
from sim import Track
from env import RaceEnv
from tracks import TEST_TRACKS, make_random_track

path = sys.argv[1]; n_rand = int(sys.argv[2]) if len(sys.argv) > 2 else 20
model = PPO.load(path, device='cpu')

def run(track, seed):
    e = RaceEnv(random_start=False, seed=seed, track=track); o, _ = e.reset()
    while True:
        a, _ = model.predict(o, deterministic=True)
        o, r, term, trunc, info = e.step(a)
        if term or trunc: return info['lap'], info['progress_px'] / track.total, e.steps / 30

print(f"{'track':16s} {'length':>6s} {'min_rad':>8s} {'laps':>5s} {'progress':>8s} {'time':>6s}")
for name, ctrl in TEST_TRACKS.items():
    t = Track(ctrl); res = [run(t, s) for s in range(5)]
    print(f"{name:16s} {t.total:6.0f} {1/np.abs(t.curv).max():8.0f} {sum(r[0] for r in res):>3d}/5 {np.mean([r[1] for r in res])*100:7.0f}% {np.mean([r[2] for r in res]):5.1f}s")
rng = np.random.default_rng(999)   # different seeds from training (0..7) and tracks.json (11,22,33)
res = []
for i in range(n_rand):
    t = make_random_track(rng); res.append(run(t, i))
print(f"{'new random tracks':16s} {'':>6s} {'':>8s} {sum(r[0] for r in res):>3d}/{n_rand} {np.mean([r[1] for r in res])*100:7.0f}%")
