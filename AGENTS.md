# 仓库指南

「Re:从零开始订阅 claude」是把《如何订阅claude》拆成分步引导的静态网站。当前状态：需求、架构和设计已定稿；Astro 工程脚手架和命令（#1）、内容格式 M1（#4）、路线 M2（#3）、本机状态 M4（#7）已建立，“开始”章已走通（#5），第一章和节点方案选择页已迁入（#6），浏览器按本机选择改写导航（#8），操作/原理视图切换已接上（#9），第二到四章（电脑代理、防泄漏、电脑改时区）和“内容待补”面板已迁入（#10）；跳过按钮、“清理本机的 Claude Code 配置”“IP 不合格”、第六章“手机代理”和第七章的汇合点已迁入（#11）；代码块复制和截图看大图已实现（#20）；第七章“准备 Google 账号”、第八章“养号”和第九章“注册 claude”已迁入（#12）；第十章“订阅”、第十一章“订阅之后”和完成页的致谢、后记已迁入，联系方式暂为占位（#13）；常见问题和常见问题页已迁入，步骤里的常见问题链接可“返回刚才的步骤”（#14）；坏内容让构建失败的构建级用例已补齐（#15）；原文与站内的命令、链接全文比对脚本 `scripts/compare-migration.mjs` 已建立，差异为零，视频和 8 张未打码截图仍待补（#16）；步骤视频门面已实现，原文的配套视频按作者决定暂不放，各步骤显示“视频制作中”（#17）；步骤目录（侧栏/抽屉、在目录里切换路线、已读 ✓）和目录里的“清除进度”已实现，常见问题页和找不到页有“打开目录”（#18）；其余内容和页面由后续 Issue 逐步实现。下文标“计划”的目录由对应任务建立，建立后改成现状。

## 文档入口

| 何时读 | 文档 |
| --- | --- |
| 任何任务前 | [CONTEXT.md](CONTEXT.md)：术语（步骤、路线、分叉点、操作视图……），命名和文案要用这里的词 |
| 判断做不做、怎么验收 | [docs/requirements.md](docs/requirements.md)：范围、三级边界、FR/AC 编号 |
| 改代码结构、接口、目录 | [docs/architecture.md](docs/architecture.md)、[docs/adr/](docs/adr/) |
| 改页面或样式 | [docs/design.md](docs/design.md)：设计令牌、页面结构、拒绝清单 |
| 选依赖 | [docs/reuse-research.md](docs/reuse-research.md) |
| 选任务、看顺序和档位 | [docs/implementation-plan.md](docs/implementation-plan.md)：里程碑、依赖和 Issue 链接；任务范围与状态以 GitHub Issues 为准 |

## 项目结构（详见架构 §6）

工程配置在仓库根目录（`astro.config.mjs`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`）。站内链接一律经 `src/lib/with-base.ts` 的 `withBase()` 生成。标“计划”的目录由后续任务建立：

- `src/content/`（集合定义在 `src/content.config.ts`）：内容。`route.yaml` 是路线图（章节、分叉点、步骤顺序），`steps/<step-id>.md` 每步一个文件，另有 `choices/`（选择页，#6 已建立）、`faq/`（常见问题，#14 已建立）和 `pages/`（首页 `home.md`、完成页 `done.md`、常见问题列表 `faq.md`）。迁移规则和逐节核对记录在 [docs/migration-checklist.md](docs/migration-checklist.md)。截图放在 `src/assets/screenshots/`（已建立），嵌入写裸文件名 `![[文件名|宽度]]`。
- `src/lib/`：纯逻辑模块，单元测试放在旁边（`*.test.ts`；组件的渲染测试用 Astro Container API，放在组件旁边）。其中 `content/` 是 M1，`route/` 是 M2，`reader-state/` 是 M4。
- `src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`：页面（M3）。`src/scripts/` 放打包进页面的浏览器脚本（如 `route-enhance.ts`），和根目录放一次性开发脚本的 `scripts/` 不是一回事。
- `tests/e2e/`：Playwright 测试，文件按验收编号命名，如 `ac-03-branch-merge.spec.ts`；`tests/build/`：构建级用例（AC-14）；`tests/fixtures/`：构建级用例用的坏内容，每个用例一个目录，按 `src/content/` 的相对路径覆盖。
- `docs/`：文档；新的难以逆转的决策写进 `docs/adr/NNNN-slug.md`。一次性的开发脚本放在 `scripts/`。

## 构建、测试与开发命令

Node ≥ 22.12，使用 npm，以 `package.json` 为准。`npm run dev`、`npm run build`（含全部内容校验：frontmatter、Obsidian 写法和路线图校验都已接入，结束时列出占位步骤；可用 `BASE_PATH=/sub/` 生成子路径版本）、`npm run preview`、`npm test`（Vitest）、`npm run test:e2e`（先构建，再用 Playwright 在 360 和 1280 两种宽度下测试；首次运行前执行 `npx playwright install chromium`）、`npm run test:build`（用 `tests/fixtures/` 的坏内容逐个构建，断言失败并报出文件）、`npm run check`（`astro check` + 单元测试 + 构建级用例 + 构建，提交前运行）。

在 AI Agent 里运行时，Astro 会把 `astro dev`/`astro preview` 自动转入后台，用 `npx astro dev stop`/`npx astro preview stop` 停止；需要前台运行时加 `--ignore-lock`。

## 代码风格与命名

- TypeScript（固定 6.x）、原生 CSS，不引入 UI 框架和 CSS 框架。颜色、间距只用 `src/styles/tokens.css` 里的令牌。
- 步骤、分叉点、常见问题的标识用英文 kebab-case，同时也是文件名和 URL。**已发布的标识不能改**（ADR-0002）。
- 原理版独有的内容写进 `> [!why]` 块（ADR-0003）。迁移原文章时只拆分和排版，不改命令、链接、优惠码、商家。

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
