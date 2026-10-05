# Asphalt Race – a racing game with an AI driver trained by reinforcement learning

Top-down racing game in Phaser 3 where a PPO agent (Stable-Baselines3) has learned to drive around the track without leaving the asphalt.
The physics live in `sim.js`, are ported to `train/sim.py` and verified identical to 1e-12, so what the AI learns in Python holds in the game.

Milestones, git tags and filming notes: [HISTORY.md](HISTORY.md).

## Play

Only a web server is needed (files are loaded with `fetch`, so `file://` does not work).

```bash
python3 -m http.server 8765
```

Open http://localhost:8765 and press an arrow key.

### Keys

| Key | Function |
|---|---|
| `↑` `↓` | throttle / brake and reverse |
| `←` `→` | steer |
| `A` | the AI takes the wheel (arrow key or `A` again = you take over). The HUD shows "AI DRIVING" |
| `S` | show/hide the AI's sensors (7 rays, green = clear, red = edge close) |
| `N` | next AI model (9 of them, from 25k training steps to the random-track model) |
| `T` | next track (Granskogsbanan, Tallmon, Mirrored, The Oval, three random tracks) |
| `R` | restart |
| `M` | engine sound on/off |

## Train it yourself

Requires Python 3.12 and [uv](https://docs.astral.sh/uv/). Python 3.14 has no torch wheels yet.

```bash
uv venv --python 3.12 train/.venv && uv pip install --python train/.venv/bin/python -r train/requirements.txt
```

All commands run from `train/`:

```bash
cd train
```

| Command | What |
|---|---|
| `.venv/bin/python check_sim.py` | verify that the Python physics match `sim.js` (requires node) |
| `.venv/bin/python baseline.py` | rule-based test driver, proves the environment works |
| `.venv/bin/python train.py 500000 name` | train on Granskogsbanan, about 1 min |
| `.venv/bin/python train.py 2000000 name random` | train on random tracks, about 6 min |
| `.venv/bin/python train.py 500000 name fixed 25000` | checkpoint every 25k steps |
| `.venv/bin/python evaluate.py runs/name/best_model.zip` | evaluate from the start line |
| `.venv/bin/python evaluate_tracks.py runs/name/best_model.zip` | evaluate on unseen tracks |
| `.venv/bin/python export.py runs/name/best_model.zip ../model.json` | export to the game (default model) |
| `.venv/bin/python export_models.py` | export checkpoints to `models/` (list in the file) |
| `.venv/bin/python export_tracks.py` | write `tracks.json` |
| `.venv/bin/python plot_curves.py` | training curves as `curves.png` + `curves.gif` |
| `.venv/bin/tensorboard --logdir runs` | follow training live at http://localhost:6006 |

After exporting: `node check_ai.js` verifies that the JS driver makes exactly the same decisions as Python.

## Films

`film/` contains a pipeline that records the game deterministically (Playwright) and composes films with Remotion,
one per step in [HISTORY.md](HISTORY.md), in two formats: 1920×1080 (16:9, landscape for LinkedIn) and 1080×1920 (9:16, portrait for Reels/Shorts/TikTok).

```bash
film/make.sh
```

The first run installs npm packages (Remotion, Playwright). A full run takes about 15 min. `film/make.sh step3`
redoes a single scene. Output: `film/out/<step>-<format>.mp4`. Scene contents (track, model, captions, length)
live in `film/src/scenes.js`; title cards and layout in `film/src/Film.jsx`.

**Record your own clip** (e.g. step 1, manual driving): open the game with `?rec=16x9` or `?rec=9x16`.
The canvas is then locked to the film size and scaled to fit the window. Press `V` to start recording, drive,
press `V` again and a `.webm` is downloaded. Import and re-render:

```bash
cd film && node import-clip.mjs ~/Downloads/asphalt-race-16x9-*.webm step1_game_16x9 && node render.mjs step1
```

Step 1 is marked `manual: true` in `scenes.js`, so `make.sh` leaves your clip alone. `node record.mjs "" --all`
records manual clips with the rule-based driver again if you want the automatic version back.

The game has a film mode via URL parameters (`?film=1&track=3&model=8&ai=1&sensors=1`) where the game loop is
stepped frame by frame, so the same code gives the same film every time.

## How the AI works

- **Observation** (14 numbers): 7 distance rays to the asphalt edge, speed, lateral slip, lateral position, heading error, curvature 100/250/500 px ahead. Nothing says which track it is on, which is why it generalises to new tracks.
- **Action**: throttle/brake/none × left/right/straight, 30 decisions per second.
- **Reward**: + progress along the track, − a small time cost, −10 and episode end if the car leaves the asphalt, +50 for a full lap. The constants are at the top of `train/env.py`.
- **Network**: 14 → 64 → 64 → 9, 5705 weights, exported as JSON and run in `ai.js`.

## File structure

| File | Contents |
|---|---|
| `index.html` | the game (Phaser 3, rendering, HUD, controls) |
| `sim.js` | track and car physics, no Phaser |
| `ai.js` | AI driver in the browser: observation + forward pass |
| `model.json`, `models/` | exported networks |
| `tracks.json` | tracks for the game |
| `train/sim.py`, `train/env.py` | Python port of the physics, Gymnasium environment |
| `train/tracks.py` | test tracks, validation, random generator |
| `train/runs/` | models and logs (outside git) |
| `film/` | film pipeline: `record.mjs` (Playwright), `src/` (Remotion), `make.sh` |
