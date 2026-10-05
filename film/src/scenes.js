// Film content. Shared by record.mjs (records game clips) and Remotion (composes the films).
// params = URL parameters for the game's film mode (see index.html). Model index per models/index.json:
//   0=25k 1=50k 2=75k 3=100k 4=150k 5=200k 6=300k 7=500k (single track) 8=random tracks 2M
// Tracks per tracks.json: 0=Granskogsbanan 1=Tallmon 2=Mirrored 3=The Oval 4-6=random tracks
export const FPS = 30;
export const FORMATS = [
  { id: '16x9', width: 1920, height: 1080, zoom: 1.2, ui: 1.4 },   // landscape (LinkedIn)
  { id: '9x16', width: 1080, height: 1920, zoom: 1.15, ui: 1.1 },   // portrait (Reels, Shorts, TikTok)
];

export const SCENES = [
  {
    id: 'step1', title: 'Step 1', heading: 'A game', text: 'A top-down racing game built in Phaser. You drive around Granskogsbanan GP yourself.',
    // manual: true -> record.mjs skips the clip; record it yourself with ?rec=16x9 / ?rec=9x16 + V and import with import-clip.mjs.
    // Remove manual (or run record.mjs with --all) to have the rule-based driver drive it instead.
    clips: [{ name: 'step1_game', manual: true, params: { track: 0, driver: 'rule', sensors: 0 }, seconds: 24, caption: 'Manual driving – throttle, brake and steer with the arrow keys' }],
  },
  {
    id: 'step2a', title: 'Step 2a', heading: 'A hand-written driver', text: 'Before any AI: a ten-line rule. Aim at a point 120 px ahead, brake before corners. Laps in 42 s.',
    clips: [{ name: 'step2a_rule', params: { track: 0, driver: 'rule', sensors: 1 }, seconds: 24, caption: 'Rule-based driver: aims at the yellow point, brakes when curvature ahead is high' }],
  },
  {
    id: 'step2b', title: 'Step 2b', heading: 'The AI learns to drive', text: 'Reinforcement learning: 500,000 attempts in one minute. Reward for progress, penalty for leaving the asphalt.',
    clips: [{ name: 'step2b_ai', params: { track: 0, model: 7, ai: 1, sensors: 0 }, seconds: 24, stopWhen: 'lap', caption: 'Trained only on Granskogsbanan – lap time 20 s, twice as fast as the rule' }],
  },
  {
    id: 'step2c', title: 'Step 2c', heading: 'A track it has never seen', text: 'The AI only sees 7 distance rays, speed and the curvature ahead. Nothing tells it which track it is on.',
    clips: [
      { name: 'step2c_tallmon', params: { track: 1, model: 7, ai: 1, sensors: 0 }, seconds: 14, caption: 'Tallmon: never seen before – handles it' },
      { name: 'step2c_oval', params: { track: 3, model: 7, ai: 1, sensors: 0 }, seconds: 20, stopWhen: 'off', caption: 'The Oval: a tighter corner than anything in training – runs off' },
    ],
  },
  {
    id: 'step3', title: 'Step 3', heading: 'Trained on random tracks', text: 'A new track every attempt, 2 million steps in 6 minutes. Granskogsbanan was kept out of training.',
    clips: [
      { name: 'step3_oval', params: { track: 3, model: 8, ai: 1, sensors: 0 }, seconds: 22, stopWhen: 'lap', caption: 'The Oval: now makes the corner it ran off in' },
      { name: 'step3_gransk', params: { track: 0, model: 8, ai: 1, sensors: 0 }, seconds: 12, caption: 'Granskogsbanan: never trained here, still 20 s' },
    ],
  },
  {
    id: 'step4', title: 'Step 4', heading: 'What the AI sees', text: 'Seven rays measure the distance to the edge of the asphalt. Green = clear, red = edge close. Plus speed, slip and curvature ahead.',
    clips: [{ name: 'step4_sensors', params: { track: 0, model: 8, ai: 1, sensors: 1, zoomMul: 1.35 }, seconds: 24, caption: '14 numbers in, 9 possible actions out – 30 decisions per second' }],
  },
  {
    id: 'step5', title: 'Step 5', heading: 'The learning process', text: 'The same network at three points during training.',
    clips: [
      { name: 'step5_25k', params: { track: 0, model: 0, ai: 1, sensors: 1 }, seconds: 8, stopWhen: 'off', caption: 'After 25,000 steps: random button presses' },
      { name: 'step5_50k', params: { track: 0, model: 1, ai: 1, sensors: 1 }, seconds: 20, stopWhen: 'off', caption: 'After 50,000 steps: makes turn 1, runs off later' },
      { name: 'step5_500k', params: { track: 0, model: 7, ai: 1, sensors: 1 }, seconds: 24, stopWhen: 'lap', caption: 'After 500,000 steps: a full lap' },
    ],
  },
  {
    id: 'step6', title: 'Step 6', heading: 'The training curves', text: 'Share of completed laps and run-offs during training.',
    curves: true, seconds: 14,
  },
];
