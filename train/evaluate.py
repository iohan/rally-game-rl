"""Run a saved model from the start line and report. python evaluate.py runs/<name>/best_model.zip [episodes]"""
import sys
import numpy as np
from stable_baselines3 import PPO
from env import RaceEnv

path = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
model = PPO.load(path, device='cpu')
env = RaceEnv(random_start=False, seed=123)
for ep in range(n):
    o, _ = env.reset(); total = 0.0; steps = 0
    while True:
        a, _ = model.predict(o, deterministic=True)
        o, r, term, trunc, info = env.step(a); total += r; steps += 1
        if term or trunc: break
    print(f"ep {ep}: lap={info['lap']}  off_track={info['off']}  progress={info['progress_px']:.0f} px  time={steps/30:.1f} s  reward={total:.1f}")
