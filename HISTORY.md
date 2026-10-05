# History – milestones for filming

Every step has a git tag. Jump there with `git checkout <tag>`, start `python3 -m http.server 8765`
and open http://localhost:8765. Back to the latest: `git checkout master`.
The Python environment (`train/.venv`) lives outside git and works at every step from 2a onwards.
Tags up to `steg3-slumpbanor` have a Swedish UI; from `steg4-sensorer` and later the game is in English (commit `5b94aac`).

| Step | Tag | Commit | What you see | Keys |
|---|---|---|---|---|
| 1 | `steg1-spel` | `17e91d0` | The game as it was: you drive around Granskogsbanan yourself. | arrow keys |
| 2a | `steg2a-regelforare` | `b34c573` | No AI yet. A hand-written "dumb" driver (pure pursuit) laps in 41.6 s, in the terminal. Proves the training environment works. Good contrast to step 2b. | `train/.venv/bin/python train/baseline.py` |
| 2b | `steg2b-ai-granskogsbanan` | `4ef304b` | The AI drives in the game, lap time 20.3 s. Trained only on Granskogsbanan (500k steps, 1 min). | `A` |
| 2c | `steg2c-ny-bana` | `5f3ee29` | Same model as 2b, but now you can switch track. Handles Tallmon, the mirrored track, random tracks. **Runs off on The Oval** (a tighter corner than anything it has seen). | `A`, `T` |
| 3 | `steg3-slumpbanor` | `203bb19` | Model trained on thousands of random tracks (2M steps, 6 min). Handles every track incl. The Oval, 20.2 s on Granskogsbanan despite never training there. | `A`, `T` |
| 4 | `steg4-sensorer` | `6ed9d73` | The AI's 7 rays drawn around the car (green = clear, red = edge close). Explains *what* the AI sees. | `S` |
| 5 | `steg5-modellvaxling` | `9a76a96` | The learning process: switch between 9 saved models. 25k steps runs off after 1.7 s, 50k gets 2/3 of a lap, 75k+ completes the lap. Last = the random-track model. | `N` |
| 6 | `steg6-kurvor` | `220255d` | Training curves as image and animated GIF: `train/curves.png`, `train/curves.gif`. | see below |

**Tip:** from step 5 onwards almost everything can be filmed from the latest commit without jumping through history:
`N` picks the model (e.g. "Granskogsbanan · 500k steps" = step 2b, "Random tracks · 2M steps" = step 3), `T` picks the track, `S` toggles sensors.
Only step 1 (no AI mode) and 2a (terminal) require checking out their tag.

## Intermediate commits (no films of their own)

| Commit | Contents |
|---|---|
| `7822f7a` | Physics and track extracted to `sim.js`. No visible change. |
| `171587d` | First PPO training (`train.py`). Contained the bug where progress was measured over half the decision; a "lap" was really two laps. |
| `1e08d20` | Generator biased towards tight corners, `model.json` = run4. |

## The films

Recorded and rendered automatically with `film/make.sh` (see README). One film per step above, 16:9 (landscape) and 9:16 (portrait), in English.
Step 2a is driven by the rule-based driver (`driver=rule` in film mode). Step 1 is recorded manually: open the game with
`?rec=16x9` and `?rec=9x16` respectively, press `V`, drive a lap, press `V` again and import with `film/import-clip.mjs` (see README).

## Training curves (step 6)

- Ready-made: `train/curves.png` (still) and `train/curves.gif` (the curve grows over 10 s). Regenerate with
  `train/.venv/bin/python train/plot_curves.py` (run from `train/`).
- Live during a training run, for screen recording: start the training, then run
  `train/.venv/bin/tensorboard --logdir train/runs --reload_interval 5` and open http://localhost:6006.
  The graphs `race/lap_rate`, `race/off_rate`, `rollout/ep_rew_mean` update every 5 seconds.
- Logs and checkpoints in `train/runs/` are outside git; to film a new training run, use
  `train/.venv/bin/python train/train.py 500000 film fixed 25000` (1 min) or `... 2000000 film random` (6 min).
