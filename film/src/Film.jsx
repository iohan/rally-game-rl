import React from 'react';
import { AbsoluteFill, Sequence, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { FPS, FULL, SCENES } from './scenes.js';
import clipIndex from '../public/clips/index.json';
import { Curves } from './Curves.jsx';

export const TITLE_FRAMES = 4 * FPS;
export const END_FRAMES = 3 * FPS;
export const FULL_END_FRAMES = 6 * FPS;   // the end card is shown only once in the full film, so give it time
const FADE = Math.round(0.4 * FPS);

export const clipFrames = (clip, fmt) => clipIndex[`${clip.name}_${fmt.id}`] || Math.round(clip.seconds * FPS);
export const sceneFrames = (scene, fmt) => scene.curves ? scene.seconds * FPS : scene.clips.reduce((a, c) => a + clipFrames(c, fmt), 0);

const FONT = '"Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif';
const GREEN = '#1e3a14', YELLOW = '#ffd60a';

const Fade = ({ children, length }) => {
  const f = useCurrentFrame();
  const opacity = Math.min(interpolate(f, [0, FADE], [0, 1], { extrapolateRight: 'clamp' }), interpolate(f, [length - FADE, length], [1, 0], { extrapolateLeft: 'clamp' }));
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const TitleCard = ({ scene, fmt }) => {
  const f = useCurrentFrame();
  const up = spring({ frame: f, fps: FPS, config: { damping: 14 } });
  const s = fmt.width >= 1600 ? 1 : 0.8;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 20%, #3f7a2f, ${GREEN} 70%)`, color: 'white', fontFamily: FONT, justifyContent: 'center', padding: 100 * s }}>
      <div style={{ color: YELLOW, fontSize: 36 * s, fontWeight: 700, letterSpacing: 4, opacity: up }}>ASPHALT RACE · AI DRIVER</div>
      <div style={{ fontSize: 120 * s, fontWeight: 800, lineHeight: 1.05, marginTop: 16 * s, transform: `translateY(${(1 - up) * 40}px)` }}>{scene.title}</div>
      <div style={{ fontSize: 68 * s, fontWeight: 700, marginTop: 10 * s, transform: `translateY(${(1 - up) * 60}px)` }}>{scene.heading}</div>
      <div style={{ fontSize: 36 * s, lineHeight: 1.35, marginTop: 36 * s, maxWidth: 1300 * s, opacity: interpolate(f, [12, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{scene.text}</div>
    </AbsoluteFill>
  );
};

const EndCard = ({ fmt }) => {
  const s = fmt.width >= 1600 ? 1 : 0.78;
  return (
    <AbsoluteFill style={{ background: GREEN, color: 'white', fontFamily: FONT, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 44 * s, fontWeight: 700 }}>Code, models and training scripts</div>
      <div style={{ fontSize: 40 * s, color: YELLOW, marginTop: 16 * s }}>github.com/iohan/rally-game-rl</div>
      <div style={{ fontSize: 26 * s, opacity: 0.75, marginTop: 30 * s }}>Phaser 3 · Stable-Baselines3 PPO · Remotion</div>
    </AbsoluteFill>
  );
};

const Caption = ({ text, fmt }) => {
  const f = useCurrentFrame();
  const s = fmt.width >= 1600 ? 1 : 0.9;
  const y = interpolate(f, [0, 12], [40, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: (fmt.height > fmt.width ? 330 : 30) * s, display: 'flex', justifyContent: 'center', transform: `translateY(${y}px)`, opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <div style={{ background: 'rgba(0,0,0,0.72)', color: 'white', fontFamily: FONT, fontSize: 30 * s, fontWeight: 600, padding: `${14 * s}px ${30 * s}px`, borderRadius: 14 * s, maxWidth: fmt.width >= 1600 ? fmt.width * 0.55 : fmt.width * 0.8, textAlign: 'center', borderLeft: `6px solid ${YELLOW}` }}>{text}</div>
    </div>
  );
};

const GameClip = ({ clip, fmt }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(`clips/${clip.name}_${fmt.id}.mp4`)} style={{ width: '100%', height: '100%' }} />
    <Caption text={clip.caption} fmt={fmt} />
  </AbsoluteFill>
);

// Lays out parts back to back. Each part fades in/out against the green background.
const partList = () => {
  let at = 0; const parts = [];
  const push = (key, n, node) => { parts.push(<Sequence key={key} from={at} durationInFrames={n}><Fade length={n}>{node}</Fade></Sequence>); at += n; };
  return { parts, push };
};
const pushScene = (push, scene, fmt) => {
  if (scene.curves) { push(`${scene.id}-curves`, scene.seconds * FPS, <Curves fmt={fmt} />); return; }
  for (const clip of scene.clips) push(clip.name, clipFrames(clip, fmt), <GameClip clip={clip} fmt={fmt} />);
};

// One film per step: title card -> clips -> end card.
export const Film = ({ scene, fmt }) => {
  const { parts, push } = partList();
  push('title', TITLE_FRAMES, <TitleCard scene={scene} fmt={fmt} />);
  pushScene(push, scene, fmt);
  push('end', END_FRAMES, <EndCard fmt={fmt} />);
  return <AbsoluteFill style={{ background: GREEN }}>{parts}</AbsoluteFill>;
};

// The complete film: intro card -> (chapter card -> clips) for every step -> one end card.
export const fullFrames = fmt => TITLE_FRAMES + SCENES.reduce((a, s) => a + TITLE_FRAMES + sceneFrames(s, fmt), 0) + FULL_END_FRAMES;
export const FullFilm = ({ fmt }) => {
  const { parts, push } = partList();
  push('intro', TITLE_FRAMES, <TitleCard scene={FULL} fmt={fmt} />);
  for (const scene of SCENES) { push(`${scene.id}-title`, TITLE_FRAMES, <TitleCard scene={scene} fmt={fmt} />); pushScene(push, scene, fmt); }
  push('end', FULL_END_FRAMES, <EndCard fmt={fmt} />);
  return <AbsoluteFill style={{ background: GREEN }}>{parts}</AbsoluteFill>;
};
