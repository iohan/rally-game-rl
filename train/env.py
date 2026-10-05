"""Gymnasium-miljö: en bil på Granskogsbanan.

Observation (14 tal, ungefär -1..1):
  [0..6]  7 strålar: avstånd till asfaltkant i -60,-40,-20,0,20,40,60 grader (0 = kant intill, 1 = >= RAY_MAX px fri asfalt)
  [7]     fart framåt / 640
  [8]     sidoglid lat / 300
  [9]     sidoposition från mittlinjen / HALF_W (-1 vänsterkant, +1 högerkant)
  [10]    riktningsfel mot banans tangent / pi
  [11..13] kurvatur 10, 25, 50 punkter (100, 250, 500 px) framåt, * 380 (så ~±1 i hårda kurvor)

Action: Discrete(9) = throttle {-1,0,1} x steer {-1,0,1}

Reward per steg:
  + framsteg längs banan i px * R_PROGRESS
  - R_TIME varje steg (annars är "stå still" riskfritt)
  - R_OFF och episoden slutar om bilen lämnar asfalten
  + R_LAP och episoden slutar när ett varv är klart
"""
import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from sim import Track, Car, step_car, SURF, HALF_W, START_IDX_FROM_END

RAY_ANGLES = np.deg2rad([-60, -40, -20, 0, 20, 40, 60])
RAY_MAX = 400.0          # px
RAY_STEP = 8.0           # px per sampel längs strålen
LOOKAHEAD = (10, 25, 50) # index framåt för kurvatur
ACTIONS = [(t, s) for t in (-1, 0, 1) for s in (-1, 0, 1)]   # (throttle, steer)

DT = 1 / 60
FRAME_SKIP = 2           # 2 fysiksteg per beslut = 30 beslut/s
MAX_STEPS = 3000         # 100 s
STALL_STEPS = 90         # 3 s utan framsteg = avbryt

R_PROGRESS = 0.01        # per px -> ~97 för ett varv
R_TIME = 0.01
R_OFF = 10.0
R_LAP = 50.0


class RaceEnv(gym.Env):
    metadata = {'render_modes': []}

    def __init__(self, random_start=True, allow_kerb=False, seed=None):
        super().__init__()
        self.track = Track()
        self.random_start = random_start
        self.limit = HALF_W + (18 if allow_kerb else 0)
        self.observation_space = spaces.Box(-1.0, 1.0, shape=(14,), dtype=np.float32)
        self.action_space = spaces.Discrete(len(ACTIONS))
        self.rng = np.random.default_rng(seed)
        self.car = Car()
        self.idx = 0

    # ---------- hjälp ----------
    def _place(self, idx, lat_off=0.0, ang_off=0.0):
        t = self.track
        self.car = Car(t.x[idx] + t.nx[idx] * lat_off, t.y[idx] + t.ny[idx] * lat_off, t.ang[idx] + ang_off)
        self.idx = idx

    def _ray(self, ang):
        """Avstånd längs strålen tills mittlinjeavståndet > HALF_W (asfaltkanten)."""
        t = self.track; c = self.car
        n = int(RAY_MAX / RAY_STEP)
        ds = np.arange(1, n + 1) * RAY_STEP
        px = c.x + math.cos(ang) * ds; py = c.y + math.sin(ang) * ds
        win = (np.arange(self.idx - 80, self.idx + 81)) % t.N
        d2 = (px[:, None] - t.x[win][None, :]) ** 2 + (py[:, None] - t.y[win][None, :]) ** 2
        off = np.sqrt(d2.min(axis=1)) > HALF_W
        hit = np.argmax(off) if off.any() else n
        return min(hit * RAY_STEP, RAY_MAX) / RAY_MAX

    def _obs(self):
        t = self.track; c = self.car; i = self.idx
        rays = [self._ray(c.rot + a) for a in RAY_ANGLES]
        lat_off = ((c.x - t.x[i]) * t.nx[i] + (c.y - t.y[i]) * t.ny[i]) / HALF_W
        head_err = math.atan2(math.sin(c.rot - t.ang[i]), math.cos(c.rot - t.ang[i])) / math.pi
        curv = [t.curv[(i + k) % t.N] * 380 for k in LOOKAHEAD]
        o = np.array(rays + [c.fwd / 640, c.lat / 300, lat_off, head_err] + curv, dtype=np.float32)
        return np.clip(o, -1, 1)

    # ---------- gym-api ----------
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        if seed is not None: self.rng = np.random.default_rng(seed)
        t = self.track
        idx = int(self.rng.integers(t.N)) if self.random_start else t.N - START_IDX_FROM_END
        self._place(idx, self.rng.uniform(-30, 30), self.rng.uniform(-0.2, 0.2))
        self.start_idx = idx
        self.progress = 0.0      # index-framsteg ackumulerat (float)
        self.steps = 0
        self.stall = 0
        self.dist = 0.0
        return self._obs(), {}

    def step(self, action):
        throttle, steer = ACTIONS[int(action)]
        t = self.track; c = self.car
        idx0 = self.idx                      # index före steget (framsteget mäts över hela beslutet)
        for _ in range(FRAME_SKIP):
            self.idx, self.dist = t.nearest_local(c.x, c.y, self.idx)
            step_car(c, throttle, steer, DT, SURF[t.surface_dist(self.dist)])
        new_idx, self.dist = t.nearest_local(c.x, c.y, self.idx)
        d_idx = (new_idx - idx0 + t.N // 2) % t.N - t.N // 2   # wrap-säker skillnad
        self.idx = new_idx
        self.progress += d_idx
        self.steps += 1
        self.stall = self.stall + 1 if d_idx <= 0 else 0

        reward = d_idx * t.step * R_PROGRESS - R_TIME
        terminated = truncated = False
        info = {'progress_px': self.progress * t.step, 'lap': False, 'off': False}
        if self.dist > self.limit:
            reward -= R_OFF; terminated = True; info['off'] = True
        elif self.progress >= t.N:
            reward += R_LAP; terminated = True; info['lap'] = True
        elif self.stall >= STALL_STEPS:
            reward -= R_OFF; terminated = True
        elif self.steps >= MAX_STEPS:
            truncated = True
        return self._obs(), float(reward), terminated, truncated, info
