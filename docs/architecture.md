# 架构：Re:从零开始订阅 claude

- 状态：**v3 增量定稿（2026-10-21）**，对应需求 v0.9（目标站点版本 3.0.0），没有阻塞决策（合并清单 Q-18 只阻塞合并数据），见 [§13](#13-v3-增量架构2026-10-21)。v2.0 定稿（2026-10-15）对应需求 v0.3（目标站点版本 2.0.0），没有阻塞决策；待定事项见 §10。上一版 v0.1（2026-10-13）对应已交付的 1.0.0，其中仍然有效的实现细节保留在各节里，标“1.0.0 已有”。
- 输入：[术语](../CONTEXT.md)、[需求 v0.9](requirements.md)、[复用调研](reuse-research.md)、[界面设计契约](design.md)、[重写稿](v3-rewrite/)
- 决策记录：[ADR-0001 Astro 静态站 + 自建路线图](adr/0001-astro-static-site-with-own-route-map.md)、[ADR-0002 URL 规则](adr/0002-url-scheme.md)（v2.0 修订）、[ADR-0003 原理块](adr/0003-principle-content-as-why-callouts.md)（已被取代）、[ADR-0004 整页视图切换](adr/0004-whole-page-view-switch.md)、[ADR-0005 重写稿原样导入、双链按标题解析](adr/0005-import-rewrite-verbatim.md)、[ADR-0006 合并页和旧网址跳转](adr/0006-merged-pages-and-moved-urls.md)
- 现状：v2 骨架已建立（#23 内容集合，#25 路线图和静态页面，2026-10-15），#26 接上了导航改写、整页视图切换和 M4 v2（2026-10-16），1.0.0 的内容、页面和依赖旧路线的脚本已删除。本文 §3–§8 描述 v2.0 的目标结构；没有实现的部分标“计划”，由 [实施计划](implementation-plan.md) 的 v2.0 任务建立，建立后改成现状。
- v2.1（2026-10-16）：页面按 design v2.1 改造，模块和依赖方向不变，差距和任务见 [§11.4](#114-v21-实施前评审2026-10-16)；对应条目在任务完成后改成现状。
- **v3（2026-10-21，现状；2026-10-22 按作者新稿收口，2026-10-22 验收）**：对应需求 v0.11（站点版本 3.0.0）。M3 按文档站风格重做外观，新增 M6 站内搜索，合并页和旧网址跳转改用 `route.yaml` 的 `moved:` 段和单版本小节锚点（[ADR-0006](adr/0006-merged-pages-and-moved-urls.md)），不新增运行时依赖；见 [§13](#13-v3-增量架构2026-10-21)。作者 2026-10-22 交来 11 页单版本新稿并确认页面地图；代码现状：V01–V12 已实施，3.0.0 已通过视觉验收和全量回归。
- v2.2（2026-10-19，现状）：按 [v2.2 改版计划](v2.2-plan.md) 和需求 v0.4 改了 M1（常见问题一问一页的导入和核对）、M2 的数据（附录一章）和 M3（页头色带、常驻侧边栏、参考页内嵌路线数据、选项行、翻页），依赖方向不变，见 [§12](#12-v22-改版2026-10-19现状)。§3 里写 v2.1 抽屉、页边栏、章节标题卡的条目是历史，以 §12 为准。

## 0. v2.0 增量影响分析

需求 §0 的改动落到各模块上。“保留”指 1.0.0 的代码和测试可以沿用，“改动”指接口或数据形状变化，“重做”指按新设计重写。

| 模块 | 影响 | v2.0 改动 | 保留 |
| --- | --- | --- | --- |
| M1 内容 | 改动（大） | 内容目录改成 `principle/`、`operation/`、`reference/` 三个集合，两版同名文件合成一个页面（§3 M1）；正文从重写稿**原样导入**，双链按中文标题解析（[ADR-0005](adr/0005-import-rewrite-verbatim.md)）；新增：去掉手写页脚、`TODO：` 段落转成“作者待补”、锚点校验、博客外链映射、选择页的选项块、操作版正文的标题 id 加前缀；去掉 `[!why]`、`placeholder`、`choices/`、`faq/`、`pages/` | Markdown 管线（unified + 自研 remark 插件）、嵌入图片进 Astro 图片处理、`contentValidation` 在 `astro:build:start` 失败的机制、SmartyPants 关闭、`deferRender`、星号检查 |
| M2 路线 | 改动 | 去掉默认路线：未选的分叉点让相邻页指向选择页；导航按视图计算，操作视图绕过原理独有步骤；选择页、旁支页和步骤共用 `/<id>/` 标识空间；旁支页（`returnTo`）；最后一页的下一步是首页；路线枚举 6 种选择 × 2 种视图 | 纯函数、构建和浏览器共用一份代码、`RouteData` 序列化、`branch` 段与共享步骤、汇合校验、无环校验、目录 outline |
| M3 页面 | 重做 | 全部页面按新 [design.md](design.md) 重做；两版正文同页输出，CSS 整页切换（[ADR-0004](adr/0004-whole-page-view-switch.md)）；新增 logo 组件、页眉、参考页（常见问题目录 + 一问一页、实测）；去掉完成页、“继续上次”、已读 ✓、清除进度 | 渐进增强（构建时写好导航、脚本按本机选择改写）、视频门面、代码复制与看大图、目录抽屉外壳、参考页的 `?from=` 返回 |
| M4 本机状态 | 改动（缩减） | 只存 `choices` 和 `view`；去掉 `lastStep`、`visited`、`clear()`；存储键升到 `:v2` | 适配器接缝（localStorage / 内存）、失效项过滤、合并写入、视图内联脚本 |
| M5 构建 | 改动 | 校验规则随 M1、M2 调整（FR-61）；构建结束列出“内容提示”：操作版缺失的页面、TODO 段落、未填地址的博客外链（FR-21、Q-11） | `astro build` 内三层校验、`BASE_PATH`、静态产物 |
| 开发脚本 | 新增 | `scripts/import-rewrite.mjs`（从重写稿导入）、`scripts/build-logo.mjs`（logo 转曲），改写 `scripts/compare-migration.mjs`（AC-13 改为对照重写稿） | — |
| 测试 | 改动 | e2e 按 v2 的 AC 编号重写；构建级坏内容用例换成新目录结构 | Playwright 配置、两种视口、子路径 webServer、屏蔽域名、axe、对比度实测 |

**不能倒退的已有行为**（需求 §0）都落在“保留”列的机制上：一页一步和页脚导航（M2/M3）、独立 URL（ADR-0002）、复制和看大图（M3）、无横向滚动和可访问性（design + e2e）、国内可访问（不加载外部资源）、纯静态和子路径（M5）、内容出错构建失败（M1/M2/M5）。

**没有新的复用需求的部分**不再调研；新增的 logo 转曲依赖见 [reuse-research.md §5](reuse-research.md)。

## 1. 技术栈与选型理由

| 项 | 选择 | 理由 / 核实来源 |
| --- | --- | --- |
| 运行时 | Node ≥ 22.12，npm | Astro 7 要求 Node ≥ 22.12（npm 元数据）（1.0.0 已有） |
| 框架 | Astro 7.3.x，`output: 'static'`，不用文档主题 | 见 [ADR-0001](adr/0001-astro-static-site-with-own-route-map.md)（1.0.0 已有） |
| Markdown | `@astrojs/markdown-remark`（unified 处理器）+ 自研 remark/rehype 插件 + `rehype-callouts` | Astro 7 默认的 Sätteri 不兼容 remark/rehype 插件（[官方文档](https://docs.astro.build/en/guides/markdown-content/)）。重写稿没有 Callout；`rehype-callouts` 只为 `[!note]`、`[!caution]` 保留，`why` 类型删掉 |
| 前端交互 | 原生 TypeScript 模块，经 Astro `<script>` 打包；不引入 UI 框架 | 交互只有视图切换、改写导航、目录、视频门面、复制、看大图 |
| 样式 | 原生 CSS + 设计令牌，不用 CSS 框架；不加载网页字体 | 令牌见 [design.md §3](design.md)；NFR-03 |
| logo | 开源字体转曲后的内联 SVG；转曲用 `opentype.js` 2.0（MIT，devDependency） | FR-70：只用允许转曲的 OFL 字体，页面不加载字体文件；见 [reuse-research.md §5](reuse-research.md) |
| 类型检查 | TypeScript **6.x**（固定）+ `@astrojs/check` | `@astrojs/check` 0.9.10 不兼容 TS 7（1.0.0 已有） |
| 测试 | Vitest 5；Playwright 1.64 + `@axe-core/playwright` | 1.0.0 已有 |
| 部署 | 纯静态 `dist/`，`BASE_PATH` 指定根路径或子路径；部署位置待定（Q-01） | 1.0.0 已有 |

## 2. 复用决策

依据 [reuse-research.md](reuse-research.md)：

- **采用为框架**：Astro 7（MIT）。
- **采用为组件**：`@astrojs/markdown-remark`（MIT）、`rehype-callouts`（MIT，只剩 note/caution）、`github-slugger`（ISC，标题锚点）、`yaml`（ISC）；v2.0 新增 `opentype.js`（MIT，只在开发脚本里用，不进页面）。
- **字体（只用于 logo 转曲，不入库、不进页面）**：需求 FR-70 列的草稿字体 Cormorant Garamond、Cinzel、思源黑体、Roboto Condensed 都是 OFL-1.1（允许嵌入和转曲）；定稿换字体时同样只用 OFL 或同等许可，许可证核对写进 reuse-research §5。
- **仅作参考**：Starlight、Material for MkDocs、lite-youtube-embed、Google Codelabs、`@flowershow/remark-wiki-link`（1.0.0 已有结论）。
- **自研**：路线图（M2）、Obsidian 写法插件、视图切换、视频门面、目录、本机状态（M4）、全部页面与样式、导入脚本、logo 转曲脚本。

## 3. 模块与依赖方向

沿用需求 §2 的能力地图，模块 ID 不变。术语用 [codebase-design](../.claude/skills/mattpocock/codebase-design/SKILL.md)：每个模块对外只暴露一个小接口，复杂度藏在实现里。

```
                 ┌──────────────── 构建时（Node） ────────────────┐      ┌──── 浏览器 ────┐
 docs/v3-rewrite/ ─▶ import-rewrite ─▶ src/content/ ─▶ M1 内容 ──▶ M2 路线 ──▶ M3 页面 ──▶ dist/*.html ──▶ 页面脚本
 （重写稿）       （开发脚本，手动跑）  principle/     │  └ Obsidian 插件       │ RouteData JSON ────────┘   │   │
                                     operation/    │                        M2（同一份代码） M4
                                     reference/    └─────── M5 构建：校验失败就终止 ───────┘
```

依赖只朝一个方向：M1 ← M2 ← M3；M4 不依赖其他模块，只被 M3 的页面脚本调用。M2 是纯函数，构建时和浏览器里用同一份代码（1.0.0 已有）。导入脚本只写 `src/content/`，不被任何模块引用。

### M1 内容（`src/content/`、`src/content.config.ts`、`src/lib/content/`）

**职责**：定义内容文件的格式；加载并校验元数据；把重写稿的 Markdown 和 Obsidian 写法转换成 HTML。

**内容文件**（V10 现状：作者 2026-10-22 的 `docs/v3-rewrite/`，11 页、只有一版正文）

| 路径 | 内容 | 元数据 |
| --- | --- | --- |
| `src/content/route.yaml` | **路线图**：章节、分叉点、各选项的页面顺序、跳转表（`moved:`） | 由 M2 校验 |
| `src/content/principle/<id>.md` | 一个页面：11 页（前言、整体思路、方案一/二、电脑端、iOS 准备/订阅、安卓准备/订阅、日常维护、后记）。正文第一行是 `# <标题>`，和重写稿文件标题相同 | frontmatter（Zod `strictObject`，都可省）：`video: { bilibili?, youtube? }`、`skippable`/`skipLabel`（v3 没有可跳过页，字段休眠）、`options: { <option-id>: { title } }`（选择页必填） |
| `src/content/reference/ip-tests.md`、`ip-tests/<id>.md` | 参考页：IP 质量实测合集和 6 篇实测，只有一版正文 | 不写 frontmatter |
| `src/content/blog-links.yaml` | 指向博客其他文章的链接目标 → 博客 URL；地址待作者提供时写 `null`（Q-11） | 由 M1 校验 |
| `src/assets/screenshots/` | 截图（从重写稿的 `附件/` 导入，只导入被引用的） | — |
| `src/assets/diagrams/` | 说明图 SVG（从重写稿的 `附件/` 导入，附件里的是原稿，变了就覆盖） | — |

- **标题**：页面标题取正文第一行的 `# <标题>`（导入时原样保留），渲染时从正文里去掉，由布局输出 `<h1>`。全站标题不能重复，因为双链按标题解析。缺少第一行标题、标题重复都让构建失败。
- **单一正文**：v3 删除 `operation/` 和 `principleOnly` 的运行路径，`[page].astro` 只渲染这一份正文；M2/M4 的 `view` 字段暂时保留，但固定按 `principle` 计算（§13.12）。
- **选择页的选项卡片**（FR-12，V10 现状）：选项写在页面 frontmatter 的 `options`（标识 → 标题），`[page].astro` 用 M2 的 `view(选择页, { 分叉点: 选项 })` 算出每个选项的第一步，交给 `ChoiceCards.astro` 渲染在正文末尾；卡片整块可点，路线图的 `default` 标“推荐”。`ChoiceCards` 的容器带 `id="下一步"`，旧“选择手机系统”和手机旧页的兜底都落到这里（`site.ts` 的 `resolveMovedTarget` 单独认这个锚点，因为它不在导入的正文标题里）。
- **参考页**：只有 `ip-tests` 和 6 篇实测；`site.ts` 的 `TOC_REFERENCES` 只列合集，挂在 `maintenance` 章末；参考页没有上一步/下一步。
- **导入**（ADR-0005）：`scripts/import-rewrite.mjs` 从 `docs/v3-rewrite/` 原样导入 11 页和 `reference/` 的 7 个文件，把相对 Markdown 链接转成站内链接，复制被引用的截图和说明图；第二次运行应无改动。`docs/rewrite/` 已在 V11 同步 Writing 后删除。
- **校验**：站内双链、同页锚点、图片、路线图、跳转表、参考页目录都在构建时核对；跳转表的目标页和小节不存在、旧标识被新页面复用、`choice` 的选项和分叉点不一致时构建失败（FR-61）。

**route.yaml 格式**（V10 现状）：章节、分叉点、跳转表的唯一来源；页面文件不重复写所属章节和选项。

```yaml
chapters:
  - id: start
    title: 开始
    summary: ……                       # 首页五栏简介的文案（M2 只校验非空；首页要求每章都有）
    items: [preface]
  - id: node-and-ip
    title: 准备节点和住宅 IP
    items:
      - { choose: node-plan, page: overview, default: plan-2 }
      - branch: node-plan
        options: { plan-1: [plan1], plan-2: [plan2-residential-server] }
  - id: client-and-subscribe
    title: 客户端配置与订阅
    items:
      - { choose: phone, page: client-desktop }
      - branch: phone
        options:
          iphone: [iphone-prepare, iphone-subscription]
          android: [android-prepare, android-subscription]
  - id: maintenance
    title: 日常维护
    items: [maintenance]
  - id: ending
    title: 结尾
    items: [afterword]
side: {}
moved:                              # 旧网址 → 目标页；也可按分叉点选择分流（choice）
  plan1-buy-server: { to: plan1, section: 购买海外 VPS }
  register-gmail:
    choice:
      fork: phone
      options:
        iphone: { to: iphone-subscription, section: 注册 Gmail }
        android: { to: android-subscription, section: 注册 Gmail }
      fallback: { to: client-desktop, section: 下一步 }
  faq/split-routing: { to: maintenance, section: 分流规则具体怎么写 }
```

标识用需求 §5.2 的地图，v2.0 发布后锁定（ADR-0002）；v3 被合并页面的旧标识只进 `moved:`（ADR-0006），`faq` 这个旧目录允许作为 `moved:` 的键，但仍不能用作页面标识。

**Obsidian 和 Markdown 写法**（自研插件 `src/lib/content/remark-obsidian.ts`，v3 现状）：

| 写法 | 转换结果 | 找不到目标时 |
| --- | --- | --- |
| `[[标题]]`、`[[标题\|文字]]` | 按标题找到页面，链接到 `/<id>/`；不写文字时用标题 | 构建失败，报出文件和行号 |
| `[[标题#小标题]]` | 链接到 `/<id>/#<slug>`，slug 用 `github-slugger`；校验目标页有这个小标题 | 同上 |
| `[文字](#小标题)` | 同页链接，片段换成渲染后的 slug | 同上 |
| 指向参考页的链接 | 从页面链出时自动加 `?from=<当前页标识>`（FR-20） | — |
| `![[文件名\|宽度]]` | 图片进 Astro 图片处理，生成 `src/assets/screenshots/` 的导入副本；说明图 `.svg` 由 `diagram.ts` 白名单内联 | 构建失败 |
| `TODO：` | 显示成“作者待补”提示，构建结束列出（FR-21） | — |

### M2 路线（`src/lib/route/`）

**职责**：根据路线图、页面元数据、读者的选择和当前视图，算出页面需要的全部导航信息；构建时校验路线图。

**接口**（#25 实现，改自 1.0.0 的 `route-map.ts`、`types.ts`）：

```ts
type PageId = string;                       // 步骤、选择页、旁支页共用一个标识空间，也是 URL
type ViewMode = 'operation' | 'principle';
type Choices = Partial<Record<ForkId, OptionId>>;
type Stop =
  | { kind: 'step' | 'choose' | 'side'; id: PageId; title: string }
  | { kind: 'home' };                       // 前言的上一步、后记的下一步

interface PageMeta {                        // 由 loadSite() 从 M1 映射而来，M2 不读文件
  id: PageId; title: string;
  principleOnly: boolean; skippable: boolean; skipLabel?: string;
  options?: { id: OptionId; title: string }[];   // 只有选择页有
}

// spec 是 route.yaml 解析后的值（unknown，逐项校验）。失败抛 RouteValidationError，errors 一次列全并写明文件
function buildRouteMap(spec: unknown, pages: PageMeta[]): RouteMap;

interface RouteMap {
  view(at: PageId, stored: Choices, mode: ViewMode): RouteView;   // at 不在路线图里时抛错
  outline(stored: Choices, current: PageId | null, mode: ViewMode): OutlineChapter[];
  readonly data: RouteData;                 // 可序列化，浏览器用 routeMapFromData() 重建
}
interface RouteView {
  choices: Choices;          // 生效的选择 = 本机保存的选择（失效项忽略）← 当前页所属选项；没选的分叉点缺省
  current: Stop;
  prev: Stop | null;
  next: Stop | null;         // 选择页未选时为 null（FR-12）
  skipTo: Stop | null;       // 只有可跳过步骤才有（FR-15）
  returnTo: Stop | null;     // 只有旁支页才有（FR-19）
  progress: { chapterId: string; chapter: string; chapterNo: number; index?: number; total?: number };
                             // chapterNo 从 0 开始（design：“从零开始”的章节号）；数不清时没有 index/total（FR-10）
  outline: OutlineChapter[];
}
function routeMapFromData(data: RouteData): RouteMap;
function pathOf(stop: Stop): string;        // '/<id>/' 或 '/'；再由 withBase() 加前缀
```

实现补充（#25）：`RouteData` 是 `{ chapters, pages, forks: { <分叉点>: { page, options } }, side: { <旁支页>: <returnTo> } }`（章节写了 `summary` 时 `chapters[i].summary` 带上它）；旁支页的 `current` 是 `{ kind: 'side' }`；`outline` 的 `onRoute` 在分叉点没选时对它的各选项都为真，操作视图下原理独有步骤为假。测试用路线图在 `src/lib/route/fixtures/sample-route.ts`，真实 `route.yaml` 的边界用例在 `src/lib/site.test.ts`。

**规则**（构建时校验，任何一条不满足就失败，FR-61）：

- **一个标识空间**：`principle/` 下的每个文件在 `route.yaml` 里恰好出现一次——普通项、某个选择页（`page`）、某个 `branch` 段里的一个或几个选项（共享步骤，1.0.0 已有），或 `side` 下的旁支页；反过来，路线图引用的页面必须有原理版文件。保留字：`faq`、`ip-tests`、`404`、`_astro`。
- **选择页**：`choose` 的 `page` 必须有 `options`，且和 `branch` 的选项一一对应、顺序一致；`branch` 引用的分叉点前面必须已经有它的 `choose`（1.0.0 已有）。
- **视图**：操作视图的序列去掉 `principleOnly` 的页面。每个选项在两种视图下都至少有一页。原理独有步骤在操作视图下被直接打开时，按原理视图的序列计算它自己的导航（它不在操作序列里），页面再按 FR-30 提示。
- **默认选项**（需求 v0.6）：选择页可写 `{ choose, page, default: <选项> }`，`default` 必须是选择页 `options` 里的选项，编译进 `RouteData.forks[fork].default`。本机没有生效的选择时按它计算序列和目录（`selected` 也按它），但不写入本机选择，选择页的“已选”只标本机保存的选择（`route-enhance.ts` 的 `markChoice`）。现在只有 `node-plan` 写了 `default: plan-2`。
- **未选**（替代 1.0.0 的默认路线）：分叉点没有生效的选择、也没有 `default` 时，它的每个 `branch` 段在序列里都折叠成“指向选择页”：段前一页的“下一步”和段后一页的“上一步”都指向该分叉点的选择页（FR-13：`import-proxy` 的上一步是 `choose-plan`，`subscribe` 的下一步是 `choose-phone`）。选择页自己的“下一步”在未选时为 `null`，已选（或有默认选项）时是所选选项在当前视图下的第一页。
- **生效的选择**：默认选项 ← 本机保存的选择 ← 当前页所属选项（打开只属于一个分支的页面时按它计算，FR-17）；共享步骤属于多个选项时，本机已选的在其中就沿用，否则取第一个（1.0.0 的“默认选项”一环去掉）。
- **汇合**：同一分叉点的最后一段 `branch` 之后必须有所有选项共用的页（1.0.0 已有）。
- **旁支页**：`returnTo` 必须是序列里的普通页；旁支页的 `returnTo` 是那一页，`next` 是那一页在当前路线和视图下的“下一步”，`prev` 为 `null`（FR-19）。
- **首页**：第一页（前言）的上一步、最后一页（后记）的下一步都是 `{ kind: 'home' }`（FR-11）。
- **可跳过**：`skipTo` 沿当前路线和视图，跳过从当前页开始连续的可跳过步骤，取其后的第一项（可以跨章节，FR-15）。
- **进度**：步骤在当前路线和视图的本章序列里才有 `index/total`；本章序列里有折叠的未选分支段、或当前页是选择页、旁支页、不在当前视图序列里的原理独有步骤时，只有章节名（FR-10）。
- **枚举**：3 × 2 种选择组合 × 2 种视图共 12 条序列，每条都要从 `preface` 走到 `afterword`，不重复经过同一页（无环）。
- **章节的 summary**（V05 之后的首页五栏简介，作者 2026-10-22 调整）：`summary` 可选；写了就必须是非空字符串（M2 校验形状）。它是首页的导航文案，不是导入的正文，所以不要求原样摘自页面；首页要求五章都有，缺了由 `index.astro` 构建失败并指出章节标识。v2.1 的 `intro`（章节标题卡的一句话）已随标题卡删除，写了是未知字段。
- **目录 outline**：章节 → 普通项 / 选择页 / 分支（每个选项的页面序列），每一项新增 `principleOnly`；去掉 `placeholder`；`current` 只在一处为真（共享步骤规则 1.0.0 已有）。侧边栏同时列出分叉点的全部选项，选中的（或当前页所在的）选项展开、其余收起（用户 2026-10-22）。

### M3 页面（`src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`、`src/scripts/`）

> **v3 现状**：本节下面标“现状”的页面结构是 1.0.0/v2.1 的；V01–V05 已按 [§13.3](#133-m3-页面按-designmd-v3) 改掉页头色带、章节标题卡、章节副标题和每页内联的编号字形（现在只剩找不到页的 404），首页和找不到页的结构见 §13.3。两者冲突时以 §13.3 为准。

**职责**：把内容和路线渲染成页面；实现 [design.md](design.md) v2.0 的全部页面和组件。

| 页面 | URL | 文件 |
| --- | --- | --- |
| 首页：VuePress 式首屏 + 五章简介（v3，见 §13.3） | `/` | `src/pages/index.astro` |
| 步骤页、选择页 | `/<id>/` | `src/pages/[page].astro` + `PageLayout` |
| 旧网址跳转页（单段旧标识 / 多段 `faq/<id>`） | `/<旧标识>/`、`/faq/<id>/` | `src/pages/[page].astro`、`src/pages/[...moved].astro` + `MovedPage` |
| IP 质量实测合集 / 各篇实测 | `/ip-tests/`、`/ip-tests/<id>/` | `src/pages/ip-tests/index.astro`、`[test].astro` + `ReferenceLayout` |
| 找不到 | `404.html` | `src/pages/404.astro` |

v3 的页面结构、组件和当前行为以 §13.3 为准；下面标“现状”的 #25/#26/#30/#31/#38 各条是 1.0.0/v2.1 的历史，已被 V01–V10 取代。

已删除（#25）：`[step].astro`、`choose/[fork].astro`、`done.astro`、`faq/[faq].astro`、`StepLayout`、`ChoiceOption`、`PlaceholderNotice`，以及依赖旧路线的页面脚本 `home.ts`、`done.ts`、`route-enhance.ts`、`toc.ts`、`view-toggle.ts`、`faq-return.ts`、`reader-store.ts`（#26、#27、#30 参照 `v1.0.0` 标签重写；`route-enhance.ts`、`view-toggle.ts`、`reader-store.ts` 已由 #26 重写，`faq-return.ts` 已由 #27 重写为 `reference-return.ts`，`toc.ts` 已由 #30 重写）。

- **#25 的静态骨架（现状）**：`PageLayout` 输出两版正文，只有原理版时在正文上方输出提示条 `.view-notice`；`ReferenceLayout` 的页脚见下文“参考页的返回”；首页和找不到页把 `TocNav` 直接写在页面上；步骤页的目录侧栏只在 ≥1100px 显示，抽屉的打开按钮在目录脚本接上前保持隐藏（#34 起取消侧栏，见下面的“目录”）。
- **#26 的交互（现状）**：`PageLayout` 内嵌 `RouteData`（`<script type="application/json" id="route-data">`，`<` 转义），页眉右侧渲染 `ViewToggle`（#31 起由 `SiteHeader` 输出，见下面的“页眉”），加载 `view-toggle` 和 `route-enhance`，路线数据由 `readRouteData(document)` 解析一次，两者共用 `src/scripts/reader-store.ts` 的 `pageReaderStore(data)`（一页一个 store，内存兜底时彼此可见；页面脚本的 `reader-store.ts` 和 M4 的 `lib/reader-state/reader-store.ts` 同名沿用 1.0.0，前者只做页面装配）。`StepNav` 总是写出“下一步”的链接，没有目标时带 `hidden`、不写地址，选择页在本机选过之后由脚本显示；脚本跑完给 `<main>` 加 `data-route-ready`。选择页的选项块（#29）和目录（#30）派发 `reader-choices-changed` 即可让导航重算。选项块的交互（#29，现状）也写在 `route-enhance.ts` 里：选择页上监听 document 的点击，点到 `.option-block` 里的同源链接时先写 `choices` 再派发事件，跳转照常进行；重算时给本机保存的块加 `aria-current="true"` 和“当前选择”标签（`span.option-current`），样式在 `prose.css`。

- **构建时**（1.0.0 已有，改接口）：页面调用 `loadSite()`（`src/lib/site.ts`），它读取三个集合和 `route.yaml`，经纯函数 `assembleRoute()` 映射成 `PageMeta[]` 后调用 `buildRouteMap`，一次构建内缓存。每页用 `view(id, {}, 'operation')` 把导航写进 HTML——没有 JS 时，读者看到的就是“操作视图 + 未选”的导航：未选的分叉点处指向选择页，选择页的选项块是普通链接，进入分支后按所属选项计算。唯一的折返在“订阅”：它的“下一步”指向“选择手机系统”，静态页面上的选项链接只能进入手机的第一段，所以没有 JS 的读者要用“订阅”正文里的链接进入订阅分支（正文原本就列出了两条路的每一步）。这是降级体验，不是验收路径；“禁用存储”（AC-18）时脚本仍运行，靠 M4 的 `window.name` 兜底记住选择。
- **两版正文**（[ADR-0004](adr/0004-whole-page-view-switch.md)）：`PageLayout` 把原理版和操作版的正文都渲染进 HTML，分别包在 `<div data-body="principle">`、`<div data-body="operation">` 里；`<html data-view>` 决定显示哪一个，另一个 `display: none`（屏幕阅读器和页内查找都跳过它，`loading="lazy"` 的图片也不加载）。原理独有步骤和缺操作版的页面只输出原理版，操作视图下在正文上方显示提示（FR-21、FR-30）。参考页只有一份正文，没有视图切换。
- **视图**（1.0.0 已有机制，改为整页）：`<head>` 里的内联脚本 `VIEW_BOOT_SCRIPT` 在首次绘制前设置 `data-view`，取不到时用 `operation`。切换控件 `ViewToggle` 在页眉；`src/scripts/view-toggle.ts` 改 `data-view`、写 M4、滚回页面顶部（FR-30），派发 `reader-view-changed`。没有 JS 时切换控件隐藏，固定操作视图。删除 1.0.0 的“为什么：… · 在原理视图中查看”提示行和“这一步没有额外原理”。
- **导航改写**（1.0.0 已有 `route-enhance.ts`，改动）：读 M4 的 `choices` 和 `view`，调用 `routeMapFromData(data).view(at, stored, view)`，改写上一步/下一步/跳过/回到的链接与目标标题和进度；收到 `reader-view-changed` 或 `reader-choices-changed` 时重算。打开只属于一个分支的页面时，把它所属的选项写进 `choices`（FR-17，纯函数 `openPatch()` 只剩这一项）。选择页：本机保存的选项块标“当前选择”和 `aria-current`，点块内任何站内链接都先写 `choices` 再跳转；**不标默认**。
- **目录**（1.0.0 已有 `Toc`/`TocNav`/`toc.ts`，改动）：去掉已读 ✓ 和“清除进度”；原理独有步骤标“原理”，在操作视图下弱化；参考页列在最后一章“附录”的附录页下面（2026-10-17 起，原先末尾单列“卡住了再看”）。首页的目录用同一个 `TocNav`（首页变体：不吸顶、不折叠，每章带锚点 `#chapter-<章节标识>`）。
  实现（#30，现状）：`TocNav` 章名前写 `00`–`04` 章节号，`site.tocReferences` 列在最后一章（附录）的列表末尾、缩进一级（`ol.toc-reference`）（`loadSite()` 按常见问题、IP 质量实测合集的顺序给出标题，由页面经 `PageLayout`/`Toc` 的参数传入，`TocNav` 自己不读内容），当前项是 `aria-current="page"`。`Toc` 输出侧栏和空的抽屉 `<dialog data-toc-dialog>`（#34 起取消侧栏，见下）。2026-10-23 起目录只画当前路线：分叉点只列当前选项的页面，另一条路线是 `a.toc-route-switch` 普通链接，点击照常导航；不再输出其他路线的页面、“其他路线”文字和“切换”按钮。`toc.ts` 只负责抽屉、首次滚到当前项和给 `<nav>` 加 `data-toc-ready`，不再重画目录。
  v2.1（#34，现状）：所有宽度都是抽屉，不常驻（design §4.5、D5）。`Toc` 只输出 `<dialog data-toc-dialog>`，`<nav>` 构建时就写在里面，不再在侧栏和抽屉之间移动；`PageLayout` 去掉 `.step-shell` 两栏网格。手机全屏，≥720px 贴左边宽 400px。页眉的“目录”构建时是 `<a href="…/#home-chapters" data-toc-open>`，没有 JS 也能到首页的完整目录（FR-16，§11.4 W-5）；`toc.ts` 把它换成同样属性（去掉 href）的 `<button aria-haspopup="dialog">`，Esc、点遮罩、点“关闭”都关，关闭后 `<dialog>` 把焦点还给按钮。过渡（design §5）选 CSS 方案：`toc.css` 用 `@starting-style` 做滑入 200ms 和遮罩淡入，关闭时 `display`/`overlay` 加 `transition-behavior: allow-discrete` 推迟移出顶层，做 150ms 滑出，脚本照常 `close()`，Esc 也有过渡；不支持的浏览器直接开关。看大图同样用 `@starting-style` 淡入 150ms，关闭直接消失。时长取 `tokens.css` 的令牌，减少动态效果时归零。章节号换成固定字形 `Numeral`（读屏“第 n 章”）：目录 20px，首页 28px。首页和找不到页的目录是静态的，按 `outline({}, null, 'principle')` 画（没有视图，全部正常显示，不弱化），不跑脚本。参考页不放抽屉，“打开目录”仍链到首页目录。
- **首页（#38，现状）**：`src/pages/index.astro`，按 design §4.4（D2）。首屏没有页眉：眉题、中文 logo（h1）、一句话、小字信息行（章节数取 `route.data.chapters.length`）、“从第 00 章开始”（`site.start`）和“先看整体思路”；一句话写在页面里，构建时核对它（去掉加粗后）原样出现在 `principle/overview.md` 正文里，不出现就构建失败。≥1100px 是 12 栏网格，右侧四行章级索引（`Numeral` 32px）链到 `TocNav` 首页变体的 `#chapter-<章节标识>`，平板和手机不显示。首屏只有 logo 的“Re”和主按钮用 `--accent`：“先看整体思路”、索引和首页目录的章节号都用 `--text`。
- **页眉（#31，现状）**：`src/components/SiteHeader.astro`，首页以外的页面都有（design §4.0）。参数 `views`（显示 `ViewToggle`，视图色带跟 `<html data-view>` 走：操作 `--text`、原理 `--accent`）和 `toc`（显示“目录”：构建时是链到首页目录的 `[data-toc-open]` 链接，所有宽度都有，`toc.ts` 换成打开抽屉的按钮，#34）；`PageLayout` 传两者，`ReferenceLayout` 和找不到页都不传（色带 `--border`）。眉题的章节号、章节标题卡由 `PageLayout` 按 `view.progress.chapterNo` 和 `routeData.chapters` 的第一项算出，`[data-route-progress]` 仍只放进度文字，页面脚本照旧改写它（#35 起改为读屏文字，见下面的“步骤编号”）。章节号的文字统一由 `lib/nav-text.ts` 的 `chapterNoText()` 给出。
- **步骤编号（#35，现状）**：design §4.1、§4.2、§4.6、D3。`lib/nav-text.ts` 给出构建时和页面脚本共用的四个函数：`stepMark(progress, current)`（普通页“本章第几步”补足两位和“共 m 步”；数不清时短横 `–`；选择页“选择”、旁支页“旁支”），`stepMarkHtml(mark)`（编号用 `numeralSvg`，带 `data-step-no` 原文），`eyebrowTotal()`（平板和手机眉题里的“ · 共 m 步”），`progressText()`（读屏文字“准备节点和住宅 IP，第 2 步，共 5 步”；数不清和选择页只有章节名，旁支页“<章> · 旁支”）。`PageLayout` 的眉题分成看得见的部分（`aria-hidden`：章节号用系统字体、章节名、`[data-route-total]`）和 `visually-hidden` 的 `[data-route-progress]`；h1 和 `[data-route-mark]`（`aria-hidden`）包在 `.step-heading` 里：<1100px 是 flex，编号在 h1 前、`--fs-title`、`--text-muted`、按第一行基线对齐，不显示“共 m 步”和选择/旁支二字；≥1100px 是两栏网格（`--margin-width` 96px + `--space-6`），用负外边距挂到正文栏左侧，编号 `--fs-margin-numeral`、`--text`、右对齐，`align-items: last baseline` 和 h1 最后一行基线对齐，“共 m 步”绝对定位在编号下方。`route-enhance` 的 `renderProgress(slots, view)` 在每次重算导航时改写这三个挂载点（切换视图、改选分叉点后编号跟着变）。
- **logo**：`src/assets/logo/` 放转曲后的 SVG（中文版、英文版、“Re:”标记），**只由 `src/components/Logo.astro` 引用**（`?raw` 内联，颜色用 `currentColor` 和设计令牌，深浅主题自动适配）；换 logo 只改这一处（需求 Q-15）。favicon 是 `public/favicon.svg`（SVG 内用 `prefers-color-scheme` 切换配色），由 `BaseLayout` 的 `<link rel="icon">` 引用。“Re”的颜色取 `--logo-re`（SVG 里的回退值是浅色的 `#5B3FA0`），`tokens.css` 在 `:root` 设 `--logo-re: var(--accent)`，深色模式下换成浅紫（#31 接入）。四个 SVG 都由 `scripts/build-logo.mjs` 生成，版式参数（字号、错落、间距）写在脚本里。
- **章节标题卡（#36，现状）**：design §4.1、§5、D6，替换 v2.0 的 `.chapter-intro`。只在 `isChapterStart()` 为真的页面（每章第一页，含选择页），放在眉题上方：`ChapterSubtitle`（`--text-muted`，对读屏隐藏）、`.chapter-card-heading`（`Numeral` 章节号，`--fs-display`、`--accent`，读屏“第 n 章”；章名 `--fs-chapter-title` 800）、`.chapter-card-intro`（`routeData.chapters` 里这一章的 `intro`，`--text-muted`、最宽 24em，没写就不输出）、一条 1px `--text` 下边线。<720px 章节号在章名上方；≥720px 并排，`align-items: last baseline` 底边对齐；≥1100px 卡片用负外边距把线延伸到页边栏，`.chapter-card-heading` 和 `.step-heading` 一样是两栏网格，章节号 `justify-self: end` 右缘对齐页边栏右缘（比页边栏宽时向左伸出）。留白按 §4.1（上方 96/48px 扣掉 `.step` 的 32px 顶部内边距）。没有入场动画。v2.0 的 `--font-numeral`、`--fs-numeral` 随之删除。
- **编号字形（#32，现状）**：design §3.2 D7 的固定字形编号。`scripts/build-logo.mjs` 按字形名取 Cormorant Garamond 500 的等高数字 `zero.lf`…`nine.lf` 和 `endash`（§11.4 W-1），输出 `src/assets/numerals/symbols.svg`（`<symbol id="numeral-0">`…`numeral-9`、`numeral-dash`，字体单位 1000/em，共用一个竖向范围）和 `metrics.json`（`top`、`height`、各字宽）；另输出四条章节副标题 `chapter-00.svg`…`chapter-03.svg`（Roboto Condensed 700，13px 原大，字距 0.3em，两端 24px 短横）。接口（§11.4 W-2）：`BaseLayout` 每页内联一份 `NumeralSprite`（隐藏、`aria-hidden`）；纯函数 `numeralSvg(text, label, className?)`（`src/lib/numeral.ts`）用 `<use>` 按字宽拼出数字串，外层 `role="img"` + `aria-label`，`fill="currentColor"`，高 `1em` = 数字高度（用 `font-size` 控制大小，例如找不到页的 `--fs-display` 64/80/96px），只接受 0–9 和 `–`；`Numeral.astro` 在构建时调用它，页面脚本改写编号时调用同一个函数，不重新转曲。`ChapterSubtitle.astro` 内联对应章节的副标题，`aria-hidden`，颜色由使用方给。已用在找不到页的大号 `404`、步骤编号（#35）、章节标题卡（#36）和首页章级索引（#38）。
- **参考页的返回**（1.0.0 已有 `faq-return`，泛化为 `reference-return`）：根据 `?from=<page-id>` 查到页面标题，显示“返回刚才的步骤：<标题>”；各条问题另有“回到：常见问题”，实测页另有“回到：IP 质量实测合集”；直接打开时显示“打开目录”。
  实现（#27，现状）：纯函数 `referenceReturn(search, pages)`（`src/lib/reference-return.ts`）只认 `RouteData.pages` 里的标识（步骤、选择页、旁支页），其他值当作直接打开；`ReferenceLayout` 内嵌“页面标识 → 标题”（`#reference-pages`），在标题上方和正文末尾写出隐藏的 `[data-reference-return]`，页面脚本 `src/scripts/reference-return.ts` 填好地址和标题后显示，并隐藏“打开目录”（`[data-reference-toc]`，页脚因此空了就整行隐藏），跑完给 `<main>` 加 `data-reference-ready`。“打开目录”是指向首页目录的链接 `/#home-chapters`，没有 JS 也能用；参考页不内嵌路线数据，不放目录抽屉（#30 保持链接）。v2.2 起这条作废：参考页和步骤页一样内嵌 `#route-data`、有侧边栏和抽屉，“打开目录”按钮删掉（§12）。
- **视频门面、代码复制、看大图**：1.0.0 已有，沿用；只改 FR-41：没有视频信息时不输出视频区域（删掉“视频制作中”）。

### M4 本机状态（`src/lib/reader-state/`）

**职责**：读写分叉点选择和视图偏好，只存在本机（三级边界 Never）。v2.0 改动 1.0.0 的 `reader-store.ts`：

```ts
interface ReaderState { choices: Choices; view: 'operation' | 'principle' }
interface ReaderStore { read(): ReaderState; write(patch: Partial<ReaderState>): void }
function createReaderStore(storage: Storage | null, options?: { isKnownChoice?: (fork, option) => boolean; nameHost?: { name: string } | null }): ReaderStore;
function getLocalStorage(scope?): Storage | null;
function getNameHost(scope?): { name: string } | null;   // 浏览器里是 window；nameHost 不传时第二层直接是内存
```

- 存储键改为 `rezero-subscribe-claude:v2`。1.0.0 没有部署过，不迁移 `:v1` 的数据，也不去读它。
- 去掉 `lastStep`、`visited`、`clear()`（FR-50、FR-51）。
- **适配器顺序改为 localStorage → `window.name` → 内存**（v2.0 新增，评审 V11）：取消默认路线后，本机存储被禁用时如果只存在内存里，换页就会忘掉选择，读者在“订阅”点“下一步”会回到“选择手机系统”、再进入手机的第一段，形成绕圈（AC-18）。`window.name` 在同一标签页的同源跳转之间保留、不随请求发给服务器（三级边界 Never），值写成带前缀的 JSON（`WINDOW_NAME_PREFIX` = `rezero-subscribe-claude:v2=`，不以它开头的 `window.name` 当作空），只存 `choices` 和 `view`；它也不可用时才用内存。localStorage 可用时只用它，为空也不去读 `window.name`；`VIEW_BOOT_SCRIPT` 按同样的顺序取视图（#26 实现）。已知局限：localStorage 能读、只有写入失败（配额已满）时，新值写进 `window.name`，但下一页仍只读 localStorage 里的旧值；这个值约 100 字节，实际不会触发，不为它改兜底规则。`window.name` 在 Chrome 88 起、Safari 和新版 Firefox 里，同一标签页跨站跳转时会被清空；更旧的浏览器里外链打开的网站可能读到它。里面只有方案和手机系统的选项标识，不含个人信息，可以接受。
- 其余规则 1.0.0 已有：存储不可用时不报错；格式不对的字段丢掉；`choices` 按分叉点合并、过滤 `__proto__` 等键。
- 写入时机：打开只属于一个分支的页面、在选择页或目录里选选项时写 `choices`；切换视图时写 `view`。

### M5 构建（`astro.config.mjs`、`package.json`）

- 校验仍分三层，都在 `astro build` 里（1.0.0 已有）：Zod 校验 frontmatter；Obsidian 插件校验双链、锚点、图片、标题、页脚和选项块；`buildRouteMap` 校验路线图。
- **内容提示**（替代 1.0.0 的占位清单 `placeholderReport`）：`astro:build:done` 时打印三类提示，不让构建失败：`操作版缺失：<id> <标题>`、`作者待补：<id> <标题>（n 处）`、`博客链接待填：<目标>`（FR-21、Q-11）。
- 配置（1.0.0 已有）：`output: 'static'`、`build.format: 'directory'`、`trailingSlash: 'always'`、`base: process.env.BASE_PATH ?? '/'`、`site: process.env.SITE_URL`。站内链接一律经 `withBase()`。
- 禁止通过放宽 Zod 规则、跳过校验来让构建通过（三级边界 Never）。

## 4. URL 规则

见 [ADR-0002](adr/0002-url-scheme.md)（v2.0 修订）：

| 页面 | URL（相对 `BASE_PATH`） |
| --- | --- |
| 首页 | `/` |
| 步骤、选择页、旁支页 | `/<id>/` |
| 常见问题 / 各条问题 | `/faq/`、`/faq/<id>/` |
| IP 质量实测合集 / 实测 | `/ip-tests/`、`/ip-tests/<id>/` |
| 找不到 | `404.html` |

从步骤链到参考页时带 `?from=<page-id>`，例如 `/faq/split-routing/?from=plan3-residential-node`。参数里只有公开的页面标识。

## 5. 数据流（以 AC-08、AC-09 为例）

1. **构建**：`loadSite()` 读三个集合和 `route.yaml`，M1 校验，M2 编译；每页用 `view(id, {}, 'operation')` 写好导航，HTML 内嵌 `RouteData`，两版正文都在 HTML 里。
2. **读者在无痕窗口打开 `/import-proxy/`**：构建时写的导航里，F1 未选，所以“上一步”已经指向 `choose-plan`（AC-09）。脚本读 M4 得到空选择，重算结果相同。
3. **读者打开 `/iphone-gmail/`**：它只属于 F2 的 `iphone`，构建时就按 `phone=iphone` 计算：上一步 `iphone-proxy`，下一步 `register-gmail`（AC-08）；脚本把 `phone=iphone` 写进 M4。
4. **读者在 `/leak-protection/` 切到原理视图**：`data-view` 变成 `principle`，整页换成原理版正文，写 M4 的 `view`；`route-enhance` 收到事件后按原理视图重算，“下一步”不变（`timezone`），但在 `check-ip` 上“下一步”会变成 `recap`（AC-06）。

## 6. 目录结构（v2.0 目标；标“计划”的由 v2.0 任务建立）

```
.
├── AGENTS.md / CLAUDE.md            仓库指南 / Claude Code 入口
├── CONTEXT.md                       术语
├── docs/                            需求、调研、架构、设计、ADR、计划、交付
│   └── rewrite/                     重写稿（作者维护的素材来源）：原理版/、操作版/ 纳入版本管理；附件/ 不提交（.gitignore），截图核对打码后只以 src/assets/screenshots/ 的副本入库
├── astro.config.mjs                 M5 构建配置
├── package.json / package-lock.json 依赖与脚本；version 字段是版本来源
├── src/
│   ├── content.config.ts            M1 集合：principle、operation、reference（#25 删除 steps/choices/faq/pages）
│   ├── content/                     route.yaml、principle/、operation/、reference/（faq.md、faq/<id>.md、ip-tests.md、ip-tests/<id>.md）、blog-links.yaml
│   ├── assets/
│   │   ├── screenshots/             截图（经 Astro 图片处理）
│   │   ├── logo/                    转曲后的 logo SVG（只由 Logo.astro 引用）
│   │   ├── mascot/                  Claude Code 像素小形象 mascot.svg（只由 Mascot.astro 引用，design D6）
│   │   ├── diagrams/                说明图（import-rewrite.mjs 从重写稿附件复制）
│   │   └── numerals/                转曲后的编号字形（build-logo.mjs 生成，只用在找不到页的 404）
│   ├── lib/
│   │   ├── content/                 M1：schemas、link-index、remark-obsidian、rehype-operation-ids、rehype-figures、markdown、integration（+ *.test.ts）
│   │   ├── route/                   M2：route-map、types（+ 测试和测试用路线图）
│   │   ├── reader-state/            M4：reader-store、view-boot（+ *.test.ts）
│   │   ├── nav-text.ts              导航文案，构建时和页面脚本共用
│   │   ├── reference-return.ts      参考页按 ?from= 找回步骤（#27 由 faq-return.ts 改名）
│   │   └── site.ts                  构建时装配 loadSite()、assembleRoute()
│   ├── scripts/                     页面脚本：route-enhance、view-toggle、toc、reference-return、code-zoom、video-facade
│   ├── layouts/                     BaseLayout、PageLayout（替换 StepLayout）、ReferenceLayout
│   ├── components/                  Logo、Mascot、SiteHeader、ThemeToggle、ContactLinks、SiteFooter、StepNav、Toc、TocNav、TocItems、TocSections、Numeral、NumeralSprite、GroupInvite、CodeCopy、ImageZoom、VideoFacade
│   ├── pages/                       index、[page]、faq/index、faq/[question]、ip-tests/index、ip-tests/[test]、404
│   └── styles/                      tokens.css、base.css、prose.css、toc.css、code-zoom.css
├── public/                          favicon.svg
├── scripts/                         一次性开发脚本：import-rewrite.mjs（+ 测试）、build-logo.mjs、compare-migration.mjs（v2.0 改写）
└── tests/
    ├── e2e/                         Playwright，按 v2 的 AC 编号命名
    ├── build/                       构建级用例（AC-14）
    └── fixtures/                    构建失败用例的坏内容，按 src/content/ 的相对路径覆盖
```

- 单元测试放在被测模块旁边；跨页面流程测试放在 `tests/e2e/`（1.0.0 已有）。
- 不提交：`dist/`、`dist-sub/`、`.astro/`、`node_modules/`、`test-results/`、`playwright-report/`、`coverage/`，以及 logo 转曲用的字体文件目录 `.cache/`。
- **版本来源**：`package.json` 的 `version`。v2.0 整体验收通过后定为 `2.0.0`（需求 v0.3）。

## 7. 命令（以 `package.json` 为准）

| 命令 | 作用 |
| --- | --- |
| `npm run dev` / `build` / `preview` / `test` / `test:build` / `test:e2e` / `check` | 1.0.0 已有，含义不变 |
| `node scripts/import-rewrite.mjs [目录]` | 从重写稿导入正文和截图；连跑两次第二次没有改动 |
| `node scripts/build-logo.mjs` | 用 `.cache/fonts/` 里的开源字体生成 logo SVG、favicon 和编号字形（字体下载地址写在脚本开头；输出是确定的，重复运行结果相同） |
| `node scripts/compare-migration.mjs` | 对照重写稿和构建产物的命令、链接、截图（AC-13，v2.0 改写） |

## 8. 验收对应的验证方式（需求 v0.3 §8）

| 验收 | 验证方式 |
| --- | --- |
| AC-02、03、04、05、08、09、19 | M2 单元测试（测试用路线图 + 真实 `route.yaml` 枚举 12 条序列）+ Playwright 走真实页面 |
| AC-01、06、07、10、11、12、18 | Playwright。AC-10 断言全站 HTML 里没有“默认”“继续上次”“清除进度”和已读标记；AC-18 沿用注入抛异常的 `localStorage` |
| AC-13 | `scripts/compare-migration.mjs` 对照重写稿与 `dist/`：每页两种视图的命令、链接、截图一致；人工抽查记录写进 `docs/migration-checklist.md` 的 v2 节 |
| AC-14 | 构建级用例（1.0.0 已有机制），坏内容换成：引用不存在的图片、引用不存在的标题、锚点不存在、删掉分支的汇合、两版标题不同 |
| AC-15、16、17 | 1.0.0 已有的 e2e，按新页面清单更新；AC-17 另断言 logo 是内联 SVG、没有字体请求 |
| AC-20 | 人工：logo 和番剧标题并排截图给作者确认，记录在 logo 任务的 Issue；自动：Playwright 在深浅两种配色下截首页、页眉，检查 favicon 文件存在；仓库里搜不到番剧 Logo 文件 |
| AC-21 | `src/styles/tokens.test.ts` 对比度实测（按新令牌更新组合）+ axe/键盘 e2e |
| 设计 | [design.md §7](design.md)：截图人工评审 + axe + 对比度实测 |

## 9. 安全与隐私

- 不加载统计、广告、评论脚本，也不加载第三方字体和图标（NFR-03/04）；logo 是内联 SVG，字体只在开发机上用于转曲。只有读者点击视频后才插入第三方 iframe。
- 截图入库前逐张检查打码（三级边界 Never）。导入脚本只复制、不判断，核对是导入任务的验收项。重写稿的 `附件/` 不提交，截图只以 `src/assets/screenshots/` 里核对过的副本入库（需求 Q-13）。
- 仓库里不放凭据；`.env*` 不提交。

## 10. 待定事项

| 编号 | 事项 | 影响 | 阻塞？ |
| --- | --- | --- | --- |
| Q-01 | 部署位置和域名（需求遗留） | 交付阶段 | 否 |
| Q-07 | 联系方式待作者提供 | 后记正文；提供前构建照常 | 否 |
| Q-11 | 已解决（#23，2026-10-15）：`blog-links.yaml` 沿用 1.0.0 已上线的三个博客地址（作者确认）；以后新增的博客双链地址未定时仍写 `null` | — | 否 |
| Q-13 | 已解决（#23，2026-10-15）：`截图 2026-10-15 13-43-53 1.png` 由仓库根目录未打码的原图裁剪而成，只保留 Settings → Account 的“Log out of all devices”一行，作者确认采用；v3 正文不再引用，收尾时删除（需要时从 git 历史取回） | — | 否 |
| A-01 | `BASE_PATH` 按部署位置各构建一次（1.0.0 已选定） | — | 否 |
| A-04 | 两版正文都进 HTML，页面体积约翻倍 | 正文是纯文本，最大的页约 6 KB 原文；图片懒加载、隐藏的不加载。可接受 | 否 |

## 11. 实施前架构评审

### 11.1 1.0.0 实施前评审（2026-10-13，历史）

- 范围：沿 S1–S6 核对需求 v0.1、本文 v0.1、ADR-0001–0003、design.md，并抽查两篇原文章。只是文档评审，没有运行任何代码。结论：**通过**，没有阻塞项。
- 发现 R1–R9：`RouteData` 带标题（R1）、汇合点可以跨章（R2）、F2 只分 tun/DNS（R3）、跳过目标（R4）、原文写法与迁移规则（R5）、四个管线疑点在 #2 验证（R6）、构建级用例在 #15 验证（R7）、SSH 截图打码（R8）、占位清单落点（R9）。处理结果见 git 历史中本文 v0.1。

### 11.2 1.0.0 补评：步骤地图 v0.2（2026-10-13，历史）

R10 共享步骤、R11 跨章汇合、R12 连续跳过与 `skipLabel`、R13 手机改时区并入第六章、R14 占位步骤增加。结论仍为通过。v2.0 中 R3、R4、R13、R14 随路线图重建失效；R1、R2、R10、R11 的机制保留。

### 11.3 v2.0 实施前评审（2026-10-15）

- 范围：沿需求 v0.3 的 S1–S6 核对本文 v2.0、ADR-0002/0004/0005、design.md v2.0，并逐个检查重写稿的写法（两版文件清单、标题、双链目标、嵌入、页脚、TODO、选择页的加粗小节）。**只是文档评审和对重写稿的文本扫描，没有运行任何代码。**
- 结论：**通过**，没有阻塞项。

| 编号 | 发现（依据） | 影响 | 处理 | 阻塞？ |
| --- | --- | --- | --- | --- |
| V1 | 重写稿的双链写的是中文标题（`[[选择方案]]`），1.0.0 插件按英文标识解析（§3 M1） | 原样导入就会全部报错；改写成标识则每次重新迁入都要手改（Q-08） | 已修正：双链按标题解析，导入原样（ADR-0005） | 否 |
| V2 | 两版正文放进同一 HTML 会出现重复的标题 id（ADR-0004） | axe 报重复 id，锚点跳错 | 已修正：操作版标题 id 加 `op-` 前缀，锚点指向原理版 | 否 |
| V3 | FR-12 要求“每个选项是一块可点击区域”，但重写稿的选择页是普通正文（加粗段落 + 链接列表），没有结构化的选项 | 拿 frontmatter 另写选项文案会和正文重复，违反 FR-03 | 已修正：frontmatter 只写 `heading` 定位正文里的小节，插件包成选项块，块内第一个链接做整块点击区域并与路线图核对（§3 M1） | 否 |
| V4 | FR-13 未选时“汇合点上一步指向选择页”，但 F2 第二段（订阅）没有选择页，且在 F2 选择页之后很远 | 规则只写了汇合点，没写段前一页 | 已修正：未选分叉点的每段 `branch` 都折叠成指向它的选择页，前后两侧对称（§3 M2），与 AC-09 一致 | 否 |
| V5 | 原理独有步骤在操作视图下被直接打开时（FR-30）没有导航规则 | 它不在操作序列里，上一步/下一步无定义 | 已修正：按原理视图序列计算它自己的导航（§3 M2） | 否 |
| V6 | 重写稿 `[[常见问题#…]]` 的小标题含问号和中文引号，`github-slugger` 的结果要和 Astro 的标题 id 一致（1.0.0 已用同一算法）；v1 不校验锚点，FR-61 现在要求校验 | 锚点写错时静默失效 | 已修正：链接索引收集每页小标题的 slug，找不到就失败（§3 M1）；导入任务的单元测试覆盖这三个真实锚点 | 否 |
| V7 | 重写稿引用的一张截图不在 `附件/`（§10 Q-13） | 导入后构建失败 | 任务：导入任务请作者提供打码后的文件；提供前这一页的构建失败是正确行为，不能放宽校验 | 否 |
| V8 | `docs/rewrite/` 目前没有纳入版本管理，导入脚本依赖它；`附件/` 未核对打码 | 换机器后无法重新导入；未核对的截图入库违反红线 | 已修正：两版正文纳入版本管理，`附件/` 不提交，截图只以核对过的 `src/assets/screenshots/` 副本入库（§6、§9）；导入任务执行 | 否 |
| V9 | 需求 FR-71 要求“草图经作者确认后再实现”，Q-12 待决 | 视觉任务可能卡在确认上 | 已决：作者 2026-10-15 授权 Agent 决定前端样式，design.md v2.0 定稿；logo 风格是否像番剧（AC-20）仍由作者确认，单独成任务 | 否 |
| V11 | 取消默认路线后，本机存储被禁用时选择只存在内存里，换页即丢：“订阅”的下一步指向“选择手机系统”，再选 iPhone 会进入手机的第一段而不是订阅段，形成绕圈（FR-13、AC-18） | AC-18 无法通过 | 已修正：M4 适配器加 `window.name` 一层（§3 M4）；没有 JS 时的同一折返写明为降级体验（§3 M3） | 否 |
| V10 | 1.0.0 的 e2e 和构建级用例按旧路线和 AC 编号写 | 改路线后旧用例全部失效 | 任务：每个 v2.0 切片同时改写自己覆盖的 e2e；先建骨架任务把旧用例和旧页面一次删干净，避免长期双轨 | 否 |

- 依赖方向不变（M1 ← M2 ← M3，M4 独立），无环；M2 的改动集中在序列计算一处，构建和浏览器共用的结构不变，没有发现过度设计。

### 11.4 v2.1 实施前评审（2026-10-16）

- 范围：对照 design.md v2.1（D1–D11）逐节核对现有代码（`src/styles/`、`src/components/`、`src/layouts/`、`src/pages/`、`src/scripts/`、`scripts/build-logo.mjs`）和需求 v0.3 的 FR-10、FR-16、FR-18、NFR-03。**是文档和代码阅读，外加一次字体文件检查（W-1），没有运行站点或测试。**
- 结论：**通过**，没有阻塞项。依赖方向不变（M1 ← M2 ← M3，M4 独立）；v2.1 只改 M3 的页面和样式，另在 M1 加一个章节字段和一个图片插件。任务见[实施计划](implementation-plan.md) v2.1 的 W01–W09。

v2.0 → v2.1 的代码差距（现状 → 目标）：

| 项 | 现状（#31） | v2.1 目标 | 任务 |
| --- | --- | --- | --- |
| 编号字形 | `--font-numeral` 用系统旧式衬线（`tokens.css`），各设备不同 | Cormorant Garamond 500 等高数字，转成图形（design §3.2、D7） | W01（#32 已完成：字形和 `Numeral`，先用在找不到页，见 §3 M3“编号字形”） |
| 断点和字号 | 两档（<720 / ≥720），没有标题卡和页边编号的字号 | 三档（<720 / 720–1099 / ≥1100），§3.2 全表；平板边距 32px | W02（#33 已完成：`tokens.css` 三档字号、标题卡/页边编号/截图编号/首页一句话的字号令牌、`--space-9`、`--gutter`） |
| 视图切换按下 | `--accent` 底（`ViewToggle.astro`） | `--text` 底、`--bg` 字（§4.3、D8） | W02（#33 已完成） |
| 动效和反馈 | 没有任何过渡、悬停或按下反馈 | 抽屉 200/150ms、看大图 150ms；悬停、按下；`prefers-reduced-motion`（§5、D11） | W02（#33 已完成：悬停、按下，动效时长和位移写成令牌，减少动态效果时在 `tokens.css` 归零）、W03（#34 已完成：抽屉、看大图的过渡） |
| 目录 | ≥1100px 常驻左侧栏（`.step-shell` 两栏网格、`toc.ts` 在侧栏和抽屉间移动 `<nav>`）；没有 JS 时“目录”按钮隐藏 | 所有宽度都是抽屉；没有 JS 时“目录”链到首页目录（§4.5、§5、D5） | W03（#34 已完成，见 §3 M3“目录”） |
| 步骤编号 | 只有眉题文字“<章> · 第 n 步，共 m 步” | 桌面悬挂页边栏的大号编号 + “共 m 步”；平板和手机编号在 h1 前；数不清时短横；选择/旁支二字（§4.1、§4.2、§4.6、D3） | W04（#35 已完成，见 §3 M3“步骤编号”） |
| 章节过场 | `.chapter-intro`：章节号 + 章名 + `--border` 线 | 章节标题卡：CHAPTER 副标题、紫色章节号 + 章名底边对齐、一句话、`--text` 线（§4.1、D6） | W05（#36 已完成，见 §3 M3“章节标题卡”） |
| 截图 | 普通 `<img>`，没有边框和编号 | 图版：边框、上下 24px、编号“图 02-1”（§4.7、D4） | W06（#37 已完成，见 §3 M1“截图图版”） |
| 首页 | logo + “开始” + 目录 | 说明书封面（眉题、logo、一句话、小字信息行、两个入口、桌面章级索引）+ 完整目录（§4.4、D2） | W07（#38 已完成，见 §3 M3“首页”） |
| 说明图 | 无 | 三页单色线稿（§4.7、§9） | W08（#39 已完成，见 §3 M1“说明图”） |

| 编号 | 发现（依据） | 影响 | 处理 | 阻塞？ |
| --- | --- | --- | --- | --- |
| W-1 | design §3.2 要“等高数字”，但 Cormorant Garamond 的默认数字是旧式数字；`build-logo.mjs` 的 `run()` 按 `charToGlyph` 取字，会拿到旧式的 `zero` | 直接沿用 logo 的取字方式会做出 `0` `1` 半高的编号，正是 §3.2 拒绝的 | 已核实（2026-10-16，读 `.cache/fonts/CormorantGaramond.ttf`）：字体里有 `zero.lf`…`nine.lf` 和 `endash`，GSUB 有 `lnum`。W01 按字形名取字，不用 `charToGlyph` | 否 |
| W-2 | 步骤编号要在浏览器里改写：切换视图、改选分叉点后本章第几步会变（FR-10、§4.3），而编号是转曲后的图形 | 如果每个数字串都在构建时整段转曲，浏览器拿不到新数字的图形 | 推荐：每页内联一份 `<symbol>`（`0`–`9`、`–`，约几 KB），构建时和 `route-enhance` 都用 `<use>` 拼数字串，外层 `role="img"` + `aria-label` 给读屏文字。W01 定接口，W04 接入；不加载网页字体（NFR-03） | 否 |
| W-3 | 章节标题卡的“一句话”要“从重写稿取，不另写”（§4.1），但 `route.yaml` 和重写稿都没有章节简介字段 | 没有放处；手抄进代码会和重写稿脱节，违背 ADR-0005 | 推荐：`route.yaml` 的章节加可选 `intro`，构建时校验它在这一章第一页的原理版正文里原样出现，不出现就失败（同 FR-61 的做法）。句子由作者从候选里定（实施计划 §6）。已实现（#36），见 §3 M1“route.yaml 格式”和 M2“章节的一句话” | 否 |
| W-4 | 截图编号“图 02-1”的前半是本页步骤号（§4.7），而步骤号可能数不清（§4.1 显示短横），文档没写这时怎么编 | 会出现“图 –-1” | 推荐：步骤号数不清时和选择页一样只用序号“图 1”；前缀随视图和选择由页面脚本改写，没有 JS 时按构建时的操作视图写。按作者 2026-10-16 的授权照此定，W06 实现，已补进 design §4.7 | 否 |
| W-5 | 没有 JS 时“目录”必须能用（§5、FR-16），现在的按钮在没有 JS 时隐藏，而 v2.1 取消了常驻侧栏 | 取消侧栏后，没有 JS 的读者在步骤页上找不到目录 | W03 构建时输出指向 `/#home-chapters` 的链接，脚本接管成抽屉按钮（参考页已经这样链到首页目录） | 否 |
| W-6 | FR-18、AC-01 写主按钮“开始”，design §4.4 改成“从第 00 章开始 →”（§8 一致性检查第 1 条） | `ac-01-home.spec.ts` 按旧文字找按钮 | W07 同步改 FR-18、AC-01 的按钮文字和用例；行为（进入前言）不变 | 否 |
| W-7 | 说明图（§4.7、§9）要放进三页原理版，但重写稿里没有这些图，正文按 ADR-0005 原样导入 | 没有放进页面的合法途径 | 作者 2026-10-17 定：加进重写稿再导入（`![[说明图-….svg]]`），不用 frontmatter、不补 ADR；#39 实现，见 §3 M1“说明图” | 否（只影响 W08） |
| W-8 | design §7 要求 768×1024 截图，`playwright.config.ts` 只有 360 和 1280 两个项目 | 平板档没有自动检查 | W02 起在用例里单独设 768 宽检查；W09 加平板项目。已实现（#40）：`tablet-768` 项目跑全套 e2e，用例里单独设 768 宽的块已并入 | 否 |

## 12. v2.2 改版（2026-10-19，现状）

按 [v2.2 改版计划](v2.2-plan.md) 和需求 v0.4。依赖方向不变（M1 ← M2 ← M3，M4 独立），没有新模块。

| 模块 | 改动 |
| --- | --- |
| M1 内容 | **常见问题一问一页**：每条问题是重写稿原理版里的单独文件，`import-rewrite.mjs` 按标题导入到 `reference/faq/<id>.md`（和别的参考页一样按第一行标题匹配；《常见问题》链到、站内还没有的条目单独报告，先手建只有 `# 标题` 的文件再重跑）。文件名是条目标识（URL `/faq/<id>/`，ADR-0002），第一行标题是问题原文，**标题和标识的对应只在这里**，没有另外的映射表，也不在构建时切分 `faq.md`（计划 W6 的 `appendix.yaml` 和切分作废）。`link-index.ts` 的 `checkFaqItems` 双向核对：条目没列进常见问题、常见问题的列表项链到没有条目文件的标题、同一条列两次、条目标识和已有页面相同；一个标题两个标识、条目缺标题由 `checkPages` 原有的“标题重复”“缺少第一行标题”报出。双链 `[[问题标题]]` 照常按标题解析到 `/faq/<id>/?from=<来源页>`。构建级坏内容用例：`tests/fixtures/faq-*`。代码块不做语法高亮，`<pre>` 的 `tabindex` 由 `rehype-scrollable-tables` 加 |
| M2 路线 | 函数不变，数据变了：`route.yaml` 多一章 `appendix`（只有附录页），后记的下一步是附录，附录是路线的最后一项、下一步是首页；方案一的顺序按重写稿改成 `plan1-free-isp → plan1-buy-server → plan1-buy-isp → plan1-make-node → plan1-panel`，标识不变；2026-10-19 删掉 `plan1-free-isp`，旧地址经 `REMOVED_PAGES` 跳到选择方案（ADR-0002 修订） |
| M3 页面 | `PageLayout`：页头色带（眉题 + h1，章首页多 `ChapterSubtitle`、章名、`intro`），删除页边栏、`stepMark`/`stepMarkHtml` 和大号章节号；`Mascot.astro` 内联 `src/assets/mascot/mascot.svg`；`SiteFooter.astro` 每页一行非官方声明。目录：`Toc` 同时输出 `aside[data-toc-sidebar]`（≥1100px 常驻、独立滚动、静态 HTML 可用）和 `<dialog data-toc-dialog>`（<1100px），同一套 `TocNav` 标记；`toc.ts` 两份一起改写，首次加载时侧边栏滚到当前项。`ReferenceLayout`：和步骤页一样的页头色带（眉题“附录 · …”由页面传入），内嵌 `#route-data` 并初始化目录（不标当前项），页脚只有 `back`（“回到：附录 / 常见问题 / IP 质量实测合集”），没有上一步/下一步；`?from=` 的返回链接照旧。`src/pages/faq/[question].astro` 生成各条问题页。选项块：`option-blocks.ts` 在块前插编号圆圈、块内末尾插箭头，样式是选项行。`StepNav`：文字链接 + 黑色主按钮，手机吸底 |
| M5 构建 | `astro.config.mjs` 设 `markdown.syntaxHighlight: false`；`build-logo.mjs` 多生成 `chapter-04.svg` |

计划和实现的出入（作者 2026-10-19 定，以 requirements 为准）：附录没有“上一条 / 下一条”和 `src/lib/appendix.ts` 阅读顺序（计划 W5 第 2、3 条）；常见问题 7 条，标识见 requirements §5 和 migration-checklist v2 节。


## 13. v3 增量架构（2026-10-21）

对应需求 v0.9（§0.1 换成文档站风格、§0.2 合并页面），目标站点版本 3.0.0。复用调研见 [reuse-research §5.1](reuse-research.md)，合并页和旧网址的决定见 [ADR-0006](adr/0006-merged-pages-and-moved-urls.md)。技术栈（§1）不变：仍是 Astro 7.3、原生 CSS、原生 TypeScript 页面脚本，**不新增运行时依赖**。代码现状：V01–V07、V09 已按本节实施（2026-10-22），其余条目仍是“计划”，由 `[v3]` 开头的 Issues 建立后改成现状。

### 13.1 增量影响分析

| 模块 | 影响 | v3 改动 | 不变 |
| --- | --- | --- | --- |
| M1 内容 | 小改 | 双链的小节锚点解析（V07 现状，页面固定原理视图，只有原理版）；给 M6 提供原理版和参考页的 h2、h3（Astro `render()` 返回的 `headings`）；合并页本身仍是“一页 = 重写稿一个文件”，导入规则不变 | 导入脚本、Obsidian 插件、校验三层 |
| M2 路线 | 数据改动 + 小改 | `route.yaml` 随作者改完的重写稿重建（Q-18 定后）；`moved:` 段和校验（V09 现状，取代 `REMOVED_PAGES`，ADR-0006：单段旧标识、`faq/<id>` 多段参考页路径、`choice` 按分叉点分流）；章节的 `intro` 字段和 `site.ts` 里对它的核对随章节标题卡一起删除（FR-72 去掉了它的显示位置，不是放宽校验）；新增可选的 `summary`（首页五栏简介的导航文案，M2 只校验非空） | `buildRouteMap`/`view`/`outline` 的算法和接口，分叉、汇合、默认方案二 |
| M3 页面 | 重做外观 | 顶栏、正文栏、侧边栏、翻页、首页、选择页卡片按 design.md v3 重做（13.3）；跳转页 `MovedPage`（V09 现状）、页面脚本 `section-hash`（V07 现状）、搜索框（V08） | 视图切换机制（ADR-0004）、导航改写、视频门面、复制、看大图、QQ 群和联系方式的数据来源 |
| M4 本机状态 | 不变 | — | 全部 |
| M5 构建 | 小改 | 删掉 `astro.config.mjs` 的 `redirects`、sitemap 过滤跳转页（V09 现状）；sitemap 每条写 `lastmod`（源文件最后一次提交的日期，2026-10-23，`src/lib/sitemap/lastmod.ts`，部署改成 `fetch-depth: 0`）；新增静态端点 `search-index.json`（V06 现状） | 构建校验、内容提示、`BASE_PATH` |
| **M6 搜索（新增）** | 新增 | 构建时生成索引，浏览器里匹配（13.2） | — |
| 开发脚本 | 新增 | ~~`scripts/merge-rewrite.mjs`：机械合并~~（13.5 已取消，作者直接交来合并稿）；保留 `import-rewrite.mjs`、`compare-migration.mjs` | `import-rewrite.mjs`、`compare-migration.mjs` 的规则 |

依赖方向：M1 ← M2 ← M3，M1 ← M6 ← M3，M4 独立。M6 不依赖 M2：索引的范围（哪些页面算步骤、选择页、旁支页、参考页）由 `loadSite()` 传入，M6 只管索引形状和匹配。

### 13.2 M6 搜索（`src/lib/search/`，现状 V06、V08 2026-10-22）

**职责**：FR-24。把页面标题和正文的 h2、h3 变成一份小索引，在浏览器里按读者输入找出最多 10 条结果。深模块：对外两个纯函数，规范化、排序都藏在里面。

```ts
interface SearchSource { path: string; title: string; order: number; headings: MarkdownHeading[] }  // 构建时
type SearchEntry =
  | { path: string; pageTitle: string; order: number }  // 页面标题本身
  | { path: string; pageTitle: string; heading: string; slug: string; order: number };  // h2、h3；heading 和 slug 成对
// path：页面是 '/maintenance/'；参考页是 '/ip-tests/voyracloud/'。order 是目录顺序，同分时靠前的排前面。
function buildSearchIndex(sources: SearchSource[]): SearchEntry[];
function search(index: SearchEntry[], query: string, limit = 10): SearchHit[];  // 浏览器
// SearchHit = { entry, href }，href 已用 withBase() 拼好
```

- **数据来源**：`src/pages/search-index.json.ts`（现状）调用 `loadSite()`，用 `searchPageIds(route)`（`src/lib/site.ts`）按目录顺序列出全部页面——步骤、选择页、分叉的各个选项（共享步骤只算第一次），旁支页排在最后——用 `searchReferences(site.references)` 列出 `ip-tests` 合集和它的各篇实测，再对每项调用 `render()` 取 `headings`，交给 `buildSearchIndex`（只收 depth 2、3）。v3 只有一版正文，不再有 `view` 参数；首页、找不到页、跳转页（V09 的 `moved:`）不进索引。常见问题在 v3 并进各章、不再有独立页面（实施计划 §3.1），所以索引里没有 `faq`。
- **匹配**：查询和条目文字都做 NFKC、转小写、去掉空白；页面标题条目只看标题，小标题条目只看小标题（所以标题命中不会把同一页的小标题重复列一遍），条目文字包含查询就算命中；页面标题和同名小标题各算一条（前者打开页顶，后者跳到小节）。排序：页面标题命中 > 小标题命中；同类里开头命中 > 中间命中；再按 `order`。不做模糊匹配和分词（需求：只搜标题和小标题；中文子串匹配足够，例如“时区”命中“改时区”）。
- **锚点**：`search()` 用 `withBase()` 生成 `href`；小标题命中是 `withBase(path + '#' + slug)`，页面标题命中是 `withBase(path)`。
- **页面脚本** `src/scripts/search.ts`（V08 现状）：读者第一次聚焦搜索框时用 `fetch(withBase('/search-index.json'))` 取索引（同源、地址固定，请求里没有读者输入的文字，AC-28）；之后输入时只在内存里调用 `search()`。下拉是 ARIA combobox（`role="combobox"` + `listbox`），上下键、回车、Esc；没有结果时显示“没有找到”，索引下载失败时显示“搜索暂时不可用”。<720px 顶栏只显示搜索图标按钮，点开后输入框覆盖顶栏，关闭后焦点回到按钮。没有 JS 时搜索控件隐藏。打开小标题结果后，由 13.4 的 `section-hash` 滚动到位置。
- **组件** `SiteSearch.astro`（V08 现状），只放进顶栏。
- 体积：几十条、几 KB，只有标题和小标题、没有正文段落；索引只在聚焦时下载一次，浏览器缓存。

### 13.3 M3 页面（按 design.md v3）

[design.md](design.md) v3（2026-10-21 定稿）给出令牌、尺寸、断点、深色配色和 Q-17 的 360px 顶栏预算，M3 的实现以它为准；本节只定结构和接口。

- **断点**：`720px` 一档取代 `1100px` 的“常驻目录”档；具体令牌由 design 定，`tokens.css` 和 `tokens.test.ts` 同步。
- **顶栏**（V01 现状，搜索 V08 现状）：`SiteHeader.astro` 改为文档站顶栏，左边 `Logo`（“Re:”标记）+ 站名 + `Mascot`，右边 `SiteSearch`（V08 接上，桌面和平板是胶囊输入框、手机是放大镜按钮）、`ThemeToggle`（昼夜切换，用户 2026-10-22 决定取代 `ViewToggle`，见 13.12）、`ContactLinks`；<720px 左边多“目录”按钮。不吸顶。首页不用顶栏（FR-18）。
- **页面骨架**（V01 现状）：`PageLayout`、`ReferenceLayout` 改成“顶栏 + 两栏（侧边栏 | 正文栏）”，≥720px 侧边栏 `position: sticky`、独立滚动，<720px 只有正文栏、目录在抽屉里。页头色带、`ChapterSubtitle`、章节标题卡、`.step-heading` 的编号挂栏删除；眉题改为 h1 上方一行灰色小字，进度文字仍由 `nav-text.ts` 和 `route-enhance` 的 `renderProgress` 给出（挂载点名字不变）。`Numeral`、`numerals/` 只剩找不到页的大号 `404`（design v3 §3.2、§9），`ChapterSubtitle` 和 `chapter-0X.svg` 已随 V05 删除。
- **正文和内容组件**（V03 现状，FR-72）：页面标题、正文和内容组件按 design §3.2、§4.7 排（h1 在 `base.css` 和页面布局，其余在 `prose.css`）：h2–h4、正文链接、行内代码和代码块、表格（全格线 + 隔行）、提示块（浅底 + 4px 左色条）和截图图版；`GroupInvite` 用普通提示块的外观。正文栏宽度仍由 `--measure` 和 `--gutter` 决定。
- **目录 / 侧边栏**（V02 现状，FR-16）：`TocNav` 每章是一个 `<details>`，当前页所在章 `open`，其余折叠；折叠只在 DOM 里，不写本机。当前页下面列出它正文的 h2（固定原理视图，只有一份，用户 2026-10-22 决定），由 `[page].astro`、`ip-tests/*.astro` 把 `render()` 的 `headings` 经 `tocSections()` 取 `depth === 2` 传给 `PageLayout`/`ReferenceLayout` 的新参数 `sections`，再交给 `Toc`；参考页的当前项由 `ReferenceLayout` 的 `currentReference` 指定（各篇实测高亮合集），合集挂在“日常维护”章末并展开这一章；子页也把 `headings` 传下去，小节挂在上级项下面，链接锚点仍是子页正文的 h2。`TocItems.astro` 写一章的页面项和参考页，`TocSections.astro` 写小节列表。链接锚点直接用正文 h2 的 `slug`。当前项 600 `--accent` + 4px 左边线。`toc.ts` 仍按本机选择改写弱化和当前项，不碰 `<details>` 的开合；分叉点的选项也是 `<details>`，选中/当前所在的展开、其余收起（用户 2026-10-22）。找不到页的目录用不折叠的变体（`collapsible` 不传）；首页不再用 `TocNav`（第二屏是五章简介，直接读 `RouteData.chapters` 的 `title` 和 `summary`）。抽屉和侧边栏仍是同一套 `TocNav` 标记（v2.2 的做法）。章名和步骤都不写数字（V10）。
- **翻页**（V04 现状，FR-72、AC-30）：`StepNav` 在正文末尾一条 1px `--border` 细线下排一行文字链接，左边“← 上一步”+ 标题、右边“下一步 →”+ 标题（两行，13px `--text-muted` 的方向 + 16px 600 `--accent` 的目标标题，整块 `min-height: 44px`）；v3 没有可跳过的整页步骤，所以不出现“跳过”。旁支页的“回到”、参考页的“回到”和“返回刚才的步骤”（`ReferenceLayout`，从步骤链接进来时出现在 h1 上方和正文末尾）用同一套样式；v2.2 的黑色主按钮、手机吸底底栏和底栏预留空白都删掉了（连同 `--bar-button-height`、`--mobile-bar-height`、`--option-no-size` 令牌）。导航数据和 `route-enhance` 的改写挂载点不变。
- **首页**（V05 现状 + 2026-10-22 调整，`index.astro`、design §4.4）：VuePress 首页。没有顶栏和侧边栏，首屏内容居中：中文两行版 logo 是 h1（`aria-label` 同时给出中文站名和英文副标题，`Logo.astro` 的 `zh` 默认标题）、logo 右下方一行放小形象、一句话（`--text-muted`）、紫色主按钮“从第 00 章开始 →”和 QQ 群入口的紧凑版（一行小字，`GroupInvite` 的 `compact`）。一条 1px 细线下是五章简介：桌面五栏一行、平板三栏、手机一栏；每栏是章名（h2，链到这一章第一页）和 `route.yaml` 的 `summary`，不列具体页面、不写“第几章”。页脚居中（`BaseLayout` 的 `footerCentered`）。一句话写在页面里，构建时核对它（去掉加粗后）原样出现在 `principle/overview.md` 正文里（ADR-0005、design V14）。v2.2 的眉题、小字信息行、“先看整体思路”、桌面章级索引和固定字形章节号都去掉。
- **选择页**（V04 样式、V10 数据，FR-12、FR-72）：`ChoiceCards.astro` 由页面 frontmatter 的 `options` 生成细边框卡片（1px `--border`、6px 圆角、内边距 16px 20px、手机 14px 16px、间距 12px，悬停边框 `--control-border`），排在正文末尾；每张卡片是 `section.option-block`，第一个链接带 `data-option-start` 并用伪元素撑满整块，`data-recommended` 标路线图的 default；“推荐”“当前选择”的标记和交互沿用（`route-enhance.ts` 只标 `aria-current` 和 `.option-current`）。容器 `id="下一步"` 是旧手机页的兜底落点。`option-blocks.ts` 已随 V10 删除。
- **跳转页** `MovedPage`（V09 现状，ADR-0006、design §4.6）：单段旧标识由 `[page].astro` 的 `getStaticPaths` 生成，`faq/<id>` 这类多段参考页路径由 `[...moved].astro` 生成（旧网址不能和页面标识或现有参考页重叠，M2 和 site.ts 校验）。按分叉点选择分流的条目（`choice`）把各选项的地址写在 `<script type="application/json" id="moved-data">` 里，`src/lib/moved.ts` 的内联脚本读 M4 的选择换成对应分支。跳转页用 `BaseLayout noindex` + `SiteHeader` + `main.page`，没有侧边栏：`<head>` 里内联一行脚本 `location.replace()`（不留历史记录），再加 `<meta http-equiv="refresh" content="5; url=…">`、`<link rel="canonical">`（指向目标页、不带小节）；正文是 h1“这一页已经并入《目标页》”、一段“正在跳转到…”、链接“打开《目标页 › 小节》→”。锚点固定用原理版（`site.ts` 的 `buildMovedPages` 用 `sectionAnchor()` 算好），所以脚本和 meta refresh 都指向同一个地址；没有 JS 的读者先看到说明和链接，5 秒后由 meta refresh 自动前往（AC-33 要求看得到说明，所以刷新不能是 0 秒）。没有 `section` 的条目（如 `appendix`）直接跳到目标页顶部；`section: 下一步` 是选择页末尾选项卡片的锚点（`ChoiceCards` 的 `id`，不是正文标题），只允许指向路线图里的选择页。`BASE_PATH` 由 `withBase()` 拼进脚本和 meta refresh（R-6）。
- **找不到页**（V05 现状，`404.astro`、design §4.6）：v3 顶栏 + 正文栏（`main.page`，宽同正文栏并居中），没有侧边栏；大号固定字形 `404`、h1、主按钮“回到首页”和次按钮“打开目录”，目录直接写在页面上。`NumeralSprite` 只在这一页内联（design §3.2、§9）。

### 13.4 小节锚点（M1 + M3，ADR-0006）

- **现状（V07，2026-10-22）**：页面固定原理视图、只有一版正文（用户 2026-10-22 决定去掉视图切换，见 §13.12），所以不再需要“按视图选锚点”。下面写的是单版本的规则；操作版、`op-` 前缀和切视图的旧做法在 V10 删除，本节的其余部分以本节为准。
- **id**：就是正文标题的 github-slugger slug（`#<slug>`，重复的加 `-1`、`-2`），和页面上的 `id` 相同。合并页每个小节的 h2 文字就是原页面标题（FR-03）。
- **数据**（`link-index.ts`）：`IndexedPage.headings` 是 `{ slug, text }[]`，一页一份，按正文顺序；`text` 去掉 `**`、行内代码和链接等行内记号，`slug` 与渲染后的标题 id 一致。
- **解析**（`src/lib/section-anchor.ts`、`remark-obsidian.ts`，V07 现状）：
  - `sectionAnchor(headings, text)`：先按标题文字精确匹配，再按 `normalizeSectionText()`（NFKC、小写、合并空白）匹配；只有唯一命中才返回 slug，重复标题或找不到返回 `undefined`。
  - `resolveSectionAnchor()` 在标题文字之外也接受已经写好的 slug，供链接片段使用。
  - `remark-obsidian.ts` 用它解析 `[[页面#小标题]]`，并在同一页出现 `[文字](#小标题)` 时把片段换成 `#<slug>`；目标不存在或片段只有 `#` 时构建失败（FR-05“校验”）。操作版不再渲染（V10 删除），同页链接不校验；`#main` 这类布局自带的落点原样交给浏览器。
  - V09 的 `moved:` 条目用同一个 `sectionAnchor()` 校验并算出跳转锚点（`site.ts` 的 `buildMovedPages`）：`section` 找不到唯一的小标题时构建失败并指出 `route.yaml`；跳转页的锚点固定这一版正文。唯一的例外是 `section: 下一步`：它指向选择页末尾由 `ChoiceCards` 输出的选项卡片容器（`id="下一步"`），`resolveMovedTarget` 只在目标页是路线图里的选择页时接受；其他页写这个 section 仍然构建失败。V11 的旧手机页兜底用它。V08 打开搜索结果直接改 `location.href`，由下面的页面脚本负责滚动。
- **页面脚本** `src/scripts/section-hash.ts`（V07 现状）：`PageLayout`、`ReferenceLayout` 加载时初始化，页面加载和 `hashchange` 时解码 `location.hash`，在正文容器 `.prose` 里找对应 id，找到就 `scrollIntoView()`；初始化放在其它页面脚本之后，补一次滚动以免布局变化把原生锚点带偏。`#main` 这类不是小节的地址不处理，交给浏览器原生跳转。没有 JS 时浏览器原生锚点照常工作。

### 13.5 合并的执行（不再执行，2026-10-22）

作者 2026-10-22 直接交来按章合并好的 `docs/v3-rewrite/`（11 个文件、单版本），V10 起站点只按“一页 = 一个文件”导入，不再执行机械合并，也不再维护 `scripts/merge-rewrite.mjs`。本节保留为历史：当时计划的“合并前后命令/外链/截图多重集比较”由 V10 的 `compare-migration.mjs` 对照新稿承接，11 页的旧网址去向由 V11 的 `moved:` 承接。

### 13.6 数据流：读者打开旧网址（AC-33，V11 现状）

1. 构建：`loadSite()` 读 `route.yaml`，M2 校验 `moved:`（旧网址是页面标识、`faq/<id>` 或旧 `faq` 目录路径，不是保留路径或现有页面；`to` 是路线图里的页面、不是另一个旧网址即不串联；`choice.fork` 是路线图里的分叉点且选项键和它一致）；`site.ts` 再用 M1 的 headings 核对每个去向的 `section` 并算出锚点（`下一步` 单独指向选择页的选项卡片）；`[page].astro` 为单段旧网址、`[...moved].astro` 为多段旧参考页路径生成跳转页。
2. 读者打开 `/plan1-buy-server/`：`<head>` 内联脚本 `location.replace('/plan1/#购买海外-vps')`，不留历史记录。带 `choice` 的条目（`register-gmail` 等 6 条手机旧页）脚本先读 M4 的选择，落到 iPhone/安卓分支的地址；没有存过、读不到或选项已失效时落到 `client-desktop#下一步`（选项卡片）。
3. 目标页加载：`route-enhance` 把所属选项写进 M4（FR-17）；`section-hash` 找到小节并滚动；侧边栏展开当前章，合并页下列出小节。
4. 禁用 JS：先看到“这一页已经并入《…》”和链接，5 秒后 meta refresh 自动前往同一个地址（先看到说明是 AC-33 的要求，所以延迟不是 0 秒）。旧 `/faq/` 跳到 `maintenance` 页顶，8 条 `faq/<id>` 跳到对应 h3。

V11 的 `moved:` 共 47 条：37 条旧页面（含 6 条 `choice`）、`plan1-free-isp`、8 条旧常见问题路径和 `faq` 目录；`/ip-tests/` 和 6 篇实测保留原网址，不写 `moved:`。

### 13.7 目录结构增量（V11 后现状）

```
src/
├── lib/search/                 M6：index.ts（buildSearchIndex、search）+ index.test.ts（V06 现状）
├── pages/search-index.json.ts  M6 的静态端点（V06 现状）
├── lib/section-anchor.ts       小节标题 → slug（V07 现状）
├── scripts/search.ts           搜索框（V08 现状）
├── scripts/section-hash.ts     小节锚点落点（V07 现状）
├── components/SiteSearch.astro 顶栏搜索（V08 现状）
├── lib/moved.ts               跳转页按 M4 的选择分流的内联脚本（V09 现状）+ moved.test.ts
└── components/MovedPage.astro  跳转页正文（V09 现状，由 [page].astro、[...moved].astro 使用）
scripts/compare-migration.mjs    对照 docs/v3-rewrite/ 和产物（V10 现状）
tests/e2e/ac-26-…ac-33-*.spec.ts
tests/fixtures/moved-*/         跳转表的坏内容用例（V09 现状：目标不存在、小节不存在、旧标识被复用、串联、choice 缺 fallback / 分叉点不存在 / 选项不一致、参考页路径不合法）
```

已删除（V01、V05、V09）：`astro.config.mjs` 的 `redirects`、`route-map.ts` 的 `REMOVED_PAGES`、`route.yaml` 的 `intro` 及其核对、页头色带和章节标题卡相关组件与样式。

### 13.8 验收对应的验证方式（需求 v0.9 §8）

| 验收 | 验证方式 |
| --- | --- |
| AC-26 | Playwright（1280）：顶栏元素顺序、细线、没有 `.page-band` 一类色带元素；`tokens.test.ts` 核对紫色令牌和对比度 |
| AC-27 | Playwright（768、1280，另在用例里设 719 宽）：`<details open>` 只有第 1 章；点章名展开；当前页的小标题列表（固定原理视图只有一份）；719 宽没有侧边栏、“目录”打开抽屉；参考页子页的小节列在上级下面 |
| AC-28 | `src/lib/search/index.test.ts`（规范化、排序、锚点选择、上限 10 条、“没有找到”）；`tests/e2e/ac-28-search.spec.ts`（V08 现状）：键盘和鼠标打开结果、打开小标题结果后由 `section-hash` 滚动到小节（固定原理视图，不切视图）、`page.on('request')` 断言只下载一次索引且没有站外请求、没有带查询文字的请求、输入法组字不搜索；360 下先点图标才有输入框、无横向滚动；`ac-15-base-path.spec.ts` 在 `/sub/` 下核对索引和结果地址 |
| AC-29 | Playwright：首页 hero 元素、五章目录、没有侧边栏 |
| AC-30 | Playwright：翻页文字链接、没有主按钮、“跳过”结果同 AC-05；360 下两个链接 `boundingBox().height ≥ 44` |
| AC-32 | `compare-migration.mjs` 对照 `docs/v3-rewrite/` 的 11 个文件和产物（命令、链接、截图、说明图、正文）+ Playwright 看侧边栏小节；人工抽查记进 migration-checklist |
| AC-33 | Playwright：无痕上下文逐条打开 `moved:` 的 47 条旧网址，断言落到目标页和小节（页尾附近的小节只要求落在视口里）；`page.addInitScript` 预置 iPhone/安卓，逐条核对 6 条 `choice` 的两个分支，未预置时落到 `client-desktop#下一步`；`javaScriptEnabled: false` 的上下文断言“已经并入”和链接、点击可到目标页；构建级用例（`tests/build/ac-33-moved-dist.test.ts`，用 `SITE_URL` 构建）断言 sitemap 和 `search-index.json` 里没有旧标识、跳转页带 noindex/canonical/meta refresh；`tests/fixtures/moved-*` 断言坏跳转表让构建失败；带小节时落到 `#<slug>` 的规则由 `site.test.ts`、`MovedPage.test.ts` 覆盖；`moved-choice` 夹具在构建级用例里核对 `choice` 的去向 JSON、多段 `faq/<id>` 跳转页和 sitemap/索引过滤；`src/lib/moved.test.ts` 用假的 storage 跑内联脚本；V11 的 `ac-33-moved.spec.ts` 全量核对落点 |
| AC-31 | 全部 e2e、axe、键盘、对比度在三种宽度重跑；断言只因选择器、文案或页面被合并而改，不删检查项 |

### 13.9 待定事项（v3）

| 编号 | 事项 | 影响 | 阻塞？ |
| --- | --- | --- | --- |
| Q-17 | 360px 顶栏放不放得下（需求遗留） | 已试排：design §4.0 预算约 320px，放得下；实现后由 e2e 核对 | 否 |
| Q-18 | 合并清单、合并页标题和新标识 | `route.yaml`、`moved:`、ADR-0006 末尾的表、提到被合并页面的 AC | **已决**（作者 2026-10-22 交来 11 页并确认页面地图；V10/V11 已落地） |
| A-05 | 小节只在原理版时，从操作视图跳过去会切到原理视图并写进本机（ADR-0006） | — | 已作废：V01 起页面固定原理视图、没有视图切换（§13.12） |
| A-06 | 首页首屏一句话的构建核对是否保留 | 已定保留（design V14） | 否 |

### 13.10 建议的实施顺序（交给 project-plan）

1. ~~design.md v3（含 Q-17 试排）~~ 已完成（2026-10-21）。
2. M3 骨架：顶栏、两栏布局、侧边栏 `<details>` 和小标题列表、翻页、首页、选择页卡片、删除 v2.2 色带和标题卡（可拆成两三个 Issue）。
3. M6 搜索（依赖 2 的顶栏挂载点；`src/lib/search/` 可以和 2 并行）。
4. 跳转和锚点机制：`moved:` 段及校验、`MovedPage`、`section-hash`、双链的视图锚点、sitemap 过滤（用 `plan1-free-isp` 和测试路线图验证，不等 Q-18）。
5. ~~`merge-rewrite.mjs`~~：作者直接交来合并稿，V10 改为导入。
6. Q-18 定后：按清单合并、导入、改路线图和跳转表、同步 Writing 和大肥鱼。
7. v3 整体验收（AC-26–AC-33、AC-31 回归），版本升到 3.0.0。

### 13.12 用户决定：去掉视图切换、改成昼夜切换（2026-10-22，V01 已实施）

用户在 V01 实施时决定：顶栏原来放“操作｜原理”视图切换的位置换成**昼夜（浅色/深色）主题切换**，视图切换的 UI 去掉，**页面固定原理视图**。以此为准，取代本节 13.3“顶栏”里的 `ViewToggle`、design §3.1 的“不提供手动切换”和 §4.3。

- **主题**（现状）：`src/lib/theme.ts`（`THEME_KEY`、`THEME_BOOT_SCRIPT`、`effectiveTheme`/`nextTheme` 纯函数）、`src/components/ThemeToggle.astro`（44×44 图标按钮，可访问名称“深色模式”，`aria-pressed` = 当前是深色，构建时 `hidden`）、`src/scripts/theme-toggle.ts`。`BaseLayout` 的 `<head>` 里内联 `THEME_BOOT_SCRIPT`，所有页面（含首页）首次绘制前按存过的选择写 `data-theme`；没存过时没有 `data-theme`，跟随系统。`tokens.css` 的深色令牌写两块：`:root[data-theme='dark']` 和 `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`，`tokens.test.ts` 核对两块一致。只存这一个 localStorage 键，和 M4 无关。
- **固定原理视图**（现状）：`[page].astro` 只渲染唯一的正文，构建时导航按 `view(id, {}, 'principle')`；`PageLayout` 不再有 `operation` slot、`notice` 和 `data-body`；`VIEW_BOOT_SCRIPT` 固定写 `data-view="principle"`（只作“页面脚本会运行”的标记，PageLayout 按它先隐藏眉题步数）；`route-enhance`、`toc` 的视图固定为 `principle`，`VIEW_CHANGED_EVENT` 删除；`ViewToggle.astro`、`view-toggle.ts` 删除。V10 已删除 `operation/`、`principleOnly` 的页面数据和 `option-blocks.ts`；M2/M4 的 `view` 字段暂时保留，没人写，也不再影响输出。
- **对后续任务的影响**（用户 2026-10-22 确认，实施计划开头有汇总）：13.4 的 `section-hash` 不再需要“切视图”，双链和搜索结果的锚点可以只取原理版 id（V07、V08 的“先切视图再滚动”部分可以去掉）；R-2（`initViewToggle` 返回 `setView`）作废；R-7 的“按 M4 视图选锚点”改为固定原理版；13.3 的侧边栏小节列表只需一份（原理版的 h2）。

### 13.11 v3 实施前评审（2026-10-21）

范围：需求 v0.9（FR-05、FR-16、FR-18、FR-24、FR-25、FR-72、AC-26–AC-33）对照本节 13.1–13.10、design v3 和 ADR-0006，再对照 v2.2 代码（`PageLayout.astro`、`Toc.astro`、`view-toggle.ts`、`[page].astro`、`route-map.ts`、`astro.config.mjs`、`tests/e2e/`）。这是文档评审，没有运行验证。**结论：通过，没有阻塞项**；以下几条已在本节或实施计划里落实：

| # | 发现 | 影响 | 处理 |
| --- | --- | --- | --- |
| R-1 | 侧边栏要列当前页两版的 h2（FR-16），但 `[page].astro` 只取 `render()` 的 `Content`，`PageLayout`/`Toc` 没有标题数据 | V02 无从下手 | 接口：`[page].astro` 把两版 `render()` 的 `headings`（depth 2）传给 `PageLayout` 的新参数 `sections: { principle: Heading[]; operation?: Heading[] }`，再传给 `Toc`；参考页只有 `principle` |
| R-2 | `section-hash` 要切视图但不能像按钮那样滚回顶部；`view-toggle.ts` 现在没有导出切换函数 | V08 需要改 view-toggle 的接口 | **作废**（§13.12：去掉视图切换，页面固定原理视图，V07 的 `section-hash` 只滚动） |
| R-3 | `tests/e2e/ac-02-chapter-card.spec.ts` 专测 v2.2 的页头色带和章首页一组，v3 按 FR-72 去掉这部分 | 按 AC-31“不删检查项”会误以为不能删 | 这是需求删掉的功能，不是放宽断言：V01 把这个文件换成 AC-26 的断言（找不到色带和章首页一组、眉题和 h1 仍在），在提交说明里写明对应 FR-72 |
| R-4 | 手机吸底翻页栏取消（design V11），`ac-16-responsive`、`a11y` 里有按底栏高度预留空白和 44px 按钮的断言 | 断言会失败 | V04 按 AC-30 改成“翻页链接可点区域 ≥44px”，同样是功能变化，写明 |
| R-5 | `Toc` 把 `TocNav` 写两份（侧边栏 + 抽屉），v3 的 `<details>` 和小节列表也会写两份 | 只是体积，不影响 id（列表里只有链接） | 沿用 v2.2 做法，不改 |
| R-6 | 跳转页的 `location.replace` 目标和 meta refresh 都要带 `BASE_PATH`；AC-15 现有 `plan1-free-isp` 的子路径用例依赖 Astro `redirects` 的输出 | 换实现后子路径可能失效 | V09 用 `withBase()` 生成两处地址，AC-15 的子路径用例保留并改为断言新跳转页 |
| R-7 | 搜索框也在参考页和找不到页的顶栏里（FR-24“首页以外每页”），这些页面没有视图切换 | `search.ts` 取不到当前视图 | **改为固定原理版**（§13.12）：V08 不读 M4 视图，打开结果直接改地址，由 `section-hash` 滚动 |
| R-8 | 合并后，AC-03/04/05/08/09/30 的用例里有会被合并的页面 | Q-18 定后才知道改哪些 | V11 按 AC-31 的规则改成合并页及其小节，在提交说明里逐条列出 |
| R-9 | “合并页和被合并页面属于同一选项”（ADR-0006 的前提）删页后无法由构建校验 | 本机选择可能丢 | V11 的手工核对清单逐条比对 `route.yaml` 改前改后；AC-33 的 e2e 断言跳转后 `choices` 写入了对应选项 |
| R-10 | `merge-rewrite.mjs` 要和 `import-rewrite.mjs` 识别同一种手写页脚 | 两套规则会漂移 | 先把页脚识别抽成两者共用的模块（V10 的第一步，先重构） |

模块依赖方向、M2 纯函数接口、M4 都不变；M6 的接口（13.2）和 ADR-0006 的锚点规则足够让 V06–V09 分开实现。
