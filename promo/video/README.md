# 宣传视频

给抖音和 B 站做的宣传片：用线上站点的截图做动画，加原创合成的配乐。站点构建不读这个目录。

**成片**：

- 抖音：`douyin-v1-music.mp4`（竖屏 1080×1920，30fps，35 秒，响度 -14 LUFS）。作者 2026-10-19 选定白底朴素版（v1）。
- B 站：`bilibili-music.mp4`（横屏 1920×1080，60fps，68 秒）。同样的白底风格，多讲了原理版/操作版切换、章节标题卡；网站画面放在浏览器窗口里，地址栏一直显示网址。

番剧风的 v2（`douyin.html`、`music.py`）作者看过觉得太花哨，没有采用，脚本留着备用。

拍摄和剪辑的约束：画面不出现首页首屏那句“不露出‘我在国内’”和第 01 章的内容，口播和字幕不用翻墙、代理、节点这类词。横版截图用 1024 宽（目录收在抽屉里，侧边栏的第 01 章标题不入镜）；章首页“选择手机系统”的正文和选项里有“走代理”“导入代理软件”，只截色带。

## 文件

| 文件 | 作用 |
| --- | --- |
| `capture.mjs` | 截取线上站点 <https://re0claude.us.ci/> 的画面，存到 `shots/`（手机画面给抖音版，`wide-*` 给 B 站版） |
| `douyin-v1.html` | v1 动画：`render(t)` 按时间画出每一帧，时间点写在各元素的 `data-in`/`data-out` 上 |
| `bilibili.html` | B 站横版动画 |
| `douyin.html` | v2 番剧风动画（未采用） |
| `render.mjs` | 逐帧截图动画页编成 mp4：Chromium 走 Vulkan 用独显渲染，分 6 路并行，NVENC 编码后拼接；`--stills` 只截几帧检查。没有 NVIDIA 显卡时加 `ENCODER=libx264` |
| `synth.py` | 配乐用的合成器：正弦和噪声做的音色和音效、立体声音轨、混响 |
| `music_v1.py` | 抖音版的配乐，卡 `douyin-v1.html` 的时间点 |
| `music_bilibili.py` | B 站版的配乐，卡 `bilibili.html` 的时间点 |
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

B 站版同理：`node promo/video/render.mjs bilibili.html 60`、`python3 promo/video/music_bilibili.py`，再用同样的 ffmpeg 命令把 `bilibili.mp4` 和 `music-bilibili.wav` 合成 `bilibili-music.mp4`。在 RTX 5060 笔记本上，B 站版 4080 帧渲染约 65 秒。

改了动画的时间点，对应配乐脚本里的时间也要一起改。
