"""Write the test tracks + a few random tracks to ../tracks.json so the game can switch track (key T)."""
import json, numpy as np
from tracks import TEST_TRACKS, make_random_track

out = [{'name': n, 'control': c} for n, c in TEST_TRACKS.items()]
for seed in (11, 22, 33):
    t = make_random_track(np.random.default_rng(seed))
    out.append({'name': f'Random track {seed}', 'control': [[round(x), round(y)] for x, y in t.control]})
json.dump(out, open('../tracks.json', 'w'))
print('wrote ../tracks.json:', ', '.join(o['name'] for o in out))
