"""Träningskurvor från TensorBoard -> film/public/curves.json (för Remotion-animationen i steg 6)."""
import json, os, numpy as np
from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
here = os.path.dirname(os.path.abspath(__file__))
RUNS = [('Granskogsbanan', 'runs/run5_1'), ('Slumpbanor', 'runs/run4_2')]
out = {}
for label, path in RUNS:
    ea = EventAccumulator(os.path.join(here, path)); ea.Reload()
    out[label] = {}
    for tag, key in [('race/lap_rate', 'lap_rate'), ('race/off_rate', 'off_rate'), ('rollout/ep_rew_mean', 'reward')]:
        ev = ea.Scalars(tag)
        out[label][key] = {'x': [e.step for e in ev], 'y': [e.value for e in ev]}   # första mätpunkten efter 100 episoder, inget hittas på
dst = os.path.join(here, '..', 'film', 'public', 'curves.json')
json.dump(out, open(dst, 'w'))
print('skrev', os.path.relpath(dst), {k: len(v['lap_rate']['x']) for k, v in out.items()}, 'punkter')
