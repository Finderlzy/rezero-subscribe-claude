# 架构：Re:从零开始订阅 claude

- 状态：v0.1 定稿（2026-10-13），没有阻塞决策；待定事项见 §10
- 输入：[术语](../CONTEXT.md)、[需求 v0.1](requirements.md)、[复用调研](reuse-research.md)、[界面设计契约](design.md)
- 决策记录：[ADR-0001 Astro 静态站 + 自建路线图](adr/0001-astro-static-site-with-own-route-map.md)、[ADR-0002 URL 规则](adr/0002-url-scheme.md)、[ADR-0003 原理内容内嵌为 why 块](adr/0003-principle-content-as-why-callouts.md)
- 现状：工程脚手架、依赖和 §7 的命令已由 #1 建立（版本以 `package-lock.json` 为准）；其余标“计划”的目录和模块由后续任务创建。

## 1. 技术栈与选型理由

| 项 | 选择 | 理由 / 核实来源 |
| --- | --- | --- |
| 运行时 | Node ≥ 22.12（本机 24.21.0），npm | Astro 7 要求 Node ≥ 22.12（npm 元数据）；npm 随 Node 自带，作者不用再装其他工具 |
| 框架 | Astro 7.3.x，`output: 'static'`，不用文档主题 | 见 [ADR-0001](adr/0001-astro-static-site-with-own-route-map.md)。内容集合 + Zod 校验 frontmatter；页面默认不带 JS；`<script>` 会打包成本地文件，满足 NFR-03 |
| Markdown | `@astrojs/markdown-remark`（unified 处理器）+ `rehype-callouts` + 自研 remark 插件 | Astro 7 的默认处理器 Sätteri 不兼容 remark/rehype 插件（[官方文档](https://docs.astro.build/en/guides/markdown-content/)） |
| 前端交互 | 原生 TypeScript 模块，通过 Astro `<script>` 打包；不引入 UI 框架 | 交互只有视图切换、改写导航链接、目录、视频门面、复制、看大图，用不着框架；满足需求里“不引入重型前端框架”（Ask first） |
| 样式 | 原生 CSS + 自定义属性（设计令牌），不用 CSS 框架 | 令牌来自 [design.md §3](design.md) |
| 类型检查 | TypeScript **6.x**（固定）+ `@astrojs/check` | `@astrojs/check` 0.9.10 的 peer 依赖是 `typescript ^5 \|\| ^6`；TS 7 不兼容 |
| 单元测试 | Vitest 5 | 测 M1、M2、M4 的纯逻辑 |
| 端到端测试 | Playwright 1.64 + `@axe-core/playwright` | 视口（AC-16）、拦截域名（AC-17）、无痕和存储禁用（AC-08/18）、可访问性扫描 |
| 部署 | 纯静态 `dist/`；具体部署位置待定（Q-01） | 构建时用 `BASE_PATH` 指定根路径或子路径（AC-15） |

## 2. 复用决策

依据 [reuse-research.md](reuse-research.md)：

- **采用为框架**：Astro 7（MIT）。上游版本以 `package-lock.json` 锁定的为准。
- **采用为组件**：`@astrojs/markdown-remark`（MIT）、`rehype-callouts`（MIT；已在 #2 实测能注册自定义 `why` 类型，见 [reuse-research.md §4.1](reuse-research.md)）。
- **仅作参考**：Starlight（侧栏和分页的做法）、Material for MkDocs（博客现有写法）、lite-youtube-embed（门面模式）、Google Codelabs（每步一页 + 记住进度）、`@flowershow/remark-wiki-link`（双链语法解析）。
- **自研**：路线图（M2）、Obsidian 双链与嵌入解析、视图切换、视频门面、目录、本机状态（M4）、全部页面与样式。

## 3. 模块与依赖方向

沿用需求 §2 的能力地图，模块 ID 不变。术语用 [codebase-design](../.claude/skills/mattpocock/codebase-design/SKILL.md)：每个模块对外只暴露一个小接口（**interface**），复杂度藏在实现里。

```
          ┌─────────────── 构建时（Node） ───────────────┐      ┌──── 浏览器 ────┐
 内容文件 ─▶ M1 内容 ──▶ M2 路线（RouteMap）──▶ M3 页面 ──▶ dist/*.html ──▶ 页面脚本
 route.yaml   │  ▲          │ 序列化为 RouteData JSON ──────────────┘    │   │
 steps/*.md   │  └ Obsidian 插件（双链/嵌入/why）                       M2(同一份代码) M4
              └──────────── M5 构建：校验失败就终止 ─────────────┘
```

依赖只朝一个方向：M1 ← M2 ← M3；M4 不依赖其他模块，只被 M3 的页面脚本调用。M2 是纯函数，不碰文件系统，也不碰浏览器 API，所以构建时和浏览器里用的是**同一份代码**，上一步/下一步的规则只写在一个地方。

### M1 内容（`src/content/`、`src/content.config.ts`、`src/lib/content/`）

**职责**：定义内容文件的格式；加载并校验元数据；把 Obsidian 写法转换成 HTML。

**内容文件（计划）**

| 路径 | 内容 | 元数据（Zod 校验） |
| --- | --- | --- |
| `src/content/route.yaml` | **路线图**：章节、分叉点、步骤序列（见下文） | 由 M2 校验 |
| `src/content/steps/<step-id>.md` | 一个步骤：操作内容 + 内嵌的 `[!why]` 原理块 | `title`（必填）；`skippable`（默认 false）；`placeholder`（默认 false，FR-21）；`video: { bilibili?: BV号, youtube?: 视频ID }`（可空，FR-40）；`placeholderHint`（可选，写原文里已有的提示）；`skipLabel`（可选，跳过按钮文案，默认“已有，跳过”） |
| `src/content/choices/<fork-id>.md` | 一个分叉点的选择页：引导语 | `question`；`options: { <option-id>: { title, path?, effort?, audience? } }`（对应原文的对比表） |
| `src/content/faq/<faq-id>.md` | 一条常见问题 | `title` |
| `src/content/pages/home.md`、`done.md` | 首页前言；完成页的致谢、后记、联系方式 | `title` |
| `src/assets/screenshots/` | 截图（从博客的 `09附件/` 复制过来，FR-04） | — |

**route.yaml 格式（计划）**：章节和分叉点的唯一来源，满足 FR-02 中“所属章节、所属路线”的要求。步骤文件不重复写这两项，避免两处数据不一致。

```yaml
defaults: { node-plan: plan-1, desktop-proxy: v2rayn, phone: iphone }  # 默认路线（Ask first）
chapters:
  - id: start
    title: 开始
    items: [before-you-start, overview, clean-claude-code]
  - id: residential-ip
    title: 一、准备住宅 IP
    items:
      - choose: node-plan                  # 选择页 /choose/node-plan/
      - branch: node-plan                  # 各选项的步骤段
        options:
          plan-1: [plan1-buy-vps, plan1-free-residential-ip, ssh-connect, run-script]
          plan-2: [plan2-buy-residential-vps, ssh-connect, run-script]   # 共享步骤：同一段内可出现在多个选项里
          plan-3: [plan3-buy-node]
  - id: desktop-proxy
    title: 二、电脑代理
    items:
      - choose: desktop-proxy              # F1 的汇合点可以是选择页
      - branch: desktop-proxy
        options:
          v2rayn: [v2rayn-import, v2rayn-tun]
          clash-verge: [clash-verge-import, clash-verge-tun]
  - id: leak-protection
    title: 三、防泄漏
    items:
      - branch: desktop-proxy              # 同一分叉点的第二段，没有选择页，沿用第二章的选择
        options: { v2rayn: [v2rayn-dns], clash-verge: [clash-verge-dns] }
      - webrtc                             # F2 的汇合点
      - ipv6
  # ……四、电脑改时区；五、检查 IP 质量；六、手机代理（choose: phone）；七、准备 Google 账号、
  #   十、订阅里各有一段 branch: phone。完整清单见需求 §5.2
```

步骤标识用上例那样的英文 kebab-case（最终清单在内容迁移时确定）。可跳过步骤在 frontmatter 里可以写 `skipLabel`（默认“已有，跳过”，FR-15）。

**Obsidian 写法**（自研 remark 插件 `src/lib/content/remark-obsidian.ts` + `rehype-callouts`）：

| 写法 | 转换结果 | 找不到目标时 |
| --- | --- | --- |
| `[[step-id]]`、`[[step-id\|文字]]`、`[[step-id#小标题\|文字]]` | 步骤链接，文字默认用目标的标题 | 构建失败，报出文件和行号 |
| `[[faq/<id>\|文字]]` | 常见问题链接，自动带上 `?from=<当前步骤>`（FR-20） | 同上 |
| `[[choose/<fork-id>\|文字]]`、`[[done]]` | 选择页 / 完成页链接 | 同上 |
| `![[文件名.jpg\|262]]` | 图片，显示宽度 262px，可以点开看大图 | 同上 |
| `> [!why] 为什么：…` | 原理块，只在原理视图展开（[ADR-0003](adr/0003-principle-content-as-why-callouts.md)） | — |
| `> [!caution]`、`> [!note]` | 两种视图都显示的提示框 | — |

插件需要一份**链接索引**：步骤、常见问题、选择页的标识，以及截图文件名。索引由 `createLinkIndex(contentRoot)` 在加载配置时同步扫描文件名生成，不依赖内容集合，所以图片和链接校验不受页面渲染顺序影响。指向博客其他文章的双链，在迁移时就改成普通的外部链接（博客根地址 `https://finderlzy.github.io/Writing/`，迁移时逐条打开核对），插件不处理。原文的嵌入写成 `![[09附件/文件名|宽度]]`，迁移时去掉 `09附件/` 前缀，插件只接受裸文件名（文件名可以含空格和中文）。

**管线实测结论**（#2，详见 [reuse-research.md §4.1](reuse-research.md)）：

- `rehype-callouts` 在 `astro.config.mjs` 里注册 `why` 类型，输出 `data-callout="why"`，视图切换用 CSS 选择器 `[data-callout='why']`，不自写 rehype 插件；关闭库自带图标（`showIndicator: false`，design §3.3）。
- 嵌入图片由插件生成 mdast `image` 节点，`url` 写成从 Markdown 文件到 `src/assets/screenshots/<文件名>` 的相对路径（经 `encodeURI`），宽度写进 `data.hProperties.width`；Astro 的 `remarkCollectImages` 在用户插件之后运行，会把它交给图片服务（输出 webp 并写上宽高）。截图因此放在 `src/assets/screenshots/`，不放 `public/`。文件名含空格和中文也能构建和访问。
- 换成 unified 处理器后 Shiki 仍默认开启（`github-dark`，样式内联），构建产物不引用外部资源。

### M2 路线（`src/lib/route/`）

**职责**：根据路线图、步骤元数据和读者的选择，算出页面需要的全部导航信息；在构建时校验路线图。

**接口**（已由 #3 实现：`src/lib/route/route-map.ts`，类型在 `types.ts`）：

```ts
type Choices = Partial<Record<ForkId, OptionId>>;
type At = { kind: 'step'; id: StepId } | { kind: 'choose'; fork: ForkId };

// 校验并编译。spec 是 route.yaml 解析后的值（unknown，M2 逐项校验形状）；choices 是选择页元数据（标题、选项顺序）。
// 失败时抛出 RouteValidationError，其 errors: RouteError[] 一次列全，每条写明 route.yaml、steps/<id>.md 或 choices/<id>.md
function buildRouteMap(spec: unknown, steps: StepMeta[], choices: ChoiceMeta[]): RouteMap;

interface RouteMap {
  /** 一个页面需要的全部导航信息。stored = 本机保存的选择，可以为空 */
  view(at: At, stored: Choices): {
    choices: Record<ForkId, OptionId>; // 实际生效的选择 = 默认路线 ← 本机保存的选择（失效项忽略）← 当前页所属选项（S5），总是覆盖全部分叉点；
                               // 共享步骤属于多个选项时：本机已选的在其中就沿用，否则用默认选项，默认也不在其中时取第一个（FR-17）
    current: Stop;             // 当前页（带标题）
    prev: Stop | null;         // 路线第一项时为 null
    next: Stop;                // 最后一步之后是 { kind: 'done' }（FR-11）
    skipTo: Stop | null;       // 只有可跳过步骤才有：跳过本章内连续的可跳过步骤后的第一项（FR-15）
    progress: { chapterId: string; chapter: string; index: number; total: number } | null; // 选择页没有步数
    outline: OutlineChapter[]; // 目录：全部步骤，标出是否在当前路线上（FR-16）
  };
  // at 不在路线图里时抛错
  readonly data: RouteData;    // 可以序列化，给浏览器重建 RouteMap 用；含步骤和选择页的标题、章节标题、skippable/placeholder 标记，
                               // 浏览器改写“下一步：<标题>”、目录、首页“继续上次：<步骤名>”都只靠它，不再另取数据
}
function routeMapFromData(data: RouteData): RouteMap;
/** Stop → 站内路径（不含 BASE_PATH）；构建时和浏览器共用，再由 withBase() 加前缀 */
function pathOf(stop: Stop): string;
```

- 输入类型 `StepMeta`、`ChoiceMeta` 定义在 `route/types.ts`，只含路线需要的字段。M2 不读文件，也不引用 M1 的集合类型：由 `loadSite()` 把 M1 的内容条目和解析后的 `route.yaml` 映射成这两种形状传入。标题等必填元数据由 M1 的 Zod 校验，M2 只校验标识和路线结构。

**规则**（构建时校验，任何一条不满足就失败，对应 FR-61）：

- 每个步骤标识只属于路线图里的一个位置：要么是普通项，要么属于**一个** `branch` 段，可以出现在这一段的多个选项里（共享步骤）。所以看 URL 就知道一个步骤属于哪个分叉点的哪几个选项（S5）。路线图引用的步骤必须有对应文件，步骤文件也必须出现在路线图里。
- `branch` 引用的分叉点，前面必须已经出现过它的 `choose`；`options` 必须和选择页文件里的选项一一对应；`defaults` 必须覆盖每个分叉点。
- 同一分叉点的 `branch` 段之后，必须有一个所有选项共用的项（普通步骤或另一个分叉点的选择页），也就是必须有汇合点。汇合点可以在后面的章节；同一分叉点的两段 `branch` 可以紧挨着（第二、三章的 F2），汇合点算在最后一段之后。
- 可跳过步骤的 `skipTo`：沿当前路线，跳过本章内从当前步骤开始连续的可跳过步骤，取其后的第一项（可能在下一章或是完成页）。
- 枚举所有选项组合（首期是 3 × 2 × 2 = 12 条路线）：每条路线都要从“开始之前”走到完成页，中间不重复经过同一步，也就是没有环。
- 步骤标识不能和保留路径重名：`choose`、`faq`、`done`、`404`、`_astro`。
- 占位步骤（`placeholder: true`）不让构建失败，只在构建输出里列出清单（FR-21）。清单由 `astro.config.mjs` 里的一个小集成在 `astro:build:done` 时打印，格式为每行一个 `占位步骤：<step-id> <标题>`。

### M3 页面（`src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`）

**职责**：把内容和路线渲染成页面；实现 [design.md](design.md) 的全部页面和组件。

- **构建时**：每个页面调用 `loadSite()`（`src/lib/site.ts`，计划）。它读取内容集合，调用 `buildRouteMap`，结果在一次构建内缓存。页面再调用 `view(at, {})`，把导航直接写进 HTML。这时生效的是默认路线，加上当前页所属的分支，所以不运行 JS 也能顺着走完。
- **浏览器里**：布局用 `<script type="application/json">` 内嵌 `RouteData`（首期约 45 个步骤，几 KB）。页面脚本读取 M4 保存的选择，调用 `routeMapFromData(data).view(at, stored)`，再改写上一步/下一步链接、进度和目录状态。这种做法是渐进增强：没有 JS 时，页面就保持构建时写好的默认导航。
- **视图**：`<head>` 里放一段几十字节的内联脚本，在首次绘制前设置 `<html data-view="operation|principle">`，避免页面闪一下。`[!why]` 块的显示和隐藏只用 CSS 控制（[ADR-0003](adr/0003-principle-content-as-why-callouts.md)）。
- **视频门面**：不发任何外部请求。读者点击后才插入 iframe：B 站用 `player.bilibili.com/player.html?bvid=…`（参数在实施时实测），YouTube 用 `www.youtube-nocookie.com/embed/<id>`。播放器下方总有一行平台外链：浏览器无法可靠判断 iframe 有没有加载失败，所以这行链接一直显示（FR-42）。
- **常见问题的“返回”**：根据 `?from=<step-id>` 查到步骤标题，再显示返回链接。参数里只有公开的步骤标识，没有个人数据。

### M4 本机状态（`src/lib/reader-state/`）

**职责**：读写阅读进度、路线选择、视图偏好、已读步骤。数据只存在本机，不发给任何服务器（三级边界 Never）。

```ts
interface ReaderState { lastStep?: StepId; choices: Choices; view: 'operation' | 'principle'; visited: StepId[] }
interface ReaderStore { read(): ReaderState; write(patch: Partial<ReaderState>): void; clear(): void }
interface ReaderStoreOptions {
  isKnownStep?: (id: StepId) => boolean;                      // 步骤是否仍在路线图里
  isKnownChoice?: (fork: ForkId, option: OptionId) => boolean; // 选项是否仍在路线图里
}
function createReaderStore(storage: Storage | null, options?: ReaderStoreOptions): ReaderStore;
/** 安全地取 localStorage：没有或访问就抛异常时返回 null；scope 默认 globalThis，仅供测试注入 */
function getLocalStorage(scope?: { localStorage?: Storage }): Storage | null;
```

M4 不依赖 M2：`StepId`、`Choices` 等在 M4 里是同义的字符串别名；标识过滤由调用方（M3 页面脚本）用 `RouteData` 构造 `options` 传入，不传时接受任何非空字符串。

- 存储接缝有两个适配器：`localStorage` 和内存。`localStorage` 不可用、读写时抛异常（无痕模式、禁用存储）时，自动换成内存适配器，不报错（异常分支、AC-18）。测试也用内存适配器。
- 存储键是 `rezero-subscribe-claude:v1`，值是 JSON。读出来的数据如果格式不对，或者里面的标识已经不在路线图里，就丢掉这一项，用默认值代替（值不是 JSON 对象时整体用默认值；某字段类型不对只丢该字段；`view` 默认 `operation`；`visited` 去重；`choices` 里的 `__proto__`、`constructor`、`prototype` 键一律丢掉）。
- `write` 是合并：patch 里没有、为 `undefined` 或不合法的字段保持原值；`choices` 按分叉点合并，`visited` 与已有记录合并去重。
- 写入时机：打开步骤页时，写 `lastStep`、`visited`，以及当前页所属分支的选择；在选择页或目录里改选项时，写 `choices`；切换视图时，写 `view`。“清除进度”调用 `clear()`（FR-51）。

### M5 构建（`astro.config.mjs`、`package.json`）

**职责**：生成纯静态站点；任何内容错误都让构建失败。

- 校验分三层，都发生在 `astro build` 里，不需要额外的命令：
  1. Zod 校验 frontmatter，缺少必填项时报出文件；
  2. Obsidian 插件校验双链和图片，报出文件和行号；
  3. `buildRouteMap` 校验路线图。
- 配置（已建立）：`output: 'static'`、`build.format: 'directory'`、`trailingSlash: 'always'`、`base: process.env.BASE_PATH ?? '/'`、`site: process.env.SITE_URL`（可选）。站内链接一律通过 `withBase()` 生成，不手写以 `/` 开头的路径。
- 禁止通过放宽 Zod 规则、跳过校验来让构建通过（三级边界 Never）。

## 4. URL 规则

见 [ADR-0002](adr/0002-url-scheme.md)：

| 页面 | URL（相对 `BASE_PATH`） |
| --- | --- |
| 首页 | `/` |
| 步骤 | `/<step-id>/` |
| 选择页 | `/choose/<fork-id>/` |
| 常见问题列表 / 条目 | `/faq/`、`/faq/<faq-id>/` |
| 完成页 | `/done/` |
| 找不到 | `404.html`（GitHub Pages 会自动使用；Nginx 需要配置 `error_page 404`） |

## 5. 数据流（以 AC-03/AC-08 为例）

1. **构建**：读取 `route.yaml` 和 `steps/*.md`，经过 M1 校验，再由 M2 `buildRouteMap` 编译。之后对每个步骤调用 `view(at, {})` 生成 HTML，HTML 里内嵌 `RouteData`。
2. **读者在无痕窗口打开 `/plan3-buy-node/`**：页面先显示构建时写好的导航。生成这个页面时，路线已经由当前页所属分支确定为 `node-plan=plan-3`，所以上一步/下一步一开始就在方案三的路线里（AC-08）。
3. **页面脚本运行**：调用 M4 的 `read()`，存储为空或不可用时返回默认值；再调用 `view(at, stored)`。结果和构建时一样，所以链接不需要改写。最后写入 `lastStep`，以及 `choices.node-plan = plan-3`。
4. **读者到达 `/choose/desktop-proxy/`**：这个页面构建时写的是默认路线，上一步指向方案一的 `run-script`。页面脚本按本机保存的 `plan-3` 重新计算，把“上一步”改写为 `plan3-buy-node`（AC-03）。

## 6. 目录结构（`src/content/`、`src/lib/` 下的模块和 `tests/fixtures/` 为计划，其余已由 #1 建立）

```
.
├── AGENTS.md / CLAUDE.md            仓库指南 / Claude Code 入口（已有）
├── CONTEXT.md                       术语（已有）
├── docs/                            需求、调研、架构、设计、ADR（已有）；之后加计划、交付
├── astro.config.mjs                 M5 构建配置
├── package.json / package-lock.json 依赖与脚本；version 字段是版本来源
├── tsconfig.json
├── vitest.config.ts / playwright.config.ts
├── src/
│   ├── content.config.ts            M1 集合与 Zod schema
│   ├── content/                     M1 内容：route.yaml、steps/、choices/、faq/、pages/
│   ├── assets/screenshots/          截图（会经过 Astro 的图片处理）
│   ├── lib/
│   │   ├── content/                 M1：remark-obsidian.ts、link-index.ts（+ *.test.ts）
│   │   ├── route/                   M2：route-map.ts、types.ts（+ route-map.test.ts、fixtures/sample-route.ts 测试用路线图）
│   │   ├── reader-state/            M4：reader-store.ts（+ *.test.ts）
│   │   └── site.ts                  构建时装配：loadSite()
│   ├── layouts/                     页面骨架（head 里的视图脚本、RouteData）
│   ├── components/                  M3 组件：StepNav、Toc、ViewToggle、VideoFacade、CodeCopy、ImageZoom …
│   ├── pages/                       index、[step]、choose/[fork]、faq/index、faq/[faq]、done、404
│   └── styles/                      tokens.css、base.css、prose.css
├── public/                          直接复制的文件（favicon 等）
└── tests/
    ├── e2e/                         Playwright：按 AC 编号命名，例如 ac-03-branch-merge.spec.ts
    └── fixtures/                    构建失败用例使用的坏内容（AC-14）
```

- 单元测试放在被测模块旁边（`*.test.ts`）；跨页面的流程测试放在 `tests/e2e/`。
- 构建输出 `dist/`、Astro 缓存 `.astro/`、`node_modules/`、`test-results/`、`playwright-report/`、`coverage/` 都不提交。截图和报告属于临时产物，统一放在这些目录里，不散落到其他地方。
- **版本来源**：`package.json` 的 `version`，按 SemVer 维护，脚手架建立时从 `0.1.0` 开始。

## 7. 命令（已由 #1 建立，以 `package.json` 为准）

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发服务器 |
| `npm run build` | 构建到 `dist/`，同时执行全部内容校验（校验由 #4 起接入）；`BASE_PATH=/sub/ npm run build` 生成子路径版本 |
| `npm run preview` | 预览构建产物 |
| `npm test` | Vitest 单元测试 |
| `npm run test:e2e` | 构建后运行 Playwright 测试（360 和 1280 两种视口） |
| `npm run check` | `astro check` + 单元测试 + 构建，提交前运行 |

## 8. 验收对应的验证方式

| 验收 | 验证方式 |
| --- | --- |
| AC-02、03、04、05、11 | M2 单元测试（测试用路线图）+ Playwright 走真实页面 |
| AC-01、06、07、09、10、12、18 | Playwright。AC-09 在同一个浏览器上下文里关掉页面再重新打开；AC-18 在测试前注入一段让 `localStorage` 抛异常的脚本 |
| AC-08 | Playwright 新建上下文（相当于无痕窗口）直接打开方案三步骤的 URL |
| AC-13 | 人工逐节核对，核对表在内容迁移任务中建立（计划放在 `docs/migration-checklist.md`），并用脚本比对原文与站内的命令和链接 |
| AC-14 | M1、M2 单元测试覆盖每一种错误；外加一个构建级用例：用 `tests/fixtures/` 里的坏内容执行构建，断言构建失败并报出文件名（可行性在实施时确认） |
| AC-15 | 分别用 `BASE_PATH=/` 和 `/sub/` 构建，再用 Playwright 抽查导航和图片 |
| AC-16 | Playwright 360 和 1280 两种视口，断言 `scrollWidth <= innerWidth` 并检查按钮可点 |
| AC-17 | Playwright 屏蔽 `*.google.com`、`*.googleapis.com`、`*.gstatic.com`、`*.youtube.com`、`*.youtube-nocookie.com`、`*.ytimg.com`，断言页面没有失败的请求、内容完整 |
| 设计 | [design.md §7](design.md)：截图人工评审 + axe 扫描 + 对比度实测 |

## 9. 安全与隐私

- 不加载统计、广告、评论脚本，也不加载第三方字体和图标（NFR-03/04）。只有读者点击视频后才插入第三方 iframe。
- 截图迁移时逐张检查，确认服务器 IP、节点链接、面板账号都已打码（三级边界 Never）。
- 仓库里不放任何凭据；`.env*` 文件不提交。

## 10. 待定事项

| 编号 | 事项 | 影响 | 阻塞？ |
| --- | --- | --- | --- |
| Q-01 | 部署位置和域名（需求遗留） | 交付阶段；`BASE_PATH` 已经同时支持根路径和子路径 | 否 |
| A-01 | AC-15“任意子路径”按“构建时设置 `BASE_PATH`”理解：每个部署位置各构建一次，不做一份产物适配所有路径 | 想要一份产物放到任何路径都能用的话，所有链接都要改成相对路径，复杂度会明显增加 | 否（已按推荐选定；有异议请提出） |
| A-02 | B 站嵌入参数（`bvid`、是否自动播放）没有官方文档 | 在 #17 里用浏览器实测。原列的 `why` Callout、插件图片进 Astro 图片处理、Shiki 三项已在 #2 验证可行（[reuse-research.md §4.1](reuse-research.md)，结论见 §3 M1） | 否 |
| A-03 | 视觉令牌的具体色值要用真实内容截图复核（P2） | [design.md](design.md) | 否 |
| Q-02、Q-07 | 需求遗留：F2 是否增加选项；联系方式的具体内容 | 只影响内容和 `route.yaml`，不影响架构 | 否 |

## 11. 实施前架构评审（2026-10-13）

- 范围：沿 S1–S6 核对需求 v0.1、本文 §1–§10、ADR-0001–0003、[design.md](design.md)，并抽查两篇原文章（标题结构、Callout、双链、嵌入）。**只是文档评审，没有运行任何代码。**
- 结论：**通过**，没有阻塞项。下表中标“已修正”的已经改进本文或需求；标“任务”的由 [实施计划](implementation-plan.md) 中对应任务解决。

| 编号 | 发现（依据） | 影响 | 处理 | 阻塞？ |
| --- | --- | --- | --- | --- |
| R1 | `RouteData` 只写了“可序列化”，没说包含标题（§3 M2/M3；design §4.1 要求按钮写出目标标题，FR-18 首页要显示步骤名） | 浏览器改写导航时拿不到标题，只能再内嵌一份数据 | 已修正：`RouteData` 含标题和标记；新增共用的 `pathOf(stop)` | 否 |
| R2 | 规则“`branch` 后面至少要有普通步骤”没说能否跨章节；F3 的汇合点在第七章（需求 §5） | 实现时可能误判 F3 没有汇合点 | 已修正：汇合点可以在后续章节 | 否 |
| R3 | 需求 §5 说 F2 影响“导入节点”，但导入节点在第一章，F2 的选择页在第二章（原文也是“以 v2rayN 为例”+ 常见问题讲 Clash Verge） | 按原写法会出现“用到选择在做选择之前” | 已修正需求 §5：导入节点按原文写，F2 只分 tun、DNS；不新增、不移动分叉点 | 否 |
| R4 | FR-15 的跳过目标和“下一步”相同（AC-05） | 功能价值有限，但和验收一致 | 已修正 §3 规则，按 AC-05 实现；记为需求 Q-09 待作者决定 | 否 |
| R5 | 原文的“为什么”框写作 `>[!note] 为什么：…`，嵌入写作 `![[09附件/…\|262]]`，文件名含空格和中文；纯操作版独有 8 张 SSH/脚本截图；方案二、三只有原理版有正文 | 迁移和插件规则需要写明 | 已修正 §3 M1；迁移规则写进 T05/T06（`docs/migration-checklist.md`） | 否 |
| R6 | A-02 的四个技术疑点（自定义 `why` Callout、插件图片进 Astro 图片流程、Shiki、B 站参数） | 影响 M1 插件写法和截图放 `src/assets` 还是 `public` | 已验证（#2）：前三项可行，截图放 `src/assets/screenshots/`（§3 M1）；B 站参数在 T16（#17）实测 | 否 |
| R7 | AC-14 的“构建级失败用例”能否在 Vitest 或脚本里稳定跑（§8 已注明待确认） | 只影响测试写法 | 任务：T14 先确认可行性，再写用例 | 否 |
| R8 | 纯操作版的 SSH 截图可能露出服务器 IP（安全红线） | 截图入库前必须逐张核对 | 任务：T06 的验收项 | 否 |
| R9 | 占位清单“在构建输出里列出”没有落点（FR-21） | 实现位置不明 | 已修正 §3 M2 规则：`astro:build:done` 打印 | 否 |

- 依赖方向（M1 ← M2 ← M3，M4 独立）无环；M2 纯函数在构建和浏览器两端复用，规模合适，没有发现过度设计。

### 11.1 补评：步骤地图 v0.2（2026-10-13）

作者要求不再沿用原文的七节，需求 §5 改为按“一个地方、一口气、可确认”拆步骤（需求 v0.2）。只补评受影响的部分：

| 编号 | 发现 | 处理 | 阻塞？ |
| --- | --- | --- | --- |
| R10 | 方案一、二共用“连上服务器”“运行脚本”，原规则“每个步骤只出现一次”放不下 | 已修正 §3 M2：允许同一 `branch` 段内的共享步骤；URL 确定“属于哪几个选项”；[ADR-0002](adr/0002-url-scheme.md) 同步更新；新增 AC-19 | 否 |
| R11 | F1 的汇合点变成第二章的选择页；F2 有两段紧挨着的 `branch` | 已修正汇合规则 | 否 |
| R12 | 安卓读者已有 Gmail 时要连跳两页；三个可跳过步骤的“已有”文案不合适 | 已修正：跳过本章内连续的可跳过步骤，`skipLabel` 可自定；Q-09 关闭 | 否 |
| R13 | 手机改时区随 F3 不同，放在第四章会出现“用到选择在做选择之前”（和 R3 同类） | 已修正需求 §5.2：手机改时区并入第六章 | 否 |
| R14 | 原文没有的步骤增加到约 14 个占位 | FR-21 机制不变；占位清单在构建输出里给作者跟踪 | 否 |

R3（Clash Verge 导入放常见问题）、R4（跳过目标等于下一步）已被 v0.2 取代。结论仍为**通过**。
