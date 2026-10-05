"""Träna en PPO-agent att köra ett varv.
  python train.py [steg] [namn] [fixed|random] [checkpoint-intervall, default 100000]
    fixed  = träna på Granskogsbanan (default)
    random = ny slumpbana varje episod; Granskogsbanan hålls utanför träningen och används bara för eval
Följ träningen:  tensorboard --logdir runs
"""
import os, sys, time
import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import SubprocVecEnv, DummyVecEnv
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback, BaseCallback
from stable_baselines3.common.monitor import Monitor
from env import RaceEnv

N_ENVS = 8


def make_env(seed, random_start=True, random_track=False):
    def _f():
        return Monitor(RaceEnv(random_start=random_start, seed=seed, random_track=random_track), info_keywords=('progress_px', 'lap', 'off'))
    return _f


class StatsCallback(BaseCallback):
    """Skriver varv/avåkningar per 100 episoder till TensorBoard och terminalen."""
    def __init__(self):
        super().__init__(); self.eps = []
    def _on_step(self):
        for info in self.locals['infos']:
            if 'episode' in info:
                self.eps.append((info['lap'], info['off'], info['progress_px'], info['episode']['r']))
                if len(self.eps) % 100 == 0:
                    e = np.array(self.eps[-100:], dtype=float)
                    self.logger.record('race/lap_rate', e[:, 0].mean())
                    self.logger.record('race/off_rate', e[:, 1].mean())
                    self.logger.record('race/progress_px', e[:, 2].mean())
                    print(f"[{self.num_timesteps:>8}] senaste 100 ep: varv {e[:,0].mean()*100:3.0f}%  av banan {e[:,1].mean()*100:3.0f}%  framsteg {e[:,2].mean():5.0f} px  reward {e[:,3].mean():6.1f}", flush=True)
        return True


if __name__ == '__main__':
    steps = int(sys.argv[1]) if len(sys.argv) > 1 else 500_000
    name = sys.argv[2] if len(sys.argv) > 2 else time.strftime('ppo_%m%d_%H%M')
    random_track = len(sys.argv) > 3 and sys.argv[3] == 'random'
    ckpt_every = int(sys.argv[4]) if len(sys.argv) > 4 else 100_000
    out = os.path.join('runs', name); os.makedirs(out, exist_ok=True)
    torch.set_num_threads(2)

    venv = SubprocVecEnv([make_env(i, random_track=random_track) for i in range(N_ENVS)])
    eval_env = DummyVecEnv([make_env(1000, random_start=False)])   # utvärdering: från startlinjen

    model = PPO(
        'MlpPolicy', venv,
        n_steps=512, batch_size=1024, n_epochs=10,
        learning_rate=3e-4, gamma=0.99, gae_lambda=0.95, ent_coef=0.01, clip_range=0.2,
        policy_kwargs=dict(net_arch=[64, 64]),
        tensorboard_log='runs', verbose=0, seed=0,
    )
    callbacks = [
        StatsCallback(),
        CheckpointCallback(save_freq=ckpt_every // N_ENVS, save_path=out, name_prefix='ckpt'),
        EvalCallback(eval_env, best_model_save_path=out, eval_freq=25_000 // N_ENVS, n_eval_episodes=3, deterministic=True, verbose=0),
    ]
    t0 = time.time()
    model.learn(total_timesteps=steps, callback=callbacks, tb_log_name=name)
    model.save(os.path.join(out, 'final'))
    print(f"klart ({'slumpbanor' if random_track else 'Granskogsbanan'}): {steps} steg på {(time.time()-t0)/60:.1f} min -> {out}/final.zip (bästa enligt eval: {out}/best_model.zip)")
