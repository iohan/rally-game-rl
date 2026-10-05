# Asfaltsrace – bilspel med AI-förare tränad med reinforcement learning

Top-down bilspel i Phaser 3 där en PPO-agent (Stable-Baselines3) lärt sig köra runt banan utan att lämna asfalten.
Fysiken ligger i `sim.js`, är portad till `train/sim.py` och verifierad lika till 1e-12, så det AI:n lär sig i Python gäller i spelet.

Milstolpar, git-taggar och filmtips: [HISTORIK.md](HISTORIK.md).

## Spela

Kräver bara en webbserver (filer laddas med `fetch`, så `file://` fungerar inte).

```bash
python3 -m http.server 8765
```

Öppna http://localhost:8765 och tryck på en piltangent.

### Tangenter

| Tangent | Funktion |
|---|---|
| `↑` `↓` | gas / broms och back |
| `←` `→` | sväng |
| `A` | AI:n tar över ratten (piltangent eller `A` igen = du tar över). HUD visar "AI DRIVING" |
| `S` | visa/dölj AI:ns sensorer (7 strålar, grön = fritt, röd = kant nära) |
| `N` | byt AI-modell (9 st, från 25k träningssteg till slumpbanemodellen) |
| `T` | byt bana (Granskogsbanan, Tallmon, Spegelbanan, Ovalen, tre slumpbanor) |
| `R` | starta om |
| `M` | motorljud av/på |

## Träna själv

Kräver Python 3.12 och [uv](https://docs.astral.sh/uv/). Python 3.14 saknar paket för torch.

```bash
uv venv --python 3.12 train/.venv && uv pip install --python train/.venv/bin/python -r train/requirements.txt
```

Alla kommandon körs från `train/`:

```bash
cd train
```

| Kommando | Vad |
|---|---|
| `.venv/bin/python check_sim.py` | verifiera att Python-fysiken matchar `sim.js` (kräver node) |
| `.venv/bin/python baseline.py` | regelstyrd testförare, bevisar att miljön fungerar |
| `.venv/bin/python train.py 500000 namn` | träna på Granskogsbanan, ca 1 min |
| `.venv/bin/python train.py 2000000 namn random` | träna på slumpbanor, ca 6 min |
| `.venv/bin/python train.py 500000 namn fixed 25000` | checkpoint var 25k steg |
| `.venv/bin/python evaluate.py runs/namn/best_model.zip` | utvärdera från startlinjen |
| `.venv/bin/python evaluate_tracks.py runs/namn/best_model.zip` | utvärdera på otränade banor |
| `.venv/bin/python export.py runs/namn/best_model.zip ../model.json` | exportera till spelet (standardmodell) |
| `.venv/bin/python export_models.py` | exportera checkpoints till `models/` (listan i filen) |
| `.venv/bin/python export_tracks.py` | skriv `tracks.json` |
| `.venv/bin/python plot_curves.py` | träningskurvor som `curves.png` + `curves.gif` |
| `.venv/bin/tensorboard --logdir runs` | följ träningen live på http://localhost:6006 |

Efter export: `node check_ai.js` verifierar att JS-föraren fattar exakt samma beslut som Python.

## Filmer

`film/` innehåller en pipeline som spelar in spelet deterministiskt (Playwright) och komponerar filmer med Remotion,
en per steg i [HISTORIK.md](HISTORIK.md), i två format: 1920×1080 (16:9, liggande för LinkedIn) och 1080×1920 (9:16, stående för Reels/Shorts/TikTok). Filmerna och spelets HUD är på engelska.

```bash
film/make.sh
```

Första körningen installerar npm-paket (Remotion, Playwright). Hela körningen tar ca 15 min. `film/make.sh steg3`
gör bara om en scen. Resultat: `film/out/<steg>-<format>.mp4`. Scenernas innehåll (bana, modell, bildtexter, längd)
ligger i `film/src/scenes.js`; titelkort och layout i `film/src/Film.jsx`.

Spelet har ett filmläge via URL-parametrar (`?film=1&track=3&model=8&ai=1&sensors=1`) där spelloopen stegas
frame för frame, så samma kod ger samma film varje gång.

## Hur AI:n fungerar

- **Observation** (14 tal): 7 avståndsstrålar till asfaltkanten, fart, sidoglid, sidoposition, riktningsfel, kurvatur 100/250/500 px framåt. Inget säger vilken bana den är på, därför generaliserar den till nya banor.
- **Handling**: gas/broms/inget × vänster/höger/rakt, 30 beslut per sekund.
- **Reward**: + framsteg längs banan, − liten tidskostnad, −10 och avbrott om bilen lämnar asfalten, +50 vid fullt varv. Konstanterna ligger överst i `train/env.py`.
- **Nät**: 14 → 64 → 64 → 9, 5705 vikter, exporteras som JSON och körs i `ai.js`.

## Filstruktur

| Fil | Innehåll |
|---|---|
| `index.html` | spelet (Phaser 3, rendering, HUD, kontroller) |
| `sim.js` | bana och bilfysik, utan Phaser |
| `ai.js` | AI-förare i webbläsaren: observation + nätet framåt |
| `model.json`, `models/` | exporterade nät |
| `tracks.json` | banor för spelet |
| `train/sim.py`, `train/env.py` | Python-port av fysiken, Gymnasium-miljö |
| `train/tracks.py` | testbanor, validering, slumpgenerator |
| `train/runs/` | modeller och loggar (utanför git) |
| `film/` | filmpipeline: `record.mjs` (Playwright), `src/` (Remotion), `make.sh` |
