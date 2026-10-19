"""宣传视频 douyin-v1.html（白底朴素版，作者 2026-10-19 选定）的配乐：轻快、干净，全部原创合成。

时间点和 douyin-v1.html 对齐：读者反馈段一层暖和的铺底，手机截图浮上来一声拨弦、弹窗放大一声钟，评论每浮上来一张八音盒往上走一个音 →
开场八音盒 → 三个坑各一下拨弦、划线各一下“唰”、盖章一声闷响 →
“死亡回归过了”处一句小调八音盒和一声钟 → 网站段起拍子，C - G - Am - F 循环 → 结尾域名一声钟、收尾和弦。
2026-10-19 开头加了 T 秒反馈段：反馈段之后的时间点写成 T + 原来的秒数，和 douyin-v1.html 里的秒数一致。
用法：python3 promo/video/music_v1.py  → promo/video/music-v1.wav（44.1 kHz 立体声，41 秒）
"""
from pathlib import Path

import numpy as np

from synth import Track, bell, feedback, heartbeat, music_box, note, pad, shaker, sparkle, swipe, thud, whoosh

T = 6.0  # 反馈段长度
tr = Track(T + 35.0)
BEAT = 60 / 96  # 96 BPM


# 0. 0–6s 读者反馈：Fmaj7 铺底，字幕出来一声轻钟。时间和 douyin-v1.html 的 setupFeedback 一致：
#    手机截图 phoneIn 0.8、弹窗放大 callIn 1.7；评论从 t0 3.4（没有手机截图时 t0Solo 0.9）起每 0.45 秒一张，最多 4 张
phone, cards = feedback(4)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], T + 0.3, attack=0.9, release=1.2), 0.0, 0.13)
tr.add(sparkle(0.8, 1800, 5000), 0.2, 0.03)
tr.add(bell(note('G5'), 2.4), 0.35, 0.1)
if phone:
    tr.add(music_box(note('C5'), 1.6), 0.8, 0.2)
    tr.add(bell(note('C6'), 2.4), 1.7, 0.14)
    tr.add(sparkle(0.7, 2200, 6000), 1.75, 0.04)
for i in range(cards):
    tr.add(music_box(note(['E5', 'G5', 'C6', 'E6'][i]), 1.6), (3.4 if phone else 0.9) + i * 0.45, 0.2, pan=-0.25 + 0.5 * (i % 2))
tr.add(whoosh(0.35), T - 0.35, 0.08)

# 1. 6–9.6s 开场：八音盒动机，字出现时各一下
for i, n in enumerate(['E5', 'G5', 'C6', 'B5', 'G5', 'D6']):
    tr.add(music_box(note(n), 1.6), T + 0.2 + i * BEAT / 2 * 1.1, 0.24, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('C6'), 2.0), T + 0.7, 0.14)
tr.add(music_box(note('A5'), 1.4), T + 1.7, 0.2)
tr.add(pad([note(x) for x in ['C4', 'E4', 'G4']], 3.8, attack=0.6, release=0.8), T + 0.0, 0.12)

# 2. 9.65–15s 三个坑：出现拨一下、划线唰一下，盖章闷响；底下一层轻轻的滴答
for at, n in [(T + 3.65, 'E5'), (T + 4.6, 'D5'), (T + 5.4, 'C5')]:
    tr.add(music_box(note(n), 1.2), at, 0.22)
for at in [T + 4.5, T + 5.3, T + 6.1]:
    tr.add(swipe(), at - 0.04, 0.22, pan=0.2)
tr.add(thud(), T + 6.6, 0.45)
tr.add(heartbeat(), T + 6.6, 0.3)
for k, at in enumerate(np.arange(T + 3.65, T + 9.0, BEAT / 2)):
    tr.add(shaker(), at, 0.05 if k % 2 else 0.08, pan=0.35)
tr.add(pad([note(x) for x in ['A3', 'C4', 'E4']], 5.6, attack=0.4, release=0.8), T + 3.6, 0.1)

# 3. 15.05–18.4s 转折：一句小调八音盒，“死亡回归过了”出现时一声钟和一点闪光
for i, n in enumerate(['A5', 'C6', 'E6', 'D6', 'C6', 'B5', 'A5']):
    tr.add(music_box(note(n), 1.8), T + 9.1 + i * BEAT / 2, 0.22, pan=-0.3 + 0.6 * (i % 2))
tr.add(bell(note('A5'), 3.0), T + 10.1, 0.22)
tr.add(sparkle(0.9, 2000, 6000), T + 10.15, 0.05)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], 3.6, attack=0.5, release=0.6), T + 9.0, 0.12)
tr.add(whoosh(0.45), T + 12.0, 0.1)

# 4. 18.45–39s 网站段起拍子：C - G - Am - F，每个和弦四拍；低鼓一、三拍，沙锤八分
chords = [['C3', 'E4', 'G4', 'C5'], ['G2', 'D4', 'G4', 'B4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'C4', 'F4', 'A4']]
bar = BEAT * 4
start = T + 12.45
k = 0
while start + k * bar < T + 32.5:
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
    if at > T + 32.0:
        break
    tr.add(music_box(note(n), 1.6), at, 0.18, pan=-0.3 + 0.6 * (i % 2))

# 换场各一下轻扫；“5 章”和“大肥鱼”出现时一声
for at in [T + 16.8, T + 21.05, T + 25.05, T + 30.05]:
    tr.add(whoosh(0.35), at - 0.35, 0.08)
tr.add(bell(note('E6'), 1.8), T + 21.1, 0.12)
tr.add(bell(note('G5'), 1.8), T + 25.5, 0.1)

# 5. 结尾：域名弹出一声钟加闪光，群号一下拨弦，收尾和弦
tr.add(bell(note('C6'), 3.0), T + 30.8, 0.2)
tr.add(sparkle(1.0, 2200, 7000), T + 30.85, 0.05)
tr.add(music_box(note('G5'), 1.6), T + 31.6, 0.2)
tr.add(pad([note(n) for n in ['C3', 'G3', 'E4', 'G4', 'C5']], 3.0, attack=0.2, release=2.2), T + 32.0, 0.24)
tr.add(music_box(note('C6'), 2.6), T + 32.2, 0.2)
tr.add(music_box(note('E6'), 2.6), T + 32.5, 0.14)

tr.write(Path(__file__).with_name('music-v1.wav'), reverb_wet=0.18, fade_out=1.5)
print('music-v1.wav')
