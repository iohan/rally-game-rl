// ============================================================
//  sim.js – pure game logic without Phaser/DOM.
//  Shared by the game (index.html) and the template for the training
//  environment (train/sim.py). If you change anything here, update the Python port.
// ============================================================
'use strict';

const WORLD_W = 4200, WORLD_H = 3000;
const HALF_W = 80;          // half road width
const KERB_W = 18;          // kerb width
const CAR_R = 16;           // car collision radius
const TAU = Math.PI * 2;

// Control points for the track (closed Catmull-Rom loop, clockwise)
const CONTROL = [
  [520, 1750], [520, 1150],                       // start/finish straight (northbound)
  [700, 700], [1150, 520],                        // turn 1, onto the top
  [1500, 560], [1750, 690], [2000, 560],          // chicane
  [2400, 480], [2900, 560], [3450, 820],          // long sweeping right-hander
  [3700, 1150], [3700, 1450], [3400, 1520],       // hairpin
  [2950, 1380], [2600, 1320],                     // back westwards
  [2340, 1620], [2560, 1960], [2300, 2300],       // S-bends
  [1900, 2450], [1350, 2350],                     // bottom straight
  [1000, 2550], [600, 2400], [480, 2100]          // final loop up towards the start
];

// Surfaces
const SURF = {
  asphalt: { max: 640, rate: 0.75, drag: 0.25, over: 1.0, roll: 20, grip: 9 },
  kerb:    { max: 600, rate: 0.70, drag: 0.35, over: 1.2, roll: 30, grip: 7 },
  grass:   { max: 240, rate: 1.00, drag: 1.20, over: 2.5, roll: 60, grip: 3 },
  gravel:  { max: 160, rate: 1.00, drag: 2.00, over: 4.0, roll: 90, grip: 2.2 },
};
const BRAKE = 650, REV_MAX = 180, REV_ACC = 220, TURN = 2.6;
const START_IDX_FROM_END = 12;   // the car starts at pts[N - 12]

function wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
  ];
}

// ============================================================
//  Track: centre line sampled every ~10 px with tangent, normal, curvature
// ============================================================
function buildTrack(control = CONTROL) {
  const raw = [], n = control.length, S = 24;
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n], p1 = control[i], p2 = control[(i + 1) % n], p3 = control[(i + 2) % n];
    for (let s = 0; s < S; s++) raw.push(cr(p0, p1, p2, p3, s / S));
  }
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  let total = 0;
  for (let i = 0; i < raw.length; i++) total += dist(raw[i], raw[(i + 1) % raw.length]);
  const spacing = 10, count = Math.floor(total / spacing), step = total / count;
  const pts = [];
  let i = 0, segStart = 0, a = raw[0], b = raw[1], segLen = dist(a, b);
  for (let k = 0; k < count; k++) {
    const target = k * step;
    while (segStart + segLen < target && i < raw.length - 1) { segStart += segLen; i++; a = raw[i % raw.length]; b = raw[(i + 1) % raw.length]; segLen = dist(a, b); }
    const t = segLen > 0 ? (target - segStart) / segLen : 0;
    pts.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t });
  }
  const N = pts.length;
  for (let k = 0; k < N; k++) {
    const p = pts[k], q = pts[(k + 1) % N], r = pts[(k - 1 + N) % N];
    let tx = q.x - r.x, ty = q.y - r.y; const l = Math.hypot(tx, ty); tx /= l; ty /= l;
    p.tx = tx; p.ty = ty; p.nx = -ty; p.ny = tx; p.ang = Math.atan2(ty, tx);
  }
  const rawCurv = pts.map((p, k) => wrapAngle(pts[(k + 2) % N].ang - pts[(k - 2 + N) % N].ang) / (4 * step));
  for (let k = 0; k < N; k++) { let s = 0; for (let w = -4; w <= 4; w++) s += rawCurv[(k + w + N) % N]; pts[k].curv = s / 9; }
  // Kerb sections: corners with radius < 380
  const kerb = pts.map(p => Math.abs(p.curv) > 1 / 380);
  const grown = kerb.slice();
  for (let k = 0; k < N; k++) if (kerb[k]) for (let w = -6; w <= 6; w++) grown[(k + w + N) % N] = true;
  // find contiguous runs (with wrap)
  let start0 = grown.indexOf(false); if (start0 < 0) start0 = 0;
  const runs = []; let cur = null;
  for (let s = 0; s < N; s++) {
    const k = (start0 + s) % N;
    if (grown[k]) { if (!cur) cur = { a: k, len: 1 }; else cur.len++; }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return {
    pts, N, step, runs, total, control,
    nearest(x, y) {
      let best = Infinity, bi = 0;
      for (let k = 0; k < N; k++) { const dx = pts[k].x - x, dy = pts[k].y - y; const d = dx * dx + dy * dy; if (d < best) { best = d; bi = k; } }
      return { idx: bi, dist: Math.sqrt(best) };
    }
  };
}

// ============================================================
//  Car physics: one time step. Mutates car {x,y,rot,vx,vy,fwd,lat}.
//  throttle: 1 throttle, -1 brake/reverse, 0 none.  steer: -1 left, 1 right, 0 straight.
//  S: surface parameters (SURF[...]).
// ============================================================
function stepCar(car, throttle, steer, dt, S) {
  // steering
  let fwd0 = car.vx * Math.cos(car.rot) + car.vy * Math.sin(car.rot);
  const sf = Math.min(1, Math.abs(fwd0) / 200);
  const hs = 1 - 0.45 * Math.min(1, Math.abs(fwd0) / 640);
  car.rot += steer * TURN * sf * hs * Math.sign(fwd0) * dt;

  // split velocity along the new heading
  const fx = Math.cos(car.rot), fy = Math.sin(car.rot);
  let fwd = car.vx * fx + car.vy * fy;
  let lat = -car.vx * fy + car.vy * fx;

  if (throttle > 0 && fwd < S.max) fwd += (S.max - fwd) * S.rate * dt;
  if (throttle < 0) { if (fwd > 2) fwd -= BRAKE * dt; else fwd = Math.max(-REV_MAX, fwd - REV_ACC * dt); }
  fwd -= fwd * S.drag * dt * (throttle > 0 && fwd <= S.max ? 0.25 : 1);
  if (fwd > S.max) fwd -= (fwd - S.max) * S.over * dt;
  const roll = S.roll * dt;
  if (Math.abs(fwd) < roll) fwd = 0; else fwd -= Math.sign(fwd) * roll;
  if (fwd > 0) fwd -= Math.abs(lat) * 0.6 * dt;
  lat *= Math.exp(-S.grip * dt);

  car.vx = fx * fwd - fy * lat; car.vy = fy * fwd + fx * lat;
  car.fwd = fwd; car.lat = lat;
  car.x += car.vx * dt; car.y += car.vy * dt;
}

// Node export for tests/comparison against the Python port (ignored in the browser)
if (typeof module !== 'undefined') module.exports = { WORLD_W, WORLD_H, HALF_W, KERB_W, CAR_R, TAU, CONTROL, SURF, BRAKE, REV_MAX, REV_ACC, TURN, START_IDX_FROM_END, wrapAngle, cr, buildTrack, stepCar };
