# 视频

**分工（作者 2026-10-23 定）**：AI Agent 只做**预处理**，视频入库和上线由作者做。

1. **预处理**：剪辑（剪掉露出服务器 IP、节点名、项目名、标签页标题的开头结尾和无关等待）、逐字打码（不画大块灰色）、显卡转码（`node scripts/encode-video.mjs`）、生成封面、全片抽帧 OCR 核查。
2. **交付**：成品和封面放到 `~/视频/预处理完成/`，文件名用小写英文和连字符（如 `v2rayn-rules.mp4` + `v2rayn-rules.jpg`），同时告诉作者该放哪个小节。
3. **作者**把视频放进 Obsidian 稿（`docs/v3-rewrite/` 对应正文）并自己决定何时上线。
4. **上线后**：跑 `node scripts/import-rewrite.mjs` 导入正文、`npm run check`、核查页面里的视频块，等作者说上线再部署。

转码命令和待办清单见 [v3-rewrite-video-list.md](../v3-rewrite-video-list.md)。
