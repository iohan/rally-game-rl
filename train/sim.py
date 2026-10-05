"""Python-port av sim.js: bana + bilfysik. Måste ge samma tal som JS-versionen.
Verifiera med: python check_sim.py
"""
import math
import numpy as np

WORLD_W, WORLD_H = 4200, 3000
HALF_W = 80           # halva vägbredden (asfalt)
KERB_W = 18           # kantsten
CAR_R = 16
TAU = math.pi * 2

CONTROL = [
    [520, 1750], [520, 1150],
    [700, 700], [1150, 520],
    [1500, 560], [1750, 690], [2000, 560],
    [2400, 480], [2900, 560], [3450, 820],
    [3700, 1150], [3700, 1450], [3400, 1520],
    [2950, 1380], [2600, 1320],
    [2340, 1620], [2560, 1960], [2300, 2300],
    [1900, 2450], [1350, 2350],
    [1000, 2550], [600, 2400], [480, 2100],
]

SURF = {
    'asphalt': dict(max=640, rate=0.75, drag=0.25, over=1.0, roll=20, grip=9),
    'kerb':    dict(max=600, rate=0.70, drag=0.35, over=1.2, roll=30, grip=7),
    'grass':   dict(max=240, rate=1.00, drag=1.20, over=2.5, roll=60, grip=3),
    'gravel':  dict(max=160, rate=1.00, drag=2.00, over=4.0, roll=90, grip=2.2),
}
BRAKE, REV_MAX, REV_ACC, TURN = 650, 180, 220, 2.6
START_IDX_FROM_END = 12


def sign(x):
    return (x > 0) - (x < 0)


def wrap_angle(a):
    while a > math.pi: a -= TAU
    while a < -math.pi: a += TAU
    return a


def cr(p0, p1, p2, p3, t):
    t2 = t * t; t3 = t2 * t
    return [
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
    ]


class Track:
    """Mittlinje som ~10 px-samplade punkter. Attribut som numpy-arrayer av längd N."""

    def __init__(self):
        raw = []; n = len(CONTROL); S = 24
        for i in range(n):
            p0, p1, p2, p3 = CONTROL[(i - 1) % n], CONTROL[i], CONTROL[(i + 1) % n], CONTROL[(i + 2) % n]
            for s in range(S):
                raw.append(cr(p0, p1, p2, p3, s / S))
        dist = lambda a, b: math.hypot(b[0] - a[0], b[1] - a[1])
        total = sum(dist(raw[i], raw[(i + 1) % len(raw)]) for i in range(len(raw)))
        spacing = 10; count = int(total // spacing); step = total / count
        pts = []
        i = 0; seg_start = 0.0; a = raw[0]; b = raw[1]; seg_len = dist(a, b)
        for k in range(count):
            target = k * step
            while seg_start + seg_len < target and i < len(raw) - 1:
                seg_start += seg_len; i += 1; a = raw[i % len(raw)]; b = raw[(i + 1) % len(raw)]; seg_len = dist(a, b)
            t = (target - seg_start) / seg_len if seg_len > 0 else 0
            pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        N = len(pts)
        self.N, self.step, self.total = N, step, total
        self.x = np.array([p[0] for p in pts]); self.y = np.array([p[1] for p in pts])
        ang = np.zeros(N); tx = np.zeros(N); ty = np.zeros(N)
        for k in range(N):
            q = pts[(k + 1) % N]; r = pts[(k - 1) % N]
            dx, dy = q[0] - r[0], q[1] - r[1]; l = math.hypot(dx, dy)
            tx[k], ty[k] = dx / l, dy / l; ang[k] = math.atan2(ty[k], tx[k])
        self.tx, self.ty, self.ang = tx, ty, ang
        self.nx, self.ny = -ty, tx
        raw_curv = np.array([wrap_angle(ang[(k + 2) % N] - ang[(k - 2) % N]) / (4 * step) for k in range(N)])
        self.curv = np.array([sum(raw_curv[(k + w) % N] for w in range(-4, 5)) / 9 for k in range(N)])

    def nearest(self, x, y):
        """Global sökning (långsam, O(N)). Samma som JS."""
        d2 = (self.x - x) ** 2 + (self.y - y) ** 2
        i = int(np.argmin(d2))
        return i, math.sqrt(d2[i])

    def nearest_local(self, x, y, hint, win=30):
        """Sök bara ±win index runt senaste kända index. Snabbt; bilen rör sig max ~2 index/steg."""
        idx = (np.arange(hint - win, hint + win + 1)) % self.N
        d2 = (self.x[idx] - x) ** 2 + (self.y[idx] - y) ** 2
        j = int(np.argmin(d2))
        return int(idx[j]), math.sqrt(d2[j])

    def surface_dist(self, dist):
        """Underlag utifrån avstånd till mittlinjen (grus ignoreras: utanför kantsten = gräs)."""
        if dist <= HALF_W: return 'asphalt'
        if dist <= HALF_W + KERB_W: return 'kerb'
        return 'grass'


class Car:
    __slots__ = ('x', 'y', 'rot', 'vx', 'vy', 'fwd', 'lat')

    def __init__(self, x=0.0, y=0.0, rot=0.0):
        self.x, self.y, self.rot = x, y, rot
        self.vx = self.vy = self.fwd = self.lat = 0.0


def step_car(car, throttle, steer, dt, S):
    """Exakt port av stepCar i sim.js."""
    fwd0 = car.vx * math.cos(car.rot) + car.vy * math.sin(car.rot)
    sf = min(1.0, abs(fwd0) / 200)
    hs = 1 - 0.45 * min(1.0, abs(fwd0) / 640)
    car.rot += steer * TURN * sf * hs * sign(fwd0) * dt

    fx, fy = math.cos(car.rot), math.sin(car.rot)
    fwd = car.vx * fx + car.vy * fy
    lat = -car.vx * fy + car.vy * fx

    if throttle > 0 and fwd < S['max']: fwd += (S['max'] - fwd) * S['rate'] * dt
    if throttle < 0:
        if fwd > 2: fwd -= BRAKE * dt
        else: fwd = max(-REV_MAX, fwd - REV_ACC * dt)
    fwd -= fwd * S['drag'] * dt * (0.25 if (throttle > 0 and fwd <= S['max']) else 1)
    if fwd > S['max']: fwd -= (fwd - S['max']) * S['over'] * dt
    roll = S['roll'] * dt
    if abs(fwd) < roll: fwd = 0.0
    else: fwd -= sign(fwd) * roll
    if fwd > 0: fwd -= abs(lat) * 0.6 * dt
    lat *= math.exp(-S['grip'] * dt)

    car.vx = fx * fwd - fy * lat; car.vy = fy * fwd + fx * lat
    car.fwd, car.lat = fwd, lat
    car.x += car.vx * dt; car.y += car.vy * dt
