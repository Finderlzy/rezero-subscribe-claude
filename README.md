# Re:从零开始订阅 claude

把《如何订阅claude》拆成一步一页的引导站。读者按自己的情况选路线（节点方案、电脑代理软件、手机系统），每一页只做一件事，“上一步 / 下一步”按所选路线计算。纯静态站点，不需要服务端程序，也不加载统计脚本和第三方字体。

## 能做什么

当前版本 2.0.0（交付记录见 [docs/delivery.md](docs/delivery.md)）。

- 五章（开始、准备节点和住宅 IP、注册和订阅、结尾、附录），一步一页，正文从 `docs/rewrite/` 的重写稿原样导入。
- 分叉点（节点方案、手机系统）有选择页，没有默认路线：选择只存在读者本机，“上一步 / 下一步”按所选路线改写；没选时，汇合处的导航指向选择页。
- 每页有原理版和操作版，可以整页切换，URL 不变，切换结果跨页保持；原理独有的页面（整体思路、小结等）只在原理视图的路线上。
- 宽屏（≥1100px）左侧常驻目录，窄一些的屏幕用目录抽屉；首页有“从第 00 章开始”和按章的完整目录。
- 常见问题一问一页（`/faq/<id>/`），IP 质量实测是独立的参考页；从步骤里点进去，有“返回刚才的步骤”。
- 旁支页（如“被封了：申诉解封”）有“回到”链接，主路线不经过它；可跳过的步骤有跳过按钮。
- 代码块一键复制，截图编号、点击看大图，原理版有说明图；不运行 JS 也能从首页走到附录。
- 每个页面都有固定 URL `/<标识>/`，可以直接打开和分享；页面标识从 2.0.0 起不再改。

## 已知限制

- 重写稿里还有 TODO 段落（9 页），页面上显示为“作者待补”；`npm run build` 结束时列出所在页面。
- 还没有步骤视频；没有视频的页面不显示视频区域。
- 后记还没写联系渠道（需求 Q-07）。
- 浏览器兼容只在 Chromium 上自动测试过；Safari、Firefox 未做实测。
- 部署位置和域名尚未决定（需求 Q-01）。

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

构建产物在 `dist/`，预览默认在 http://localhost:4321/ 。内容有错（标识重复、引用不存在的页面、锚点或图片、某条路线走不到后记、分支没有汇合、两版标题不同、元数据写错）时构建会失败并报出文件。构建结束时列出内容提示（操作版缺失、作者待补、博客链接待填），不影响构建。

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

内容都在 `src/content/`：`route.yaml` 是路线图（章节、分叉点、页面顺序、旁支页），`principle/<标识>.md` 是原理版（页面元数据写在它的 frontmatter），`operation/<标识>.md` 是同名操作版，`reference/` 是常见问题和实测。正文不手改：改 `docs/rewrite/` 的重写稿，再运行 `node scripts/import-rewrite.mjs`（[ADR-0005](docs/adr/0005-import-rewrite-verbatim.md)）。截图放在 `src/assets/screenshots/`，正文里写 `![[文件名|宽度]]`。页面标识表见 [docs/migration-checklist.md](docs/migration-checklist.md) 的 v2 节；**v2.0 发布后页面标识不能改**。

## 开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm test` | 单元测试（Vitest） |
| `npm run test:build` | 用坏内容逐个构建，断言构建失败并报出文件 |
| `npm run test:e2e` | 构建后用 Playwright 在 360、768 和 1280 三种宽度下测试，另按 `/sub/` 子路径构建再测一次 |
| `npm run check` | `astro check` + 单元测试 + 构建级用例 + 构建，提交前运行 |
| `node scripts/compare-migration.mjs` | 先 `npm run build`，再把重写稿和 `dist/` 的命令、链接、截图和说明图逐项比对（AC-13）；退出码 0 无差异，1 有差异，2 只剩登记的作者待补 |
| `node scripts/import-rewrite.mjs` | 从 `docs/rewrite/` 的重写稿导入正文和截图（v2 内容，规则见 [ADR-0005](docs/adr/0005-import-rewrite-verbatim.md)）；新复制的截图要逐张核对打码 |

开发约定见 [AGENTS.md](AGENTS.md)，需求、架构和设计在 [docs/](docs/)。
