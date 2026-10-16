# 实施计划：Re:从零开始订阅 claude

- 状态：**v2.1 计划（2026-10-16，作者同意）**，把代码从[设计 v2.0](design.md)（#31 的现状）改到设计 v2.1（2026-10-16 定稿，决定 D1–D11 见 design §8）。对应需求 v0.3 的 FR-10、FR-16、FR-18、FR-70、FR-71、NFR-01、NFR-03、NFR-06，[架构 §11.4 v2.1 实施前评审](architecture.md#114-v21-实施前评审2026-10-16)。v2.0 的任务（#23–#31）已全部关闭，计划保留在下文；1.0.0 的计划在文末。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，v2.1 的标题以 `[v2.1]` 开头（2026-10-16 发布，#32–#40；W 编号与 Issue 的对应见 §3）。**任务范围、状态和完成证据以 Issue 为准**，本文只保留里程碑、顺序和链接；§4 是发布时的正文草稿。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。
- 站点版本：2.0.0 还没有做整体验收。建议 v2.1 的任务全部完成后再交 project-delivery 一起验收，发布为 2.0.0（待作者确认）。

> **首个可开工任务：[#32 [v2.1] 生成编号字形并用在找不到页](https://github.com/Finderlzy/rezero-subscribe-claude/issues/32)**（W01，建议档位：强）。新开会话，用 `task-implement` 指定 #32。**[#33 令牌和控件反馈](https://github.com/Finderlzy/rezero-subscribe-claude/issues/33)（W02，标准）可以立即并行开工**（W01 改 `scripts/`、`src/assets/`、`src/components/`，W02 改 `src/styles/`，基本不重叠）。

## 1. 里程碑（v2.1）

| 里程碑 | 交付的可用能力 | 覆盖 | 任务 |
| --- | --- | --- | --- |
| **MS8 v2.1 基础** | 固定字形的编号能在页面上显示（先用在找不到页）；三档断点和字号令牌；按钮、链接的悬停和按下反馈，视图切换按下改墨色；目录在所有宽度下都是抽屉，没有 JS 时“目录”是链接 | design §3.2、§3.3、§4.0、§4.3、§4.5、§4.6（404）、§5；D5、D7、D8、D9、D11；FR-16、NFR-03 | W01、W02、W03 |
| **MS9 v2.1 页面** | 步骤页的页边栏和步骤编号；每章第一页的章节标题卡；截图编号；首页说明书封面 + 完整目录 | design §4.1、§4.2、§4.4、§4.6（旁支）、§4.7；D2、D3、D4、D6；FR-10、FR-18 | W04、W05、W06、W07 |
| **MS10 v2.1 验收** | 三种宽度、深浅两色的截图对照和可访问性检查；说明图（待细化） | design §4.7（说明图）、§6、§7；AC-16、AC-20、AC-21 | W08、W09 |

## 2. 依赖与顺序（v2.1）

```
W01（可立即开工）──┬────────────── W03 ──┬── W04 ──┬── W05 ──┐
W02（可立即开工）──┘                     │         └── W06 ──┤
                                        └── W07 ────────────┼── W09
                                            W08（待细化）────┘
```

- **立即可开工**：W01、W02，并行时各用独立 worktree。
- W03 依赖 W01（目录的章节号换成固定字形）和 W02（抽屉过渡用 W02 定的动效令牌）。W03 先拆掉常驻侧栏，W04 再在空出来的位置做页边栏，两者都改 `PageLayout`，所以串行。
- W04 之后 W05、W06 可以并行（W05 改章节标题卡，W06 改 M1 的图片输出和 `prose.css`），都会碰 `PageLayout` 的页边栏，后合并的一方变基。W07 只依赖 W03，可以和 W04–W06 并行。
- W05 还要等作者确认四章的“一句话”，W07 要等作者确认首页的一句话和小字信息行（§6）；没确认前可以先做其余部分，文案位置留空，不能自己编。
- W08 待细化：说明图的素材和放进页面的方式还没定（§6）。W09 最后做。

## 3. 任务索引（v2.1）

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 细化 | 设计章节 | Issue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W01 | 生成编号字形并用在找不到页 | MS8 | 无 | 强 | 已细化 | §3.2、§4.6、§5、§9 | [#32](https://github.com/Finderlzy/rezero-subscribe-claude/issues/32) |
| W02 | 按 v2.1 调整令牌、断点和控件反馈 | MS8 | 无 | 标准 | 已细化 | §3.1、§3.2、§3.3、§4.3、§4.7、§5 | [#33](https://github.com/Finderlzy/rezero-subscribe-claude/issues/33) |
| W03 | 目录只用抽屉，没有 JS 时链到首页目录 | MS8 | W01、W02 | 标准 | 已细化 | §4.0、§4.5、§5 | [#34](https://github.com/Finderlzy/rezero-subscribe-claude/issues/34) |
| W04 | 步骤页的页边栏和步骤编号 | MS9 | W03 | 强 | 已细化 | §3.2、§3.3、§4.1、§4.2、§4.6 | [#35](https://github.com/Finderlzy/rezero-subscribe-claude/issues/35) |
| W05 | 每章第一页的章节标题卡 | MS9 | W04、作者确认四章一句话 | 标准 | 已细化 | §3.2、§4.1、§4.2 | [#36](https://github.com/Finderlzy/rezero-subscribe-claude/issues/36) |
| W06 | 截图编号和页边注 | MS9 | W04 | 标准 | 已细化 | §4.1、§4.7 | [#37](https://github.com/Finderlzy/rezero-subscribe-claude/issues/37) |
| W07 | 首页说明书封面和完整目录 | MS9 | W03、作者确认首页文案 | 标准 | 已细化 | §3.2、§3.3、§4.4 | [#38](https://github.com/Finderlzy/rezero-subscribe-claude/issues/38) |
| W08 | 原理页的说明图 | MS10 | W04 | 标准 | 待细化 | §4.7、§9 | [#39](https://github.com/Finderlzy/rezero-subscribe-claude/issues/39) |
| W09 | 按设计 v2.1 做视觉验收 | MS10 | W05、W06、W07、W08 | 标准 | 已细化 | §6、§7 | [#40](https://github.com/Finderlzy/rezero-subscribe-claude/issues/40) |

## 4. 任务正文（v2.1，发布时的草稿，现以 Issue 为准）

公共约定（每个任务都适用）：改动按 design v2.1 的对应章节做，颜色、间距只用 `src/styles/tokens.css` 的令牌；代码注释里的 `design §x.y` 引用照旧有效（章节号和 v2.0 一致），说到版本处改成 v2.1；不放宽任何内容校验和断言；`npm run check`、`npm run test:e2e` 是每个任务的通用验收，下面只写各任务自己的。

### W01 生成编号字形并用在找不到页

**目标**：编号用和 logo“Re”同一种细衬线（Cormorant Garamond 500）的等高数字，事先转成图形，所有设备显示一样（design §3.2、D7；FR-70 的做法；NFR-03 不加载网页字体）。本任务做出字形和渲染组件，先用在找不到页的大号 `404`（design §4.6），后续任务直接复用。

**涉及范围**：`scripts/build-logo.mjs`（新增数字和短横、四条 `− CHAPTER 0n −` 副标题的输出）、`src/assets/numerals/`（新，生成物，不手改）、`src/components/Numeral.astro`（新）和 `ChapterSubtitle.astro`（新）及旁边的渲染测试、`src/pages/404.astro`、`AGENTS.md`（生成物清单加一项）、`docs/architecture.md` §3 M3（把“v2.1 计划”改成现状）。

**依赖**：可立即开工

**建议档位**：`强` — 要定一个构建时和浏览器脚本都能用的字形接口（W04 的步骤编号会在浏览器里按视图和选择改写），选错要返工后面三个任务。

**参照**：
- 字形：Cormorant Garamond 默认是旧式数字（`zero`），等高数字是字形名 `zero.lf`…`nine.lf`（2026-10-16 用 `.cache/fonts/CormorantGaramond.ttf` 核实过，GSUB 里也有 `lnum`），按字形名取，不要用 `charToGlyph`；短横用 `endash`；字重按 `build-logo.mjs` 的 `{ wght: 500 }` 变量轴。副标题用 Roboto Condensed 700，字距 `0.3em`，两端短横 24px（§4.1）。
- 接口：架构 §11.4 W-2 的推荐——每页内联一份 `<svg>` 里的 `<symbol id="numeral-0">`…，`Numeral.astro` 用 `<use>` 拼出数字串，外层 `role="img"` + `aria-label`（例如“第 2 步，共 5 步”“第 1 章”，§5），颜色用 `currentColor`，高度跟 `font-size` 走（`1em` 等于数字高度，具体比例在组件里定一次）；浏览器脚本拼同样的 `<use>`，不重新转曲。副标题是装饰，`aria-hidden="true"`。
- 已有写法：`Logo.astro` 用 `?raw` 内联 SVG、`Logo.test.ts` 的 Container API 测试。

**验收**：
- [ ] 测试：`npm test`——`Numeral` 的渲染测试覆盖 `00`、`404`、`–`、`aria-label`；`build-logo.mjs` 重跑两次输出相同
- [ ] 构建：`npm run build` 后 `dist/404.html` 里没有 `@font-face`、没有外部字体请求
- [ ] e2e：`tests/e2e/ac-18-not-found.spec.ts` 断言 404 的大号数字是 SVG 且读屏名称是“404”
- [ ] 手工验证：360 和 1280 宽打开找不到页 → `404` 是等高的细衬线数字（`0` 和 `4` 一样高），桌面 96px、手机 64px，`--text` 色，深色模式变浅

### W02 按 v2.1 调整令牌、断点和控件反馈

**目标**：把三档断点（手机 <720、平板 720–1099、桌面 ≥1100px）和 §3.2 的字号表写进令牌；补 §3.3 的间距 96 和平板 32px 边距；按 §5（D11）加悬停、按下的轻反馈和 `prefers-reduced-motion`；视图切换按下的一段改成 `--text` 底、`--bg` 字（§3.1 用紫规则、§4.3、D8）。

**涉及范围**：`src/styles/tokens.css`、`src/styles/tokens.test.ts`、`src/styles/base.css`、`src/styles/prose.css`（链接悬停）、`src/components/ViewToggle.astro`、`src/components/StepNav.astro`（按钮悬停、按下）、`src/layouts/PageLayout.astro` 和 `ReferenceLayout`/`base.css` 的 `.page` 边距。

**依赖**：可立即开工

**建议档位**：`标准` — 照表改令牌和样式，没有新接口。

**参照**：design §3.2 字号表（章节标题卡和页边编号的令牌先定义，W04、W05 才用）、§3.3、§4.3、§4.7 主按钮/次按钮/链接三行、§5 动效表；现有 `tokens.css` 的媒体查询写法。动效时长写成令牌（抽屉 200/150ms、看大图 150ms），W03 用。

**验收**：
- [ ] 测试：`npm test`——`tokens.test.ts` 增加 `--bg` / `--text`（视图切换按下的一段）的对比度
- [ ] e2e：`tests/e2e/ac-06-view-toggle.spec.ts` 断言按下的一段背景色等于 `--text`；`ac-16-responsive.spec.ts` 增加 768 宽：正文 18px、h1 30px，没有页面级横向滚动
- [ ] 手工验证：悬停主按钮 → 箭头右移 4px、颜色不变；悬停次按钮 → 边框变 `--text`；按下任意按钮 → 下移 1px；系统开启“减少动态效果”后以上位移都没有；步骤页首屏只有主按钮一个大块紫色

### W03 目录只用抽屉，没有 JS 时链到首页目录

**目标**：取消 ≥1100px 的常驻目录侧栏，所有宽度都从页眉的“目录”按钮打开抽屉（design §4.5、D5）；手机全屏，平板和桌面从左侧滑出宽 400px，滑入 200ms、关闭 150ms，遮罩同时淡入；看大图淡入 150ms（§5）。没有 JS 时“目录”按钮是指向首页完整目录的链接（§5，FR-16）。目录的章节号换成 W01 的固定字形（20px）。

**涉及范围**：`src/components/Toc.astro`、`TocNav.astro`、`SiteHeader.astro`、`src/scripts/toc.ts`（不再在侧栏和抽屉之间移动 `<nav>`）、`src/styles/toc.css`、`src/styles/code-zoom.css`（看大图淡入）、`src/layouts/PageLayout.astro`（去掉 `.step-shell` 两栏网格）、`tests/e2e/toc-helpers.ts`、`ac-04-change-route.spec.ts` 等用到侧栏的用例、`docs/architecture.md` §3 M3 的“目录”“页眉”两条。

**依赖**：依赖 W01、W02

**建议档位**：`标准` — 删一种布局，抽屉逻辑已有，只改打开方式和过渡。

**参照**：现有 `toc.ts` 的 `initDrawer`、`Toc.astro` 的标记契约（`data-toc-*` 不变）；参考页已有的“打开目录”链接 `/#home-chapters`（`ReferenceLayout.astro`）。没有 JS 时的写法：构建时输出 `<a href="…/#home-chapters" data-toc-open>`，脚本接管点击并加 `aria-haspopup="dialog"`；`dialog` 的关闭过渡用 `transition-behavior: allow-discrete` 或脚本延迟关闭，二选一写进架构。

**验收**：
- [ ] e2e：1280 宽步骤页没有常驻目录，点“目录”打开抽屉、Esc / 点遮罩 / 点“关闭”都能关，关闭后焦点回到按钮；`ac-04` 改为经抽屉操作后照旧通过
- [ ] e2e：`javaScriptEnabled: false` 时“目录”是链接，点击到达首页 `#home-chapters`
- [ ] 手工验证：360 宽抽屉全屏、768 和 1280 宽抽屉宽 400px 从左滑入；开启“减少动态效果”后没有滑动和淡入

### W04 步骤页的页边栏和步骤编号

**目标**：桌面（≥1100px）的步骤页按 design §3.3、§4.1 排版：正文栏（≤38em）居中，左侧悬挂 96px 页边栏、间隔 32px；页边栏顶端是步骤编号（固定字形 56px、`--text`），和 h1 底边对齐、右对齐到页边栏右边缘，下一行“共 m 步”；数不清第几步时显示短横 `–`、不写步数；选择页放“选择”、旁支页放“旁支”（§4.2、§4.6）。平板和手机没有页边栏，编号放在 h1 前（和 h1 同字号、`--text-muted`）。眉题按宽度变化：桌面 `— 01 准备节点和住宅 IP —`，平板和手机多“ · 共 m 步”；读屏读“准备节点和住宅 IP，第 2 步，共 5 步”。编号是本章进度（FR-10），切换视图、改选分叉点后由页面脚本重算。

**涉及范围**：`src/layouts/PageLayout.astro`、`src/lib/nav-text.ts` 和测试、`src/scripts/route-enhance.ts` 和测试（改写编号和“共 m 步”）、`src/layouts/PageLayout.test.ts`、`tests/e2e/ac-02-walk.spec.ts`、`ac-06-view-toggle.spec.ts`、`ac-09-unchosen.spec.ts`、`ac-19-side-page.spec.ts`。

**依赖**：依赖 W03

**建议档位**：`强` — 构建时和浏览器两处要写出一致的编号和读屏文字，还要处理三档宽度的对齐。

**参照**：`Progress`（`src/lib/route/types.ts`，`index`/`total` 缺省即“数不清”）、`progressText()`、`[data-route-progress]` 的改写方式；W01 的 `Numeral` 组件和浏览器端拼字形的函数。

**验收**：
- [ ] 测试：`npm test`——`nav-text` 覆盖“第 n 步，共 m 步”、数不清、选择页、旁支页四种文字；`route-enhance` 测试覆盖切换视图后编号变化
- [ ] e2e：1280 宽前言页编号为 `01`，操作视图“共 3 步”、切到原理视图变“共 4 步”（整体思路是原理独有步骤），编号底边和 h1 底边差 ≤2px；“清理旧账号和配置”操作视图 `03`、原理视图 `04`；未选方案时汇合点之后的页显示 `–`；选择页显示“选择”，旁支页显示“旁支”
- [ ] e2e：360 宽编号在 h1 前、眉题含“共 m 步”；没有页面级横向滚动（AC-16）
- [ ] 手工验证：1280 宽看三个页面，编号落在同一条竖线上，页面重心偏左、右侧留白

### W05 每章第一页的章节标题卡

**目标**：每章第一页（前言、选择方案、选择手机系统、致谢）顶部换成章节标题卡（design §4.1、D6）：英文副标题 `− CHAPTER 0n −`（固定字形）、章节号（固定字形、`--accent`）+ 章名（800），桌面和平板并排底边对齐、章节号右缘对齐页边栏右缘，手机上下排；一句话（`--text-muted`、最宽 24em）；一条横跨页边栏和正文栏的 1px `--text` 线；留白按 §4.1。没有入场动画。

**涉及范围**：`src/content/route.yaml`（章节加 `intro`）、`src/content.config.ts` 或路线图的 schema、`src/lib/route/`（`RouteDataChapter` 带上 `intro`）和测试、`src/layouts/PageLayout.astro`（替换现在的 `.chapter-intro`）、`tests/build/` 和 `tests/fixtures/`（一句话不在原文里时构建失败）、`docs/architecture.md` §3 M1/M2。

**依赖**：依赖 W04；四章的一句话由作者确认（§6）

**建议档位**：`标准` — 版式清楚，数据只加一个字段，校验照已有的写法。

**参照**：架构 §11.4 W-3：`intro` 写在 `route.yaml` 的章节上，构建时校验它是这一章第一页原理版正文里**原样出现**的一段文字，不是的话构建失败（守住 ADR-0005“不改正文”）；W01 的 `ChapterSubtitle`、`Numeral`；`isChapterStart()`。

**验收**：
- [ ] 测试：`npm test`——路线图解析带出 `intro`；`npm run test:build` 新增一例：`intro` 不在正文里 → 构建失败并报出 `route.yaml`
- [ ] e2e：四个章首页都有标题卡，章节号读屏为“第 n 章”，副标题对读屏隐藏；非章首页没有
- [ ] 手工验证：1280 宽“选择方案”的章节号是首屏唯一的大块紫色（主按钮不在首屏），章节号和章名底边对齐；360 宽章节号在章名上方

### W06 截图编号和页边注

**目标**：截图成为编号的图版（design §4.7、D4）：统一边框、圆角、上下 24px；编号“图 02-1”（本页步骤号-序号）——桌面标在页边栏、和截图顶边对齐，平板和手机写在截图下方作图注；选择页、旁支页、参考页只用序号“图 1”；步骤号数不清时也只用序号（架构 §11.4 W-4）。`[!caution]` 在桌面的页边栏同高处标“注意”（`--caution-rule`）。

**涉及范围**：`src/lib/content/remark-obsidian.ts`（或新的 rehype 插件，把截图包成带序号的 `<figure>`，两版正文各自编号）和测试、`src/styles/prose.css`、`src/layouts/ReferenceLayout.astro`、`src/scripts/route-enhance.ts`（编号里的步骤号随视图和选择改写）、`src/scripts/code-zoom.ts`（看大图照常可用）、`tests/e2e/nfr-02-copy-zoom.spec.ts`。

**依赖**：依赖 W04

**建议档位**：`标准` — 插件改动有现成的 `rehype-scrollable-tables.ts` 可照着写，编号前缀复用 W04 的改写。

**参照**：`rehype-scrollable-tables.ts`（包一层容器的写法）、`remark-obsidian.ts` 的 `data-zoom` 图片输出、`option-blocks.ts`（选择页里的截图仍不可点）。

**验收**：
- [ ] 测试：`npm test`——插件给两版正文分别从 1 编号，原文宽度（`|262`、`|600`）保留
- [ ] e2e：1280 宽有截图的步骤页，“图 nn-1”在页边栏、顶边和截图顶边差 ≤2px；360 宽在截图下方；常见问题里是“图 1”；点截图仍能看大图
- [ ] 手工验证：“清理旧账号和配置”的截图编号和步骤编号在同一条竖线上

### W07 首页说明书封面和完整目录

**目标**：首页按 design §4.4（D2）重做：顶部留白 96px（手机 32px）；眉题“一份照着做的说明书”；中文两行 logo 作 h1；一句话；小字信息行；主按钮“从第 00 章开始 →”（进前言）+ 文字链接“先看整体思路”。桌面 12 栏，右侧（第 9–12 栏）是四行章级索引（固定字形 32px），每行链到下方完整目录的对应章；平板和手机不显示索引。封面下一条 1px `--border` 线，上下各 64px，下面是完整目录（章节号固定字形 28px）。首页没有“继续上次”和已读标记（FR-18）。

**涉及范围**：`src/pages/index.astro`、`src/components/TocNav.astro`（首页变体：每章一个锚点、28px 章节号）、`src/styles/toc.css`、`tests/e2e/ac-01-home.spec.ts`、`docs/requirements.md` FR-18/AC-01 的按钮文字（“开始” → “从第 00 章开始”，作者在 design §8 一致性检查第 1 条已同意）。

**依赖**：依赖 W03；一句话和小字信息行由作者确认（§6）

**建议档位**：`标准` — 单页版式，组件都已有。

**参照**：design §4.4 的线框和五条留白；现有 `index.astro`；小字信息行里的章节数从 `site.route` 取，不写死；总步数之类会变的数字不写。

**验收**：
- [ ] e2e：`ac-01-home.spec.ts`——看到 logo、眉题、“从第 00 章开始”，点它进入前言；“先看整体思路”进入整体思路；1280 宽有四行章级索引，点“02”跳到下方目录的第 02 章；360 宽没有索引
- [ ] e2e：首页首屏只有主按钮和 logo 的“Re”是 `--accent`（取计算后的颜色）
- [ ] 手工验证：1280 宽封面左对齐、索引和主区顶部对齐；360 宽 logo 满宽、没有横向滚动

### W08 原理页的说明图（待细化）

**目标**：给“整体思路”“小结：从服务器到代理软件”“测 IP 质量”三页加单色线稿说明图（design §4.7、§9，作者 2026-10-16 确认这三页）。

**待细化**（开工前和作者定）：图由谁画（作者提供 SVG，还是 Agent 按 §4.7 画、作者确认）；图放进页面的方式——重写稿里没有这几张图，正文按 ADR-0005 原样导入，所以要么作者把图加进重写稿再导入，要么用 frontmatter 声明“在第 n 段后插图”，两者都要先在架构里定。“整体思路”正文里现有的字符画代码块和说明图是什么关系也要定（替换还是并存）。

**依赖**：依赖 W04（编号、页边栏）

**建议档位**：`标准`（细化时复核）

### W09 按设计 v2.1 做视觉验收

**目标**：按 design §7 对 v2.1 做一次整体检查并留证据，作为 2.0.0 整体验收的视觉部分（AC-16、AC-21，AC-20 的 logo 部分沿用 #24 的结论）。

**涉及范围**：`playwright.config.ts`（新增 768×1024 平板项目）、`tests/e2e/ac-16-responsive.spec.ts`、`tests/e2e/a11y.spec.ts`、`docs/delivery.md`（记录结果和待补项）。

**依赖**：依赖 W05、W06、W07、W08

**建议档位**：`标准` — 跑检查、对照清单、修小问题。

**参照**：design §6 拒绝清单、§7 验收方式。

**验收**：
- [ ] e2e：`npm run test:e2e` 在 360、768、1280 三种宽度都通过；axe 没有 serious 及以上问题；只用 Tab 走完 AC-02 一条路线的前五页
- [ ] 手工验证：360×800、768×1024、1280×800，浅色和深色，截首页、步骤页（两种视图，含章首页）、选择页（未选/已选）、旁支页、目录抽屉、常见问题、实测、找不到页，逐条对照 §4、§6；每屏只有一个大块紫色；编号落在同一条竖线上（截图是临时产物，不提交）
- [ ] 手工验证（需要作者的设备）：编号字形在 iPhone、安卓、Windows 上截图对比，必须一样

## 5. 检查点（v2.1）

**MS8 结束（W01–W03 合并后）**
- [ ] 找不到页的 `404` 在作者的手机上和电脑上看起来一样（D7 的第一次真机检查）
- [ ] 回看本计划：W04 的字形接口是否够用，W05–W07 的拆分是否仍然合适

**MS9 结束**：四章标题卡和首页文案都是作者确认过的原文；构建输出的内容提示没有新增项。

**全部完成**：交 project-delivery 做 2.0.0 整体验收（AC-01–21）。

## 6. 待作者确认（v2.1）

下面的候选都是从 `docs/rewrite/` 原样摘出的句子，没有改写；作者选一个、改原文，或者决定不放。

1. **首页 logo 下的一句话**（design §4.4，最宽 22em）：
   - A（整体思路）：“所以下面每一步，其实都在做同一件事：让每一项信息都不露出‘我在国内’，而且像一个普通用户。”（可去掉开头“所以”）
   - B（后记）：“这篇文章只是一个普通人的经验记录，而不是标准答案。”
   - C（前言，原理版）：“每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。”
2. **首页小字信息行**（design §4.4，从内容取，不写会变的数字）。可用的事实和出处：
   - “4 章”（`route.yaml`，按章节数算）；
   - 成本（前言）：“我用的方案一，服务器每月 4.5 美元，另外还有 claude 本身的订阅费。”
   - 设备（选择手机系统）：“Gmail 是在手机上注册的。后面订阅也是在手机上的 claude app 里完成的。”导入代理软件一页分电脑和手机两部分。
   - 候选拼法：“4 章 · 需要一台电脑和一部手机” / “4 章 · 方案一每月约 4.5 美元，另加 claude 订阅费”。这两种都是把原文的事实缩写成短语，不是原句，需要作者认可这种写法。
3. **四章标题卡下的一句话**（design §4.1，最宽 24em，W05 校验它在这一章第一页正文里原样出现）：
   - 00 开始（前言）：“每一步我都会努力去讲清楚为什么要这么做……”同上 C；或“文中没写的情况，我不一定可以给出答案，请见谅。”
   - 01 准备节点和住宅 IP（选择方案）：“三个方案的目的都一样：让 claude 看到一个静态住宅 IP，而且只有你自己在用。”
   - 02 注册和订阅（选择手机系统）：“所以手机也是 claude 会看到的一台设备。”
   - 03 结尾（致谢）：“也感谢所有我没能记住名字、但确实帮到我的人。”
   - 注意：00 章的候选取自前言**原理版**；操作版前言里没有这句。标题卡两种视图一样，只校验原理版。
   - **已定（作者 2026-10-16，#36）**：四章都按推荐，00 章用前言原理版的整句“每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。”，01–03 用上面的候选；写在 `route.yaml` 各章的 `intro`。
4. **说明图**（W08）：谁画、怎么放进页面。
5. **版本**：v2.1 是否并入 2.0.0 一起验收发布（本计划的建议）。

---

## 附：v2.0 实施计划（2026-10-15，历史）

- 状态：v2.0 计划（2026-10-15），对应需求 v0.3、[架构 v2.0](architecture.md)（含 [§11.3 v2.0 实施前评审](architecture.md#113-v20-实施前评审2026-10-15)）、[设计 v2.0](design.md)，目标站点版本 2.0.0。任务 #23–#31 已全部关闭。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，v2.0 的标题以 `[v2.0]` 开头（2026-10-15 发布，#23–#31；V 编号与 Issue 的对应见 §3）。

### 1. 里程碑

| 里程碑 | 交付的可用能力 | 覆盖需求 | 任务 |
| --- | --- | --- | --- |
| **MS5 v2 静态骨架** | 重写稿全部 50 页导入；站点换成 v2 路线图和 URL，不运行 JS 也能从首页走到后记；两版正文都在页面里（固定操作视图）；1.0.0 的页面、内容和过时的测试删干净 | FR-01–04、FR-10、FR-11、FR-13、FR-17、FR-19（静态）、FR-21、FR-41、FR-60、FR-61；AC-07、08、09、12、14、15、17、18（找不到页） | V01、V02 |
| **MS6 v2 交互** | 按本机选择和视图改写导航；整页视图切换；选择页选项块；目录与首页；参考页返回；迁移核对 | FR-12、FR-14–16、FR-18、FR-20、FR-30、FR-31、FR-50；AC-01–06、10、11、13、18、19 | V03–V06、V09 |
| **MS7 v2 视觉与 logo** | logo 和 favicon；全部页面按设计 v2.0 重做 | FR-70、FR-71、NFR-01、NFR-06；AC-16、20、21 | V07、V08 |

全部完成后交给 project-delivery 做 2.0.0 整体验收（AC-01–21），版本号在那时定为 `2.0.0`。

### 2. 依赖与顺序

```
V01 ── V02 ──┬── V03 ──┬── V04 ──┐
             │         └── V05 ──┤
             ├── V06 ────────────┼── V08
             └── V09             │
V07（可立即开工）─────────────────┘
```

- **立即可开工**：V01、V07。两者并行时各用独立 worktree；都会改 `package.json` / `.gitignore`，后合并的一方解决冲突。
- V01 是 expand（新集合与 1.0.0 内容并存，1.0.0 站点照常构建），V02 是 contract（换路线和页面，删掉 1.0.0 的内容、页面和测试）。之后 `main` 上只有 v2。
- V02 之后可以并行：V03、V06、V09。V04、V05 都改 `route-enhance` 周边，排在 V03 之后，二者之间按“先合并的先来”，后者变基。
- V08 最后做：要等页面结构（V03–V06）和 logo（V07）都定型。

### 3. 任务索引

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 细化 | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| V01 | 把重写稿导入 v2 内容集合 | MS5 | 无 | 强 | 已细化 | [#23](https://github.com/Finderlzy/rezero-subscribe-claude/issues/23) |
| V02 | 切换到 v2 路线图和静态页面 | MS5 | V01 | 强 | 已细化 | [#25](https://github.com/Finderlzy/rezero-subscribe-claude/issues/25) |
| V03 | 按本机选择和视图改写导航 | MS6 | V02 | 强 | 待细化 | [#26](https://github.com/Finderlzy/rezero-subscribe-claude/issues/26) |
| V04 | 实现选择页的选项块 | MS6 | V03 | 标准 | 待细化 | [#29](https://github.com/Finderlzy/rezero-subscribe-claude/issues/29) |
| V05 | 实现目录与首页 | MS6 | V03 | 标准 | 待细化 | [#30](https://github.com/Finderlzy/rezero-subscribe-claude/issues/30) |
| V06 | 实现旁支页和参考页的返回 | MS6 | V02 | 标准 | 待细化 | [#27](https://github.com/Finderlzy/rezero-subscribe-claude/issues/27) |
| V07 | 制作 logo 和 favicon | MS7 | 无 | 强 | 已细化 | [#24](https://github.com/Finderlzy/rezero-subscribe-claude/issues/24) |
| V08 | 按设计 v2.0 重做全站视觉 | MS7 | V04、V05、V06、V07 | 标准 | 待细化 | [#31](https://github.com/Finderlzy/rezero-subscribe-claude/issues/31) |
| V09 | 对照重写稿完成迁移核对 | MS6 | V02 | 标准 | 待细化 | [#28](https://github.com/Finderlzy/rezero-subscribe-claude/issues/28) |

### 4. 检查点

**MS5 结束（V01、V02 合并后）**
- [ ] `npm run check`、`npm run test:e2e` 通过
- [ ] 关掉 JS，在 360 和 1280 宽下从首页点到后记（选方案三、iPhone），没有断链
- [ ] 新入库的截图已逐张核对打码；`docs/rewrite/附件/` 没有进仓库
- [ ] 回看本计划：MS6 任务的拆分和档位是否仍然合适

**MS6 结束**
- [ ] AC-01–06、08–13、18、19 都有 e2e 或写明的人工核对记录
- [ ] 构建输出的内容提示（操作版缺失、作者待补、博客链接待填）与作者确认一致

**全部完成**：AC-01–21 都有证据，交给 project-delivery。

### 5. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 重写稿引用的 `截图 2026-10-15 13-43-53 1.png` 不存在（需求 Q-13） | V01 导入后构建失败 | 已解决：#23 按作者选定从原图裁剪入库 |
| 作者导入期间继续改重写稿 | 内容和路线图对不上 | 导入脚本可重复运行；新页面、删页面只报告，由作者决定 |
| logo 风格作者不认可 | V08 的主色和页眉要返工 | V07 先出 logo 并取得作者确认，V08 排在最后；`--accent` 跟 logo 的“Re”紫走 |
| V02 改动面大（M2 + 全部页面 + 删旧代码） | 一次做不完、`main` 不绿 | V02 只做静态版，浏览器脚本整体留给 V03/V05，参照 `v1.0.0` 标签里的旧实现 |
| 本机存储禁用时选择丢失导致绕圈（评审 V11） | AC-18 | V03 实现 M4 的 `window.name` 兜底 |

### 6. 待决事项（不阻塞）

需求 Q-01（部署位置）、Q-07（联系方式）、Q-11（博客地址，#23 已解决）、Q-13（缺失截图，#23 已解决）。1.0.0 的 [#16 完成迁移核对](https://github.com/Finderlzy/rezero-subscribe-claude/issues/16) 核对的是旧文章，已被 V09 取代，建议关闭（需作者同意）。

---

## 附：1.0.0 实施计划（v0.2，2026-10-13，历史）

- 状态：v0.2（2026-10-13），首期（需求 v0.2，步骤地图按作者意见重排为十一章）全部范围
- 输入：[需求](requirements.md)、[架构](architecture.md)（含 [§11 实施前评审](architecture.md#11-实施前架构评审2026-10-13)）、[设计](design.md)、[复用调研](reuse-research.md)、[术语](../CONTEXT.md)
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)（私密仓库，2026-10-13 发布）。**任务范围、状态和完成证据以 Issue 为准**，本文只保留里程碑、顺序和链接。Issue 正文里的依赖已写成 Issue 编号；T01–T12 与 #1–#12 一一对应；T22 是 #13，T13–T21 依次是 #14–#22，以下表为准。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。

> **首个可开工任务：[#1 建立 Astro 工程脚手架与命令](https://github.com/Finderlzy/rezero-subscribe-claude/issues/1)**（建议档位：强）。新开会话，用 `task-implement` 指定 #1。

### 1. 里程碑

| 里程碑 | 交付的可用能力 | 覆盖需求 | 任务 |
| --- | --- | --- | --- |
| **MS1 端到端骨架** | 首页 →“直接开始”→ 开始之前 → 整体思路 → 节点方案选择页 → 默认路线的第一章 → 检查 IP 质量 → 完成页，全部是构建时写死的导航；内容校验在构建里生效 | FR-01–04、FR-10–13（静态部分）、FR-17、FR-18（无进度）、FR-60、FR-61；AC-01、AC-08 与 AC-19（静态部分）、AC-18（找不到页） | T01–T06 |
| **MS2 完整 P0** | 全部十一章和常见问题迁完；任意路线按本机选择计算上一步/下一步；操作/原理视图；内容待补占位；构建失败用例；迁移核对 | FR-03、FR-11–15、FR-20、FR-21、FR-30、FR-31、FR-50（写入）；AC-02、03、05、06、08、11、12、13、14、18、19 | T07–T15、T22 |
| **MS3 P1** | 视频门面、步骤目录（改路线、清除进度）、继续上次、代码复制与看大图 | FR-14、FR-16、FR-18、FR-19、FR-40–42、FR-50、FR-51、NFR-02；AC-04、07、09、10 | T16–T19 |
| **MS4 P2 与交付准备** | 两种宽度和两种主题下的视觉、可访问性；子路径部署；屏蔽境外域名后完整显示 | NFR-01、NFR-03、NFR-04、NFR-05、design §7；AC-15、16、17 | T20–T21 |

MS1、MS2 结束各有一个检查点（§4）。MS2 之后的任务先保留目标和依赖，开工前由 `task-implement` 细化并补参照。

### 2. 依赖与顺序

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

### 3. 任务索引

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 细化 | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | 建立 Astro 工程脚手架与命令 | MS1 | 无 | 强 | 已细化 | [#1](https://github.com/Finderlzy/rezero-subscribe-claude/issues/1) |
| T02 | 验证 Markdown 管线的四个技术疑点 | MS1 | T01 | 强 | 已细化 | [#2](https://github.com/Finderlzy/rezero-subscribe-claude/issues/2) |
| T03 | 实现路线图模块 M2 | MS1 | T01 | 强 | 已细化 | [#3](https://github.com/Finderlzy/rezero-subscribe-claude/issues/3) |
| T04 | 实现内容格式与 Obsidian 写法插件 M1 | MS1 | T01、T02 | 强 | 已细化 | [#4](https://github.com/Finderlzy/rezero-subscribe-claude/issues/4) |
| T05 | 走通“开始”章：首页、步骤页、完成页、找不到页 | MS1 | T03、T04 | 强 | 已细化 | [#5](https://github.com/Finderlzy/rezero-subscribe-claude/issues/5) |
| T06 | 迁移第一章并实现节点方案选择页 | MS1 | T05 | 标准 | 已细化 | [#6](https://github.com/Finderlzy/rezero-subscribe-claude/issues/6) |
| T07 | 实现本机状态模块 M4 | MS2 | T01 | 标准 | 已细化 | [#7](https://github.com/Finderlzy/rezero-subscribe-claude/issues/7) |
| T08 | 浏览器按本机选择改写导航 | MS2 | T06、T07 | 强 | 待细化 | [#8](https://github.com/Finderlzy/rezero-subscribe-claude/issues/8) |
| T09 | 实现操作/原理视图切换 | MS2 | T06、T07 | 标准 | 待细化 | [#9](https://github.com/Finderlzy/rezero-subscribe-claude/issues/9) |
| T10 | 迁移电脑代理、防泄漏、电脑改时区并实现内容待补占位 | MS2 | T06 | 标准 | 待细化 | [#10](https://github.com/Finderlzy/rezero-subscribe-claude/issues/10) |
| T11 | 迁移清理配置、IP 不合格与手机代理并实现跳过 | MS2 | T10 | 标准 | 待细化 | [#11](https://github.com/Finderlzy/rezero-subscribe-claude/issues/11) |
| T12 | 迁移 Google 账号、养号与注册 claude | MS2 | T11 | 标准 | 待细化 | [#12](https://github.com/Finderlzy/rezero-subscribe-claude/issues/12) |
| T22 | 迁移订阅、订阅之后与完成页内容 | MS2 | T12 | 标准 | 待细化 | [#13](https://github.com/Finderlzy/rezero-subscribe-claude/issues/13) |
| T13 | 迁移常见问题并实现常见问题页 | MS2 | T22 | 标准 | 待细化 | [#14](https://github.com/Finderlzy/rezero-subscribe-claude/issues/14) |
| T14 | 补齐构建失败用例 | MS2 | T06 | 标准 | 待细化 | [#15](https://github.com/Finderlzy/rezero-subscribe-claude/issues/15) |
| T15 | 完成迁移核对 | MS2 | T13 | 标准 | 待细化 | [#16](https://github.com/Finderlzy/rezero-subscribe-claude/issues/16) |
| T16 | 实现步骤视频门面 | MS3 | T06 | 标准 | 待细化 | [#17](https://github.com/Finderlzy/rezero-subscribe-claude/issues/17) |
| T17 | 实现步骤目录与清除进度 | MS3 | T08 | 标准 | 待细化 | [#18](https://github.com/Finderlzy/rezero-subscribe-claude/issues/18) |
| T18 | 实现“继续上次”与完成页操作 | MS3 | T08、T17 | 标准 | 待细化 | [#19](https://github.com/Finderlzy/rezero-subscribe-claude/issues/19) |
| T19 | 实现代码复制与看大图 | MS3 | T06 | 标准 | 待细化 | [#20](https://github.com/Finderlzy/rezero-subscribe-claude/issues/20) |
| T20 | 视觉打磨、响应式与可访问性验收 | MS4 | T17、T18、T19 | 标准 | 待细化 | [#21](https://github.com/Finderlzy/rezero-subscribe-claude/issues/21) |
| T21 | 子路径部署与国内可访问验收 | MS4 | T16 | 标准 | 待细化 | [#22](https://github.com/Finderlzy/rezero-subscribe-claude/issues/22) |

### 4. 检查点

**MS1 结束（T01–T06 合并后）**
- [ ] `npm run check` 通过；`npm run test:e2e` 通过
- [ ] 在 360 和 1280 宽下，从首页沿默认路线点到完成页，没有断链
- [ ] 截图入库前已逐张核对打码（R8）
- [ ] 回看本计划：MS2 任务的顺序和档位是否仍然合适

**MS2 结束（T07–T15、T22 合并后）**
- [ ] AC-02、03、05、06、08、11、12、13、14、18、19 全部有对应的 e2e 用例或人工核对记录
- [ ] 构建输出的占位清单和作者确认一致

**全部完成**：AC-01–AC-18 都有证据，交给 project-delivery 做整体验收。

### 5. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| `rehype-callouts` 不支持自定义 `why`，或插件图片进不了 Astro 图片流程 | 中 | 已在 T02（#2）验证可行，风险解除（reuse-research §4.1） |
| Astro 7 / Vitest 5 / TS 6 组合有未知兼容问题 | 中 | T01 锁版本并跑通全部命令后再开其他任务 |
| 迁移时漏内容或改了命令、链接 | 高 | 每个迁移任务更新 `docs/migration-checklist.md`；T15 用脚本比对命令和链接 |
| 截图露出服务器 IP 等敏感信息 | 高 | T06 起每个迁移任务的验收都有逐张核对项 |
| Playwright 浏览器需要联网下载 | 低 | T01 安装 chromium 一次；离线时 e2e 无法运行要如实报告 |

### 6. 待决事项（不阻塞）

需求 Q-01（部署位置）、Q-02（F2 选项）、Q-07（联系方式，T22 用占位）、Q-10（注册 claude 单独成章，作者可改）。
