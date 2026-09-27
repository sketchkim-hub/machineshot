"""나레이션 아래에 깔 잔잔한 배경음(public/music.wav)을 numpy 로 합성

  python3 narration/music.py [길이(초), 기본 240]
코드 진행 Cmaj9 – Am9 – Fmaj7 – G6sus, 4초씩. 부드러운 패드 + 작은 아르페지오.
"""
import os, sys
import numpy as np
import soundfile as sf
from scipy.signal import lfilter

SR = 44100
LEN = float(sys.argv[1]) if len(sys.argv) > 1 else 240.0
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "music.wav")

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

CHORDS = [  # MIDI 음
    [48, 55, 59, 62, 64],   # Cmaj9
    [45, 52, 55, 59, 60],   # Am9
    [41, 48, 52, 57, 60],   # Fmaj7
    [43, 50, 55, 57, 62],   # G6sus
]
BAR = 4.0
n = int(LEN * SR)
t = np.arange(n) / SR
L = np.zeros(n)
R = np.zeros(n)

def env(length, attack, release):
    e = np.ones(length)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a) ** 2
    e[-r:] *= np.linspace(1, 0, r) ** 2
    return e

# 패드: 살짝 디튠된 사인 + 약한 3배음, 마디마다 크로스페이드
rng = np.random.default_rng(7)
for b in range(int(LEN / BAR) + 1):
    ch = CHORDS[b % 4]
    s0 = int(b * BAR * SR)
    ln = int((BAR + 1.5) * SR)
    s1 = min(n, s0 + ln)
    if s0 >= n:
        break
    tt = np.arange(s1 - s0) / SR
    e = env(ln, 1.2, 1.8)[: s1 - s0]
    for i, m in enumerate(ch):
        f = hz(m)
        for det, pan in ((-0.12, 0.3), (0.12, 0.7)):
            ph = rng.uniform(0, 2 * np.pi)
            w = np.sin(2 * np.pi * (f + det) * tt + ph) + 0.12 * np.sin(2 * np.pi * 3 * (f + det) * tt + ph)
            amp = (0.05 if i == 0 else 0.03) * e
            L[s0:s1] += w * amp * (1 - pan)
            R[s0:s1] += w * amp * pan

# 아르페지오: 8분음표(0.5초), 부드러운 감쇠
step = 0.5
for k in range(int(LEN / step)):
    b = int(k * step // BAR)
    ch = CHORDS[b % 4]
    m = ch[[2, 3, 4, 3][k % 4]] + 12
    s0 = int(k * step * SR)
    ln = int(1.4 * SR)
    s1 = min(n, s0 + ln)
    tt = np.arange(s1 - s0) / SR
    w = np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 4.0) * (1 - np.exp(-tt * 300))
    pan = 0.35 if k % 2 else 0.65
    L[s0:s1] += w * 0.022 * (1 - pan)
    R[s0:s1] += w * 0.022 * pan

# 간단한 잔향(피드백 딜레이) + 한 극 저역통과
def verb(x):
    y = x.copy()
    for d, g in ((0.113, 0.35), (0.197, 0.28), (0.293, 0.22), (0.411, 0.16)):
        k = int(d * SR)
        y[k:] += x[:-k] * g
    return y

L, R = verb(L), verb(R)
a = np.exp(-2 * np.pi * 3200 / SR)          # 한 극 저역통과로 고역을 부드럽게
L = lfilter([1 - a], [1, -a], L)
R = lfilter([1 - a], [1, -a], R)

x = np.stack([L, R], 1)
fade = int(2.0 * SR)
x[:fade] *= np.linspace(0, 1, fade)[:, None]
x *= 0.7 / np.abs(x).max()
sf.write(OUT, x.astype(np.float32), SR, subtype="PCM_16")
print(f"{OUT} ({LEN:.0f}s)")
