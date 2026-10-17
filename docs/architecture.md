# 架构：Re:从零开始订阅 claude

- 状态：**v2.0 定稿（2026-10-15）**，对应需求 v0.3（目标站点版本 2.0.0），没有阻塞决策；待定事项见 §10。上一版 v0.1（2026-10-13）对应已交付的 1.0.0，其中仍然有效的实现细节保留在各节里，标“1.0.0 已有”。
- 输入：[术语](../CONTEXT.md)、[需求 v0.3](requirements.md)、[复用调研](reuse-research.md)、[界面设计契约](design.md)、[重写稿](rewrite/)
- 决策记录：[ADR-0001 Astro 静态站 + 自建路线图](adr/0001-astro-static-site-with-own-route-map.md)、[ADR-0002 URL 规则](adr/0002-url-scheme.md)（v2.0 修订）、[ADR-0003 原理块](adr/0003-principle-content-as-why-callouts.md)（已被取代）、[ADR-0004 整页视图切换](adr/0004-whole-page-view-switch.md)、[ADR-0005 重写稿原样导入、双链按标题解析](adr/0005-import-rewrite-verbatim.md)
- 现状：v2 骨架已建立（#23 内容集合，#25 路线图和静态页面，2026-10-15），#26 接上了导航改写、整页视图切换和 M4 v2（2026-10-16），1.0.0 的内容、页面和依赖旧路线的脚本已删除。本文 §3–§8 描述 v2.0 的目标结构；没有实现的部分标“计划”，由 [实施计划](implementation-plan.md) 的 v2.0 任务建立，建立后改成现状。
- v2.1（2026-10-16）：页面按 design v2.1 改造，模块和依赖方向不变，差距和任务见 [§11.4](#114-v21-实施前评审2026-10-16)；对应条目在任务完成后改成现状。

## 0. v2.0 增量影响分析

需求 §0 的改动落到各模块上。“保留”指 1.0.0 的代码和测试可以沿用，“改动”指接口或数据形状变化，“重做”指按新设计重写。

| 模块 | 影响 | v2.0 改动 | 保留 |
| --- | --- | --- | --- |
| M1 内容 | 改动（大） | 内容目录改成 `principle/`、`operation/`、`reference/` 三个集合，两版同名文件合成一个页面（§3 M1）；正文从重写稿**原样导入**，双链按中文标题解析（[ADR-0005](adr/0005-import-rewrite-verbatim.md)）；新增：去掉手写页脚、`TODO：` 段落转成“作者待补”、锚点校验、博客外链映射、选择页的选项块、操作版正文的标题 id 加前缀；去掉 `[!why]`、`placeholder`、`choices/`、`faq/`、`pages/` | Markdown 管线（unified + 自研 remark 插件）、嵌入图片进 Astro 图片处理、`contentValidation` 在 `astro:build:start` 失败的机制、SmartyPants 关闭、`deferRender`、星号检查 |
| M2 路线 | 改动 | 去掉默认路线：未选的分叉点让相邻页指向选择页；导航按视图计算，操作视图绕过原理独有步骤；选择页、旁支页和步骤共用 `/<id>/` 标识空间；旁支页（`returnTo`）；最后一页的下一步是首页；路线枚举 6 种选择 × 2 种视图 | 纯函数、构建和浏览器共用一份代码、`RouteData` 序列化、`branch` 段与共享步骤、汇合校验、无环校验、目录 outline |
| M3 页面 | 重做 | 全部页面按新 [design.md](design.md) 重做；两版正文同页输出，CSS 整页切换（[ADR-0004](adr/0004-whole-page-view-switch.md)）；新增 logo 组件、页眉、参考页（常见问题一页 + 实测）；去掉完成页、“继续上次”、已读 ✓、清除进度 | 渐进增强（构建时写好导航、脚本按本机选择改写）、视频门面、代码复制与看大图、目录抽屉外壳、参考页的 `?from=` 返回 |
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
 docs/rewrite/ ─▶ import-rewrite ─▶ src/content/ ─▶ M1 内容 ──▶ M2 路线 ──▶ M3 页面 ──▶ dist/*.html ──▶ 页面脚本
 （重写稿）       （开发脚本，手动跑）  principle/     │  └ Obsidian 插件       │ RouteData JSON ────────┘   │   │
                                     operation/    │                        M2（同一份代码） M4
                                     reference/    └─────── M5 构建：校验失败就终止 ───────┘
```

依赖只朝一个方向：M1 ← M2 ← M3；M4 不依赖其他模块，只被 M3 的页面脚本调用。M2 是纯函数，构建时和浏览器里用同一份代码（1.0.0 已有）。导入脚本只写 `src/content/`，不被任何模块引用。

### M1 内容（`src/content/`、`src/content.config.ts`、`src/lib/content/`）

**职责**：定义内容文件的格式；加载并校验元数据；把重写稿的 Obsidian 写法转换成 HTML。

**内容文件**（#23 建立；1.0.0 的 `steps/`、`choices/`、`faq/`、`pages/` 和页面已在 #25 删除）

| 路径 | 内容 | 元数据 |
| --- | --- | --- |
| `src/content/route.yaml` | **路线图**：章节、分叉点、各选项的页面顺序、旁支页（见下文） | 由 M2 校验 |
| `src/content/principle/<id>.md` | 一个页面的原理版：步骤、选择页、旁支页各一份。正文第一行是 `# <标题>`，与重写稿文件名相同 | frontmatter（Zod `strictObject`，都可省）：`principleOnly`（默认 false，原理独有步骤）、`skippable`（默认 false）、`skipLabel`（可选，默认“跳过”）、`video: { bilibili?, youtube? }`（可选）；选择页另有必填的 `options: { <option-id>: { title, heading } }` |
| `src/content/operation/<id>.md` | 同一页面的操作版，文件名与原理版相同 | 不写 frontmatter |
| `src/content/reference/faq.md`、`ip-tests.md`、`ip-tests/<id>.md` | 参考页：常见问题（一页，条目是二级标题）、IP 质量实测合集、各篇实测；只有原理版 | 不写 frontmatter |
| `src/content/blog-links.yaml` | 指向博客其他文章的双链目标（如 `04技术/自建梯子：VPS + 3x-ui + VLESS Reality`）→ 博客 URL；地址待作者提供时写 `null`（Q-11） | 由 M1 校验 |
| `src/assets/screenshots/` | 截图（从重写稿的 `附件/` 导入，只导入被引用的） | — |
| `src/assets/diagrams/` | 说明图 SVG（从重写稿的 `附件/` 导入，附件里的是原稿，变了就覆盖；#39） | — |

- **标题**：页面标题取正文第一行的 `# <标题>`（导入时原样保留），渲染时从正文里去掉，由布局输出 `<h1>`。两版的标题必须相同（FR-03）；全站标题（原理版和参考页）不能重复，因为双链按标题解析。缺少第一行标题、两版标题不同、标题重复都让构建失败。
- **原理独有步骤**：`principleOnly: true` 且没有操作版文件。写了 `principleOnly: true` 却有操作版文件 → 构建失败；没写却缺操作版 → 按 FR-21 处理（操作视图显示原理版正文并提示“操作版还在写”），构建结束列进内容提示，不阻止构建。
- **选择页的选项块**（FR-12）：`options` 的 `heading` 是正文里独占一段的加粗文字原文（如 `方案一：普通服务器 + 白嫖ISP（我用的）`、`iPhone`）。插件在两版正文里各找到这一段，把它到后面第一个列表（含）为止的内容包成 `<section data-option="<option-id>">`，加粗段落变成块标题；遇到“独占一段的加粗文字 / 分隔线 / 标题 / 正文结尾”时提前结束。“到第一个列表为止”是 #29 加的：选择手机系统末尾的“两条路走完，都接着注册 Gmail”是两个选项共用的话，不能进“安卓”块，否则点它会把选择记成安卓。块内第一个站内链接是这个选项的第一步，M3 用它做整块的点击区域。找不到 `heading`、块内没有站内链接、第一个链接不是该选项在路线图里的第一步（两种视图各核对一次）都让构建失败。`title`（如“方案一”）用于目录的“或”分组。
  - 现状（#29）：`src/lib/content/option-blocks.ts`，在 remark-obsidian 转完双链之后调用。依赖方向的例外：核对第一步要用 M2 的纯函数 `buildRouteMap`（只在这里，读 `route.yaml`；M2 不引用 M1，不成环），因为“第一步”的定义就在 M2。输出 `<section class="option-block" data-option>`，块标题是 `p.option-title`，块内第一个站内链接带 `data-option-start`。“该选项的第一步”取 M2 的 `view(选择页, {分叉点: 选项}, 视图).next`，和选择页的“下一步”是同一个定义；原理版按原理视图核对，操作版按操作视图核对，没有操作版时原理版两种视图都核对。路线图本身有错时只包块、不核对（错误由 `loadSite()` 报出）。

**route.yaml 格式**（#25 建立）：章节、分叉点和旁支页的唯一来源。页面文件不重复写所属章节和选项。

```yaml
chapters:
  - id: start
    title: 开始
    intro: 每一步我都会努力去讲清楚为什么要这么做，……   # 可选：章节标题卡下的一句话（#36）
    items: [preface, disclaimer, overview, clean-up]
  - id: node-and-ip
    title: 准备节点和住宅 IP
    items:
      - choose: node-plan          # 分叉点 F1
        page: choose-plan          # 选择页的标识，也是 URL /choose-plan/
      - branch: node-plan
        options:
          plan-1: [plan1-free-isp, plan1-buy-server, plan1-make-node, plan1-buy-isp, plan1-panel]
          plan-2: [plan2-residential-server]
          plan-3: [plan3-residential-node]
      - import-proxy               # F1 的汇合点
      - check-ip
      - recap                      # 原理独有（principleOnly），操作视图绕过
      - leak-protection
      - timezone
  - id: register-and-subscribe
    title: 注册和订阅
    items:
      - { choose: phone, page: choose-phone }
      - branch: phone
        options:
          iphone: [iphone-app-store-austria, iphone-proxy, iphone-gmail]
          android: [android-proxy, android-google-play, android-gmail]
      - register-gmail             # F2 第一段的汇合点
      - chrome-sign-in
      - use-two-days
      - google-region
      - register-claude
      - subscribe
      - branch: phone              # 同一分叉点的第二段，没有选择页
        options:
          iphone: [iphone-why-us-apple-id, iphone-apple-id, iphone-app-store-login, iphone-gift-card, iphone-subscribe, iphone-purchase-failed]
          android: [android-subscribe]
      - after-subscribe
  - id: ending
    title: 结尾
    items: [thanks, afterword]
side:                              # 旁支页：不在序列里
  google-appeal: { returnTo: use-two-days }
```

标识用需求 §5.2 的初稿，导入任务可以微调，v2.0 发布后锁定（ADR-0002）。

**Obsidian 写法**（自研插件 `src/lib/content/remark-obsidian.ts`，1.0.0 已有，v2.0 改动见表）：

| 写法 | 转换结果 | 找不到目标时 |
| --- | --- | --- |
| `[[标题]]`、`[[标题\|文字]]` | 按标题找到页面，链接到 `/<id>/`；不写文字时用标题。**v2.0 改动**：1.0.0 按标识解析 | 构建失败，报出文件和行号 |
| `[[标题#小标题]]` | 链接到 `/<id>/#<slug>`，slug 用 `github-slugger`；**v2.0 新增**：校验目标页有这个小标题 | 同上 |
| 指向参考页的双链（`[[常见问题#…]]`、`[[IP 质量实测合集]]`、`[[实测：…]]`） | 从步骤页链出时自动加 `?from=<当前页标识>`（FR-20），锚点放在查询串之后 | 同上 |
| `[[如何订阅claude]]`、`[[如何订阅claude（纯操作版）]]`（重写稿的目录页） | 首页 `/` | — |
| `[[04技术/…]]` | 查 `blog-links.yaml`：有地址时是外链；`null` 时只输出链接文字，构建结束列进内容提示（Q-11） | 表里没有这一项 → 构建失败 |
| `![[文件名\|宽度]]`、`![[文件名]]` | 图片，可以点开看大图（1.0.0 已有） | 构建失败 |
| 正文末尾“分隔线 + `上一步：`/`下一步：`/`回到：` 开头的一段” | 去掉（FR-04：页脚由路线图生成）。**v2.0 新增** | — |
| 以 `TODO：` 开头的段落 | `<aside class="author-todo">`，文字原样，前面加“作者待补”标签（FR-21）。**v2.0 新增** | — |
| `> [!note]`、`> [!caution]` | 两种视图都显示的提示框（1.0.0 已有）；`[!why]` 从白名单删掉，出现即报错 | — |

- **链接索引**：`createLinkIndex(contentRoot)` 同步扫描三个集合的文件，取每个文件第一行（frontmatter 之后第一个非空行）的标题和全部小标题的 slug（跳过代码块），生成 `pages`（每个文件一项：集合、标识、标题、小标题集合、`principleOnly`）和 `titles`（标题 → 页面，只收原理版和参考页），外加截图文件名和 `blogLinks`。`checkPages(index)` 报出页面之间的问题：缺第一行标题、标题重复、两版标题不同、操作版没有同名原理版、原理独有步骤却有操作版、`blog-links.yaml` 形状不对。仍然不依赖内容集合的渲染顺序（1.0.0 已有）。参考页的标识带子目录（`ip-tests/decodo`），URL 统一是 `/<id>/`。
- **内容提示的接口**：插件通过 `onHints` 交出 `ContentHint`（`author-todo`、`blog-link`，带所在页面）；`validateContent()` 返回 `{ problems, hints }`，另外补上 `missing-operation`；`contentValidation` 在 `astro:build:done` 用 `formatHints()` 打印（M5）。
- **标题 id**：同一 HTML 里有两版正文（ADR-0004），操作版正文的标题 id 加前缀 `op-`（`rehype-operation-ids.ts` 按文件路径判断，按 Astro 同样的 github-slugger 规则先写好 id），避免重复 id；`[[标题#小标题]]` 指向原理版的 id。
- **只有一套规则**（#25 删除了 1.0.0 按标识解析的模式和 `[!why]`）：不属于三个集合的文件（只在单元测试里出现）照样按标题解析双链，只是不去标题和页脚、不记内容提示。
- **表格可聚焦**（#25）：`rehype-scrollable-tables.ts` 给每张表加 `tabindex="0"`，窄屏上横向滚动的表格能用键盘滚动（axe 的 scrollable-region-focusable；同 Shiki 给 `<pre>` 的做法）。
- **截图图版**（#37，§11.4 W-4，现状）：`rehype-figures.ts` 把独占一行的截图（`img[data-zoom]`）包成 `<figure class="plate" data-figure="n">`，编号 `<figcaption class="plate-no">图 <span data-figure-step></span>n</figcaption>` 放在截图前面；每篇正文单独编号，所以两版各自从 1 起。截图所在的段落从截图处拆开（前后的文字仍是段落，空段落丢掉），列表项里的截图留在这一项里；只在根和能放块级内容的容器（列表项、引用、表格单元格等）里包，标题、加粗、链接里的图片和与文字同一行的行内图片不是图版，不编号；先包完再按文档顺序编号。步骤号前缀（`02-`）由 `figurePrefix(stepMark(...))`（`src/lib/nav-text.ts`）算：数得清时是“步骤号-”，数不清、选择页、旁支页为空；`PageLayout` 构建时用 `fillFigureSteps()` 按操作视图写进两版正文（没有 JS 时就是它），`route-enhance` 的 `renderProgress` 按当前视图和选择改写所有 `[data-figure-step]`，算完前和页边栏编号一样先不显示。参考页不填，只有序号。样式在 `prose.css`：图片 1px `--border`、4px 圆角，图版上下 24px；<1100px 编号用 `order` 排到截图下方；≥1100px `.prose` 作定位容器，编号绝对定位到页边栏（横向按 `.prose`，列表缩进不影响；竖向不写 `top`，取原位置，所以和截图顶边齐平），`[!caution]` 用 `::before` 在同一位置写“注意”（`--caution-rule`，替代文字为空，不重复读）。参考页同样悬挂在正文左侧（design §4.7 把参考页列在编号规则里；§4.6 的“没有页边栏编号”指步骤编号）。已知限制：选项块自己是定位容器，块里的截图编号会对不上竖线，选择页现在没有截图。
- **说明图**（#39，§11.4 W-7，现状）：design §4.7 的单色线稿。作者在重写稿原理版里写 `![[说明图-页面标题.svg]]`，SVG 放在 `附件/`，导入脚本复制到 `src/assets/diagrams/`（链接索引的 `diagrams`/`diagramsDir`）；不另加 frontmatter 字段，也不用新 ADR（ADR-0005 的“原样导入”不变）。`remark-obsidian` 遇到 `.svg` 嵌入就读文件、用 `parseDiagram()`（`src/lib/content/diagram.ts`）检查后原样内联：输出 mdast `html` 节点并带 `hName: 'svg'`，hast 里就是一个 `svg[data-diagram]` 元素（`role="img"`、`aria-label` 取 `<title>`，宽高写成 viewBox 的宽高），`rehype-figures` 把它和截图一样包成图版（多一个 `diagram` 类），一起编号。检查是白名单：只放行 `title`、`desc`、`g`、基本形状、`text`/`tspan` 和画线稿用得到的属性，颜色只能是 `currentColor`/`none`，没有脚本、样式、外部资源、渐变滤镜、`transform` 和 id（内联后和页面共用样式和 id）；属性必须写成 `名字="值"`（没加引号、没有值的写法报错，不能绕过白名单），标签以外不能有 `<`；画法按 §4.7 固定：只有文字和包文字的 `<g>` 能 `fill="currentColor"`，`stroke-width` 只能 1.5，`font-size` 只能 14，`class` 只能 `accent`；根元素只写 `xmlns`、`viewBox`，viewBox 宽度不超过 328（手机正文栏）；必须有 `<title>`。不合格、找不到、写了宽度都按 FR-61 报错让构建失败。样式在 `prose.css`：图按 1:1 显示、`max-width: 100%`，`color: var(--text)`，`.accent` 里的用 `--accent`，`text` 用 `--font-sans`、`--fs-meta`（14px），图版上下 32px、没有边框；不进看大图（不是 `img[data-zoom]`）。
- **1.0.0 已有、继续生效**：管线配置的唯一来源 `markdownPipeline()`；`contentValidation` 集成在 `astro:build:start` 用同一条管线重新处理全部源文件并在失败时终止构建；集合 `deferRender: true`；关闭 SmartyPants；嵌入的宽度、文件名字符和 1x/2x `srcset` 规则；解析后残留 `**` 报错；Shiki 默认开启且不引用外部资源；内容文件名必须是以字母开头的英文 kebab-case。

**导入脚本**（`scripts/import-rewrite.mjs`，#23 建立，[ADR-0005](adr/0005-import-rewrite-verbatim.md)；页面标识表和截图核对记录在 [migration-checklist.md](migration-checklist.md) 的 v2 节）：

- `node scripts/import-rewrite.mjs [重写稿目录，默认 docs/rewrite]`。按标题匹配：读 `src/content/principle/*.md` 和 `reference/**/*.md` 的第一行标题，与重写稿 `原理版/<标题>.md` 对应（参考页也按标题，不用固定文件名，新增实测页的做法与新增步骤相同）。操作版跟随原理版：重写稿有 `操作版/<标题>.md` 时写入 `operation/<同一标识>.md`，缺的直接新建（操作版没有元数据，标识由原理版决定，不算“新页面”）。重写稿文件带 frontmatter（Obsidian 属性）时去掉并报告。
- 对已匹配的页面，**保留目标文件的 frontmatter，正文整段替换成重写稿原文**（只把 Windows 换行统一成 `\n`）；把被引用、但 `src/assets/screenshots/` 里还没有的图片从 `附件/` 复制过去；嵌入的 `.svg`（说明图）复制到 `src/assets/diagrams/`，内容变了也覆盖（附件里的是原稿，不需要打码）。
- 重写稿里有、站内没有的页面（新页面）只列出来，不自动建文件：新页面要先手建 `principle/<id>.md`（frontmatter + `# 标题`），再在 `route.yaml` 里放好位置，然后重跑脚本。站内有、重写稿里没有的页面同样列出来，由作者决定是否删除。
- 脚本不改 `route.yaml`，也不判断截图有没有打码；结束时提醒“新复制的截图要逐张核对打码”（三级边界 Never）。

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

实现补充（#25）：`RouteData` 是 `{ chapters, pages, forks: { <分叉点>: { page, options } }, side: { <旁支页>: <returnTo> } }`（#36 起章节写了 `intro` 时 `chapters[i].intro` 带上它）；旁支页的 `current` 是 `{ kind: 'side' }`；`outline` 的 `onRoute` 在分叉点没选时对它的各选项都为真，操作视图下原理独有步骤为假。测试用路线图在 `src/lib/route/fixtures/sample-route.ts`，真实 `route.yaml` 的边界用例在 `src/lib/site.test.ts`。

**规则**（构建时校验，任何一条不满足就失败，FR-61）：

- **一个标识空间**：`principle/` 下的每个文件在 `route.yaml` 里恰好出现一次——普通项、某个选择页（`page`）、某个 `branch` 段里的一个或几个选项（共享步骤，1.0.0 已有），或 `side` 下的旁支页；反过来，路线图引用的页面必须有原理版文件。保留字：`faq`、`ip-tests`、`404`、`_astro`。
- **选择页**：`choose` 的 `page` 必须有 `options`，且和 `branch` 的选项一一对应、顺序一致；`branch` 引用的分叉点前面必须已经有它的 `choose`（1.0.0 已有）。
- **视图**：操作视图的序列去掉 `principleOnly` 的页面。每个选项在两种视图下都至少有一页。原理独有步骤在操作视图下被直接打开时，按原理视图的序列计算它自己的导航（它不在操作序列里），页面再按 FR-30 提示。
- **未选**（替代 1.0.0 的默认路线）：分叉点没有生效的选择时，它的每个 `branch` 段在序列里都折叠成“指向选择页”：段前一页的“下一步”和段后一页的“上一步”都指向该分叉点的选择页（FR-13：`import-proxy` 的上一步是 `choose-plan`，`subscribe` 的下一步是 `choose-phone`）。选择页自己的“下一步”在未选时为 `null`，已选时是所选选项在当前视图下的第一页。
- **生效的选择**：本机保存的选择 ← 当前页所属选项（打开只属于一个分支的页面时按它计算，FR-17）；共享步骤属于多个选项时，本机已选的在其中就沿用，否则取第一个（1.0.0 的“默认选项”一环去掉）。
- **汇合**：同一分叉点的最后一段 `branch` 之后必须有所有选项共用的页（1.0.0 已有）。
- **旁支页**：`returnTo` 必须是序列里的普通页；旁支页的 `returnTo` 是那一页，`next` 是那一页在当前路线和视图下的“下一步”，`prev` 为 `null`（FR-19）。
- **首页**：第一页（前言）的上一步、最后一页（后记）的下一步都是 `{ kind: 'home' }`（FR-11）。
- **可跳过**：`skipTo` 沿当前路线和视图，跳过从当前页开始连续的可跳过步骤，取其后的第一项（可以跨章节，FR-15）。
- **进度**：步骤在当前路线和视图的本章序列里才有 `index/total`；本章序列里有折叠的未选分支段、或当前页是选择页、旁支页、不在当前视图序列里的原理独有步骤时，只有章节名（FR-10）。
- **枚举**：3 × 2 种选择组合 × 2 种视图共 12 条序列，每条都要从 `preface` 走到 `afterword`，不重复经过同一页（无环）。
- **章节的一句话**（#36，§11.4 W-3）：`intro` 可选；写了就必须是非空字符串（M2 校验形状），并且原样出现在这一章第一项（普通页或选择页）的原理版正文里，第一项是分支段的章节不能写。M2 不读正文，这一条由 `assembleRoute()`（`src/lib/site.ts`）在 `buildRouteMap` 之后核对，错误照样是 `RouteValidationError`、写明 `route.yaml`（ADR-0005：标题卡的一句话不另写，`tests/fixtures/intro-not-in-body`）。
- **目录 outline**：沿用 1.0.0 的结构（章节 → 普通项 / 选择页 / “或”分组），每一项新增 `principleOnly`；去掉 `placeholder`；`current` 只在一处为真（共享步骤规则 1.0.0 已有）。

### M3 页面（`src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`、`src/scripts/`）

**职责**：把内容和路线渲染成页面；实现 [design.md](design.md) v2.0 的全部页面和组件。

| 页面 | URL | 文件（#25 建立） |
| --- | --- | --- |
| 首页：首屏（logo、站名、英文副标题、“从第 00 章开始”、桌面章级索引）、按章目录 | `/` | `src/pages/index.astro` |
| 步骤页、选择页、旁支页 | `/<id>/` | `src/pages/[page].astro` + `PageLayout` |
| 常见问题 | `/faq/` | `src/pages/faq/index.astro` + `ReferenceLayout` |
| IP 质量实测合集 / 各篇实测 | `/ip-tests/`、`/ip-tests/<id>/` | `src/pages/ip-tests/index.astro`、`[test].astro` |
| 找不到 | `404.html` | `src/pages/404.astro` |

已删除（#25）：`[step].astro`、`choose/[fork].astro`、`done.astro`、`faq/[faq].astro`、`StepLayout`、`ChoiceOption`、`PlaceholderNotice`，以及依赖旧路线的页面脚本 `home.ts`、`done.ts`、`route-enhance.ts`、`toc.ts`、`view-toggle.ts`、`faq-return.ts`、`reader-store.ts`（#26、#27、#30 参照 `v1.0.0` 标签重写；`route-enhance.ts`、`view-toggle.ts`、`reader-store.ts` 已由 #26 重写，`faq-return.ts` 已由 #27 重写为 `reference-return.ts`，`toc.ts` 已由 #30 重写）。

- **#25 的静态骨架（现状）**：`PageLayout` 输出两版正文，只有原理版时在正文上方输出提示条 `.view-notice`；`ReferenceLayout` 的页脚见下文“参考页的返回”；首页和找不到页把 `TocNav` 直接写在页面上；步骤页的目录侧栏只在 ≥1100px 显示，抽屉的打开按钮在目录脚本接上前保持隐藏（#34 起取消侧栏，见下面的“目录”）。
- **#26 的交互（现状）**：`PageLayout` 内嵌 `RouteData`（`<script type="application/json" id="route-data">`，`<` 转义），页眉右侧渲染 `ViewToggle`（#31 起由 `SiteHeader` 输出，见下面的“页眉”），加载 `view-toggle` 和 `route-enhance`，路线数据由 `readRouteData(document)` 解析一次，两者共用 `src/scripts/reader-store.ts` 的 `pageReaderStore(data)`（一页一个 store，内存兜底时彼此可见；页面脚本的 `reader-store.ts` 和 M4 的 `lib/reader-state/reader-store.ts` 同名沿用 1.0.0，前者只做页面装配）。`StepNav` 总是写出“下一步”的链接，没有目标时带 `hidden`、不写地址，选择页在本机选过之后由脚本显示；脚本跑完给 `<main>` 加 `data-route-ready`。选择页的选项块（#29）和目录（#30）派发 `reader-choices-changed` 即可让导航重算。选项块的交互（#29，现状）也写在 `route-enhance.ts` 里：选择页上监听 document 的点击，点到 `.option-block` 里的同源链接时先写 `choices` 再派发事件，跳转照常进行；重算时给本机保存的块加 `aria-current="true"` 和“当前选择”标签（`span.option-current`），样式在 `prose.css`。

- **构建时**（1.0.0 已有，改接口）：页面调用 `loadSite()`（`src/lib/site.ts`），它读取三个集合和 `route.yaml`，经纯函数 `assembleRoute()` 映射成 `PageMeta[]` 后调用 `buildRouteMap`，一次构建内缓存。每页用 `view(id, {}, 'operation')` 把导航写进 HTML——没有 JS 时，读者看到的就是“操作视图 + 未选”的导航：未选的分叉点处指向选择页，选择页的选项块是普通链接，进入分支后按所属选项计算。唯一的折返在“订阅”：它的“下一步”指向“选择手机系统”，静态页面上的选项链接只能进入手机的第一段，所以没有 JS 的读者要用“订阅”正文里的链接进入订阅分支（正文原本就列出了两条路的每一步）。这是降级体验，不是验收路径；“禁用存储”（AC-18）时脚本仍运行，靠 M4 的 `window.name` 兜底记住选择。
- **两版正文**（[ADR-0004](adr/0004-whole-page-view-switch.md)）：`PageLayout` 把原理版和操作版的正文都渲染进 HTML，分别包在 `<div data-body="principle">`、`<div data-body="operation">` 里；`<html data-view>` 决定显示哪一个，另一个 `display: none`（屏幕阅读器和页内查找都跳过它，`loading="lazy"` 的图片也不加载）。原理独有步骤和缺操作版的页面只输出原理版，操作视图下在正文上方显示提示（FR-21、FR-30）。参考页只有一份正文，没有视图切换。
- **视图**（1.0.0 已有机制，改为整页）：`<head>` 里的内联脚本 `VIEW_BOOT_SCRIPT` 在首次绘制前设置 `data-view`，取不到时用 `operation`。切换控件 `ViewToggle` 在页眉；`src/scripts/view-toggle.ts` 改 `data-view`、写 M4、滚回页面顶部（FR-30），派发 `reader-view-changed`。没有 JS 时切换控件隐藏，固定操作视图。删除 1.0.0 的“为什么：… · 在原理视图中查看”提示行和“这一步没有额外原理”。
- **导航改写**（1.0.0 已有 `route-enhance.ts`，改动）：读 M4 的 `choices` 和 `view`，调用 `routeMapFromData(data).view(at, stored, view)`，改写上一步/下一步/跳过/回到的链接与目标标题和进度；收到 `reader-view-changed` 或 `reader-choices-changed` 时重算。打开只属于一个分支的页面时，把它所属的选项写进 `choices`（FR-17，纯函数 `openPatch()` 只剩这一项）。选择页：本机保存的选项块标“当前选择”和 `aria-current`，点块内任何站内链接都先写 `choices` 再跳转；**不标默认**。
- **目录**（1.0.0 已有 `Toc`/`TocNav`/`toc.ts`，改动）：去掉已读 ✓ 和“清除进度”；原理独有步骤标“原理”，在操作视图下弱化；参考页在末尾单列“卡住了再看”。首页的目录用同一个 `TocNav`（首页变体：不吸顶、不折叠，每章带锚点 `#chapter-<章节标识>`）。
  实现（#30，现状）：`TocNav` 章名前写 `00`–`03` 章节号，末尾单列 `site.tocReferences`（`loadSite()` 按常见问题、IP 质量实测合集的顺序给出标题，由页面经 `PageLayout`/`Toc` 的参数传入，`TocNav` 自己不读内容），当前项是 `aria-current="page"`。`Toc` 输出侧栏和空的抽屉 `<dialog data-toc-dialog>`（#34 起取消侧栏，见下）。页面脚本 `src/scripts/toc.ts` 在 `route-enhance` 之后运行（它先记下当前页所属选项），按本机选择和当前视图调用 `outline(stored, at, mode)` 改写标记：`data-off-route`（其他选项的步骤、操作视图下的原理独有步骤）、“其他路线”（只按分支判断，原理独有步骤只弱化不标）、`data-selected`、“切换”按钮和当前项；“切换”写入 `choices` 并派发 `reader-choices-changed`，收到选择或视图变化时重画；跑完给 `<nav>` 加 `data-toc-ready`。
  v2.1（#34，现状）：所有宽度都是抽屉，不常驻（design §4.5、D5）。`Toc` 只输出 `<dialog data-toc-dialog>`，`<nav>` 构建时就写在里面，不再在侧栏和抽屉之间移动；`PageLayout` 去掉 `.step-shell` 两栏网格。手机全屏，≥720px 贴左边宽 400px。页眉的“目录”构建时是 `<a href="…/#home-chapters" data-toc-open>`，没有 JS 也能到首页的完整目录（FR-16，§11.4 W-5）；`toc.ts` 把它换成同样属性（去掉 href）的 `<button aria-haspopup="dialog">`，Esc、点遮罩、点“关闭”都关，关闭后 `<dialog>` 把焦点还给按钮。过渡（design §5）选 CSS 方案：`toc.css` 用 `@starting-style` 做滑入 200ms 和遮罩淡入，关闭时 `display`/`overlay` 加 `transition-behavior: allow-discrete` 推迟移出顶层，做 150ms 滑出，脚本照常 `close()`，Esc 也有过渡；不支持的浏览器直接开关。看大图同样用 `@starting-style` 淡入 150ms，关闭直接消失。时长取 `tokens.css` 的令牌，减少动态效果时归零。章节号换成固定字形 `Numeral`（读屏“第 n 章”）：目录 20px，首页 28px。首页和找不到页的目录是静态的，按 `outline({}, null, 'principle')` 画（没有视图，全部正常显示，不弱化），不跑脚本。参考页不放抽屉，“打开目录”仍链到首页目录。
- **首页（#38，现状）**：`src/pages/index.astro`，按 design §4.4（D2）。首屏没有页眉：眉题、中文 logo（h1）、一句话、小字信息行（章节数取 `route.data.chapters.length`）、“从第 00 章开始”（`site.start`）和“先看整体思路”；一句话写在页面里，构建时核对它（去掉加粗后）原样出现在 `principle/overview.md` 正文里，不出现就构建失败。≥1100px 是 12 栏网格，右侧四行章级索引（`Numeral` 32px）链到 `TocNav` 首页变体的 `#chapter-<章节标识>`，平板和手机不显示。首屏只有 logo 的“Re”和主按钮用 `--accent`：“先看整体思路”、索引和首页目录的章节号都用 `--text`。
- **页眉（#31，现状）**：`src/components/SiteHeader.astro`，首页以外的页面都有（design §4.0）。参数 `views`（显示 `ViewToggle`，视图色带跟 `<html data-view>` 走：操作 `--text`、原理 `--accent`）和 `toc`（显示“目录”：构建时是链到首页目录的 `[data-toc-open]` 链接，所有宽度都有，`toc.ts` 换成打开抽屉的按钮，#34）；`PageLayout` 传两者，`ReferenceLayout` 和找不到页都不传（色带 `--border`）。眉题的章节号、章节标题卡由 `PageLayout` 按 `view.progress.chapterNo` 和 `routeData.chapters` 的第一项算出，`[data-route-progress]` 仍只放进度文字，页面脚本照旧改写它（#35 起改为读屏文字，见下面的“步骤编号”）。章节号的文字统一由 `lib/nav-text.ts` 的 `chapterNoText()` 给出。
- **步骤编号（#35，现状）**：design §4.1、§4.2、§4.6、D3。`lib/nav-text.ts` 给出构建时和页面脚本共用的四个函数：`stepMark(progress, current)`（普通页“本章第几步”补足两位和“共 m 步”；数不清时短横 `–`；选择页“选择”、旁支页“旁支”），`stepMarkHtml(mark)`（编号用 `numeralSvg`，带 `data-step-no` 原文），`eyebrowTotal()`（平板和手机眉题里的“ · 共 m 步”），`progressText()`（读屏文字“准备节点和住宅 IP，第 2 步，共 5 步”；数不清和选择页只有章节名，旁支页“<章> · 旁支”）。`PageLayout` 的眉题分成看得见的部分（`aria-hidden`：章节号用系统字体、章节名、`[data-route-total]`）和 `visually-hidden` 的 `[data-route-progress]`；h1 和 `[data-route-mark]`（`aria-hidden`）包在 `.step-heading` 里：<1100px 是 flex，编号在 h1 前、`--fs-title`、`--text-muted`、按第一行基线对齐，不显示“共 m 步”和选择/旁支二字；≥1100px 是两栏网格（`--margin-width` 96px + `--space-6`），用负外边距挂到正文栏左侧，编号 `--fs-margin-numeral`、`--text`、右对齐，`align-items: last baseline` 和 h1 最后一行基线对齐，“共 m 步”绝对定位在编号下方。`route-enhance` 的 `renderProgress(slots, view)` 在每次重算导航时改写这三个挂载点（切换视图、改选分叉点后编号跟着变）。
- **logo**：`src/assets/logo/` 放转曲后的 SVG（中文版、英文版、“Re:”标记），**只由 `src/components/Logo.astro` 引用**（`?raw` 内联，颜色用 `currentColor` 和设计令牌，深浅主题自动适配）；换 logo 只改这一处（需求 Q-15）。favicon 是 `public/favicon.svg`（SVG 内用 `prefers-color-scheme` 切换配色），由 `BaseLayout` 的 `<link rel="icon">` 引用。“Re”的颜色取 `--logo-re`（SVG 里的回退值是浅色的 `#5B3FA0`），`tokens.css` 在 `:root` 设 `--logo-re: var(--accent)`，深色模式下换成浅紫（#31 接入）。四个 SVG 都由 `scripts/build-logo.mjs` 生成，版式参数（字号、错落、间距）写在脚本里。
- **章节标题卡（#36，现状）**：design §4.1、§5、D6，替换 v2.0 的 `.chapter-intro`。只在 `isChapterStart()` 为真的页面（每章第一页，含选择页），放在眉题上方：`ChapterSubtitle`（`--text-muted`，对读屏隐藏）、`.chapter-card-heading`（`Numeral` 章节号，`--fs-display`、`--accent`，读屏“第 n 章”；章名 `--fs-chapter-title` 800）、`.chapter-card-intro`（`routeData.chapters` 里这一章的 `intro`，`--text-muted`、最宽 24em，没写就不输出）、一条 1px `--text` 下边线。<720px 章节号在章名上方；≥720px 并排，`align-items: last baseline` 底边对齐；≥1100px 卡片用负外边距把线延伸到页边栏，`.chapter-card-heading` 和 `.step-heading` 一样是两栏网格，章节号 `justify-self: end` 右缘对齐页边栏右缘（比页边栏宽时向左伸出）。留白按 §4.1（上方 96/48px 扣掉 `.step` 的 32px 顶部内边距）。没有入场动画。v2.0 的 `--font-numeral`、`--fs-numeral` 随之删除。
- **编号字形（#32，现状）**：design §3.2 D7 的固定字形编号。`scripts/build-logo.mjs` 按字形名取 Cormorant Garamond 500 的等高数字 `zero.lf`…`nine.lf` 和 `endash`（§11.4 W-1），输出 `src/assets/numerals/symbols.svg`（`<symbol id="numeral-0">`…`numeral-9`、`numeral-dash`，字体单位 1000/em，共用一个竖向范围）和 `metrics.json`（`top`、`height`、各字宽）；另输出四条章节副标题 `chapter-00.svg`…`chapter-03.svg`（Roboto Condensed 700，13px 原大，字距 0.3em，两端 24px 短横）。接口（§11.4 W-2）：`BaseLayout` 每页内联一份 `NumeralSprite`（隐藏、`aria-hidden`）；纯函数 `numeralSvg(text, label, className?)`（`src/lib/numeral.ts`）用 `<use>` 按字宽拼出数字串，外层 `role="img"` + `aria-label`，`fill="currentColor"`，高 `1em` = 数字高度（用 `font-size` 控制大小，例如找不到页的 `--fs-display` 64/80/96px），只接受 0–9 和 `–`；`Numeral.astro` 在构建时调用它，页面脚本改写编号时调用同一个函数，不重新转曲。`ChapterSubtitle.astro` 内联对应章节的副标题，`aria-hidden`，颜色由使用方给。已用在找不到页的大号 `404`、步骤编号（#35）、章节标题卡（#36）和首页章级索引（#38）。
- **参考页的返回**（1.0.0 已有 `faq-return`，泛化为 `reference-return`）：根据 `?from=<page-id>` 查到页面标题，显示“返回刚才的步骤：<标题>”；实测页另有“回到：IP 质量实测合集”；直接打开时显示“打开目录”。
  实现（#27，现状）：纯函数 `referenceReturn(search, pages)`（`src/lib/reference-return.ts`）只认 `RouteData.pages` 里的标识（步骤、选择页、旁支页），其他值当作直接打开；`ReferenceLayout` 内嵌“页面标识 → 标题”（`#reference-pages`），在标题上方和正文末尾写出隐藏的 `[data-reference-return]`，页面脚本 `src/scripts/reference-return.ts` 填好地址和标题后显示，并隐藏“打开目录”（`[data-reference-toc]`，页脚因此空了就整行隐藏），跑完给 `<main>` 加 `data-reference-ready`。“打开目录”是指向首页目录的链接 `/#home-chapters`，没有 JS 也能用；参考页不内嵌路线数据，不放目录抽屉（#30 保持链接）。
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
| 常见问题（条目用锚点） | `/faq/`、`/faq/#<slug>` |
| IP 质量实测合集 / 实测 | `/ip-tests/`、`/ip-tests/<id>/` |
| 找不到 | `404.html` |

从步骤链到参考页时带 `?from=<page-id>`，例如 `/faq/?from=plan3-residential-node#分流规则具体怎么写`。参数里只有公开的页面标识。

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
│   ├── content/                     route.yaml、principle/、operation/、reference/、blog-links.yaml
│   ├── assets/
│   │   ├── screenshots/             截图（经 Astro 图片处理）
│   │   ├── logo/                    转曲后的 logo SVG（只由 Logo.astro 引用）
│   │   └── numerals/                转曲后的编号字形和 CHAPTER 副标题（build-logo.mjs 生成）
│   ├── lib/
│   │   ├── content/                 M1：schemas、link-index、remark-obsidian、rehype-operation-ids、rehype-figures、markdown、integration（+ *.test.ts）
│   │   ├── route/                   M2：route-map、types（+ 测试和测试用路线图）
│   │   ├── reader-state/            M4：reader-store、view-boot（+ *.test.ts）
│   │   ├── nav-text.ts              导航文案，构建时和页面脚本共用
│   │   ├── reference-return.ts      参考页按 ?from= 找回步骤（#27 由 faq-return.ts 改名）
│   │   └── site.ts                  构建时装配 loadSite()、assembleRoute()
│   ├── scripts/                     页面脚本：route-enhance、view-toggle、toc、reference-return、code-zoom、video-facade
│   ├── layouts/                     BaseLayout、PageLayout（替换 StepLayout）、ReferenceLayout
│   ├── components/                  Logo、SiteHeader、ViewToggle、StepNav、Toc、TocNav、CodeCopy、ImageZoom、VideoFacade
│   ├── pages/                       index、[page]、faq/index、ip-tests/index、ip-tests/[test]、404
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
| Q-13 | 已解决（#23，2026-10-15）：`截图 2026-10-15 13-43-53 1.png` 由仓库根目录未打码的原图裁剪而成，只保留 Settings → Account 的“Log out of all devices”一行，作者确认采用 | — | 否 |
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
| W-8 | design §7 要求 768×1024 截图，`playwright.config.ts` 只有 360 和 1280 两个项目 | 平板档没有自动检查 | W02 起在用例里单独设 768 宽检查；W09 加平板项目 | 否 |
