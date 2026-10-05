"""Regelstyrd förare: bevisar att miljön fungerar innan ML kopplas in.
Pure pursuit: sikta på en banpunkt 120 px fram, bromsa om fart x kurvatur framåt är hög.
Får läsa env.track direkt (fuskar), det får inte RL-agenten som bara ser observationen."""
import math, time
import numpy as np
from env import RaceEnv, ACTIONS

AIM = 12   # index framåt (~120 px)

def policy(env, o):
    t, c = env.track, env.car
    j = (env.idx + AIM) % t.N
    want = math.atan2(t.y[j] - c.y, t.x[j] - c.x)
    err = math.atan2(math.sin(want - c.rot), math.cos(want - c.rot))
    steer = 1 if err > 0.04 else (-1 if err < -0.04 else 0)
    speed, curv_ahead = o[7], max(abs(o[11]), abs(o[12]), abs(o[13]))
    v_allow = 0.75 - 0.45 * min(1.0, curv_ahead)      # tillåten fart (andel av 640)
    throttle = -1 if speed > v_allow else 1
    return ACTIONS.index((throttle, steer))

if __name__ == '__main__':
    env = RaceEnv(random_start=False, seed=0)
    o, _ = env.reset(seed=0)
    total = 0.0; t0 = time.time(); n = 0
    while True:
        o, r, term, trunc, info = env.step(policy(env, o))
        total += r; n += 1
        if term or trunc: break
    dt = time.time() - t0
    print(f"steg={n} ({n/dt:.0f} steg/s, {n/30:.1f} s speltid)  reward={total:.1f}  framsteg={info['progress_px']:.0f} px av {env.track.total:.0f}  varv={info['lap']}  av_banan={info['off']}  idx={env.idx}")
