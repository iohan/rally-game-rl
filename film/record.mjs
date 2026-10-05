// Records game clips with Playwright: the game is stepped deterministically frame by frame (window.filmAdvance)
// and every frame (JPEG) is piped to ffmpeg. Result: public/clips/<name>_<format>.mp4 + index.json.
//   node record.mjs                 missing clips only
//   node record.mjs step2c          only clips whose scene id starts like that
//   node record.mjs "" --force      redo everything (make.sh does this)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES, FORMATS, FPS } from './src/scenes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');           // the game folder (index.html)
const OUT = path.join(here, 'public', 'clips');
const FFMPEG = path.join(here, 'node_modules', '.bin', 'remotion');
const filter = process.argv[2] || '';
const force = process.argv.includes('--force');
const all = process.argv.includes('--all');      // also record clips marked manual: true (with the rule-based driver)

// Small static server for the game (python3 -m http.server works too, but this is self-contained)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
  try { const b = await readFile(p); res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream'); res.setHeader('Content-Length', b.length); res.end(b); }
  catch { res.statusCode = 404; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

async function record(clip, fmt) {
  const name = `${clip.name}_${fmt.id}`, file = path.join(OUT, name + '.mp4');
  const params = { film: 1, zoom: (fmt.zoom * (clip.params.zoomMul || 1)).toFixed(2), ui: fmt.ui || 1, ...clip.params };
  delete params.zoomMul;
  const url = `http://127.0.0.1:${PORT}/?` + new URLSearchParams(params);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: fmt.width, height: fmt.height }, deviceScaleFactor: 1 });
  await page.goto(url, { timeout: 60000 });
  await page.waitForFunction(() => window.filmState && window.filmState().ready, null, { timeout: 60000 });
  const ff = spawn(FFMPEG, ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `scale=${fmt.width}:${fmt.height}:flags=lanczos`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const maxFrames = Math.round(clip.seconds * FPS);
  let frames = 0, stopAt = null;
  const SIM_PER_FRAME = 60 / FPS;
  for (let f = 0; f < maxFrames; f++) {
    const { jpeg, state } = await page.evaluate(n => { window.filmAdvance(n); return { jpeg: window.filmFrame(), state: window.filmState() }; }, SIM_PER_FRAME);
    const ok = ff.stdin.write(Buffer.from(jpeg.split(',')[1], 'base64'));
    if (!ok) await new Promise(r => ff.stdin.once('drain', r));
    frames++;
    if (stopAt == null) {
      if (clip.stopWhen === 'off' && state.surf !== 'asphalt') stopAt = f + Math.round(1.5 * FPS);
      if (clip.stopWhen === 'lap' && state.lap >= 2) stopAt = f + Math.round(1.2 * FPS);
    }
    if (stopAt != null && f >= stopAt) break;
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  await browser.close();
  console.log(`${name}: ${frames} frames (${(frames / FPS).toFixed(1)} s)`);
  return [name, frames];
}

await mkdir(OUT, { recursive: true });
const indexFile = path.join(OUT, 'index.json');
const index = existsSync(indexFile) ? JSON.parse(await readFile(indexFile, 'utf8')) : {};
for (const scene of SCENES) {
  if (!scene.id.startsWith(filter) || !scene.clips) continue;
  for (const clip of scene.clips) for (const fmt of FORMATS) {
    const name = `${clip.name}_${fmt.id}`;
    if (clip.manual && !all) {
      const have = index[name] && existsSync(path.join(OUT, name + '.mp4'));
      console.log(`${name}: manual clip, ${have ? 'using imported' : 'MISSING – record with ?rec=' + fmt.id + ' and import with import-clip.mjs'}`);
      continue;
    }
    if (!force && index[name] && existsSync(path.join(OUT, name + '.mp4'))) { console.log(`${name}: already exists (skipping, --force re-records)`); continue; }
    let result, lastErr;
    for (let attempt = 1; attempt <= 3 && !result; attempt++) {
      try { result = await record(clip, fmt); }
      catch (e) { lastErr = e; console.log(`${name}: attempt ${attempt} failed (${e.message.split('\n')[0]})`); }
    }
    if (!result) throw lastErr;
    index[result[0]] = result[1];
    await writeFile(indexFile, JSON.stringify(index, null, 1));
  }
}
server.close();
console.log('done ->', OUT);
