# Historik – milstolpar för filmning

Varje steg har en git-tagg. Hoppa dit med `git checkout <tagg>`, starta `python3 -m http.server 8765`
och öppna http://localhost:8765. Tillbaka till senaste: `git checkout master`.
Python-miljön (`train/.venv`) ligger utanför git och fungerar på alla steg från 2a och framåt.

| Steg | Tagg | Commit | Vad man ser | Tangenter |
|---|---|---|---|---|
| 1 | `steg1-spel` | `17e91d0` | Spelet som det var: du kör själv runt Granskogsbanan. | Piltangenter |
| 2a | `steg2a-regelforare` | `b34c573` | Ingen AI än. En handskriven "dum" förare (pure pursuit) klarar varvet på 41.6 s, i terminalen. Bevisar att träningsmiljön funkar. Bra kontrast till steg 2b. | `train/.venv/bin/python train/baseline.py` |
| 2b | `steg2b-ai-granskogsbanan` | `4ef304b` | AI:n kör i spelet, varvtid 20.3 s. Tränad enbart på Granskogsbanan (500k steg, 1 min). | `A` |
| 2c | `steg2c-ny-bana` | `5f3ee29` | Samma modell som 2b, men nu kan man byta bana. Klarar Tallmon, Spegelbanan, slumpbanor. **Åker av på Ovalen** (snävare kurva än något den sett). | `A`, `T` |
| 3 | `steg3-slumpbanor` | `203bb19` | Modell tränad på tusentals slumpbanor (2M steg, 6 min). Klarar alla banor inkl. Ovalen, 20.2 s på Granskogsbanan trots att den aldrig tränat där. | `A`, `T` |
| 4 | `steg4-sensorer` | `6ed9d73` | AI:ns 7 strålar ritas runt bilen (grön = fritt, röd = kant nära). HUD visar gas/broms och ratt. Förklarar *vad* AI:n ser. | `S` |
| 5 | `steg5-modellvaxling` | `9a76a96` | Läroprocessen: växla mellan 9 sparade modeller. 25k steg åker av efter 1.7 s, 50k kommer 2/3 varv, 75k+ klarar varvet. Sista = slumpbanemodellen. | `N` |
| 6 | `steg6-kurvor` | `220255d` | Träningskurvor som bild och animerad GIF: `train/curves.png`, `train/curves.gif`. | se nedan |

**Tips:** från steg 5 och framåt kan nästan allt filmas från senaste commit utan att hoppa i historiken:
`N` väljer modell (t.ex. "Granskogsbanan 500k" = steg 2b, "Slumpbanor 2M" = steg 3), `T` väljer bana, `S` sensorer av/på.
Bara steg 1 (inget AI-läge) och 2a (terminal) kräver checkout av sin tagg.

## Mellanliggande commits (ej egna filmer)

| Commit | Innehåll |
|---|---|
| `7822f7a` | Fysik och bana lyfts ut till `sim.js`. Ingen synlig skillnad. |
| `171587d` | Första PPO-träningen (`train.py`). Innehöll buggen där framsteg mättes över halva beslutet; "varv" var i själva verket två varv. |
| `1e08d20` | Generator viktad mot snäva kurvor, `model.json` = run4. |

## Filmerna

Spelas in och renderas automatiskt med `film/make.sh` (se README). En film per steg ovan, 16:9 och 1:1.
Steg 1 och 2a körs av den regelstyrda föraren (`driver=rule` i filmläget), eftersom ingen människa sitter vid tangenterna
vid inspelningen; byt gärna ut steg 1-klippet mot en egen skärminspelning.

## Träningskurvor (steg 6)

- Färdiga: `train/curves.png` (stillbild) och `train/curves.gif` (kurvan växer fram på 10 s). Regenerera med
  `train/.venv/bin/python train/plot_curves.py` (kör från `train/`).
- Live under en träning, för skärminspelning: starta träningen, kör sedan
  `train/.venv/bin/tensorboard --logdir train/runs --reload_interval 5` och öppna http://localhost:6006.
  Graferna `race/lap_rate`, `race/off_rate`, `rollout/ep_rew_mean` uppdateras var 5:e sekund.
- Loggar och checkpoints i `train/runs/` ligger utanför git; vill du filma en ny träning, kör
  `train/.venv/bin/python train/train.py 500000 film fixed 25000` (1 min) eller `... 2000000 film random` (6 min).
