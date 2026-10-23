# 仓库指南

「Re:从零开始订阅 claude」是把《如何订阅claude》做成分步引导的静态网站。当前状态：**v3 已完成（V01–V12）并上线，站点版本 3.0.0（2026-10-22 正式上线）**，正式地址 <https://re0claude.us.ci/>（见 [docs/delivery.md](docs/delivery.md)）。

v3（2026-10-21 需求定稿，2026-10-22 按作者新稿收口）把站点改成参考站 VuePress 默认文档主题的样子（保留紫色和 Astro，去掉页头色带，≥720px 常驻侧边栏，加站内搜索、昼夜切换），并按作者重写好的 `docs/v3-rewrite/` 换成 11 页单版本：一章一页、没有操作版/原理版切换，方案三、独立常见问题、附录不再收录，IP 质量实测合集和 6 篇实测保留为参考页。V01–V09 已合并 main；**V10** 换成 11 页、5 章、2 个分叉点，选项卡片改由 frontmatter 生成；**V11** 把全部 47 条旧网址（37 条旧页面含 6 条手机分流、8 条旧常见问题路径和旧 `faq` 目录）写进 `route.yaml` 的 `moved:`，更新验收和文档、同步 Writing 和大肥鱼、删除旧稿 `docs/rewrite/`。**V12** 按 design §7 做了 360/768/1280、深浅两色的逐页截图对照和 AC-01–AC-33 全量回归，升 3.0.0 并打标签。**2026-10-22 收尾**：清掉 v2 遗留的 28 张未引用截图和一张旧说明图、合并后的本地分支，README 换成大 logo + 徽章 + QQ 群 + 截图的样式，以 3.0.0 正式上线。标“计划”的条目由对应任务建立，建立后改成现状。

## 给 AI Agent 的约定

- **让作者选方案时，默认推荐方案二**（作者 2026-10-23 规定）：需要作者在几个方案里挑的时候（如选项卡片式的提问、方案一/方案二这类取舍），默认把**方案二**（第二个选项）作为推荐项，标“推荐 / (Recommended)”；选项按自然顺序排，不为了强调推荐把它挪到第一位。只有方案二在具体情况下明显不合适时，才先说明理由、再换一个推荐。
- **文章同步是手动动作**：默认不同步到 Writing，作者说了再同步（见下文“文章同步”）。

## 文档入口

| 何时读 | 文档 |
| --- | --- |
| 任何任务前 | [CONTEXT.md](CONTEXT.md)：术语（步骤、路线、分叉点、小节……），命名和文案要用这里的词 |
| 判断做不做、怎么验收 | [docs/requirements.md](docs/requirements.md)：范围、三级边界、FR/AC 编号 |
| 改代码结构、接口、目录 | [docs/architecture.md](docs/architecture.md)（v3 的增量在 §13）、[docs/adr/](docs/adr/) |
| 改页面或样式 | [docs/design.md](docs/design.md)：设计令牌、页面结构、拒绝清单；**v3（文档站风格，2026-10-21 定稿，V01–V12 已实施）**：昼夜切换、常驻侧边栏、正文组件、文字链接翻页、VuePress 式首页、站内搜索、小节锚点、11 页单版本内容和选项卡片。v2.2 的契约见 git 历史 |
| 选依赖 | [docs/reuse-research.md](docs/reuse-research.md) |
| 看交付状态、未解决项 | [docs/delivery.md](docs/delivery.md)：验收基线、结果和待补项；使用和部署说明在 [README.md](README.md) |
| 选任务、看顺序和档位 | [docs/implementation-plan.md](docs/implementation-plan.md)：里程碑、依赖和 Issue 链接；任务范围与状态以 GitHub Issues 为准 |

## 项目结构（详见架构 §6）

