# 实施计划：Re:从零开始订阅 claude

- 状态：v0.2（2026-10-13），首期（需求 v0.2，步骤地图按作者意见重排为十一章）全部范围
- 输入：[需求](requirements.md)、[架构](architecture.md)（含 [§11 实施前评审](architecture.md#11-实施前架构评审2026-10-13)）、[设计](design.md)、[复用调研](reuse-research.md)、[术语](../CONTEXT.md)
- 任务记录：**GitHub Issues 尚未发布**。仓库还没有 Git 远端，本机也没有 `gh`，所以下文“Issue 草稿”就是当前的任务权威记录。发布后在“任务索引”回填编号和链接，删掉草稿正文，之后状态以 Issues 为准。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。

> **首个可开工任务：T01 工程脚手架**（建议档位：强）。新开会话，用 `task-implement` 指定 T01（发布后改为指定对应的 Issue）。

## 1. 里程碑

| 里程碑 | 交付的可用能力 | 覆盖需求 | 任务 |
| --- | --- | --- | --- |
| **MS1 端到端骨架** | 首页 →“直接开始”→ 开始之前 → 整体思路 → 节点方案选择页 → 默认路线的第一章 → 检查 IP 质量 → 完成页，全部是构建时写死的导航；内容校验在构建里生效 | FR-01–04、FR-10–13（静态部分）、FR-17、FR-18（无进度）、FR-60、FR-61；AC-01、AC-08 与 AC-19（静态部分）、AC-18（找不到页） | T01–T06 |
| **MS2 完整 P0** | 全部十一章和常见问题迁完；任意路线按本机选择计算上一步/下一步；操作/原理视图；内容待补占位；构建失败用例；迁移核对 | FR-03、FR-11–15、FR-20、FR-21、FR-30、FR-31、FR-50（写入）；AC-02、03、05、06、08、11、12、13、14、18、19 | T07–T15、T22 |
| **MS3 P1** | 视频门面、步骤目录（改路线、清除进度）、继续上次、代码复制与看大图 | FR-14、FR-16、FR-18、FR-19、FR-40–42、FR-50、FR-51、NFR-02；AC-04、07、09、10 | T16–T19 |
| **MS4 P2 与交付准备** | 两种宽度和两种主题下的视觉、可访问性；子路径部署；屏蔽境外域名后完整显示 | NFR-01、NFR-03、NFR-04、NFR-05、design §7；AC-15、16、17 | T20–T21 |

MS1、MS2 结束各有一个检查点（§4）。MS2 之后的任务先保留目标和依赖，开工前由 `task-implement` 细化并补参照。

## 2. 依赖与顺序

```
T01 ─┬─ T02 ── T04 ─┐
     ├─ T03 ────────┴─ T05 ── T06 ──┬─ T10 ── T11 ── T12 ── T22 ── T13 ── T15
     │                              ├─ T14
     │                              ├─ T16 ── T21
     │                              ├─ T19 ─────────────────┐
     └─ T07 ─────────────────(T06+T07)─┬─ T08 ── T17 ── T18 ─┴─ T20
                                       └─ T09
```

- **立即可开工**：T01。
- T01 完成后可以并行：T02、T03、T07（互不改同一目录）。
- T06 完成后可以并行：T08（需 T07）、T09（需 T07）、T10、T14、T16、T19。内容迁移 T10 → T11 → T12 → T22 → T13 **串行**，因为都要改 `route.yaml`。
- 并行写代码时各用独立 worktree，按上图从左到右合并；没有循环依赖。

## 3. 任务索引

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 状态 | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | 建立 Astro 工程脚手架与命令 | MS1 | 无 | 强 | 可执行 | 未发布 |
| T02 | 验证 Markdown 管线的四个技术疑点 | MS1 | T01 | 强 | 可执行 | 未发布 |
| T03 | 实现路线图模块 M2 | MS1 | T01 | 强 | 可执行 | 未发布 |
| T04 | 实现内容格式与 Obsidian 写法插件 M1 | MS1 | T01、T02 | 强 | 可执行 | 未发布 |
| T05 | 走通“开始”章：首页、步骤页、完成页、找不到页 | MS1 | T03、T04 | 强 | 可执行 | 未发布 |
| T06 | 迁移第一章并实现节点方案选择页 | MS1 | T05 | 标准 | 可执行 | 未发布 |
| T07 | 实现本机状态模块 M4 | MS2 | T01 | 标准 | 可执行 | 未发布 |
| T08 | 浏览器按本机选择改写导航 | MS2 | T06、T07 | 强 | 待细化 | 未发布 |
| T09 | 实现操作/原理视图切换 | MS2 | T06、T07 | 标准 | 待细化 | 未发布 |
| T10 | 迁移电脑代理、防泄漏、电脑改时区并实现内容待补占位 | MS2 | T06 | 标准 | 待细化 | 未发布 |
| T11 | 迁移清理配置、IP 不合格与手机代理并实现跳过 | MS2 | T10 | 标准 | 待细化 | 未发布 |
| T12 | 迁移 Google 账号、养号与注册 claude | MS2 | T11 | 标准 | 待细化 | 未发布 |
| T22 | 迁移订阅、订阅之后与完成页内容 | MS2 | T12 | 标准 | 待细化 | 未发布 |
| T13 | 迁移常见问题并实现常见问题页 | MS2 | T22 | 标准 | 待细化 | 未发布 |
| T14 | 补齐构建失败用例 | MS2 | T06 | 标准 | 待细化 | 未发布 |
| T15 | 完成迁移核对 | MS2 | T13 | 标准 | 待细化 | 未发布 |
| T16 | 实现步骤视频门面 | MS3 | T06 | 标准 | 待细化 | 未发布 |
| T17 | 实现步骤目录与清除进度 | MS3 | T08 | 标准 | 待细化 | 未发布 |
| T18 | 实现“继续上次”与完成页操作 | MS3 | T08、T17 | 标准 | 待细化 | 未发布 |
| T19 | 实现代码复制与看大图 | MS3 | T06 | 标准 | 待细化 | 未发布 |
| T20 | 视觉打磨、响应式与可访问性验收 | MS4 | T17、T18、T19 | 标准 | 待细化 | 未发布 |
| T21 | 子路径部署与国内可访问验收 | MS4 | T16 | 标准 | 待细化 | 未发布 |

## 4. 检查点

**MS1 结束（T01–T06 合并后）**
- [ ] `npm run check` 通过；`npm run test:e2e` 通过
- [ ] 在 360 和 1280 宽下，从首页沿默认路线点到完成页，没有断链
- [ ] 截图入库前已逐张核对打码（R8）
- [ ] 回看本计划：MS2 任务的顺序和档位是否仍然合适

**MS2 结束（T07–T15、T22 合并后）**
- [ ] AC-02、03、05、06、08、11、12、13、14、18、19 全部有对应的 e2e 用例或人工核对记录
- [ ] 构建输出的占位清单和作者确认一致

**全部完成**：AC-01–AC-18 都有证据，交给 project-delivery 做整体验收。

## 5. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| `rehype-callouts` 不支持自定义 `why`，或插件图片进不了 Astro 图片流程 | 中 | T02 先验证；不行就按 reuse-research §4 的替代方案（自写 rehype 插件 / 截图放 `public/`） |
| Astro 7 / Vitest 5 / TS 6 组合有未知兼容问题 | 中 | T01 锁版本并跑通全部命令后再开其他任务 |
| 迁移时漏内容或改了命令、链接 | 高 | 每个迁移任务更新 `docs/migration-checklist.md`；T15 用脚本比对命令和链接 |
| 截图露出服务器 IP 等敏感信息 | 高 | T06 起每个迁移任务的验收都有逐张核对项 |
| Playwright 浏览器需要联网下载 | 低 | T01 安装 chromium 一次；离线时 e2e 无法运行要如实报告 |

## 6. 待决事项（不阻塞）

需求 Q-01（部署位置）、Q-02（F2 选项）、Q-07（联系方式，T22 用占位）、Q-10（注册 claude 单独成章，作者可改）。

---

## 附：Issue 草稿

正文按 project-plan 模板写，发布时把每节 `####` 以下的内容作为 Issue 正文，标题用 `####` 后的文字（去掉 `Txx`）。

### MS1 端到端骨架

#### T01 建立 Astro 工程脚手架与命令

**目标**：建立可以构建、测试、端到端测试的空工程，后续所有任务都在这个基础上开工。首页只显示站名大标题「Re:从零开始订阅 claude」和英文副标题「Re:Zero − Starting Life with Claude」（需求 §1），所有页面的 `<title>` 含站名。关联 FR-60、架构 §1、§6、§7。

**涉及范围**：`package.json`、`package-lock.json`、`astro.config.mjs`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`、`.gitignore`、`src/layouts/BaseLayout.astro`、`src/pages/index.astro`、`src/styles/tokens.css`、`src/styles/base.css`、`src/lib/with-base.ts`（+ 测试）、`tests/e2e/smoke.spec.ts`、`AGENTS.md`（把“计划”改成现状）。

**依赖**：`可立即开工`

**建议档位**：`强` — 首个端到端骨架，确定后续所有任务共用的版本、配置和命令。

**参照**：
- 版本：Astro 7.3.x、`@astrojs/markdown-remark`（unified 处理器，先装上，T02 再接插件）、TypeScript 6.x（固定，`@astrojs/check` 不兼容 7）、Vitest 5、`@playwright/test` 1.64、`@axe-core/playwright`；Node ≥ 22.12（`engines` 写明）。`version` 从 `0.1.0` 开始。
- `astro.config.mjs` 按架构 §3 M5：`output: 'static'`、`build.format: 'directory'`、`trailingSlash: 'always'`、`base: process.env.BASE_PATH ?? '/'`、`site: process.env.SITE_URL`。
- `withBase(path: string): string`：拼上 `import.meta.env.BASE_URL`，处理 `/` 与 `/sub/` 两种 base；边界用例：`'/'`、`'/foo/'`、带查询参数、重复斜杠。
- 脚本按架构 §7：`dev`、`build`、`preview`、`test`（vitest run）、`test:e2e`（先 build 再 playwright，`webServer` 用 `astro preview`）、`check`（`astro check && vitest run && astro build`）。Playwright 两个项目：360×800、1280×800，只装 chromium。
- `tokens.css` 照抄 design §3.1–§3.3 的令牌（含深色），`base.css` 只放系统字体栈和 `body` 背景。
- `.gitignore`：`dist/`、`.astro/`、`node_modules/`、`test-results/`、`playwright-report/`、`coverage/`、`.env*`。
- 不引入任何网页字体、图标库、UI 框架或 CSS 框架。

**验收**：
- [ ] 测试：`npm test` → `with-base` 的单元测试通过
- [ ] 构建：`npm run check` 通过；`BASE_PATH=/sub/ npm run build` 也成功
- [ ] e2e：`npm run test:e2e` → 两个视口下首页 h1 为「Re:从零开始订阅 claude」，副标题存在，`document.title` 含站名
- [ ] 手工验证：`npm run dev` 打开首页 → 浅色和深色系统主题下背景色分别为 `#F7F5F0`、`#171614`

#### T02 验证 Markdown 管线的四个技术疑点

**目标**：用实验回答架构 §10 A-02 / 复用调研 §4 的第 1、2、4 条疑点，并补测中文文件名，把结论写回文档，T04 按结论实现。B 站参数放到 T16 实测。关联架构 §11 R6。

**涉及范围**：`astro.config.mjs`（接入 unified 处理器和 `rehype-callouts`）、一个临时的演示内容（实验后删除或改造成 T04 的测试样例）、`docs/reuse-research.md` §4、`docs/architecture.md` §3 M1 与 §10。超出范围的实验代码不入库。

**依赖**：`依赖 T01`

**建议档位**：`强` — 未定的设计取舍：结论决定 M1 插件的写法和截图目录。

**参照**：
1. `rehype-callouts` 能否注册自定义类型 `why`，输出上能否带 `data-callout="why"` 之类的属性供 CSS 按视图显示隐藏；不行就记录替代方案“自写约 50 行 rehype 插件”。
2. 自写 remark 插件生成的图片节点（指向 `src/assets/screenshots/x.jpg`）能否进入 Astro 图片处理；不行就定为截图放 `public/screenshots/`、输出普通 `<img>`（宽高仍要写上）。
3. 换成 unified 处理器后，代码块是否仍由 Shiki 高亮；构建产物里是否引用了任何外部资源。
4. 含空格和中文的文件名（如 `Pasted image 20261012190537.png`、`微信图片_….jpg`）在第 2 条方案下能否正常构建和访问。

**验收**：
- [ ] 测试：`npm test` 通过（本任务不新增业务测试）
- [ ] 构建：`npm run build` 通过，`grep -rE 'https?://' dist/**/*.html` 只出现正文里的外链
- [ ] 手工验证：四个问题各有“结论 + 依据（命令输出或产物片段）”，写进 `docs/reuse-research.md` §4；架构 §3 M1、§10 A-02 同步更新，不再有“待核实”字样（B 站参数除外）

#### T03 实现路线图模块 M2

**目标**：实现架构 §3 M2 的 `buildRouteMap`、`RouteMap.view`、`routeMapFromData`、`pathOf`，以及全部校验规则，用测试用路线图覆盖默认路线、分支、共享步骤、汇合、可跳过、跨章节汇合和每一种校验错误。关联 FR-11、FR-12、FR-13、FR-15、FR-16、FR-17、FR-61，AC-02–05、AC-14、AC-19（逻辑层）。

**涉及范围**：`src/lib/route/`（`types.ts`、`route-map.ts`、`route-map.test.ts`、`fixtures/`）、`package.json`（如需 `yaml` 解析库）。不碰页面和内容。

**依赖**：`依赖 T01`

**建议档位**：`强` — 跨模块接口：M3 构建时和浏览器端都依赖它的签名和 `RouteData` 格式。

**参照**：
- 接口以架构 §3 M2 为准（含评审 R1、R10–R12 的修正）：`RouteData` 必须带步骤/选择页标题、章节标题、`skippable`、`skipLabel`、`placeholder`。夹具照需求 §5.2 的形状缩写（三个分叉点、方案一二共享两步、F2 两段、F3 三段）。
- 生效选择 = 默认路线 ← stored ← 当前页所属选项（共享步骤：已生效的选择在其中就保留，否则取其中第一个）；选择页 `progress` 为 `null`；路线第一项 `prev` 为 `null`；最后一项 `next` 为 `{ kind: 'done' }`。
- 错误用 `RouteError[]` 一次报全，每条含 `file`（`route.yaml` 或 `steps/<id>.md`）和可读消息。
- 必测边界：步骤重复出现；路线图引用不存在的步骤；步骤文件不在路线图里；`branch` 在 `choose` 之前；`options` 与选择页不一致；`defaults` 缺分叉点；分支后没有汇合；保留字 `choose/faq/done/404/_astro` 作标识；枚举全部组合（夹具里 3×2×2）都能走到 done；stored 里有已不存在的选项时回退默认；F3 式跨章节汇合；同一分叉点出现两个 `branch` 段且紧挨着（F2）；共享步骤在 stored 为 plan-2 / plan-3 / 空时的 `choices` 和 `prev`；同一步骤出现在两个不同 `branch` 段里要报错；汇合点是另一个分叉点的选择页；`skipTo` 跳过本章内连续的可跳过步骤（含跨越分支末尾和到达下一章、到达 done 的情况）。

**验收**：
- [ ] 测试：`npx vitest run src/lib/route` → 上面每个边界都有用例且通过
- [ ] 构建：`npm run check` 通过
- [ ] 手工验证：对夹具调用 `view({kind:'choose',fork:'desktop-proxy'}, {'node-plan':'plan-3'})` → `prev` 是方案三最后一步（等价于 AC-03 的逻辑）

#### T04 实现内容格式与 Obsidian 写法插件 M1

**目标**：建立内容集合与 Zod schema、链接索引和 Obsidian 写法插件，使双链、嵌入、`[!why]`、`[!note]`、`[!caution]` 按架构 §3 M1 的表格转换，找不到目标时构建失败并报出文件和行号。关联 FR-02、FR-04、FR-61，ADR-0003。

**涉及范围**：`src/content.config.ts`、`src/lib/content/`（`link-index.ts`、`remark-obsidian.ts` 及测试）、`astro.config.mjs`（注册插件）、按 T02 结论确定的截图目录。

**依赖**：`依赖 T01、T02`

**建议档位**：`强` — 跨模块接口：内容格式和链接索引被 M2、M3 和全部迁移任务使用。

**参照**：
- schema 以架构 §3 M1 的表为准：`steps`（`title` 必填，`skippable`/`placeholder` 默认 false，`video`、`placeholderHint`、`skipLabel` 可选）、`choices`（`question`、`options`）、`faq`、`pages`。
- `createLinkIndex(contentRoot)` 同步扫描文件名，返回步骤、常见问题、选择页标识和截图文件名集合。
- 双链：`[[id]]`、`[[id|文字]]`、`[[id#小标题|文字]]`、`[[faq/<id>|文字]]`（加 `?from=<当前步骤>`，当前文件不是步骤时不加）、`[[choose/<fork>|文字]]`、`[[done]]`；生成的 href 一律经过 `withBase`。
- 嵌入：`![[文件名|宽度]]` 和无宽度写法，只接受裸文件名（评审 R5），带 `09附件/` 前缀视为错误并提示去掉前缀；替代文字默认取文件名去掉扩展名。
- 必测边界：未知步骤、未知常见问题、未知图片、文件名含空格和中文、链接文字缺省时取目标标题、代码块里的 `[[...]]` 不转换。

**验收**：
- [ ] 测试：`npx vitest run src/lib/content` → 上面每个边界都有用例且通过
- [ ] 构建：`npm run check` 通过
- [ ] 手工验证：临时在一个内容文件里写 `[[not-exist]]` → `npm run build` 失败，输出含该文件路径和行号；改回后构建通过

#### T05 走通“开始”章：首页、步骤页、完成页、找不到页

**目标**：把 M1、M2 接到页面上，交付第一个端到端切片：首页（前言 +“直接开始”）→ 开始之前 → 整体思路 → 完成页，导航全部在构建时写进 HTML，不依赖 JS。关联 FR-10、FR-11、FR-17、FR-18（无进度部分）、FR-19（骨架）、FR-21（构建清单落点），AC-01、AC-18（找不到页）。

**涉及范围**：`src/lib/site.ts`（`loadSite()`）、`src/pages/index.astro`、`src/pages/[step].astro`、`src/pages/done.astro`、`src/pages/404.astro`、`src/layouts/StepLayout.astro`、`src/components/StepNav.astro`、`src/styles/prose.css`、`astro.config.mjs`（占位清单集成，评审 R9）、`src/content/route.yaml`（只含“开始”章）、`src/content/steps/before-you-start.md`、`overview.md`、`src/content/pages/home.md`、`done.md`、`docs/migration-checklist.md`（新建）、`tests/e2e/ac-01-home.spec.ts`、`tests/e2e/ac-18-not-found.spec.ts`。

**依赖**：`依赖 T03、T04`

**建议档位**：`强` — 首个端到端骨架，第一次把 M1、M2、M3 接起来并定下页面结构。

**参照**：
- 数据流按架构 §3 M3 与 §5：`loadSite()` 读集合、调 `buildRouteMap` 并缓存；页面调 `view(at, {})`；布局内嵌 `RouteData` 的 `<script type="application/json">`（本任务只输出，不读取）。
- 页面结构按 design §4.1、§4.4、§4.6：顶部“章节名 · 第 n 步，共 m 步”；底部“← 上一步：<标题>”“下一步：<标题> →”；首页不放致谢和后记；找不到页“找不到这一步”+“回首页”（目录入口在 T17 补）。
- 迁移规则（写进 `docs/migration-checklist.md` 开头，后续迁移任务沿用）：正文用纯操作版文字，原理版独有的内容放进 `> [!why]`（原文 `>[!note] 为什么：…` 改为 `> [!why] 为什么：…`）；两版都有的 `[!caution]`、`[!note]` 保持；嵌入去掉 `09附件/`；指向博客其他文章的双链改成 `https://finderlzy.github.io/Writing/...` 外链并打开核对；命令、链接、优惠码、商家一字不改。
- 完成页先只放“这条路线走完了”和“重新开始”（指向 `before-you-start`）；致谢、后记在 T12 迁移。

**验收**：
- [ ] 测试：`npm test` 通过
- [ ] 构建：`npm run check` 通过
- [ ] e2e：`npm run test:e2e` → AC-01（无进度时看到前言和“直接开始”，看不到致谢、后记；点击进入“开始之前”）；禁用 JS 时从“开始之前”点“下一步”两次到完成页；打开 `/no-such-step/` 显示“找不到这一步”
- [ ] 手工验证：`docs/migration-checklist.md` 里前言、开始之前、整体思路三节已逐项勾选

#### T06 迁移第一章并实现节点方案选择页

**目标**：迁移第一章（F1 选择页、方案一/二/三、共享的“连上服务器”“运行脚本”）和第五章的“检查 IP 质量”及其截图，实现选择页。“检查 IP 质量”暂时充当 F1 的汇合点（T10 在它前面插入第二到四章）。默认路线从“开始之前”经方案一走到“检查 IP 质量”再到完成页；直接打开方案三或共享步骤的 URL 时，构建时写好的导航就在对应路线内。关联 FR-03、FR-04、FR-12、FR-13、FR-17，AC-02（第一章部分）、AC-08、AC-19（静态部分）。

**涉及范围**：`src/content/route.yaml`、`src/content/choices/node-plan.md`、`src/content/steps/plan1-*.md`、`plan2-*.md`、`plan3-*.md`、`ssh-connect.md`、`run-script.md`、`check-ip-quality.md`、截图目录（T02 定）、`src/pages/choose/[fork].astro`、`src/components/ChoiceOption.astro`、`docs/migration-checklist.md`、`tests/e2e/ac-02-default-route.spec.ts`、`tests/e2e/ac-08-direct-url.spec.ts`、`tests/e2e/ac-19-shared-step.spec.ts`。

**依赖**：`依赖 T05`

**建议档位**：`标准` — 页面、数据流和迁移规则已由 T05 定型，本任务按同一模式扩展。

**参照**：
- 页面写法参照 T05 的 `src/pages/[step].astro` 与 `StepNav.astro`；选择页结构按 design §4.2（整块 `<a>`、标“默认”、不计入步数、原文对比表拆进各选项块）。本任务的选择页链接只是普通链接，记录选择在 T08 做。
- 步骤标识按架构 §3 示例：`plan1-buy-vps`、`plan1-free-residential-ip`、`plan2-buy-residential-vps`、`ssh-connect`、`run-script`（共享步骤）、`plan3-buy-node`、`check-ip-quality`；`defaults` 先只写 `node-plan: plan-1`。
- 共享步骤“运行脚本”里方案二的差别（问到住宅代理时直接回车）原文写在方案二小节，迁移时原样放进“运行脚本”正文，标明“方案二：”。方案三原文的“导入代理软件”“分流”两句，导入部分移到 T10 的导入步骤，分流部分改为链到常见问题“分流规则怎么写”（先写纯文本，标“待 T13 改链接”）。
- 方案二、三只有原理版有正文，操作内容取原理版正文、“为什么”放进 `[!why]`；纯操作版独有的 8 张 SSH/脚本截图放进方案一对应步骤（评审 R5）。
- 原文“附：打开面板排查”等常见问题的链接本任务先写成纯文本并在核对表里标“待 T13 改链接”。
- 截图入库前逐张检查服务器 IP、节点链接、面板账号是否已打码（评审 R8）；未打码的停下来问作者，不自行涂抹后入库。

**验收**：
- [ ] 测试：`npm test` 通过
- [ ] 构建：`npm run check` 通过，路线校验覆盖 3 个方案
- [ ] e2e：`npm run test:e2e` → 默认路线从“开始之前”连续点“下一步”到完成页，依次经过方案一四步和“检查 IP 质量”；新上下文直接打开 `/plan3-buy-node/`，上一步是 `/choose/node-plan/`、下一步是“检查 IP 质量”；打开 `/ssh-connect/`，上一步是 `plan1-free-residential-ip`
- [ ] 手工验证：核对表第一章逐项勾选；截图逐张核对结果写在提交说明里

### MS2 完整 P0

#### T07 实现本机状态模块 M4

**目标**：实现 `createReaderStore(storage)`，读写阅读进度、路线选择、视图偏好和已读步骤，存储不可用时自动换成内存适配器且不报错。关联 FR-31、FR-50、FR-51，AC-18（存储禁用部分的逻辑层）。

**涉及范围**：`src/lib/reader-state/`（`reader-store.ts`、`reader-store.test.ts`）。不碰页面。

**依赖**：`依赖 T01`

**建议档位**：`标准` — 纯函数模块，接口已在架构 §3 M4 写定。

**参照**：
- 签名照抄架构 §3 M4：`ReaderState`、`ReaderStore { read; write(patch); clear }`、`createReaderStore(storage: Storage | null)`；键 `rezero-subscribe-claude:v1`，值 JSON。
- 本模块不依赖 M2：标识是否仍在路线图里的过滤，由调用方传入 `isKnown?: (kind, id) => boolean` 之类的可选参数完成，签名在实现时写回架构 §3 M4。
- 必测边界：`storage` 为 `null`；`getItem`/`setItem` 抛异常；值不是 JSON；字段类型不对（只丢该字段）；`view` 不是两个合法值之一；`visited` 去重；`clear()` 后 `read()` 返回默认值；`write` 是合并而不是覆盖。

**验收**：
- [ ] 测试：`npx vitest run src/lib/reader-state` → 上面每个边界都有用例且通过
- [ ] 构建：`npm run check` 通过
- [ ] 手工验证：无（纯逻辑模块）

#### T08 浏览器按本机选择改写导航（待细化）

**目标**：页面脚本读取内嵌 `RouteData` 和 M4 状态，用 `routeMapFromData(...).view(at, stored)` 改写上一步/下一步、进度；打开步骤页写 `lastStep`、`visited` 和所属分支选择；选择页点选项时记录选择。关联 FR-11–14、FR-50，AC-03、AC-08、AC-18（存储禁用）、AC-19（本机已选方案二）。

**涉及范围**：`src/scripts/route-enhance.ts`、`src/layouts/`、`src/pages/choose/[fork].astro`、`tests/e2e/ac-03-branch-merge.spec.ts`、`ac-08-direct-url.spec.ts`、`ac-18-storage-disabled.spec.ts`。

**依赖**：`依赖 T06、T07`

**建议档位**：`强` — 跨模块接口：首次在浏览器里组合 M2、M4，并与构建时输出保持一致。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-03、AC-08、AC-19、AC-18（注入让 `localStorage` 抛异常的脚本后走默认路线不报错）
- [ ] 构建：`npm run check`

#### T09 实现操作/原理视图切换（待细化）

**目标**：顶栏两段式切换；`<head>` 内联脚本在首次绘制前设 `data-view`；`[!why]` 只用 CSS 显示隐藏，操作视图留一行提示可点切换；没有原理内容时显示“这一步没有额外原理”；视图写入 M4。关联 FR-30、FR-31，AC-06，ADR-0003，design §4.3。

**涉及范围**：`src/components/ViewToggle.astro`、`src/layouts/`、`src/styles/prose.css`、`tests/e2e/ac-06-view-toggle.spec.ts`。

**依赖**：`依赖 T06、T07`

**建议档位**：`标准` — 机制在 ADR-0003 和 design §4.3 已定。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-06
- [ ] 构建：`npm run check`

#### T10 迁移电脑代理、防泄漏、电脑改时区并实现内容待补占位（待细化）

**目标**：在第一章和“检查 IP 质量”之间插入第二章“电脑代理”（F2 选择页，v2rayN / Clash Verge 的“下载并导入节点”“开 tun”）、第三章“防泄漏”（DNS 随 F2 分两段，WebRTC、IPv6）、第四章“电脑改时区”；实现“内容待补”面板和构建占位清单。关联 FR-03、FR-21，需求 §5.2。

**涉及范围**：`src/content/route.yaml`、`src/content/choices/desktop-proxy.md`、对应 `steps/*.md`、`src/components/PlaceholderNotice.astro`、`docs/migration-checklist.md`。

**依赖**：`依赖 T06`

**建议档位**：`标准` — 迁移规则和页面模式沿用 T05、T06。

**验收**：
- [ ] 构建：`npm run check`，构建输出列出本任务的占位步骤（下载 v2rayN、Clash Verge 的 tun 和 DNS）
- [ ] 手工验证：核对表对应小节逐项勾选；占位页面只有“内容待补”和原文已有提示

#### T11 迁移清理配置、IP 不合格与手机代理并实现跳过（待细化）

**目标**：实现跳过按钮（`skipLabel`、跳过本章内连续的可跳过步骤）；加入“清理本机的 Claude Code 配置”（占位，“没用过，跳过”）、“IP 不合格：换 IP 或退款”（占位，“IP 合格，跳过”）、第六章“手机代理”（F3 选择页；iPhone：App Store 改到奥地利、v2Box、手机改时区；安卓：v2rayNG、手机改时区）。关联 FR-15、FR-21，AC-05（文案部分）。

**涉及范围**：`src/content/route.yaml`、`src/content/choices/phone.md`、对应 `steps/*.md`、`src/components/StepNav.astro`、`tests/e2e/ac-05-skip.spec.ts`、`docs/migration-checklist.md`。

**依赖**：`依赖 T10`

**建议档位**：`标准` — 跳过逻辑已在 T03 实现，本任务只渲染按钮并迁移内容。

**验收**：
- [ ] e2e：`npm run test:e2e` → “清理本机的 Claude Code 配置”的跳过按钮文案是“没用过，跳过”，点击后到第一章选择页
- [ ] 手工验证：核对表对应小节逐项勾选；“App Store 改到奥地利”页面的视频信息等作者提供

#### T12 迁移 Google 账号、养号与注册 claude（待细化）

**目标**：迁移第七章“准备 Google 账号”（随 F3：iPhone 下载 Gmail；安卓安装 Google Play、下载 Gmail；汇合到“创建 Gmail 邮箱和 Google 账号”）、第八章“养号”（先用几天、申诉解封、改关联地区）、第九章“注册 claude”。关联 FR-03、FR-15、FR-21，AC-05（连续跳过部分），需求 Q-10。

**涉及范围**：`src/content/route.yaml`、对应 `steps/*.md`、`tests/e2e/ac-05-skip.spec.ts`、`docs/migration-checklist.md`。

**依赖**：`依赖 T11`

**建议档位**：`标准` — 迁移规则和跳过按钮沿用 T10、T11。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-05（已选安卓时在“安装 Google Play”点跳过，到第八章第一步）
- [ ] 手工验证：核对表对应小节逐项勾选

#### T22 迁移订阅、订阅之后与完成页内容（待细化）

**目标**：迁移第十章“订阅”（随 F3。iPhone：注册美区 Apple ID、登录 App Store 并设置账单地址、下载 Claude 并允许 App 内购买、买礼品卡、充值、在 app 内订阅、购买无法完成：问 AI；安卓：订阅占位）、第十一章“订阅之后”（注意事项、关于 KYC）、致谢和后记；完成页联系方式在作者提供前留占位（Q-07）；`defaults` 补齐三个分叉点；默认路线全程走通。关联 FR-03、FR-19、FR-21，AC-02（完整）、AC-12。

**涉及范围**：`src/content/route.yaml`、对应 `steps/*.md`、`src/content/pages/done.md`、`src/pages/done.astro`、截图目录、`tests/e2e/ac-02-default-route.spec.ts`、`ac-12-placeholder.spec.ts`、`docs/migration-checklist.md`。

**依赖**：`依赖 T12`

**建议档位**：`标准` — 迁移规则和页面模式沿用 T06、T10。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-02 完整路线、AC-12
- [ ] 手工验证：核对表对应小节、致谢、后记逐项勾选；截图逐张核对打码

#### T13 迁移常见问题并实现常见问题页（待细化）

**目标**：迁移四条常见问题（打开面板排查、装过了想重装、1 人独享确认、分流规则）；`/faq/`、`/faq/<id>/` 页面，按 `?from=` 显示“← 返回刚才的步骤”，没有上一步/下一步；把前面任务标“待 T13 改链接”的地方改成双链。关联 FR-20，AC-11。

**涉及范围**：`src/content/faq/*.md`、`src/pages/faq/index.astro`、`src/pages/faq/[faq].astro`、相关 `steps/*.md`、`tests/e2e/ac-11-faq-return.spec.ts`、`docs/migration-checklist.md`。

**依赖**：`依赖 T22`

**建议档位**：`标准` — 页面模式沿用 T05。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-11（从“运行脚本”进入“打开面板排查”再返回）
- [ ] 手工验证：核对表中“待 T13 改链接”全部清零

#### T14 补齐构建失败用例（待细化）

**目标**：先确认“用坏内容跑一次构建并断言失败”的可行写法（评审 R7），再在 `tests/fixtures/` 放坏内容：引用不存在的图片、引用不存在的步骤、删掉一个分支的汇合、缺必填元数据；断言构建失败并报出具体文件。关联 FR-61，AC-14。

**涉及范围**：`tests/fixtures/`、`tests/build/`（或 `scripts/`）、`package.json`（必要时加入 `check`）、`docs/architecture.md` §8（写回可行性结论）。

**依赖**：`依赖 T06`

**建议档位**：`标准` — 校验逻辑已在 T03、T04 实现，本任务只做构建级验证。

**验收**：
- [ ] 测试：新增的构建级用例四种坏内容各自失败并报出文件名
- [ ] 构建：`npm run check` 包含或明确列出这些用例的运行方式

#### T15 完成迁移核对（待细化）

**目标**：对照两篇原文章逐节核对 `docs/migration-checklist.md`，并写一个一次性脚本比对原文与站内的全部命令（代码块）和链接，差异为零。关联 FR-03，AC-13。

**涉及范围**：`docs/migration-checklist.md`、`scripts/compare-migration.*`。

**依赖**：`依赖 T13`

**建议档位**：`标准` — 核对工作，规则已写在核对表开头。

**验收**：
- [ ] 手工验证：核对表全部勾选；脚本输出“命令差异 0、链接差异 0”（允许的改动只有架构 §3 M1 规定的双链转换，逐条列出）

### MS3 P1

#### T16 实现步骤视频门面（待细化）

**目标**：视频门面不发外部请求，点击后才插入 iframe；B 站 / YouTube 切换（默认 B 站）；底部始终显示平台外链和“打不开？”提示；没有视频时显示一行“视频制作中”；实测 B 站嵌入参数并写回架构 §3 M3。关联 FR-40–42、NFR-04，AC-07。

**涉及范围**：`src/components/VideoFacade.astro`、`src/scripts/video-facade.ts`、`src/pages/[step].astro`、一个步骤的 `video` 字段（用作者提供的真实视频；没有时只测占位并在 Issue 里说明）、`tests/e2e/ac-07-video.spec.ts`、`docs/architecture.md`。

**依赖**：`依赖 T06`

**建议档位**：`标准` — 门面模式在 design §4.7 已定。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-07；点击前网络请求里没有 bilibili/youtube 域名

#### T17 实现步骤目录与清除进度（待细化）

**目标**：用 `view().outline` 渲染目录：手机 `<dialog>` 抽屉、≥1100px 常驻侧栏；分叉点显示“或”分组并可切换选项；其他路线弱化并标“其他路线”；标可跳过、内容待补、已读 ✓；底部“清除进度”（确认后执行）；找不到页加目录入口。关联 FR-14、FR-16、FR-51，AC-04、AC-10。

**涉及范围**：`src/components/Toc.astro`、`src/scripts/toc.ts`、`src/layouts/`、`src/pages/404.astro`、`tests/e2e/ac-04-change-route.spec.ts`、`ac-10-clear-progress.spec.ts`。

**依赖**：`依赖 T08`

**建议档位**：`标准` — 数据来自已有的 `view().outline`，交互模式沿用 T08。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-04、AC-10

#### T18 实现“继续上次”与完成页操作（待细化）

**目标**：首页有阅读进度时主按钮变为“继续上次：<步骤名>”，“直接开始”降为次按钮；完成页提供“回到目录”“重新开始”“清除进度”。关联 FR-18、FR-19、FR-50、FR-51，AC-09、AC-10。

**涉及范围**：`src/pages/index.astro`、`src/pages/done.astro`、`src/scripts/home.ts`、`tests/e2e/ac-09-resume.spec.ts`。

**依赖**：`依赖 T08、T17`

**建议档位**：`标准` — 复用 M4 和 `RouteData` 标题。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-09（同一上下文关页后重开）、AC-10（完成页清除）

#### T19 实现代码复制与看大图（待细化）

**目标**：代码块右上角“复制”，成功后 2 秒显示“已复制”并用 `aria-live` 播报，长行横向滚动不折行；截图点击用 `<dialog>` 看大图，Esc 或点背景关闭。关联 NFR-02，design §4.7。

**涉及范围**：`src/components/CodeCopy.astro`、`src/components/ImageZoom.astro`、`src/scripts/`、`src/styles/prose.css`、`tests/e2e/nfr-02-copy-zoom.spec.ts`。

**依赖**：`依赖 T06`

**建议档位**：`标准` — 独立的小交互组件。

**验收**：
- [ ] e2e：`npm run test:e2e` → 复制后剪贴板内容与代码块原文一致；看大图可用 Esc 关闭

### MS4 P2 与交付准备

#### T20 视觉打磨、响应式与可访问性验收（待细化）

**目标**：按 design §7：360×800 / 1280×800、浅色 / 深色下截图人工对照 §4、§6；axe 无 serious 及以上问题；只用 Tab 走完 AC-02 前五步；实测 §3.1 对比度并回写；无页面级横向滚动。关联 NFR-01、NFR-05，AC-16，架构 §10 A-03。

**涉及范围**：`src/styles/`、`src/components/`、`tests/e2e/ac-16-responsive.spec.ts`、`tests/e2e/a11y.spec.ts`、`docs/design.md`（回写色值）。

**依赖**：`依赖 T17、T18、T19`

**建议档位**：`标准` — 按设计契约逐条核对。

**验收**：
- [ ] e2e：`npm run test:e2e` → AC-16、axe 扫描
- [ ] 手工验证：截图对照拒绝清单逐条通过，记录在 Issue 评论

#### T21 子路径部署与国内可访问验收（待细化）

**目标**：分别用 `BASE_PATH=/` 和 `/sub/` 构建并抽查导航、图片；屏蔽 Google / YouTube 相关域名后访问，除视频外内容完整、没有失败请求。关联 FR-60、NFR-03、NFR-04，AC-15、AC-17。

**涉及范围**：`playwright.config.ts`、`tests/e2e/ac-15-base-path.spec.ts`、`ac-17-blocked-domains.spec.ts`、`package.json`。

**依赖**：`依赖 T16`

**建议档位**：`标准` — 测试方法已在架构 §8 写定。

**验收**：
- [ ] e2e：AC-15 两种 base 各跑一次；AC-17 通过
