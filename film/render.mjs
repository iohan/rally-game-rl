// Renderar alla filmer: bundlar Remotion-projektet en gång, sedan en MP4 per scen och format -> out/
//   node render.mjs            alla
//   node render.mjs steg3      bara scener vars id börjar så
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { SCENES, FORMATS } from './src/scenes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || '';
await mkdir(path.join(here, 'out'), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(here, 'src', 'index.jsx'), publicDir: path.join(here, 'public') });
for (const scene of SCENES) {
  if (!scene.id.startsWith(filter)) continue;
  for (const fmt of FORMATS) {
    const id = `${scene.id}-${fmt.id}`;
    const composition = await selectComposition({ serveUrl, id, inputProps: { scene, fmt } });
    const outputLocation = path.join(here, 'out', `${id}.mp4`);
    const t0 = Date.now();
    await renderMedia({ composition, serveUrl, codec: 'h264', crf: 24, outputLocation, inputProps: { scene, fmt } });   // crf 24: ~10 MB per 30 s
    console.log(`${id}.mp4  ${(composition.durationInFrames / composition.fps).toFixed(1)} s  (${((Date.now() - t0) / 1000).toFixed(0)} s render)`);
  }
}
