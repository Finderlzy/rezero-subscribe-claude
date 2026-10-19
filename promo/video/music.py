"""宣传视频 douyin.html 的配乐：全部用正弦、噪声合成的原创音乐和音效，不用番剧原声（版权）。

时间点和 douyin.html 的时间轴对齐：开场心跳 → 三次轮回（钟摆滴答、蓄力、裂屏）→ 时钟倒转 →
话数卡前硬切静音，八音盒（番剧感）→ 光芒处转大调 → 存档点五声上行 → 结尾和弦。
用法：python3 promo/video/music.py  → promo/video/music.wav（44.1 kHz 立体声，41 秒）
"""
from pathlib import Path

import numpy as np

from synth import SR, Track, bell, heartbeat, impact, music_box, note, pad, riser, sparkle, t_arr, tick

tr = Track(41.0)
HITS = [3.9, 5.9, 7.9]
BURST = 17.3

# ---------- 编排 ----------
# 暗场低音持续音：A1 + E2，慢慢推高，12.2 硬切
t = t_arr(12.2)
drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.25 * np.sin(2 * np.pi * 110 * t * (1 + 0.002 * np.sin(t))))
drone *= (0.25 + 0.75 * (t / 12.2) ** 1.5) * np.minimum(t / 1.5, 1) * np.minimum((12.2 - t) / 0.03, 1)
tr.add(drone, 0, 0.16)

for b in [0.15, 0.55, 1.6, 2.0]:
    tr.add(heartbeat(), b, 0.9)

# 轮回：钟摆滴答、撞击前蓄力、撞击
for i, tt in enumerate(np.arange(2.6, 8.8, 0.5)):
    if not any(abs(tt - h) < 0.12 for h in HITS):
        tr.add(tick(i % 2 == 0), tt, 0.35, pan=0.3 if i % 2 else -0.3)
for h in HITS:
    tr.add(riser(0.55), h - 0.55, 0.12)
    tr.add(impact(), h, 0.55)
    tr.add(heartbeat(), h + 0.05, 0.6)

# 时钟倒转：滴答从很密慢慢变疏
tt, gap = 8.85, 0.045
while tt < 12.0:
    tr.add(tick(True)[::-1], tt, 0.28 * (0.5 + 0.5 * min(gap / 0.3, 1)), pan=float(np.sin(tt * 7)) * 0.4)
    tt += gap
    gap = min(gap * 1.09, 0.42)
tr.add(riser(1.2), 11.0, 0.06)  # 倒转结束前往硬切推一把

# 话数卡：硬切后一声钟，然后八音盒（小调）
tr.add(bell(note('A5')), 12.5, 0.28)
minor = ['A5', 'C6', 'E6', 'A5', 'G5', 'E5', 'D5', 'E5', 'F5', 'A5', 'C6', 'F5', 'E5', 'B4', 'C5', 'E5']
for i, n in enumerate(minor):
    tr.add(music_box(note(n)), 12.75 + i * 0.29, 0.22, pan=-0.25 + 0.5 * (i % 2))
tr.add(pad([note('A3'), note('C4'), note('E4')], 4.6, attack=1.5, release=0.3), 12.7, 0.12)

# 光芒：反向铺垫进来，转 C 大调
tr.add(riser(0.9), BURST - 0.9, 0.08)
tr.add(sparkle(1.4, 1500, 5000), BURST, 0.08)
tr.add(bell(note('C6'), 4), BURST, 0.2)

# 后半段：C - G - Am - F 循环，每个和弦 2.4 秒；轻轻的拍子
chords = [['C3', 'E4', 'G4', 'C5'], ['G2', 'D4', 'G4', 'B4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'C4', 'F4', 'A4']]
CH = 2.4
c0 = BURST
k = 0
while c0 < 38.0:
    tr.add(pad([note(n) for n in chords[k % 4]], CH + 1.0, attack=0.25 if k else 0.05, release=1.0), c0, 0.24)
    tr.add(heartbeat(), c0, 0.25)  # 每个和弦开头一下低鼓
    tr.add(heartbeat(), c0 + CH / 2, 0.15)
    c0 += CH
    k += 1
# 大调八音盒旋律（原创）
major = ['E5', 'G5', 'C6', 'G5', 'D6', 'C6', 'B5', 'G5', 'C6', 'E6', 'D6', 'C6', 'A5', 'C6', 'B5', 'G5',
         'E5', 'G5', 'C6', 'E6', 'F6', 'E6', 'D6', 'B5', 'C6', 'A5', 'G5', 'E5', 'F5', 'A5', 'C6', 'E6']
for i, n in enumerate(major):
    at = 18.5 + i * 0.6
    if at > 37.4:
        break
    if 27.5 < at < 29.0:  # 存档点那几下让位
        continue
    tr.add(music_box(note(n), 1.8), at, 0.22, pan=-0.3 + 0.6 * (i % 2))

# 存档点：五声上行
for i, n in enumerate(['C6', 'D6', 'E6', 'G6', 'C7']):
    tr.add(bell(note(n), 1.6), 27.6 + i * 0.25, 0.13, pan=-0.5 + 0.25 * i)

# 结尾：过场闪光、域名扫光、最后的和弦
tr.add(riser(0.5), 35.12, 0.08)
tr.add(bell(note('C5'), 4), 35.62, 0.22)
tr.add(sparkle(1.1, 2200, 7000), 37.6, 0.07)
tr.add(pad([note(n) for n in ['C3', 'G3', 'E4', 'G4', 'C5', 'E5']], 3.4, attack=0.3, release=2.6), 37.6, 0.2)
tr.add(music_box(note('C6'), 3.0), 38.0, 0.18)
tr.add(music_box(note('G6'), 3.0), 38.3, 0.12)


tr.write(Path(__file__).with_name('music.wav'))
print('music.wav')
