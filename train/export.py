"""Exportera PPO-policyn till JSON som ai.js kan läsa.
python export.py runs/run1/best_model.zip ../model.json
Skriver även en referensbana (traj) så check_ai.js kan verifiera JS-implementationen."""
import sys, json
import numpy as np
from stable_baselines3 import PPO
from env import RaceEnv, RAY_ANGLES, RAY_MAX, RAY_STEP, LOOKAHEAD, ACTIONS

src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else '../model.json'
m = PPO.load(src, device='cpu')
sd = {k: v.numpy().tolist() for k, v in m.policy.state_dict().items()}
layers = [
    {'W': sd['mlp_extractor.policy_net.0.weight'], 'b': sd['mlp_extractor.policy_net.0.bias'], 'act': 'tanh'},
    {'W': sd['mlp_extractor.policy_net.2.weight'], 'b': sd['mlp_extractor.policy_net.2.bias'], 'act': 'tanh'},
    {'W': sd['action_net.weight'], 'b': sd['action_net.bias'], 'act': 'linear'},
]
model = {
    'source': src,
    'obs': {'rayAngles': [float(a) for a in RAY_ANGLES], 'rayMax': RAY_MAX, 'rayStep': RAY_STEP, 'lookahead': list(LOOKAHEAD)},
    'actions': ACTIONS,
    'layers': layers,
}
json.dump(model, open(dst, 'w'))
n = sum(len(l['b']) * (len(l['W'][0]) + 1) for l in layers)
print(f"skrev {dst}: {len(layers)} lager, {n} vikter")

# referensbana för check_ai.js: startläge + (obs, action) per steg
env = RaceEnv(random_start=False, seed=123)
o, _ = env.reset()
ref = {'start': {'x': env.car.x, 'y': env.car.y, 'rot': env.car.rot, 'idx': env.idx}, 'steps': []}
while True:
    a, _ = m.predict(o, deterministic=True)
    ref['steps'].append({'obs': [float(v) for v in o], 'action': int(a)})
    o, r, term, trunc, info = env.step(a)
    if term or trunc: break
ref['lap'] = bool(info['lap'])
json.dump(ref, open('ai_ref.json', 'w'))
print(f"referens: {len(ref['steps'])} steg, varv={ref['lap']}")
