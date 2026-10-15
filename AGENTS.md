# 仓库指南

「Re:从零开始订阅 claude」是把《如何订阅claude》做成分步引导的静态网站。当前状态：**1.0.0 已交付**（2026-10-15，按旧文章和 11 章路线，见 [docs/delivery.md](docs/delivery.md)）；**v2.0 规划已完成**（需求 v0.3、架构 v2.0、设计 v2.0、ADR-0004/0005，2026-10-15）：内容改为从 `docs/rewrite/` 的重写稿原样导入，原理/操作整页切换，路线和 URL 按原理版目录重建，取消默认路线和阅读记录，重做视觉和 logo；v2.0 任务见 [实施计划](docs/implementation-plan.md) 和 `[v2.0]` 开头的 Issues。下文“现状”指 1.0.0 的代码，标“v2.0 计划”的由对应任务建立，建立后改成现状。

## 文档入口

| 何时读 | 文档 |
| --- | --- |
| 任何任务前 | [CONTEXT.md](CONTEXT.md)：术语（步骤、路线、分叉点、操作视图……），命名和文案要用这里的词 |
| 判断做不做、怎么验收 | [docs/requirements.md](docs/requirements.md)：范围、三级边界、FR/AC 编号 |
| 改代码结构、接口、目录 | [docs/architecture.md](docs/architecture.md)、[docs/adr/](docs/adr/) |
| 改页面或样式 | [docs/design.md](docs/design.md)：设计令牌、页面结构、拒绝清单 |
| 选依赖 | [docs/reuse-research.md](docs/reuse-research.md) |
| 看交付状态、未解决项 | [docs/delivery.md](docs/delivery.md)：验收基线、结果和待补项；使用和部署说明在 [README.md](README.md) |
| 选任务、看顺序和档位 | [docs/implementation-plan.md](docs/implementation-plan.md)：里程碑、依赖和 Issue 链接；任务范围与状态以 GitHub Issues 为准 |

## 项目结构（详见架构 §6）

工程配置在仓库根目录（`astro.config.mjs`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`）。站内链接一律经 `src/lib/with-base.ts` 的 `withBase()` 生成。标“计划”的目录由后续任务建立：

- `src/content/`（集合定义在 `src/content.config.ts`）：内容。`route.yaml` 是路线图（章节、分叉点、页面顺序）。现状（1.0.0）：`steps/`、`choices/`、`faq/`、`pages/`，迁移记录在 [docs/migration-checklist.md](docs/migration-checklist.md)。v2.0 计划：换成 `principle/<id>.md`（原理版，页面元数据写在它的 frontmatter）、`operation/<id>.md`（同名操作版）、`reference/`（常见问题、实测）和 `blog-links.yaml`，正文由 `scripts/import-rewrite.mjs` 从 `docs/rewrite/` 原样导入，不手改正文（ADR-0005）。截图放在 `src/assets/screenshots/`，嵌入写裸文件名 `![[文件名|宽度]]`；logo 只放 `src/assets/logo/`，只由 `src/components/Logo.astro` 引用；这些 SVG 和 `public/favicon.svg` 由 `node scripts/build-logo.mjs` 生成，不手改。
- `src/lib/`：纯逻辑模块，单元测试放在旁边（`*.test.ts`；组件的渲染测试用 Astro Container API，放在组件旁边）。其中 `content/` 是 M1，`route/` 是 M2，`reader-state/` 是 M4。
- `src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`：页面（M3）。`src/scripts/` 放打包进页面的浏览器脚本（如 `route-enhance.ts`），和根目录放一次性开发脚本的 `scripts/` 不是一回事。
- `tests/e2e/`：Playwright 测试，文件按验收编号命名，如 `ac-03-branch-merge.spec.ts`；`tests/build/`：构建级用例（AC-14）；`tests/fixtures/`：构建级用例用的坏内容，每个用例一个目录，按 `src/content/` 的相对路径覆盖。
- `docs/`：文档；新的难以逆转的决策写进 `docs/adr/NNNN-slug.md`。`docs/rewrite/` 是作者维护的重写稿（素材来源），站点代码不直接读它。一次性的开发脚本放在 `scripts/`（`build-logo.mjs`，logo 转曲用的字体放在不提交的 `.cache/fonts/`，下载地址写在脚本开头；v2.0 计划：`import-rewrite.mjs`）。

## 构建、测试与开发命令

Node ≥ 22.12，使用 npm，以 `package.json` 为准。`npm run dev`、`npm run build`（含全部内容校验：frontmatter、Obsidian 写法和路线图校验都已接入，结束时列出占位步骤；可用 `BASE_PATH=/sub/` 生成子路径版本）、`npm run preview`、`npm test`（Vitest）、`npm run test:e2e`（先构建，再用 Playwright 在 360 和 1280 两种宽度下测试；AC-15 另按 `BASE_PATH=/sub/` 构建到 `dist-sub/`，用 `tests/e2e/static-server.mjs` 挂在子路径下再测一次，这次构建要排在 `dist/` 的构建之后，不能并行（两者共用 Astro 内容缓存）；首次运行前执行 `npx playwright install chromium`）、`npm run test:build`（用 `tests/fixtures/` 的坏内容逐个构建，断言失败并报出文件）、`npm run check`（`astro check` + 单元测试 + 构建级用例 + 构建，提交前运行）。

在 AI Agent 里运行时，Astro 会把 `astro dev`/`astro preview` 自动转入后台，用 `npx astro dev stop`/`npx astro preview stop` 停止；需要前台运行时加 `--ignore-lock`。

## 代码风格与命名

- TypeScript（固定 6.x）、原生 CSS，不引入 UI 框架和 CSS 框架。颜色、间距只用 `src/styles/tokens.css` 里的令牌。
- 页面（步骤、选择页、旁支页）和分叉点的标识用英文 kebab-case，同时也是文件名和 URL。**v2.0 发布后标识不能改**（ADR-0002）。
- v2.0 起正文从重写稿原样导入：双链写中文标题 `[[选择方案]]`，不改命令、链接、优惠码、商家；要改内容就改重写稿再重新导入（ADR-0005）。`[!why]` 块不再使用（ADR-0004 取代 ADR-0003）。

## 测试指南

- 路线、内容解析、本机状态用单元测试覆盖；每条 AC 至少有一个 e2e 用例或写明的人工核对方式。
- 内容出错时，构建必须失败。**不许放宽校验或删断言来让检查通过。**

## 安全

不提交凭据、真实服务器 IP、节点链接、面板账号；截图要先打码再入库。页面不加载统计脚本和第三方字体。

## 提交与合并

提交信息用中文祈使句，概括本次改动，例如“新增路线图校验”。

```
合并策略: auto   # auto：验收通过后自动合并 main | confirm：推送分支后等确认再合并 | pr：走 PR
```
