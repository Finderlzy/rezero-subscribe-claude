# 宣传视频

给抖音和 B 站做的竖屏宣传片：用线上站点的截图做动画，加原创合成的配乐。站点构建不读这个目录。

**选定的成片**：`douyin-v1-music.mp4`（1080×1920，30fps，35 秒，响度 -14 LUFS）。作者 2026-10-19 选定白底朴素版（v1）。番剧风的 v2（`douyin.html`、`music.py`）作者看过觉得太花哨，没有采用，脚本留着备用。

拍摄和剪辑的约束：画面不出现首页首屏那句“不露出‘我在国内’”和第 01 章的内容，口播和字幕不用翻墙、代理、节点这类词。

## 文件

| 文件 | 作用 |
| --- | --- |
| `capture.mjs` | 截取线上站点 <https://re0claude.us.ci/> 的手机画面，存到 `shots/` |
| `douyin-v1.html` | v1 动画：`render(t)` 按时间画出每一帧，时间点写在各元素的 `data-in`/`data-out` 上 |
| `douyin.html` | v2 番剧风动画（未采用） |
| `render.mjs` | 逐帧截图动画页，用 ffmpeg 编成 mp4；`--stills` 只截几帧检查 |
| `synth.py` | 配乐用的合成器：正弦和噪声做的音色、立体声音轨、混响 |
| `music_v1.py` | v1 的配乐，卡 `douyin-v1.html` 的时间点 |
| `music.py` | v2 的配乐（未采用） |

字体用仓库根目录 `.cache/fonts/` 里的思源黑体 Heavy、Cormorant Garamond 和 Cinzel（不提交，下载地址见 `scripts/build-logo.mjs` 开头）。

## 重新生成成片

在仓库根目录执行（要先装好 ffmpeg 和 Playwright 的 Chromium；配乐只依赖 numpy）：

```bash
node promo/video/capture.mjs
node promo/video/render.mjs douyin-v1.html 30
python3 promo/video/music_v1.py
ffmpeg -y -i promo/video/douyin-v1.mp4 -i promo/video/music-v1.wav -map 0:v -map 1:a -c:v copy -af "loudnorm=I=-14:TP=-1:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart promo/video/douyin-v1-music.mp4
```

改了动画的时间点，`music_v1.py` 里对应的时间也要一起改。