工程配置在仓库根目录（`astro.config.mjs`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`）。站内链接一律经 `src/lib/with-base.ts` 的 `withBase()` 生成。标“计划”的目录由后续任务建立：

- `src/content/`（集合定义在 `src/content.config.ts`）：内容。`route.yaml` 是路线图（章节、分叉点、页面顺序、跳转表 `moved:`）。现状（V10）：`principle/<id>.md` 是 11 页单版本正文，页面元数据写在它的 frontmatter（选择页写 `options`）；`reference/` 只留 `ip-tests.md` 和 `ip-tests/<id>.md` 共 7 个参考页；`blog-links.yaml` 是博客外链映射。正文由 `scripts/import-rewrite.mjs` 从 `docs/v3-rewrite/` 原样导入，不手改正文（ADR-0005）；页面标识、旧网址去向和迁移口径在 [docs/migration-checklist.md](docs/migration-checklist.md)。截图放在 `src/assets/screenshots/`，嵌入写裸文件名 `![[文件名|宽度]]`；说明图（`.svg`，design §4.7）由导入脚本从重写稿的 `附件/` 复制到 `src/assets/diagrams/`，改图就改附件里的原稿再导入；正文视频（`.mp4`，2026-10-23）自托管：文件直接放 `public/videos/`，正文写裸文件名 `![[名字.mp4]]`，导入脚本不复制视频（转码命令见 [docs/v3-rewrite-video-list.md](docs/v3-rewrite-video-list.md)）；logo 只放 `src/assets/logo/`，只由 `src/components/Logo.astro` 引用；README 顶部的深浅两版横幅也由 `node scripts/build-logo.mjs` 生成，放 `docs/assets/readme-logo-{light,dark}.svg`，由 README 用 `<picture>` 引用（不进站点构建）；README 的首页截图 `docs/assets/readme-home-{light,dark}.webp` 同样是交付用图，不参与站点构建；Claude Code 像素小形象只放 `src/assets/mascot/`，只由 `src/components/Mascot.astro` 引用（design D6、D7：不改色、不放大、不改画）；编号字形放 `src/assets/numerals/`，只由 `Numeral.astro`/`NumeralSprite.astro` 和 `src/lib/numeral.ts` 引用，只用在找不到页的大号 `404`（章节号一律写成文字）；这些 SVG、`metrics.json` 和 `public/favicon.svg` 由 `node scripts/build-logo.mjs` 生成，不手改（`scripts/build-logo.test.ts` 核对生成物和脚本输出一致）。
- `src/lib/`：纯逻辑模块，单元测试放在旁边（`*.test.ts`；组件的渲染测试用 Astro Container API，放在组件旁边）。其中 `content/` 是 M1，`route/` 是 M2，`reader-state/` 是 M4；`search/` 是 M6 站内搜索（V06、V08 现状：构建时生成索引、浏览器里匹配，索引由静态端点 `src/pages/search-index.json.ts` 输出，顶栏的搜索框由 `src/components/SiteSearch.astro` 和 `src/scripts/search.ts` 接上）。
- `src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`：页面（M3）。`src/scripts/` 放打包进页面的浏览器脚本（如 `code-zoom.ts`），和根目录放一次性开发脚本的 `scripts/` 不是一回事。
- `tests/e2e/`：Playwright 测试，文件按验收编号命名，如 `ac-09-unchosen.spec.ts`；`tests/build/`：构建级用例（AC-14）；`tests/fixtures/`：构建级用例用的坏内容，每个用例一个目录，按 `src/content/` 的相对路径覆盖。
- `docs/`：文档；新的难以逆转的决策写进 `docs/adr/NNNN-slug.md`。`docs/v3-rewrite/` 是作者维护的重写稿（v3 素材来源），站点代码不直接读它；v1/v2 的 `docs/rewrite/` 已在 V11 删除。一次性的开发脚本放在 `scripts/`（`import-rewrite.mjs`，测试在旁边；`compare-migration.mjs` 对照新稿和产物；`build-logo.mjs`，生成 logo、README 横幅和编号转曲，字体放在不提交的 `.cache/fonts/`，下载地址写在脚本开头）。

## 构建、测试与开发命令

Node ≥ 22.12，使用 npm，以 `package.json` 为准。`npm run dev`、`npm run build`（含全部内容校验：frontmatter、Obsidian 写法和路线图校验都已接入，结束时列出内容提示：作者待补、博客链接待填；可用 `BASE_PATH=/sub/` 生成子路径版本）、`npm run preview`、`npm test`（Vitest）、`npm run test:e2e`（先构建，再用 Playwright 在 360、768 和 1280 三种宽度下测试；AC-15 另按 `BASE_PATH=/sub/` 构建到 `dist-sub/`，用 `tests/e2e/static-server.mjs` 挂在子路径下再测一次，这次构建要排在 `dist/` 的构建之后，不能并行（两者共用 Astro 内容缓存）；首次运行前执行 `npx playwright install chromium`）、`npm run test:build`（用 `tests/fixtures/` 的坏内容逐个构建，断言失败并报出文件）、`npm run check`（`astro check` + 单元测试 + 构建级用例 + 构建，提交前运行）。

在 AI Agent 里运行时，Astro 会把 `astro dev`/`astro preview` 自动转入后台，用 `npx astro dev stop`/`npx astro preview stop` 停止；需要前台运行时加 `--ignore-lock`。

## 代码风格与命名

- TypeScript（固定 6.x）、原生 CSS，不引入 UI 框架和 CSS 框架。颜色、间距只用 `src/styles/tokens.css` 里的令牌。
- 页面（步骤、选择页）和分叉点的标识用英文 kebab-case，同时也是文件名和 URL。**v2.0 发布后标识不能改**（ADR-0002）；删掉或合并掉的旧标识登记在 `route.yaml` 的 `moved:` 段（ADR-0006，V09/V11；旧网址仍然生成跳转页），不能再分给新页面。
- v2.0 起正文从重写稿原样导入；v3 新稿用相对 Markdown 链接（如 `[文字](02-方案一…md)`），导入时转成站内链接，不改命令、链接、优惠码、商家；要改内容就改 `docs/v3-rewrite/` 再重新导入（ADR-0005）。`[!why]` 块不再使用（ADR-0004 取代 ADR-0003）。

## 视频

**分工（作者 2026-10-23 定）**：AI Agent 只负责**预处理**，视频入库和上线由作者做。

1. **Agent 做预处理**：剪辑（剪掉露出服务器 IP、节点名、项目名、标签页标题的开头结尾和无关等待）、逐字打码（不要画大块灰色）、用显卡转码（`node scripts/encode-video.mjs`）、生成封面、全片抽帧 OCR 核查。
2. **交付**：成品和封面统一放到 `~/视频/预处理完成/`，文件名用小写英文和连字符（如 `v2rayn-rules.mp4` + `v2rayn-rules.jpg`），同时告诉作者该放哪个小节。
3. **作者**把视频放进 Obsidian 稿（`docs/v3-rewrite/` 对应正文）并自己决定何时上线。
4. **Agent 之后做的**：`node scripts/import-rewrite.mjs` 导入正文、`npm run check`、核查页面里的视频块；**不自己提交视频、不自己推送上线**，等作者说上线再部署。

## 文章同步

改了文章（`docs/v3-rewrite/` 的 11 页、参考页、附件）之后，**不自动**同步到 Writing；作者说了再同步（规则以 Writing 的 `docs/AGENTS.md` 为准）。大肥鱼按下面的规则同步：

- **Writing**（`~/Workspace/Writing`，作者博客）：按需同步，2026-10-23 起不再随文章改动自动执行。作者要求同步时，11 页单版本按 Writing 的目录和链接规则落到博客里，先 diff 再改，保留 Writing 已有的改写和 frontmatter 的 `slug`；在 Writing 里单独提交，信息写“同步订阅教程：……”。旧的详细口径（`docs/04技术/原理版/`、`docs/09附件/`、删旧页、不复制到 `操作版/`）见 git 历史。
- **大肥鱼**（`~/Workspace/dafeiyu`）：本仓库合并后，在 `MaiBot-1.2.4/plugins/dafeiyu_tutorial_qa/` 运行 `python3 build_corpus.py ~/Workspace/rezero-subscribe-claude` 重新生成 `corpus.json`（记录本仓库的提交号），再按该目录 `README.md` 同步到服务器、重启 core。上服务器会影响线上群，先问用户；大肥鱼仓库不自动提交，在它的 `docs/project-board.md` 登记，规则以它的 `AGENTS.md` 为准。

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
