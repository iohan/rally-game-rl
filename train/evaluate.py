"""Kör en sparad modell från startlinjen och rapportera. python evaluate.py runs/<namn>/best_model.zip [antal]"""
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
    print(f"ep {ep}: varv={info['lap']}  av_banan={info['off']}  framsteg={info['progress_px']:.0f} px  tid={steps/30:.1f} s  reward={total:.1f}")
