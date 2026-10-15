# Re:从零开始订阅 claude

把《如何订阅claude》拆成一步一页的引导站。读者按自己的情况选路线（节点方案、电脑代理软件、手机系统），每一页只做一件事，“上一步 / 下一步”按所选路线计算。纯静态站点，不需要服务端程序，也不加载统计脚本和第三方字体。

## 能做什么

- 十一章、一步一页；分叉点有选择页，选择记在本机浏览器，之后的导航按所选路线走，没选时走默认路线（方案一 + v2rayN + iPhone）。
- 每一步有“操作 / 原理”两种视图，切换后后续页面沿用。
- 步骤目录（桌面侧栏、手机抽屉）：在目录里改路线、看已读 ✓、清除进度。
- 首页“继续上次”，完成页“重新开始”“回到目录”“清除进度”。
- 可跳过的步骤有跳过按钮；常见问题独立成页，从步骤进来时可“返回刚才的步骤”。
- 代码块一键复制，截图点击看大图；步骤视频点击后才加载。
- 每个步骤、常见问题、选择页都有固定 URL，可以直接打开和分享。

## 已知限制

- 14 个步骤是“内容待补”占位（原文没有这些内容，等作者补写）；`npm run build` 结束时会列出清单。
- 原文第一章的 8 张 SSH / 脚本截图还没有打码，暂未放进站点；原文的配套视频按作者决定暂不放，各步骤显示“视频制作中”。
- 完成页的联系方式暂为占位。
- 浏览器兼容只在 Chromium 上自动测试过；Safari、Firefox 未做实测。
- 部署位置尚未决定（需求 Q-01）。

详见 [交付记录](docs/delivery.md)。

## 先决条件

- Node.js ≥ 22.12，npm
- 运行端到端测试前需要一次 `npx playwright install chromium`（要联网下载浏览器）

## 构建与本地预览

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run preview
```

构建产物在 `dist/`，预览默认在 http://localhost:4321/ 。内容有错（步骤标识重复、引用不存在的步骤或图片、路线走不到完成页、分支没有汇合、元数据缺失）时构建会失败并报出文件。

## 部署

`dist/` 是一组静态文件，放到任意静态文件服务器（Nginx、GitHub Pages 等）即可。部署在子路径下时，构建时用 `BASE_PATH` 指定：

```bash
BASE_PATH=/sub/ npm run build
```

站点用目录式 URL（`/overview/` → `overview/index.html`），找不到的地址应返回 `404.html`。Nginx 的常见写法：

```nginx
location /sub/ {
    try_files $uri $uri/index.html =404;
    error_page 404 /sub/404.html;
}
```

`SITE_URL` 可选，填站点的完整域名。

## 改内容

内容都在 `src/content/`：`route.yaml` 是路线图（章节、分叉点、步骤顺序），`steps/<步骤标识>.md` 每步一个文件，另有 `choices/`、`faq/`、`pages/`。截图放在 `src/assets/screenshots/`，正文里写 `![[文件名|宽度]]`。补写占位步骤时只需要替换对应的步骤文件，不用改路线。写法规则见 [CONTEXT.md](CONTEXT.md) 和 [docs/migration-checklist.md](docs/migration-checklist.md)；**已发布的步骤标识不能改**。

## 开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm test` | 单元测试（Vitest） |
| `npm run test:build` | 用坏内容逐个构建，断言构建失败并报出文件 |
| `npm run test:e2e` | 构建后用 Playwright 在 360 和 1280 两种宽度下测试，另按 `/sub/` 子路径构建再测一次 |
| `npm run check` | `astro check` + 单元测试 + 构建级用例 + 构建，提交前运行 |
| `node scripts/compare-migration.mjs` | 原文与站内的命令、链接、截图逐项比对（需要原文所在的博客仓库） |
| `node scripts/import-rewrite.mjs` | 从 `docs/rewrite/` 的重写稿导入正文和截图（v2 内容，规则见 [ADR-0005](docs/adr/0005-import-rewrite-verbatim.md)）；新复制的截图要逐张核对打码 |

开发约定见 [AGENTS.md](AGENTS.md)，需求、架构和设计在 [docs/](docs/)。
