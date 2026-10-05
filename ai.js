// ============================================================
//  ai.js – AI-förare i webbläsaren. Bygger samma observation som
//  train/env.py och kör det exporterade nätet (model.json) framåt.
//  Allt här måste matcha env.py exakt; verifieras av train/check_ai.js.
// ============================================================
'use strict';

const AI_DECISION_DT = 2 / 60;   // FRAME_SKIP=2 i env.py -> 30 beslut/s

class AiDriver {
  constructor(model, track) {
    this.model = model; this.track = track;
    this.cfg = model.obs;
    this.nRay = Math.round(this.cfg.rayMax / this.cfg.rayStep);
  }

  // Avstånd längs strålen tills mittlinjeavståndet > HALF_W. Samma sampling som env._ray.
  ray(car, idx, ang) {
    const t = this.track, N = t.N, cfg = this.cfg;
    const cx = car.x, cy = car.y, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let s = 1; s <= this.nRay; s++) {
      const d = s * cfg.rayStep, px = cx + ca * d, py = cy + sa * d;
      let best = Infinity;
      for (let w = -80; w <= 80; w++) {
        const p = t.pts[(idx + w + N * 2) % N];
        const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
        if (d2 < best) best = d2;
      }
      if (Math.sqrt(best) > HALF_W) return Math.min((s - 1) * cfg.rayStep, cfg.rayMax) / cfg.rayMax;
    }
    return 1;
  }

  observe(car, idx) {
    const t = this.track, N = t.N, p = t.pts[idx], cfg = this.cfg;
    const o = [];
    for (const a of cfg.rayAngles) o.push(this.ray(car, idx, car.rot + a));
    const latOff = ((car.x - p.x) * p.nx + (car.y - p.y) * p.ny) / HALF_W;
    const headErr = Math.atan2(Math.sin(car.rot - p.ang), Math.cos(car.rot - p.ang)) / Math.PI;
    o.push(car.fwd / 640, car.lat / 300, latOff, headErr);
    for (const k of cfg.lookahead) o.push(t.pts[(idx + k) % N].curv * 380);
    for (let i = 0; i < o.length; i++) o[i] = Math.max(-1, Math.min(1, Math.fround(o[i])));
    return o;
  }

  forward(obs) {
    let x = obs;
    for (const L of this.model.layers) {
      const y = new Array(L.b.length);
      for (let i = 0; i < L.b.length; i++) {
        let s = L.b[i]; const row = L.W[i];
        for (let j = 0; j < row.length; j++) s += row[j] * x[j];
        y[i] = L.act === 'tanh' ? Math.tanh(s) : s;
      }
      x = y;
    }
    return x;
  }

  // -> { throttle, steer, action, obs }
  decide(car, idx) {
    const obs = this.observe(car, idx), logits = this.forward(obs);
    let action = 0;
    for (let i = 1; i < logits.length; i++) if (logits[i] > logits[action]) action = i;
    const [throttle, steer] = this.model.actions[action];
    return { throttle, steer, action, obs };
  }
}

if (typeof module !== 'undefined') module.exports = { AiDriver, AI_DECISION_DT };
