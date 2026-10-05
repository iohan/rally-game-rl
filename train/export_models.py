"""Export several checkpoints to ../models/ + index.json so the game can switch model (key N).
Each model is run once from the start line on Granskogsbanan so index.json gets a lap status."""
import os, json
from export import policy_to_json
from env import RaceEnv

MODELS = [
    ('Granskogsbanan · 25k steps',  'runs/run5/ckpt_25000_steps.zip',  'gb_025k'),
    ('Granskogsbanan · 50k steps',  'runs/run5/ckpt_50000_steps.zip',  'gb_050k'),
    ('Granskogsbanan · 75k steps',  'runs/run5/ckpt_75000_steps.zip',  'gb_075k'),
    ('Granskogsbanan · 100k steps', 'runs/run5/ckpt_100000_steps.zip', 'gb_100k'),
    ('Granskogsbanan · 150k steps', 'runs/run5/ckpt_150000_steps.zip', 'gb_150k'),
    ('Granskogsbanan · 200k steps', 'runs/run5/ckpt_200000_steps.zip', 'gb_200k'),
    ('Granskogsbanan · 300k steps', 'runs/run5/ckpt_300000_steps.zip', 'gb_300k'),
    ('Granskogsbanan · 500k steps', 'runs/run5/final.zip',             'gb_500k'),
    ('Random tracks · 2M steps',       'runs/run4/final.zip',             'slump_2M'),
]
os.makedirs('../models', exist_ok=True)
index = []
for name, src, fid in MODELS:
    m, model = policy_to_json(src)
    json.dump(model, open(f'../models/{fid}.json', 'w'))
    env = RaceEnv(random_start=False, seed=123); o, _ = env.reset()
    while True:
        a, _ = m.predict(o, deterministic=True)
        o, r, term, trunc, info = env.step(a)
        if term or trunc: break
    status = f"lap {env.steps/30:.1f} s" if info['lap'] else f"off track after {info['progress_px']:.0f} px"
    index.append({'name': name, 'file': f'models/{fid}.json', 'status': status, 'default': fid == 'slump_2M'})
    print(f"{name:26s} {status}")
json.dump(index, open('../models/index.json', 'w'), ensure_ascii=False, indent=1)
print('wrote ../models/index.json')
