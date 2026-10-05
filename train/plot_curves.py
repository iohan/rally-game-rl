"""Plot training curves from the TensorBoard logs (for filming).
  python plot_curves.py runs/run5_1 "Single track" runs/run4_2 "Random tracks"
Writes curves.png (still) and curves.gif (the curve grows over 10 s).
Live alternative during training:  tensorboard --logdir runs --reload_interval 5
"""
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, PillowWriter
from tensorboard.backend.event_processing.event_accumulator import EventAccumulator

TAGS = [('race/lap_rate', 'Share of episodes with a full lap'), ('race/off_rate', 'Share of run-offs'), ('rollout/ep_rew_mean', 'Reward per episode (mean)')]
args = sys.argv[1:] or ['runs/run5_1', 'Single track', 'runs/run4_2', 'Random tracks']
runs = [(args[i], args[i + 1]) for i in range(0, len(args), 2)]

data = {}
for path, label in runs:
    ea = EventAccumulator(path); ea.Reload()
    data[label] = {tag: (np.array([e.step for e in ea.Scalars(tag)]), np.array([e.value for e in ea.Scalars(tag)])) for tag, _ in TAGS if tag in ea.Tags()['scalars']}

plt.rcParams.update({'font.size': 11, 'axes.spines.top': False, 'axes.spines.right': False})
fig, axes = plt.subplots(1, len(TAGS), figsize=(15, 4.2))
lines = {}
for ax, (tag, title) in zip(axes, TAGS):
    for label in data:
        if tag not in data[label]: continue
        x, y = data[label][tag]
        (ln,) = ax.plot(x / 1000, y, lw=2.2, label=label)
        lines[(label, tag)] = (ln, x / 1000, y)
    ax.set_title(title); ax.set_xlabel('training steps (thousands)'); ax.grid(alpha=0.3)
    if 'rate' in tag: ax.set_ylim(-0.02, 1.02)
axes[0].legend(loc='lower right')
fig.tight_layout()
fig.savefig('curves.png', dpi=150)
print('wrote curves.png')

# GIF: the curves are drawn left -> right
xmax = max(x.max() for (_, x, _) in lines.values())
for ax in axes: ax.set_xlim(0, xmax * 1.02)
frames = 300
def update(i):
    lim = xmax * (i + 1) / frames
    for ln, x, y in lines.values():
        k = np.searchsorted(x, lim); ln.set_data(x[:k], y[:k])
    return [ln for ln, _, _ in lines.values()]
anim = FuncAnimation(fig, update, frames=frames, blit=True)
anim.save('curves.gif', writer=PillowWriter(fps=30), dpi=80)
print('wrote curves.gif')
