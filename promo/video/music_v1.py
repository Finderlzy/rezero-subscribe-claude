"""宣传视频 douyin-v1.html（白底朴素版，作者 2026-10-19 选定）的配乐：轻快、干净，全部原创合成。

时间点和 douyin-v1.html 对齐：开场八音盒 → 三个坑各一下拨弦、划线各一下“唰”、盖章一声闷响 →
“死亡回归过了”处一句小调八音盒和一声钟 → 网站段起拍子，C - G - Am - F 循环 → 结尾域名一声钟、收尾和弦。
用法：python3 promo/video/music_v1.py  → promo/video/music-v1.wav（44.1 kHz 立体声，35 秒）
"""
from pathlib import Path

import numpy as np

from synth import Track, bell, env, fft_filter, heartbeat, music_box, note, pad, rng, sparkle, t_arr

tr = Track(35.0)
BEAT = 60 / 96  # 96 BPM


def swipe(d=0.16):
    """划线：一小段由低到高扫过的噪声"""
    n = int(d * 44100)
    x = fft_filter(rng.standard_normal(n), lo=1500, hi=9000)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 2


def shaker():
    n = int(0.05 * 44100)
    return fft_filter(rng.standard_normal(n), lo=6000) * env(n, 0.003, 0.04, 5)


def whoosh(d=0.4):
    n = int(d * 44100)
    x = fft_filter(rng.standard_normal(n), lo=400, hi=5000)
    return x * np.linspace(0, 1, n) ** 2 * np.minimum(np.linspace(1, 0, n) * 6, 1)


def thud():
    t = t_arr(0.6)
    return np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 14) + 50) / 44100) * env(len(t), 0.002, 0.45)


# 1. 0–3.6s 开场：八音盒动机，字出现时各一下
for i, n in enumerate(['E5', 'G5', 'C6', 'B5', 'G5', 'D6']):
    tr.add(music_box(note(n), 1.6), 0.2 + i * BEAT / 2 * 1.1, 0.24, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('C6'), 2.0), 0.7, 0.14)
tr.add(music_box(note('A5'), 1.4), 1.7, 0.2)
tr.add(pad([note(x) for x in ['C4', 'E4', 'G4']], 3.8, attack=0.6, release=0.8), 0.0, 0.12)

# 2. 3.65–9s 三个坑：出现拨一下、划线唰一下，盖章闷响；底下一层轻轻的滴答
for at, n in [(3.65, 'E5'), (4.6, 'D5'), (5.4, 'C5')]:
    tr.add(music_box(note(n), 1.2), at, 0.22)
for at in [4.5, 5.3, 6.1]:
    tr.add(swipe(), at - 0.04, 0.22, pan=0.2)
tr.add(thud(), 6.6, 0.45)
tr.add(heartbeat(), 6.6, 0.3)
for k, at in enumerate(np.arange(3.65, 9.0, BEAT / 2)):
    tr.add(shaker(), at, 0.05 if k % 2 else 0.08, pan=0.35)
tr.add(pad([note(x) for x in ['A3', 'C4', 'E4']], 5.6, attack=0.4, release=0.8), 3.6, 0.1)

# 3. 9.05–12.4s 转折：一句小调八音盒，“死亡回归过了”出现时一声钟和一点闪光
for i, n in enumerate(['A5', 'C6', 'E6', 'D6', 'C6', 'B5', 'A5']):
    tr.add(music_box(note(n), 1.8), 9.1 + i * BEAT / 2, 0.22, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('A5'), 3.0), 10.1, 0.22)
tr.add(sparkle(0.9, 2000, 6000), 10.15, 0.05)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], 3.6, attack=0.5, release=0.6), 9.0, 0.12)
tr.add(whoosh(0.45), 12.0, 0.1)

# 4. 12.45–33s 网站段起拍子：C - G - Am - F，每个和弦四拍；低鼓一、三拍，沙锤八分
chords = [['C3', 'E4', 'G4', 'C5'], ['G2', 'D4', 'G4', 'B4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'C4', 'F4', 'A4']]
bar = BEAT * 4
start = 12.45
k = 0
while start + k * bar < 32.5:
    at = start + k * bar
    tr.add(pad([note(n) for n in chords[k % 4]], bar + 0.8, attack=0.08, release=0.7), at, 0.2)
    for b in range(4):
        if b in (0, 2):
            tr.add(heartbeat(), at + b * BEAT, 0.32)
        tr.add(shaker(), at + b * BEAT + BEAT / 2, 0.07, pan=0.35)
    k += 1
melody = ['E5', 'G5', 'C6', 'G5', 'D6', 'C6', 'B5', 'G5', 'C6', 'E6', 'D6', 'C6', 'A5', 'C6', 'B5', 'G5',
          'E5', 'G5', 'C6', 'E6', 'F6', 'E6', 'D6', 'B5', 'C6', 'A5', 'G5', 'E5', 'F5', 'A5', 'C6', 'E6']
for i, n in enumerate(melody):
    at = start + bar + i * BEAT
    if at > 32.0:
        break
    tr.add(music_box(note(n), 1.6), at, 0.18, pan=-0.3 + 0.6 * (i % 2))

# 换场各一下轻扫；“5 章”和“大肥鱼”出现时一声
for at in [16.8, 21.05, 25.05, 30.05]:
    tr.add(whoosh(0.35), at - 0.35, 0.08)
tr.add(bell(note('E6'), 1.8), 21.1, 0.12)
tr.add(bell(note('G5'), 1.8), 25.5, 0.1)

# 5. 结尾：域名弹出一声钟加闪光，群号一下拨弦，收尾和弦
tr.add(bell(note('C6'), 3.0), 30.8, 0.2)
tr.add(sparkle(1.0, 2200, 7000), 30.85, 0.05)
tr.add(music_box(note('G5'), 1.6), 31.6, 0.2)
tr.add(pad([note(n) for n in ['C3', 'G3', 'E4', 'G4', 'C5']], 3.0, attack=0.2, release=2.2), 32.0, 0.24)
tr.add(music_box(note('C6'), 2.6), 32.2, 0.2)
tr.add(music_box(note('E6'), 2.6), 32.5, 0.14)

tr.write(Path(__file__).with_name('music-v1.wav'), reverb_wet=0.18, fade_out=1.5)
print('music-v1.wav')
