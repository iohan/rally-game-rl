"""Compare the Python port against sim.js number by number. Requires node."""
import json, subprocess, os, math
import numpy as np
from sim import Track, Car, step_car, SURF, HALF_W, KERB_W, START_IDX_FROM_END

here = os.path.dirname(os.path.abspath(__file__))
js = json.loads(subprocess.check_output(['node', os.path.join(here, 'check_sim.js')]))
t = Track()
assert t.N == js['N'], (t.N, js['N'])
jp = np.array(js['pts'])
print(f"N={t.N}  total diff={abs(t.total - js['total']):.2e}")
print(f"pts max diff: x={np.abs(jp[:,0]-t.x).max():.2e} y={np.abs(jp[:,1]-t.y).max():.2e} ang={np.abs(jp[:,2]-t.ang).max():.2e} curv={np.abs(jp[:,3]-t.curv).max():.2e}")
i0 = t.N - START_IDX_FROM_END
car = Car(t.x[i0], t.y[i0], t.ang[i0])
worst = 0.0; idx = i0
for i, row in enumerate(js['traj']):
    throttle = 1 if i < 400 else (-1 if i < 500 else 0)
    steer = 0 if i < 150 else (1 if i < 300 else (-1 if i < 350 else 0))
    idx, dist = t.nearest_local(car.x, car.y, idx)
    gi, gd = t.nearest(car.x, car.y)
    assert idx == gi, f"local nearest {idx} != global {gi} at step {i}"
    assert idx == row[5], f"idx {idx} != js {row[5]} at step {i}"
    step_car(car, throttle, steer, 1 / 60, SURF[t.surface_dist(dist)])
    worst = max(worst, abs(car.x - row[0]), abs(car.y - row[1]), abs(car.rot - row[2]), abs(car.vx - row[3]), abs(car.vy - row[4]))
print(f"600 steps, max deviation in car state: {worst:.2e}")
print("OK" if worst < 1e-6 else "ERROR: the port deviates")
