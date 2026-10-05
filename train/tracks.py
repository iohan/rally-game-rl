"""Banor: fasta testbanor (hålls utanför träningen) + slumpgenerator för träning."""
import math
import numpy as np
from sim import Track, CONTROL, HALF_W, WORLD_W, WORLD_H

MARGIN = 150            # minsta avstånd från mittlinje till världskant
MIN_RADIUS = 80         # snävaste tillåtna kurva i slumpbanor (Granskogsbanan: 118, Ovalen: 89)
MIN_SELF_DIST = 2 * HALF_W + 25   # två delar av banan får inte ligga närmare än så (Granskogsbanan: 191)

TEST_TRACKS = {
    'Granskogsbanan': CONTROL,
    'Tallmon': [[400,2600],[400,1800],[600,900],[1200,500],[2200,450],[3200,600],[3800,1000],[3700,1500],[3000,1600],
                [2400,1300],[1900,1500],[2000,2100],[2700,2300],[3400,2200],[3600,2650],[2800,2800],[1800,2750],[1000,2800]],
    'Mirrored': [[WORLD_W - x, y] for x, y in CONTROL],
    'The Oval': [[600,1500],[800,700],[1600,400],[2600,400],[3400,700],[3700,1500],[3400,2300],[2700,2650],
               [2250,2150],[1800,2700],[1300,2650],[800,2300]],
}


def validate(track, min_radius=MIN_RADIUS):
    """Returnerar None om banan duger, annars en sträng med felet."""
    N = track.N
    r = 1 / max(np.abs(track.curv).max(), 1e-9)
    if r < min_radius: return f'för snäv kurva (radie {r:.0f})'
    if (track.x < MARGIN).any() or (track.x > WORLD_W - MARGIN).any() or (track.y < MARGIN).any() or (track.y > WORLD_H - MARGIN).any():
        return 'utanför världen'
    X = np.stack([track.x, track.y], 1)
    D = np.sqrt(((X[:, None] - X[None]) ** 2).sum(2))
    ii = np.arange(N); sep = np.abs((ii[:, None] - ii[None] + N // 2) % N - N // 2)
    d = np.where(sep > 20, D, np.inf).min()
    if d < MIN_SELF_DIST: return f'överlappar sig själv ({d:.0f} px)'
    if not 5000 <= track.total <= 15000: return f'längd {track.total:.0f}'
    return None


def random_control(rng):
    """Slumpade kontrollpunkter: jämnt fördelade vinklar runt världens mitt med jitter,
    och en mjukt varierande radie (indrag ger hårnålar/chikaner)."""
    n = int(rng.integers(9, 15))
    cx, cy = WORLD_W / 2, WORLD_H / 2
    gap = 2 * math.pi / n
    ang = np.arange(n) * gap + rng.uniform(-0.3, 0.3, n) * gap + rng.uniform(0, 2 * math.pi)
    rx = rng.uniform(1400, 1900); ry = rng.uniform(950, 1300)
    k = rng.uniform(0.3, 1.0, n)
    k = 0.8 * k + 0.1 * (np.roll(k, 1) + np.roll(k, -1))    # jämna ut radien lite mellan grannar
    pts = [[cx + math.cos(a) * rx * kk, cy + math.sin(a) * ry * kk] for a, kk in zip(ang, k)]
    if rng.random() < 0.5: pts.reverse()               # medurs eller moturs
    return [[float(x), float(y)] for x, y in pts]


TIGHT_RADIUS = 110      # banor med snävare kurva än så räknas som "svåra"
EASY_ACCEPT = 0.35      # mjuka banor accepteras bara så här ofta, så svåra blir ~hälften av träningen


def make_random_track(rng, max_tries=2000):
    for _ in range(max_tries):
        t = Track(random_control(rng))
        if validate(t) is not None: continue
        if 1 / np.abs(t.curv).max() < TIGHT_RADIUS or rng.random() < EASY_ACCEPT: return t
    raise RuntimeError('hittade ingen giltig slumpbana')


if __name__ == '__main__':
    import time
    for name, c in TEST_TRACKS.items():
        t = Track(c); print(f"{name:15s} N={t.N} längd={t.total:.0f} minradie={1/np.abs(t.curv).max():.0f}  {validate(t, 85) or 'OK'}")
    rng = np.random.default_rng(0); t0 = time.time()
    ok = [make_random_track(rng) for _ in range(100)]
    dt = time.time() - t0; rad = [1 / np.abs(t.curv).max() for t in ok]
    print(f"slump: 100 banor, {dt/len(ok)*1000:.0f} ms per bana")
    print(f"  längd {min(t.total for t in ok):.0f}-{max(t.total for t in ok):.0f}, minradie <95: {sum(r < 95 for r in rad)}, 95-110: {sum(95 <= r < 110 for r in rad)}, >=110: {sum(r >= 110 for r in rad)}, moturs-andel {np.mean([np.sign(t.curv).mean() < 0 for t in ok]):.2f}")
