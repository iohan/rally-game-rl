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

## Mellanliggande commits (ej egna filmer)

| Commit | Innehåll |
|---|---|
| `7822f7a` | Fysik och bana lyfts ut till `sim.js`. Ingen synlig skillnad. |
| `171587d` | Första PPO-träningen (`train.py`). Innehöll buggen där framsteg mättes över halva beslutet; "varv" var i själva verket två varv. |
| `1e08d20` | Generator viktad mot snäva kurvor, `model.json` = run4. |

## Saknas för filmerna

- **Läroprocessen syns inte i spelet.** Mellan 2a och 2b finns inget sätt att visa "AI:n efter 50k steg kör som en full, efter 200k klarar den kurva 1, efter 500k hela varvet". Checkpoints finns lokalt i `train/runs/` (ignoreras av git) men spelet laddar bara `model.json`. Förslag: exportera 3–4 checkpoints till `models/` och låt en tangent växla modell i spelet.
- **Sensorerna syns inte.** Att rita de 7 strålarna och deras träffpunkter runt bilen gör det begripligt *vad* AI:n ser. Litet jobb, stor pedagogisk effekt.
- **Ingen TensorBoard-film.** Reward-kurvan som klättrar är den klassiska bilden. Loggarna i `train/runs/` finns kvar lokalt.
