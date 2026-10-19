"""抖音经历版 douyin-story.html 的配乐：和 v1 同一套音色，慢一点、暖一点，全部原创合成。

时间点和 douyin-story.html 对齐：弹窗放大一声钟 → 私信、学生两段八音盒 → “其实是懒”一下拨弦 →
“从零开始？”一声钟加闪光 → logo 起拍子，C - G - Am - F → 结尾收尾和弦。
用法：python3 promo/video/music_story.py  → promo/video/music-story.wav（44.1 kHz 立体声，31 秒）
"""
from pathlib import Path

from synth import Track, bell, heartbeat, music_box, note, pad, shaker, sparkle, whoosh

tr = Track(31.0)
BEAT = 60 / 88  # 88 BPM

# 1. 0–5s 弹窗：Fmaj7 铺底，手机浮上来一下拨弦，弹窗放大一声钟
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4', 'E4']], 5.4, attack=0.9, release=1.0), 0.0, 0.13)
tr.add(music_box(note('C5'), 1.6), 0.3, 0.2)
tr.add(bell(note('C6'), 2.6), 1.9, 0.16)
tr.add(sparkle(0.7, 2200, 6000), 1.95, 0.04)
tr.add(whoosh(0.35), 4.7, 0.08)

# 2. 5–9.5s 私信：两句字各一个音
tr.add(pad([note(x) for x in ['A3', 'C4', 'E4']], 4.8, attack=0.5, release=0.8), 5.0, 0.11)
for at, n in [(5.05, 'E5'), (5.8, 'G5')]:
    tr.add(music_box(note(n), 1.6), at, 0.22)
tr.add(whoosh(0.35), 9.2, 0.08)

# 3. 9.5–14.5s 学生：三句往上走，“其实是懒”落下来一声
tr.add(pad([note(x) for x in ['D3', 'F3', 'A3', 'C4']], 5.2, attack=0.5, release=0.8), 9.5, 0.11)
for at, n in [(9.55, 'D5'), (10.3, 'F5'), (10.9, 'A5')]:
    tr.add(music_box(note(n), 1.6), at, 0.22)
tr.add(music_box(note('C5'), 1.2), 12.3, 0.26)
tr.add(heartbeat(), 12.3, 0.25)
tr.add(whoosh(0.35), 14.2, 0.08)

# 4. 14.5–18.5s 那就写一份：G 和弦铺底，三句各一个音
tr.add(pad([note(x) for x in ['G3', 'B3', 'D4']], 4.4, attack=0.4, release=0.6), 14.5, 0.12)
for at, n in [(14.55, 'G5'), (15.1, 'B5'), (15.6, 'D6')]:
    tr.add(music_box(note(n), 1.6), at, 0.22)

# 5. 18.5–21.5s 从零开始？
tr.add(bell(note('A5'), 3.0), 18.55, 0.22)
tr.add(sparkle(0.9, 2000, 6000), 18.6, 0.05)
tr.add(pad([note(x) for x in ['F3', 'A3', 'C4']], 3.2, attack=0.3, release=0.6), 18.5, 0.1)

# 6. 21.5–31s logo 起拍子：C - G - Am - F，每个和弦四拍；低鼓一、三拍，沙锤八分
chords = [['C3', 'E4', 'G4', 'C5'], ['G2', 'D4', 'G4', 'B4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'C4', 'F4', 'A4']]
bar = BEAT * 4
start = 22.0
tr.add(bell(note('C6'), 2.4), start, 0.18)
k = 0
while start + k * bar < 28.8:
    at = start + k * bar
    tr.add(pad([note(n) for n in chords[k % 4]], bar + 0.8, attack=0.08, release=0.7), at, 0.2)
    for b in range(4):
        if b in (0, 2):
            tr.add(heartbeat(), at + b * BEAT, 0.3)
        tr.add(shaker(), at + b * BEAT + BEAT / 2, 0.07, pan=0.35)
    k += 1
melody = ['E5', 'G5', 'C6', 'G5', 'D6', 'C6', 'B5', 'G5', 'C6', 'E6', 'D6', 'C6']
for i, n in enumerate(melody):
    tr.add(music_box(note(n), 1.6), start + i * BEAT, 0.18, pan=-0.3 + 0.6 * (i % 2))

# 7. 结尾：“十分高涨”一声钟，收尾和弦
tr.add(bell(note('E6'), 2.4), 26.8, 0.16)
tr.add(pad([note(n) for n in ['C3', 'G3', 'E4', 'G4', 'C5']], 3.0, attack=0.2, release=2.2), 28.6, 0.24)
tr.add(music_box(note('C6'), 2.6), 28.8, 0.2)
tr.add(music_box(note('E6'), 2.6), 29.1, 0.14)

tr.write(Path(__file__).with_name('music-story.wav'), reverb_wet=0.18, fade_out=1.5)
print('music-story.wav')
