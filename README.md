<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme-logo-dark.svg">
  <img src="docs/assets/readme-logo-light.svg" width="560" alt="Re:从零开始订阅 Claude">
</picture>

**把《如何订阅 Claude》做成一步一步照着点就行的引导站。**

> 让 Claude 能看到的每一项信息，都指向一个 Claude 支持地区的普通用户，并且用得像个普通人。

[![在线站点](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E7%AB%99%E7%82%B9-re0claude.us.ci-6F42C1?style=flat-square)](https://re0claude.us.ci/)
[![QQ 群](https://img.shields.io/badge/QQ%E7%BE%A4-1131606770-12B7F5?style=flat-square&logo=tencentqq&logoColor=white)](https://qm.qq.com/q/a00aEmiu2I)
[![版本](https://img.shields.io/badge/version-3.0.0-6F42C1?style=flat-square)](https://github.com/Finderlzy/rezero-subscribe-claude/releases)
[![部署](https://github.com/Finderlzy/rezero-subscribe-claude/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Finderlzy/rezero-subscribe-claude/actions/workflows/deploy.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.12-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#本地运行)
[![许可](https://img.shields.io/badge/license-MIT%20%2B%20CC%20BY--NC%204.0-3DA639?style=flat-square)](LICENSE-CONTENT.md)

[开始阅读](https://re0claude.us.ci/) · [QQ 群](#qq-群) · [本地运行](#本地运行) · [开发文档](#开发文档)

</div>

<div align="center">


</div>

## 这是什么

《如何订阅 Claude》原本是一篇很长的文章。这个仓库把它拆成按章阅读的引导站：读者每页只读一章，按自己的情况选路线（节点方案、手机系统），然后一路点“下一步”走到后记。

纯静态站点，不需要服务端程序，不加载统计脚本，也不用第三方字体。正文仍然只维护一份：改 `docs/v3-rewrite/` 的稿子，再导入站点。

- **五章、11 页**：开始、准备节点和住宅 IP、客户端配置与订阅、日常维护、结尾。一章一页，没有操作版/原理版切换。
- **两条路线**：方案一/二、iPhone/安卓两个分叉点，选项卡片就在正文页末尾。选择只存在读者本机；节点方案没选时按默认的方案二走，手机系统没选时导航指向选择页。
- **好读也好找**：≥720px 左侧常驻侧边栏，窄屏用目录抽屉；顶栏有站内搜索（页面标题和 h2/h3）和昼夜切换。
- **旧网址不丢**：47 条旧页面、旧常见问题路径和 `/faq/` 都跳到新页面和小节，页面标识从 2.0.0 起不再改。
- **参考页保留**：IP 质量实测合集和 6 篇实测在 `/ip-tests/` 与 `/ip-tests/<id>/`，不进入上一步/下一步序列。
- **能读也能用**：代码块一键复制、截图编号和点击看大图、正文说明图；不运行 JS 也能从首页走到后记。
- **找得到人**：首页、日常维护页、参考页和后记有 QQ 群入口；首页以外每页的顶栏有作者的联系方式（GitHub、X、哔哩哔哩、抖音）。

## QQ 群

有问题？进群问**大肥鱼**。

<p>
  <a href="https://qm.qq.com/q/a00aEmiu2I"><strong>QQ 群 1131606770</strong></a>
  ·
  <a href="https://qm.qq.com/q/a00aEmiu2I">加入群聊 →</a>
</p>

大肥鱼是群里的 AI 嘉宾，24 小时在线。教程哪一步卡住了都可以问她，也可以随便聊。她比我靠谱多了。

问之前建议先看看站里的正文和“日常维护、风控应对与常见故障”，很多坑已经写在里面了。实在不行再在群里问，说清楚卡在哪一页、做了什么、看到了什么；有报错就截图，**截图记得把 IP、节点链接和密码打码**。

## 本地运行

需要 Node.js ≥ 22.12 和 npm。

```bash
npm ci
npm run build
npm run preview
```

构建产物在 `dist/`，预览默认在 <http://localhost:4321/> 。

内容有错时构建会失败并报出文件，包括标识重复、引用不存在的页面/锚点/图片、某条路线走不到后记、分支没有汇合、跳转表目标或小节不存在、元数据写错。构建结束时会列出内容提示（作者待补、博客链接待填），不影响构建。

## 部署

正式站点 <https://re0claude.us.ci/> 部署在 GitHub Pages。推送到 `main` 后由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 构建并发布，也可以在 Actions 页手动运行；内容有错时构建失败，不会部署。域名写在 `public/CNAME`。

换仓库或域名时：

1. 仓库 Settings → Pages → Build and deployment 的 Source 选 **GitHub Actions**。
2. 域名的 DNS 加 4 条 A 记录指向 `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`（可再加 AAAA：`2606:50c0:8000::153` 到 `2606:50c0:8003::153`）；用 Cloudflare 时先关掉代理（灰色云朵），等证书签发后再打开。
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

内容都在 `src/content/`：

- `route.yaml`：路线图（章节、分叉点、页面顺序、旧网址跳转表）。
- `principle/<标识>.md`：11 页正文；页面元数据写在 frontmatter，选择页写 `options`。
- `reference/`：只放 IP 质量实测合集和 6 篇实测。

**正文不手改。** 改 `docs/v3-rewrite/` 的重写稿，再运行：

```bash
node scripts/import-rewrite.mjs
```

截图放在 `src/assets/screenshots/`，正文里写 `![[文件名|宽度]]`；说明图由导入脚本从重写稿的 `附件/` 复制到 `src/assets/diagrams/`，改图就改附件里的原稿再导入。页面标识、旧网址去向和迁移口径见 [docs/migration-checklist.md](docs/migration-checklist.md)。

## 开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm test` | 单元测试（Vitest） |
| `npm run test:build` | 用坏内容逐个构建，断言构建失败并报出文件 |
| `npm run test:e2e` | 构建后用 Playwright 在 360、768 和 1280 三种宽度下测试，另按 `/sub/` 子路径构建再测一次 |
| `npm run check` | `astro check` + 单元测试 + 构建级用例 + 构建，提交前运行 |
| `node scripts/import-rewrite.mjs` | 从 `docs/v3-rewrite/` 导入 11 页正文和截图（规则见 [ADR-0005](docs/adr/0005-import-rewrite-verbatim.md)）；新复制的截图要逐张核对打码 |
| `node scripts/compare-migration.mjs` | 先 `npm run build`，再把重写稿和 `dist/` 的命令、链接、截图和说明图逐项比对（AC-13）；退出码 0 无差异，1 有差异，2 只剩登记的作者待补 |
| `node scripts/build-logo.mjs` | 重新生成 logo、favicon、编号字形和 README 横幅（字体放在不提交的 `.cache/fonts/`，下载地址写在脚本开头） |

## 项目结构

```text
src/
  content/       路线图、11 页正文、参考页
  components/    顶栏、侧边栏、搜索、选项卡片、页脚等
  layouts/       页面外壳
  lib/           路线、内容解析、本机状态、站内搜索
  pages/         静态页面和搜索索引端点
  scripts/       打包进页面的浏览器脚本
  styles/        设计令牌和样式
docs/            需求、架构、设计、交付记录、作者重写稿
scripts/         一次性开发脚本和测试
tests/           Playwright 和构建级用例
promo/           封面、宣传片和群头像
```

## 已知限制

- 重写稿里还有 TODO 段落（当前 1 页，`ip-tests/qsu-residential`），页面上显示为“作者待补”；`npm run build` 结束时列出。
- 还没有步骤视频；没有视频的页面不显示视频区域。
- 浏览器兼容只在 Chromium 上自动测试过；Safari、Firefox 未做实测。

## 开发文档

| 文档 | 内容 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 仓库约定、目录职责、构建和提交流程 |
| [CONTEXT.md](CONTEXT.md) | 术语表 |
| [docs/requirements.md](docs/requirements.md) | 范围、FR/AC 编号 |
| [docs/architecture.md](docs/architecture.md) | 模块、接口和数据流 |
| [docs/design.md](docs/design.md) | 设计令牌、页面结构和拒绝清单 |
| [docs/delivery.md](docs/delivery.md) | 验收基线、结果和待补项 |
| [docs/implementation-plan.md](docs/implementation-plan.md) | 里程碑和任务顺序 |

## 许可

代码用 [MIT](LICENSE)；教程正文、截图、说明图和宣传片用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)：可以转载和改编，要署名、不能商用。Claude Code 小形象、logo 里致敬番剧的 “Re:” 字样等不在授权范围内。详见 [LICENSE-CONTENT.md](LICENSE-CONTENT.md)。

---

<div align="center">

非官方项目，与 Anthropic 无关。

</div>
