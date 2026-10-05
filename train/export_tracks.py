"""Skriv testbanor + några slumpbanor till ../tracks.json så spelet kan byta bana (tangent T)."""
import json, numpy as np
from tracks import TEST_TRACKS, make_random_track

out = [{'name': n, 'control': c} for n, c in TEST_TRACKS.items()]
for seed in (11, 22, 33):
    t = make_random_track(np.random.default_rng(seed))
    out.append({'name': f'Slumpbana {seed}', 'control': [[round(x), round(y)] for x, y in t.control]})
json.dump(out, open('../tracks.json', 'w'))
print('skrev ../tracks.json:', ', '.join(o['name'] for o in out))
