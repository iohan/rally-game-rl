// Importera ett eget inspelat klipp (från spelets ?rec-läge, tangent V) till filmpipelinen.
//   node import-clip.mjs ~/Downloads/asphalt-race-16x9-....webm step1_game_16x9
// Konverterar till mp4 i rätt storlek/30 fps, lägger i public/clips/ och registrerar längden i index.json.
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATS, FPS } from './src/scenes.js';

const [src, name] = process.argv.slice(2);
if (!src || !name) { console.error('användning: node import-clip.mjs <videofil> <klippnamn t.ex. step1_game_16x9>'); process.exit(1); }
const fmt = FORMATS.find(f => name.endsWith('_' + f.id));
if (!fmt) { console.error('klippnamnet måste sluta på ett format: ' + FORMATS.map(f => '_' + f.id).join(', ')); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(here, 'node_modules', '.bin', 'remotion');
const out = path.join(here, 'public', 'clips', name + '.mp4');
const ff = spawnSync(bin, ['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-r', String(FPS), '-vf', `scale=${fmt.width}:${fmt.height}:flags=lanczos`,
  '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', out], { stdio: 'inherit' });
if (ff.status !== 0) process.exit(ff.status);
const probe = spawnSync(bin, ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', out], { encoding: 'utf8' });
const frames = parseInt(probe.stdout.trim());
const indexFile = path.join(here, 'public', 'clips', 'index.json');
const index = JSON.parse(await readFile(indexFile, 'utf8'));
index[name] = frames;
await writeFile(indexFile, JSON.stringify(index, null, 1));
console.log(`${name}.mp4: ${frames} frames (${(frames / FPS).toFixed(1)} s) -> rendera med: node render.mjs ${name.split('_')[0]}`);
