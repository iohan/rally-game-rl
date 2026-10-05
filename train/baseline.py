"""Rule-based driver: proves the environment works before any ML is involved.
Pure pursuit: aim at a track point 120 px ahead, brake if speed x curvature ahead is high.
It is allowed to read env.track directly (cheating); the RL agent only sees the observation."""
import math, time
import numpy as np
from env import RaceEnv, ACTIONS

AIM = 12   # indices ahead (~120 px)

def policy(env, o):
    t, c = env.track, env.car
    j = (env.idx + AIM) % t.N
    want = math.atan2(t.y[j] - c.y, t.x[j] - c.x)
    err = math.atan2(math.sin(want - c.rot), math.cos(want - c.rot))
    steer = 1 if err > 0.04 else (-1 if err < -0.04 else 0)
    speed, curv_ahead = o[7], max(abs(o[11]), abs(o[12]), abs(o[13]))
    v_allow = 0.75 - 0.45 * min(1.0, curv_ahead)      # allowed speed (fraction of 640)
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
    print(f"steps={n} ({n/dt:.0f} steps/s, {n/30:.1f} s game time)  reward={total:.1f}  progress={info['progress_px']:.0f} px of {env.track.total:.0f}  lap={info['lap']}  off_track={info['off']}  idx={env.idx}")
