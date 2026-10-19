# 封面和群头像

和宣传片同样的白底风格：上方浅紫色带放 logo 和眉题，标题“第一次订阅 Claude / 只想一次成功”，下面是完整的 https 网址（不写裸域名，原因见 [../video/README.md](../video/README.md)）。横版右侧放网站“注册 claude”页的手机截图（`../video/shots/step-register-claude.png`）。站点构建不读这个目录。

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `douyin-3x4.png` | 1080×1440 | 抖音竖版封面（3:4） |
| `douyin-4x3.png` | 1440×1080 | 抖音横版封面（4:3） |
| `bilibili-16x9.png` | 1920×1080 | B 站封面（16:9）。B 站会把同一张图裁成 16:9（个人空间）和 4:3（首页推荐），4:3 切掉左右各 240px，所以内容都在中间 1440 宽的安全区里，上传时保持“双比例同步改动”勾选即可 |
| `bilibili-16x9-story.png` | 1920×1080 | B 站经历版封面：不带网址，右侧是订阅成功弹窗的截图，安全区同上 |
| `avatar-light.png` | 640×640 | QQ 群头像，白底紫字（作者 2026-10-19 选定，在用） |
| `avatar-dark.png` | 640×640 | QQ 群头像，紫底白字 |

Claude Code 的像素小形象按 design D6 不能放大，所以封面和头像都不用它（截图里网页本身带的那个除外）。

重新生成（在仓库根目录执行，字体同宣传片，放在 `.cache/fonts/`）：

```bash
node promo/cover/render.mjs
```

版式（尺寸、字号、间距）写在 `cover.html` 的 `LAYOUTS` 里。
