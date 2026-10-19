"""B 站横版 bilibili.html 的配乐：和抖音版（music_v1.py）同一套音色和调子，轻快、干净，全部原创合成。

时间点和 bilibili.html 对齐：读者反馈段一层暖和的铺底，手机截图浮上来一声拨弦、弹窗放大一声钟，评论每浮上来一张八音盒往上走一个音 →
开场八音盒 → 三个坑（拨弦、划线、盖章）→ “死亡回归过了”一声钟 →
网站段起拍子（C - G - Am - F），点“原理”时一下点击 → 章节卡、大肥鱼各一声 → 结尾域名一声钟、收尾和弦。
2026-10-19 开头加了 T 秒反馈段：反馈段之后的时间点写成 T + 原来的秒数，和 bilibili.html 里的秒数一致。
用法：python3 promo/video/music_bilibili.py  → promo/video/music-bilibili.wav（44.1 kHz 立体声，76 秒）
"""
from pathlib import Path

import numpy as np

from synth import Track, bell, feedback, heartbeat, music_box, note, pad, shaker, sparkle, swipe, thud, tick, whoosh

T = 8.0  # 反馈段长度
tr = Track(T + 68.0)
BEAT = 60 / 96  # 96 BPM

# 0. 0–8s 读者反馈：Fmaj7 铺底，字幕出来一声轻钟。时间和 bilibili.html 的 setupFeedback 一致：
#    手机截图 phoneIn 1.0、弹窗放大 callIn 2.0；评论从 t0 4.3（没有手机截图时 t0Solo 1.1）起每 0.55 秒一张，最多 4 张
phone, cards = feedback(4)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], T + 0.3, attack=1.0, release=1.4), 0.0, 0.13)
tr.add(sparkle(0.8, 1800, 5000), 0.3, 0.03)
tr.add(bell(note('G5'), 2.6), 0.5, 0.1)
if phone:
    tr.add(music_box(note('C5'), 1.8), 1.0, 0.2)
    tr.add(bell(note('C6'), 2.6), 2.0, 0.14)
    tr.add(sparkle(0.7, 2200, 6000), 2.05, 0.04)
for i in range(cards):
    tr.add(music_box(note(['E5', 'G5', 'C6', 'E6'][i]), 1.8), (4.3 if phone else 1.1) + i * 0.55, 0.2, pan=-0.25 + 0.5 * (i % 2))
tr.add(whoosh(0.4), T - 0.4, 0.08)

# 1. 8–13s 开场
for i, n in enumerate(['E5', 'G5', 'C6', 'B5', 'G5', 'D6', 'C6']):
    tr.add(music_box(note(n), 1.6), T + 0.3 + i * BEAT * 0.55, 0.24, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('C6'), 2.4), T + 0.9, 0.14)
tr.add(music_box(note('A5'), 1.6), T + 2.2, 0.2)
tr.add(pad([note(x) for x in ['C4', 'E4', 'G4']], 5.2, attack=0.6, release=1.0), T + 0.0, 0.12)

# 2. 13–21.5s 三个坑
for at, n in [(T + 5.3, 'E5'), (T + 6.2, 'D5'), (T + 7.1, 'C5')]:
    tr.add(music_box(note(n), 1.2), at, 0.22)
for at in [T + 6.6, T + 7.5, T + 8.4]:
    tr.add(swipe(), at - 0.04, 0.22, pan=0.2)
tr.add(thud(), T + 9.2, 0.45)
tr.add(heartbeat(), T + 9.2, 0.3)
tr.add(music_box(note('A4'), 1.6), T + 10.6, 0.16)
for k, at in enumerate(np.arange(T + 5.0, T + 13.4, BEAT / 2)):
    tr.add(shaker(), at, 0.05 if k % 2 else 0.08, pan=0.35)
tr.add(pad([note(x) for x in ['A3', 'C4', 'E4']], 8.6, attack=0.5, release=1.0), T + 5.0, 0.1)

# 3. 21.5–27s 转折：小调八音盒，“死亡回归过了”一声钟
for i, n in enumerate(['A5', 'C6', 'E6', 'D6', 'C6', 'B5', 'A5', 'E5']):
    tr.add(music_box(note(n), 1.8), T + 13.6 + i * BEAT / 2, 0.22, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('A5'), 3.0), T + 14.4, 0.22)
tr.add(sparkle(0.9, 2000, 6000), T + 14.45, 0.05)
tr.add(music_box(note('C6'), 2.0), T + 16.2, 0.18)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], 5.6, attack=0.5, release=0.8), T + 13.5, 0.12)
tr.add(whoosh(0.45), T + 18.7, 0.1)

# 4. 27.1–63s 网站段起拍子：C - G - Am - F，每个和弦四拍；低鼓一、三拍，沙锤八分
chords = [['C3', 'E4', 'G4', 'C5'], ['G2', 'D4', 'G4', 'B4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'C4', 'F4', 'A4']]
bar = BEAT * 4
start = T + 19.1
k = 0
while start + k * bar < T + 55.0:
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
    if at > T + 54.4:
        break
    if T + 39.0 < at < T + 40.4 or T + 46.0 < at < T + 47.4:
        continue
    tr.add(music_box(note(n), 1.6), at, 0.18, pan=-0.3 + 0.6 * (i % 2))

# 点“原理”的一下点击，切换时一点闪光
tr.add(tick(True), T + 31.85, 0.45)
tr.add(sparkle(0.6, 2500, 6000), T + 32.1, 0.04)
# 换场轻扫；章节卡、大肥鱼出现时各一声
for at in [T + 27.1, T + 39.2, T + 46.2, T + 55.2]:
    tr.add(whoosh(0.35), at - 0.35, 0.08)
tr.add(bell(note('E6'), 1.8), T + 40.2, 0.12)
tr.add(bell(note('G5'), 1.8), T + 47.8, 0.12)

# 5. 63–76s 结尾：域名弹出一声钟加闪光，群号一下拨弦，收尾和弦慢慢散掉
tr.add(bell(note('C6'), 3.0), T + 56.1, 0.2)
tr.add(sparkle(1.0, 2200, 7000), T + 56.15, 0.05)
tr.add(music_box(note('G5'), 1.6), T + 57.0, 0.2)
tr.add(pad([note(n) for n in ['C3', 'G3', 'E4', 'G4', 'C5']], 9.5, attack=0.3, release=6.0), T + 57.4, 0.24)
for i, n in enumerate(['C6', 'E6', 'G6', 'C7']):
    tr.add(music_box(note(n), 3.0), T + 57.6 + i * BEAT, 0.16 - 0.02 * i)

tr.write(Path(__file__).with_name('music-bilibili.wav'), reverb_wet=0.18, fade_out=2.5)
print('music-bilibili.wav')
