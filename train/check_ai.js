// Kör JS-föraren från Python-referensens startläge och jämför observation + val steg för steg.
global.HALF_W = require('../sim.js').HALF_W;
const sim = require('../sim.js'), { AiDriver } = require('../ai.js');
const fs = require('fs'), path = require('path');
const model = JSON.parse(fs.readFileSync(path.join(__dirname, '../model.json')));
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'ai_ref.json')));
const track = sim.buildTrack(), ai = new AiDriver(model, track);
const car = { x: ref.start.x, y: ref.start.y, rot: ref.start.rot, vx: 0, vy: 0, fwd: 0, lat: 0 };
let idx = ref.start.idx, maxObsDiff = 0, mismatches = 0, progress = 0;
for (let n = 0; n < ref.steps.length; n++) {
  const d = ai.decide(car, idx);
  for (let i = 0; i < 14; i++) maxObsDiff = Math.max(maxObsDiff, Math.abs(d.obs[i] - ref.steps[n].obs[i]));
  if (d.action !== ref.steps[n].action) { mismatches++; if (mismatches <= 5) console.log(`steg ${n}: js=${d.action} py=${ref.steps[n].action}`); }
  for (let f = 0; f < 2; f++) {
    const near = track.nearest(car.x, car.y);
    const surf = near.dist <= sim.HALF_W ? 'asphalt' : near.dist <= sim.HALF_W + sim.KERB_W ? 'kerb' : 'grass';
    sim.stepCar(car, d.throttle, d.steer, 1 / 60, sim.SURF[surf]);
  }
  const ni = track.nearest(car.x, car.y).idx;
  progress += ((ni - idx + track.N / 2 + track.N) % track.N) - track.N / 2; idx = ni;
}
console.log(`${ref.steps.length} steg: max obs-diff ${maxObsDiff.toExponential(2)}, olika val ${mismatches}, framsteg ${(progress * track.step).toFixed(0)} px (varv=${progress >= track.N})`);
console.log(mismatches === 0 && progress >= track.N ? 'OK' : 'FEL');
