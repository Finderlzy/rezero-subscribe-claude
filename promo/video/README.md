# 宣传视频

给抖音和 B 站做的宣传片：用线上站点的截图做动画，加原创合成的配乐。站点构建不读这个目录。

**成片**：

- 抖音：`douyin-v1-music.mp4`（竖屏 1080×1920，30fps，响度 -14 LUFS）。作者 2026-10-19 选定白底朴素版（v1）。
- 抖音经历版：`douyin-story-music.mp4`（竖屏 1080×1920，30fps，31 秒）。教程版 2026-10-19 在抖音被判“不符合相关法律法规（画面）”、限制自己可见，这一版只讲做这个项目的经过：订阅成功的弹窗 → 朋友私信想让我远程帮装 → 我是学生（其实是懒）→ 那就写一份从零开始的 → 想到 Re0 → 夹带私货热情高涨。**画面不出现网址、群号、网站页面截图，也不讲任何步骤。** 动画 `douyin-story.html`，配乐 `music_story.py`，生成命令同下（`render.mjs douyin-story.html 30`）。
- B 站：`bilibili-music.mp4`（横屏 1920×1080，60fps）。同样的白底风格，多讲了原理版/操作版切换、章节标题卡；网站画面放在浏览器窗口里，地址栏一直显示网址。

2026-10-19 两版开头都加了“读者反馈”段，动画和配乐改成 **抖音 41 秒（反馈段 0–6 秒）、B 站 76 秒（反馈段 0–8 秒）**，之后的时间点整体后移 6 / 8 秒。上面两个 mp4 已按新版重新渲染（2026-10-19）。

**读者反馈段**：先是读者订阅成功的手机截图，装在手机框里浮上来，弹窗区域框出来再放大成卡片；然后几条评论截图一张张浮上来叠成一列；字幕“读者反馈 / 已经有人订阅成功了”。截图放在 `feedback/`，登记在 `feedback/list.json`（顺序、竖图还是横条、要放大的区域），格式和打码要求见 [feedback/README.md](feedback/README.md)。**只用真实读者的截图，不编造。** 没登记截图时画红色虚线占位框，`render.mjs` 拒绝渲染整片。摆法写在 `feedback.js`（两个动画共用），时间写在各页面的 `setupFeedback({...})` 里，配乐脚本按同样的时间卡点。

番剧风的 v2（`douyin.html`、`music.py`）作者看过觉得太花哨，没有采用，脚本留着备用。

拍摄和剪辑的约束：画面上的网址一律写完整的 `https://re0claude.us.ci/`，不写裸域名（裸域名首次访问会先发 http，在大陆会被劫持）。画面不出现首页首屏那句“不露出‘我在国内’”和第 01 章的内容，口播和字幕不用翻墙、代理、节点这类词。横版截图用 1024 宽（目录收在抽屉里，侧边栏的第 01 章标题不入镜）；章首页“选择手机系统”的正文和选项里有“走代理”“导入代理软件”，只截色带。

## 文件

| 文件 | 作用 |
| --- | --- |
| `capture.mjs` | 截取线上站点 <https://re0claude.us.ci/> 的画面，存到 `shots/`（手机画面给抖音版，`wide-*` 给 B 站版） |
| `douyin-v1.html` | v1 动画：`render(t)` 按时间画出每一帧，时间点写在各元素的 `data-in`/`data-out` 上 |
| `bilibili.html` | B 站横版动画 |
| `feedback.js` | 两个动画共用的读者反馈段：按 `feedback/list.json` 摆手机截图和评论卡片 |
| `feedback/` | 读者反馈截图和登记表 `list.json`，见其中的 README |
| `douyin.html` | v2 番剧风动画（未采用） |
| `render.mjs` | 逐帧截图动画页编成 mp4：Chromium 走 Vulkan 用独显渲染，分 6 路并行，NVENC 编码后拼接；`--stills` 只截几帧检查（存到 `stills/`，`STILLS_DIR` 可改）。读 `feedback/list.json` 交给页面（`FEEDBACK_DIR` 可换目录，检查用）。没有 NVIDIA 显卡时加 `ENCODER=libx264` |
| `synth.py` | 配乐用的合成器：正弦和噪声做的音色和音效、立体声音轨、混响；`feedback()` 读 `feedback/list.json`，给反馈段卡点 |
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

B 站版同理：`node promo/video/render.mjs bilibili.html 60`、`python3 promo/video/music_bilibili.py`，再用同样的 ffmpeg 命令把 `bilibili.mp4` 和 `music-bilibili.wav` 合成 `bilibili-music.mp4`。在 RTX 5060 笔记本上，B 站版原来 4080 帧渲染约 65 秒，现在 4560 帧。

换了反馈截图（改了 `feedback/list.json`）后，先截几帧看反馈段，再重新渲染两版、重新生成配乐（配乐按截图张数卡点）：

```bash
node promo/video/render.mjs douyin-v1.html --stills 1.2,2.6,4.5,5.6
node promo/video/render.mjs bilibili.html --stills 1.4,3,6,7.5
```

改了动画的时间点，对应配乐脚本里的时间也要一起改。配乐脚本里反馈段之后的时间写成 `T + 原来的秒数`（`T` 是反馈段长度），等于动画里的秒数。
