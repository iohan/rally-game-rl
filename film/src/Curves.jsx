// Animated training curves (data from public/curves.json, created by train/export_curves_json.py)
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { FPS } from './scenes.js';
import data from '../public/curves.json';

const FONT = '"Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif';
const COLORS = ['#ffd60a', '#6cc0ef'];
const PANELS = [['lap_rate', 'Share of completed laps'], ['off_rate', 'Share of run-offs']];

const Chart = ({ tag, title, x, y, w, h, progress }) => {
  const runs = Object.keys(data);
  const xmax = Math.max(...runs.map(r => data[r][tag].x[data[r][tag].x.length - 1]));
  const px = v => x + (v / xmax) * w, py = v => y + h - v * h;
  return (
    <g fontFamily={FONT}>
      <text x={x} y={y - 22} fill="white" fontSize={30} fontWeight={700}>{title}</text>
      {[0, 0.5, 1].map(v => <g key={v}><line x1={x} x2={x + w} y1={py(v)} y2={py(v)} stroke="rgba(255,255,255,0.18)" /><text x={x - 14} y={py(v) + 9} fill="#cfd8c3" fontSize={24} textAnchor="end">{Math.round(v * 100)}%</text></g>)}
      {[0, 0.5, 1].map(v => { const unit = xmax >= 1.5e6 ? 5e5 : 1e5, t = Math.round(v * xmax / unit) * unit; return <text key={v} x={px(t)} y={y + h + 34} fill="#cfd8c3" fontSize={24} textAnchor="middle">{t >= 1e6 ? (t / 1e6).toFixed(1).replace('.0', '') + ' M' : Math.round(t / 1000) + ' k'}</text>; })}
      <text x={x + w / 2} y={y + h + 70} fill="#cfd8c3" fontSize={24} textAnchor="middle">training steps</text>
      {runs.map((r, i) => {
        const s = data[r][tag]; const lim = xmax * progress;
        const pts = s.x.map((xv, k) => [xv, s.y[k]]).filter(p => p[0] <= lim);
        if (pts.length < 2) return null;
        const d = pts.map((p, k) => `${k ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
        const last = pts[pts.length - 1];
        return <g key={r}><path d={d} fill="none" stroke={COLORS[i]} strokeWidth={5} strokeLinejoin="round" /><circle cx={px(last[0])} cy={py(last[1])} r={8} fill={COLORS[i]} /></g>;
      })}
    </g>
  );
};

export const Curves = ({ fmt }) => {
  const f = useCurrentFrame();
  const progress = interpolate(f, [FPS * 0.5, FPS * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const runs = Object.keys(data);
  const W = fmt.width, H = fmt.height, wide = W >= 1600;
  const y0 = wide ? 190 : Math.max(140, H / 2 - 480);
  const panels = wide
    ? PANELS.map((p, i) => ({ p, x: 140 + i * 900, y: 190, w: 740, h: 620 }))
    : PANELS.map((p, i) => ({ p, x: 130, y: y0 + i * 470, w: 860, h: 320 }));
  return (
    <AbsoluteFill style={{ background: '#1e3a14' }}>
      <svg width={W} height={H}>
        <text x={W / 2} y={wide ? 90 : y0 - 80} fill="white" fontFamily={FONT} fontSize={wide ? 48 : 44} fontWeight={800} textAnchor="middle">How the AI learned</text>
        {panels.map(({ p, x, y, w, h }) => <Chart key={p[0]} tag={p[0]} title={p[1]} x={x} y={y} w={w} h={h} progress={progress} />)}
        {runs.map((r, i) => <g key={r} transform={`translate(${wide ? 140 + i * 420 : 130 + i * 420}, ${wide ? H - 50 : y0 + 2 * 470 + 40})`}><rect width={44} height={8} y={-6} fill={COLORS[i]} rx={4} /><text x={60} y={6} fill="white" fontFamily={FONT} fontSize={28}>{r}</text></g>)}
      </svg>
    </AbsoluteFill>
  );
};
