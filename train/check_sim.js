// Kör en fast styrsekvens i sim.js och skriver banan som JSON (jämförs mot Python i check_sim.py)
const s = require('../sim.js');
const t = s.buildTrack();
const p = t.pts[t.N - s.START_IDX_FROM_END];
const car = { x: p.x, y: p.y, rot: p.ang, vx: 0, vy: 0, fwd: 0, lat: 0 };
const out = { N: t.N, total: t.total, pts: t.pts.map(q => [q.x, q.y, q.ang, q.curv]), traj: [] };
for (let i = 0; i < 600; i++) {
  const throttle = i < 400 ? 1 : (i < 500 ? -1 : 0);
  const steer = i < 150 ? 0 : (i < 300 ? 1 : (i < 350 ? -1 : 0));
  const near = t.nearest(car.x, car.y);
  const surf = near.dist <= s.HALF_W ? 'asphalt' : near.dist <= s.HALF_W + s.KERB_W ? 'kerb' : 'grass';
  s.stepCar(car, throttle, steer, 1 / 60, s.SURF[surf]);
  out.traj.push([car.x, car.y, car.rot, car.vx, car.vy, near.idx]);
}
process.stdout.write(JSON.stringify(out));
