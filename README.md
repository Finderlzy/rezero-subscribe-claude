# Re:从零开始订阅 claude

把《如何订阅claude》做成按章阅读的引导站。读者按自己的情况选路线（节点方案、手机系统），每一页读一章，“上一步 / 下一步”按所选路线计算。纯静态站点，不需要服务端程序，也不加载统计脚本和第三方字体。

## 能做什么

当前版本 3.0.0（交付记录见 [docs/delivery.md](docs/delivery.md)）。

- 五章（开始、准备节点和住宅 IP、客户端配置与订阅、日常维护、结尾）、11 页，一章一页，正文从 `docs/v3-rewrite/` 的重写稿原样导入；没有操作版/原理版切换。
- 两个分叉点（方案一/二、iPhone/安卓）的选项卡片在正文页末尾：选择只存在读者本机，“上一步 / 下一步”按所选路线改写。节点方案没选时按默认的方案二走；手机系统没有默认，没选时导航指向选择页。
- 宽屏（≥720px）左侧常驻侧边栏，窄屏用目录抽屉；侧边栏只展开当前章、列出当前页的小标题，章名和步骤都不写数字。首页是 VuePress 式首屏 + 五章简介。
- 顶栏有站内搜索（页面标题和 h2/h3）、昼夜切换和作者联系方式；搜索索引在构建时生成，在浏览器里匹配。
- IP 质量实测合集和 6 篇实测是保留的参考页（`/ip-tests/`、`/ip-tests/<id>/`）；旧常见问题、附录、旁支页的网址都跳到新页面和小节。
- 代码块一键复制，截图编号、点击看大图，正文有说明图；不运行 JS 也能从首页走到后记。
- 首页、日常维护页、参考页和后记有 QQ 群入口；首页以外每页的顶栏右侧有作者的联系方式（GitHub、X、哔哩哔哩、抖音）。
- 每个页面都有固定 URL `/<标识>/`，可以直接打开和分享；页面标识从 2.0.0 起不再改，合并掉的旧标识由 `route.yaml` 的 `moved:` 跳转。

## 已知限制

- 重写稿里还有 TODO 段落（当前 1 页，`ip-tests/qsu-residential`），页面上显示为“作者待补”；`npm run build` 结束时列出。
- 还没有步骤视频；没有视频的页面不显示视频区域。
- 浏览器兼容只在 Chromium 上自动测试过；Safari、Firefox 未做实测。

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

构建产物在 `dist/`，预览默认在 http://localhost:4321/ 。内容有错（标识重复、引用不存在的页面、锚点或图片、某条路线走不到后记、分支没有汇合、跳转表目标或小节不存在、元数据写错）时构建会失败并报出文件。构建结束时列出内容提示（作者待补、博客链接待填），不影响构建。

## 部署

正式站点 <https://re0claude.us.ci/> 部署在 GitHub Pages，2026-10-19 上线。推送到 `main` 后由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 构建并发布（也可以在 Actions 页手动运行）；内容有错时构建失败，不会部署。域名写在 `public/CNAME`。上线时做过下面三件事，换仓库或域名时照做：

1. 仓库 Settings → Pages → Build and deployment 的 Source 选 **GitHub Actions**。
2. 域名的 DNS 加 4 条 A 记录指向 `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`（可再加 AAAA：`2606:50c0:8000::153` 到 `2606:50c0:8003::153`）；用 Cloudflare 时先关掉代理（灰色云朵），等证书签发后再说。
3. Settings → Pages 的 Custom domain 填 `re0claude.us.ci`，DNS 检查通过后勾选 **Enforce HTTPS**。

私有仓库开 Pages 需要付费账户；改为公开前先扫一次提交历史（见 [docs/delivery.md](docs/delivery.md)）。

`dist/` 是一组静态文件，也可以放到其他静态文件服务器（Nginx 等）。部署在子路径下时，构建时用 `BASE_PATH` 指定：

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

内容都在 `src/content/`：`route.yaml` 是路线图（章节、分叉点、页面顺序、旧网址跳转表），`principle/<标识>.md` 是 11 页正文（页面元数据写在 frontmatter，选择页写 `options`），`reference/` 只放 IP 质量实测合集和 6 篇实测。正文不手改：改 `docs/v3-rewrite/` 的重写稿，再运行 `node scripts/import-rewrite.mjs`（[ADR-0005](docs/adr/0005-import-rewrite-verbatim.md)）。截图放在 `src/assets/screenshots/`，正文里写 `![[文件名|宽度]]`。页面标识、旧网址去向和迁移口径见 [docs/migration-checklist.md](docs/migration-checklist.md)；**v2.0 发布后页面标识不能改**。

## 开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm test` | 单元测试（Vitest） |
| `npm run test:build` | 用坏内容逐个构建，断言构建失败并报出文件 |
| `npm run test:e2e` | 构建后用 Playwright 在 360、768 和 1280 三种宽度下测试，另按 `/sub/` 子路径构建再测一次 |
| `npm run check` | `astro check` + 单元测试 + 构建级用例 + 构建，提交前运行 |
| `node scripts/compare-migration.mjs` | 先 `npm run build`，再把重写稿和 `dist/` 的命令、链接、截图和说明图逐项比对（AC-13）；退出码 0 无差异，1 有差异，2 只剩登记的作者待补 |
| `node scripts/import-rewrite.mjs` | 从 `docs/v3-rewrite/` 的重写稿导入 11 页正文和截图（规则见 [ADR-0005](docs/adr/0005-import-rewrite-verbatim.md)）；新复制的截图要逐张核对打码 |

开发约定见 [AGENTS.md](AGENTS.md)，需求、架构和设计在 [docs/](docs/)。

## 许可

代码用 [MIT](LICENSE)；教程正文、截图、说明图和宣传片用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)：可以转载和改编，要署名、不能商用。Claude Code 小形象、logo 里致敬番剧的 “Re:” 字样等不在授权范围内。详见 [LICENSE-CONTENT.md](LICENSE-CONTENT.md)。
