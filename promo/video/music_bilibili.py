"""B 站横版 bilibili.html 的配乐：和抖音版（music_v1.py）同一套音色和调子，轻快、干净，全部原创合成。

时间点和 bilibili.html 对齐：开场八音盒 → 三个坑（拨弦、划线、盖章）→ “死亡回归过了”一声钟 →
网站段起拍子（C - G - Am - F），点“原理”时一下点击 → 章节卡、大肥鱼各一声 → 结尾域名一声钟、收尾和弦。
用法：python3 promo/video/music_bilibili.py  → promo/video/music-bilibili.wav（44.1 kHz 立体声，68 秒）
"""
from pathlib import Path

import numpy as np

from synth import Track, bell, heartbeat, music_box, note, pad, shaker, sparkle, swipe, thud, tick, whoosh

tr = Track(68.0)
BEAT = 60 / 96  # 96 BPM

# 1. 0–5s 开场
for i, n in enumerate(['E5', 'G5', 'C6', 'B5', 'G5', 'D6', 'C6']):
    tr.add(music_box(note(n), 1.6), 0.3 + i * BEAT * 0.55, 0.24, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('C6'), 2.4), 0.9, 0.14)
tr.add(music_box(note('A5'), 1.6), 2.2, 0.2)
tr.add(pad([note(x) for x in ['C4', 'E4', 'G4']], 5.2, attack=0.6, release=1.0), 0.0, 0.12)

# 2. 5–13.5s 三个坑
for at, n in [(5.3, 'E5'), (6.2, 'D5'), (7.1, 'C5')]:
    tr.add(music_box(note(n), 1.2), at, 0.22)
for at in [6.6, 7.5, 8.4]:
    tr.add(swipe(), at - 0.04, 0.22, pan=0.2)
tr.add(thud(), 9.2, 0.45)
tr.add(heartbeat(), 9.2, 0.3)
tr.add(music_box(note('A4'), 1.6), 10.6, 0.16)
for k, at in enumerate(np.arange(5.0, 13.4, BEAT / 2)):
    tr.add(shaker(), at, 0.05 if k % 2 else 0.08, pan=0.35)
tr.add(pad([note(x) for x in ['A3', 'C4', 'E4']], 8.6, attack=0.5, release=1.0), 5.0, 0.1)

# 3. 13.5–19s 转折：小调八音盒，“死亡回归过了”一声钟
for i, n in enumerate(['A5', 'C6', 'E6', 'D6', 'C6', 'B5', 'A5', 'E5']):
    tr.add(music_box(note(n), 1.8), 13.6 + i * BEAT / 2, 0.22, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('A5'), 3.0), 14.4, 0.22)
tr.add(sparkle(0.9, 2000, 6000), 14.45, 0.05)
tr.add(music_box(note('C6'), 2.0), 16.2, 0.18)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], 5.6, attack=0.5, release=0.8), 13.5, 0.12)
tr.add(whoosh(0.45), 18.7, 0.1)

# 4. 19.1–55s 网站段起拍子：C - G - Am - F，每个和弦四拍；低鼓一、三拍，沙锤八分
chords = [['C3', 'E4', 'G4', 'C5'], ['G2', 'D4', 'G4', 'B4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'C4', 'F4', 'A4']]
bar = BEAT * 4
start = 19.1
k = 0
while start + k * bar < 55.0:
    at = start + k * bar
    tr.add(pad([note(n) for n in chords[k % 4]], bar + 0.8, attack=0.08, release=0.7), at, 0.2)
    for b in range(4):
        if b in (0, 2):
            tr.add(heartbeat(), at + b * BEAT, 0.32)
        tr.add(shaker(), at + b * BEAT + BEAT / 2, 0.07, pan=0.35)
    k += 1
# 旋律：两段 16 拍的主题，后半段换成更高、更舒展的变奏；章节卡和大肥鱼段各空一小节让给音效
theme = ['E5', 'G5', 'C6', 'G5', 'D6', 'C6', 'B5', 'G5', 'C6', 'E6', 'D6', 'C6', 'A5', 'C6', 'B5', 'G5',
         'E5', 'G5', 'C6', 'E6', 'F6', 'E6', 'D6', 'B5', 'C6', 'A5', 'G5', 'E5', 'F5', 'A5', 'C6', 'E6']
variation = ['G5', 'C6', 'E6', 'G6', 'F6', 'E6', 'D6', 'C6', 'A5', 'C6', 'E6', 'A6', 'G6', 'F6', 'E6', 'D6',
             'C6', 'E6', 'G6', 'E6', 'D6', 'B5', 'G5', 'B5', 'C6', 'E6', 'A6', 'E6', 'F6', 'E6', 'D6', 'C6']
for i, n in enumerate(theme + variation):
    at = start + bar + i * BEAT
    if at > 54.4:
        break
    if 39.0 < at < 40.4 or 46.0 < at < 47.4:
        continue
    tr.add(music_box(note(n), 1.6), at, 0.18, pan=-0.3 + 0.6 * (i % 2))

# 点“原理”的一下点击，切换时一点闪光
tr.add(tick(True), 31.85, 0.45)
tr.add(sparkle(0.6, 2500, 6000), 32.1, 0.04)
# 换场轻扫；章节卡、大肥鱼出现时各一声
for at in [27.1, 39.2, 46.2, 55.2]:
    tr.add(whoosh(0.35), at - 0.35, 0.08)
tr.add(bell(note('E6'), 1.8), 40.2, 0.12)
tr.add(bell(note('G5'), 1.8), 47.8, 0.12)

# 5. 55–68s 结尾：域名弹出一声钟加闪光，群号一下拨弦，收尾和弦慢慢散掉
tr.add(bell(note('C6'), 3.0), 56.1, 0.2)
tr.add(sparkle(1.0, 2200, 7000), 56.15, 0.05)
tr.add(music_box(note('G5'), 1.6), 57.0, 0.2)
tr.add(pad([note(n) for n in ['C3', 'G3', 'E4', 'G4', 'C5']], 9.5, attack=0.3, release=6.0), 57.4, 0.24)
for i, n in enumerate(['C6', 'E6', 'G6', 'C7']):
    tr.add(music_box(note(n), 3.0), 57.6 + i * BEAT, 0.16 - 0.02 * i)

tr.write(Path(__file__).with_name('music-bilibili.wav'), reverb_wet=0.18, fade_out=2.5)
print('music-bilibili.wav')
