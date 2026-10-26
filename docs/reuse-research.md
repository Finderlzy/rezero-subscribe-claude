# 复用调研：Re:从零开始订阅 claude

- 检索日期：2026-10-13
- 依据：[CONTEXT.md](../CONTEXT.md)、[docs/requirements.md](requirements.md)（v0.1）
- 检索方式：网页检索 + 官方文档 + npm registry 元数据（`npm view`）。本机没有 `gh`，没有用 GitHub API；没有克隆、安装或运行任何第三方代码。
- v2.0 补充（2026-10-15）：只为新增的 logo 转曲需求补做检索，见 §5；其余能力没有新的复用需求，沿用下文结论。本次用 `gh api` 和 npm registry 查询。
- v3 补充（2026-10-21）：只为站内搜索、文档站外观和合并页补做检索，见 §5.1。
- v3.2 补充（2026-10-26）：只为订阅 Skill 补做检索（格式与校验、各家 Agent 的目录、打 zip、非交互跑一键脚本、SSH 密码），见 §5.2。
- 结论标记：**文档/源码核查** = 只读过 README、官方文档或 npm 元数据，没有实际运行过；**已验证** = 在本项目里跑通过（2026-10-13 检索时没有这一类；#2 的实测见 §4.1）。

## 1. 检索词

| 需求能力 | 检索词 |
| --- | --- |
| 一页一步 + 分叉路线的引导站 | `step-by-step interactive tutorial static site generator branching paths markdown`、`"choose your own adventure" docs wizard decision tree static site`、Google Codelabs `claat`、StackBlitz TutorialKit |
| 静态站框架 | `Astro Starlight latest release 2026`、`Astro 7 content collections glob loader zod`、`VitePress 2.0 release stable 2026`、`Material for MkDocs maintenance mode Zensical`、`Zensical release status` |
| Obsidian 写法（Callout、双链、嵌入） | `remark plugin obsidian callouts wikilinks astro` |
| 视频嵌入 | `lite-youtube-embed facade web.dev`、`bilibili player.html bvid iframe embed parameters` |
| 中文排版与字体 | `中文网页正文 每行字数 行高`、`system font stack Chinese PingFang SC Microsoft YaHei Noto Sans CJK` |

## 2. 整站方案候选

| 候选 | 覆盖 | 缺口 | 许可证 / 维护 | 复用方式 | 结论 |
| --- | --- | --- | --- | --- | --- |
| **作者博客现有栈**：MkDocs 1.6.1 + Material for MkDocs 9.7.7（`~/Workspace/Writing`） | 作者熟悉；原生支持 Admonition、代码复制 | 上一步/下一步只按导航顺序，不支持按读者路线动态计算；没有视图切换。Material 9.7.0 之后不再加新功能，承诺的关键修复只到 **2026-11-05** 前后 | MIT；**维护期即将结束** | 仅作参考 | 不采用：新项目不建在一个月后就停止维护的主题上 |
| **Zensical**（Material 团队的新生成器） | 读取 `mkdocs.yml`，可平滑迁移博客 | 仍是 alpha（官方路线图自述）；插件只兼容一部分；同样没有路线导航 | MIT；活跃开发中 | 仅作参考 | 不采用：alpha，而且不解决核心需求 |
| **Astro Starlight 0.42.6** | 文档站外壳、侧栏、上一步/下一步、暗色模式、搜索 | `prev`/`next` frontmatter 只能写静态值，没有按读者路线动态计算的入口；整体是“文档站”的布局和观感，要做一页一步、视图切换、分叉页就得覆盖大部分组件 | MIT；活跃（npm 2026-10-08 有更新） | 仅作参考 | 不采用：要覆盖的部分比能复用的多 |
| **VitePress** | Vue 生态的文档站 | 稳定版仍是 1.6.4（2025-08）；2.0 还是 alpha；导航同样是静态的 | MIT | 仅作参考 | 不采用 |
| **Eleventy 3.1.6** | 很轻、模板自由 | 内容校验、图片处理、TypeScript 要自己搭 | MIT；活跃 | 备选框架 | 备选：可行，但同样的工作量下 Astro 自带的东西更多 |
| **Astro 7.3.8（不加文档主题）** | 内容集合 + Zod 校验 frontmatter、静态输出、`base` 子路径、图片处理、默认不往页面里塞 JS，`<script>` 会打包成本地文件 | 路线、视图、视频、目录都要自己写（本来就是项目的核心逻辑） | MIT；活跃（2026-10-08）；Node ≥ 22.12 | **组件集成：作为框架** | **推荐采用**（见 [ADR-0001](adr/0001-astro-static-site-with-own-route-map.md)） |
| Google Codelabs `claat` | 一页一步的教程格式，记住读者读到哪 | **2025-12-16 已归档**；依赖 Google Docs、Analytics | Apache-2.0；已归档 | 仅作参考 | 不采用；保留“每步一页 + 记住进度”这个做法 |
| StackBlitz TutorialKit | 基于 Astro 的分课教程 | 面向在线写代码的教程，核心依赖 WebContainer；没有分叉路线 | MIT | 仅作参考 | 不采用 |
| “分叉路线引导站”的现成项目 | — | — | — | — | **本次未找到**。检索结果只有 GitHub Pages 入门课、文档生成器推荐工具这类无关项目 |

## 3. 组件候选

| 用途 | 候选 | 证据 | 许可证 / 维护 | 结论 |
| --- | --- | --- | --- | --- |
| Markdown 处理器 | `@astrojs/markdown-remark` 7.3.2（unified） | Astro 7 起默认处理器是 Sätteri，它不兼容 remark/rehype 插件；要用插件生态就安装 unified 处理器，配置 `markdown.processor: unified({ remarkPlugins, rehypePlugins })`（[Astro Markdown 文档](https://docs.astro.build/en/guides/markdown-content/)） | MIT；官方 | **采用**（文档核查） |
| Obsidian Callout | `rehype-callouts` 2.2.0 | 支持 Obsidian 主题和 `[!type]` 语法，可以用 `<details>` 折叠，不需要 JS；纯 ESM，Node ≥ 18 | MIT；2026-06 有更新 | **采用**（已验证，见 §4.1）：可以注册 `why` 类型，输出自带 `data-callout` |
| Obsidian Callout | `remark-obsidian-callout` 1.5.1 | 能用 | Apache-2.0；最后更新 2024-10 | 备选 |
| Obsidian Callout | `@r4ai/remark-callout` 0.6.2 | 标题里可以写行内元素 | MIT；最后更新 2024-09 | 备选 |
| 双链 / 嵌入 | `@flowershow/remark-wiki-link` 4.0.0 | 解析 `[[...]]` | MIT；2026-06 有更新 | **仅作参考**：本项目的双链要按步骤和常见问题标识解析，找不到目标时要让构建失败（FR-61），这部分逻辑现成插件给不了，自己写一个小 remark 插件更直接 |
| 双链 / 嵌入 | `remark-obsidian`（heavycircle） | 支持链接、嵌入、Callout | MIT；1 star，2025-05 后无提交 | 不采用：维护不足 |
| 视频门面 | `lite-youtube-embed`（Paul Irish） | web.dev 推荐的门面模式实现；默认用 youtube-nocookie | 开源（未核实具体许可证） | **仅作参考**：它会从 `i.ytimg.com` 加载封面图，国内打不开，而且等于点击前就请求了第三方（NFR-03、NFR-04）。采用它的思路，自己写一个不发外部请求的门面 |
| 解析 route.yaml | `yaml` 2.9.1 | 路线图是单个对象，Astro 的 `file()` loader 要的是“标识 → 条目”的集合，形状不合；`yaml` 已在依赖树里（`@astrojs/check` 等引入），`parseDocument` 能给出出错行号 | ISC；活跃 | **采用**（#5），只在构建时用；`js-yaml` 也能用，但不在依赖树里，且不带行号定位 |
| 单元测试 | `vitest` 5.0.4 | Node `^22.12 \|\| ^24 \|\| >=26` | MIT；活跃 | 采用 |
| 端到端测试 | `@playwright/test` 1.64.0 | 可以设置视口、拦截域名，正好用来测 AC-16、AC-17 | Apache-2.0；活跃 | 采用 |
| 类型检查 | `@astrojs/check` 0.9.10 | peer 依赖 `typescript ^5 \|\| ^6`，而 TypeScript 最新版已经是 7.0.2 | MIT | 采用，**TypeScript 固定 6.x**，安装时再核实一遍 |
| 站内搜索 | `pagefind` 1.5.2 | 静态全文搜索 | MIT | 首期不需要，不引入（v3 的结论见 §5.1） |

## 4. 推荐方向与缺口

- **推荐**：Astro 7（静态输出，不用文档主题）+ unified Markdown 处理器 + `rehype-callouts`。路线图、双链解析、视图切换、视频门面、目录、本机状态都自己写；这些正是项目的核心逻辑，现成方案都没有覆盖。
- **自研部分**：M2 路线（含构建校验）、Obsidian 双链和嵌入解析、视图切换、视频门面、步骤目录、M4 本机状态、全部页面和视觉设计。
- **缺口 / 待实施核实**（原列四条，第 1、2、4 条和中文文件名已在 #2 实测，见 §4.1）：
  1. ~~`rehype-callouts` 能否注册自定义 `why` 类型并输出视图属性~~ → 能；
  2. ~~自定义 remark 插件生成的图片节点，能否进入 Astro 的图片处理流程~~ → 能，截图放 `src/assets/screenshots/`；
  3. B 站嵌入参数（`bvid`、是否自动播放）没有官方文档，只有社区说法，留到 #17 在浏览器里实测；
  4. ~~换成 unified 处理器以后，Shiki 代码高亮是否仍然默认开启~~ → 仍默认开启。
- 架构设计见 [architecture.md](architecture.md)，设计调研见 [design.md](design.md)。

### 4.1 Markdown 管线实测（#2，2026-10-14，已验证）

做法：在任务分支上临时加了一个内容集合、一篇演示步骤、一个约 25 行的 remark 插件（把 `![[文件名|宽度]]` 换成 mdast `image` 节点：`url` 是从 Markdown 文件到 `src/assets/screenshots/<文件名>` 的相对路径，宽度写进 `data.hProperties.width`）和三张用 sharp 生成的 800×600 测试图，然后跑 `npx astro build` 和 `astro preview`。实验代码和图片验证后已删除，只保留 `astro.config.mjs` 里的 `rehype-callouts` 配置。版本：astro 7.3.8、@astrojs/markdown-remark 7.3.2、rehype-callouts 2.2.0。

| # | 疑点 | 结论 | 依据 |
| --- | --- | --- | --- |
| 1 | `rehype-callouts` 能否注册 `why` 类型并带出视图属性 | **能，不用自写插件。** 配置 `callouts: { why: { title: '为什么' } }` 即可；输出自带 `data-callout="why"`，CSS 可以用 `[data-callout='why']` 按视图展开或收起；标题文字原样保留在 `.callout-title-text`，足够生成操作视图的“为什么：<原标题>”提示行（design §4.3）。另设 `showIndicator: false`：库默认给 `note`/`caution` 内联 Lucide 图标，和 design §3.3“图标全部自画，不引入图标库”冲突 | 产物：`<div class="callout" data-callout="why" data-collapsible="false"><div class="callout-title"><div class="callout-title-text">为什么：要先装 Git</div></div><div class="callout-content"><p>…</p></div></div>`；`caution`、`note` 同样输出各自的 `data-callout` |
| 2 | 自写 remark 插件生成的图片节点能否进入 Astro 图片处理 | **能，截图放 `src/assets/screenshots/`。** `@astrojs/markdown-remark` 先跑用户的 remark 插件，再跑 `remarkCollectImages`（源码 `dist/index.js`），所以插件生成的相对路径 `image` 节点会被收集并交给图片服务：输出 webp，自动写上 `width`/`height`。`hProperties.width` 被当作目标宽度（按比例算高度，并缩放到该宽度）。引用不存在的文件时构建失败 | 构建日志：`generating optimized images` → `/_astro/demo.CDULYUoC_ZjUVyx.webp …(1/3)`；产物：`<img alt="" loading="lazy" decoding="async" width="262" height="197" src="/_astro/demo.CDULYUoC_ZjUVyx.webp">`，不写宽度的图得到 `width="800" height="600"`；`BASE_PATH=/sub/` 时 `src` 变成 `/sub/_astro/…`；文件不存在时：`[ImageNotFound] Could not find requested image ../../assets/screenshots/missing.jpg`，退出码 1 |
| 3 | 换成 unified 处理器后 Shiki 是否仍默认开启；产物是否引用外部资源 | **Shiki 仍默认开启**（`markdown.syntaxHighlight` 默认 `shiki`，主题 `github-dark`，样式内联，不发外部请求）。产物里的 `https?://` 只剩正文外链和代码块文字；关掉 Callout 图标后，连 SVG 的 `xmlns` 也没有了 | 产物：`<pre class="astro-code github-dark" style="background-color:#24292e;…" data-language="bash">`；`grep -rhoE 'https?://[^"<> ]+' dist --include=*.html` 只输出 `https://docs.astro.build/`（正文链接）和 `https://example.com/install.sh`（代码块里的文字）；非 HTML 产物没有匹配 |
| 4 | 含空格和中文的文件名在第 2 条方案下能否构建和访问 | **能。** 插件写原始文件名或写 `encodeURI` 后的路径都能构建（Astro 收集图片时会 `decodeURI`）；产物文件名保留原名，HTML 里的 `src` 已做百分号编码，预览服务器返回 200 | 产物：`/_astro/Pasted image 20261012190537.DozFJPLc_Z1rF4mv.webp`、`/_astro/微信图片_20261012190537.BvSmf42U_1d0FOd.webp`；`src="/_astro/Pasted%20image%2020261012190537…webp"`、`src="/_astro/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_…webp"`；`curl` 三张图均为 `200 image/webp` |

给 #4 的实现提示：

- 插件按 vfile 路径算出相对路径写进 `image.url`。Astro 会对 `url` 做 `decodeURI`，文件名含 `%` 时原样写会出错，统一写 `encodeURI(相对路径)` 更稳。
- `hProperties` 的键会**原样**成为 `<img>` 属性（写 `dataZoom` 就输出 `dataZoom="true"`），要用 `'data-zoom'` 这样的字面键名。
- 写了显示宽度后，图片服务只生成该宽度的文件，“点开看大图”（design §4.7）会糊。可以同时传 `densities: [1, 2]`（实测生成 1x/2x 的 `srcset`），或另给大图一个链接；由 #4 或负责图片放大的任务决定。
- 输出文件名里的哈希按图片内容计算：两张字节完全相同、名字不同的截图会合并成同一个产物文件（实测两张同色测试图共用 `demo.<hash>.webp`），页面显示不受影响；做测试样例时要用内容不同的图片，否则会误以为文件名没生效。
- `showIndicator: false` 只关掉标题图标：写成可折叠的 `> [!why]-`、`> [!note]+` 时，库仍会输出 `<details>` 和自带的折叠箭头 SVG（`.callout-fold-icon`，源码 `rehype-callouts/dist/index.js` 的 `getFoldIcon`），与 design §3.3 冲突。#4 要么让这类写法构建失败，要么用 `foldIconTagName`/`foldIconProperties` 换掉。上表“没有 SVG”的结论只针对不可折叠写法。
- Shiki 默认主题 `github-dark` 的底色是内联样式（`#24292e`），和 design 里代码块用 `--surface` 令牌冲突，内联样式还会压过令牌。实现代码块样式的任务需要配置 `markdown.shikiConfig` 的主题（例如 CSS 变量主题）。
- 实验插件只匹配单独成段的嵌入：紧跟在同段其他文字后的 `![[…]]` 被当成普通文字原样输出，构建也不报错（实测）。#4 要决定是否支持行内嵌入，并让无法识别的写法构建失败。

#4 的处理（2026-10-14）：`encodeURI`、`'data-zoom'` 字面键、写宽度时加 `densities: [1, 2]`、可折叠 Callout 判为错误、行内嵌入支持、无法识别的写法让构建失败，均已实现；测试样例的截图内容各不相同。Shiki 主题留给代码块样式任务。详见 [architecture.md §3 M1“实现（#4）”](architecture.md)。

## 5. v2.0 补充：logo 转曲（2026-10-15）

需求 FR-70：logo 用开源字体排出文字、按参考图调整字形大小和位置，再转成 SVG 路径；页面不加载字体文件。检索词：`opentype font to svg path node`、`text to svg path`、`fonttools pens svg`。

| 候选 | 覆盖 | 复用方式 | 许可证 | 维护状态 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [opentype.js](https://github.com/opentypejs/opentype.js) 2.0.0 | 读 OTF/TTF，`Font.getPath()`/`getPaths()` 得到逐字形路径，可输出 SVG path data | 开发脚本的依赖（devDependency） | MIT | 最近发布 2026-05-06，仓库 2026-08 仍有提交，约 5k star | **采用**（文档/源码核查）。逐字形取路径，正好做“E 小一号上移、R 下沉”这种单字调整 |
| [text-to-svg](https://github.com/shrhdk/text-to-svg) | 基于 opentype.js 的封装，整串文字转一条路径 | — | GitHub 未识别许可证（NOASSERTION） | 最后提交 2023-09 | 不采用：许可证不明确，而且不便单字调整 |
| [fontTools](https://github.com/fonttools/fonttools) | Python，`SVGPathPen` 可输出路径；还能子集化 | — | MIT | 活跃 | 仅作参考：要多一套 Python 环境，本项目工具链是 Node |

**字体许可**（只在开发机上用于转曲，不入库、不进页面产物）：Cormorant Garamond、Cinzel、Roboto Condensed（google/fonts 的 `ofl/<名称>/OFL.txt`）和思源黑体（adobe-fonts/source-han-sans 的 `LICENSE.txt`）都是 **SIL OFL 1.1**，允许把字形转成路径后嵌入作品发布。定稿换字体时，同样先核对许可证并补进本表。

**定稿（2026-10-15，#24）**：沿用上面四个草稿字体，没有换。脚本用的文件和来源（地址固定到提交，也写在 `scripts/build-logo.mjs` 开头）：

| 用途 | 文件 | 来源 | 许可证 |
| --- | --- | --- | --- |
| “Re”（wght 500；favicon 用 700） | `CormorantGaramond[wght].ttf` | google/fonts `b7c8331` `ofl/cormorantgaramond/` | OFL 1.1 |
| 冒号（wght 900）、ZERO 和 CLAUDE（wght 800） | `Cinzel[wght].ttf` | google/fonts `b7c8331` `ofl/cinzel/` | OFL 1.1 |
| 小号英文（wght 700） | `RobotoCondensed[wght].ttf` | google/fonts `b7c8331` `ofl/robotocondensed/` | OFL 1.1 |
| 中文 | `SourceHanSansCN-Heavy.otf`（SubsetOTF） | adobe-fonts/source-han-sans `a4f7cf9`（release 分支） | OFL 1.1 |

用 opentype.js 2.0 时发现的问题和处理：Google 字体只有可变字体，用 `getPath` 的 `variation` 选项取字重；`Font.getPath` 遇到 Roboto Condensed 的 GSUB（ccmp 链式替换格式 2）会报“不支持”，所以脚本逐字用 `Glyph.getPath` 排版；`Path.toPathData` 遇到 `112.00000000000001` 这类字号会输出 `NaN`，所以路径数据由脚本自己按两位小数写出，并在出现 `NaN` 时报错。

缺口：没有现成工具做“仿某个标题字风格”的版式，这部分是 `scripts/build-logo.mjs` 里的自研排版参数，由作者对照参考图确认（AC-20）。

## 5.1 v3 补充：文档站外观、站内搜索、合并页（2026-10-21）

依据需求 v0.9 §0.1、§0.2。v3 新出现的复用需求只有**站内搜索**（FR-24）；文档站外观由作者限定为“只学参考站、不换框架、不引入现成文档主题”（需求三级边界 Ask first），合并页和旧网址跳转是本项目内容管线的延伸。检索方式：npm registry 元数据（`npm view <包> version license time.modified`，2026-10-21）+ 官方文档；没有克隆、安装或运行第三方代码。结论都是**文档/源码核查**。

检索词：`static site search titles headings client side`、`pagefind astro`、`minisearch` / `flexsearch` / `fuse.js`、`vuepress default theme search headers`。

| 候选 | 覆盖 | 缺口 | 许可证 / 维护 | 结论 |
| --- | --- | --- | --- | --- |
| [Pagefind](https://pagefind.app/) 1.5.2（及 `astro-pagefind` 2.0.1） | 构建后扫 `dist/` 生成分片索引，自带 UI，CJK 分词，不发外部请求 | 定位是**正文全文**搜索，需求把全文搜索列为 v3 非目标；匹配到小标题后要“切到含它的视图再滚动”（FR-24），它的结果只给 URL 和片段，要包一层；构建多一步、产物多几十个文件；新增依赖属于 Ask first | MIT；2026-04 有发布 | 不采用（超出范围） |
| [MiniSearch](https://github.com/lucaong/minisearch) 7.2.0 | 浏览器内倒排索引、前缀和模糊匹配 | 默认按空格分词，中文要自带分词器；数据量只有约 100 条，倒排索引没有收益 | MIT；2025-09 | 不采用 |
| [FlexSearch](https://github.com/nextapps-de/flexsearch) 0.8.212 | 高性能全文索引，可配 CJK 编码 | 同上；0.8 的 API 变动大 | Apache-2.0；2025-09 | 不采用 |
| [Fuse.js](https://github.com/krisk/Fuse) 7.5.0 | 模糊匹配，小数据集合适 | 模糊打分对两三个汉字的查询容易给出不相干的结果；仍是新增依赖 | Apache-2.0；2026-08 | 不采用 |
| VuePress 1.9.10 默认主题的顶栏搜索（`@vuepress/plugin-search`） | **正好是需求要的范围**：只匹配页面标题和 h2/h3，下拉列出“页面 > 小标题”，上下键选、回车打开，`searchMaxSuggestions` 限条数 | Vue 组件，不能直接用在 Astro | MIT；VuePress 1 已停止开发 | **仅作参考**：照它的范围和交互，自己用几十行代码做子串匹配 |
| Starlight 0.42.6 / VitePress | 文档站外壳 + 搜索 | 作者 2026-10-21 选定不换框架、不引入现成文档主题（需求三级边界） | MIT | 结论同 §2，不采用 |

**推荐**：站内搜索**自研、不加依赖**（新模块 M6，见 [architecture.md §13](architecture.md#13-v3-增量架构2026-10-21)）。理由：索引条目约 100 条（41 个原理版页面、16 个参考页，合并后每页几个小标题），整份 JSON 只有几 KB，对全部条目做规范化后的子串匹配就足够快；中文不需要分词；“匹配小标题时切视图再滚动”本来就要自己写。

**文档站外观**：参考 VuePress 1 默认主题的布局（顶栏、`sidebarDepth` 式的小标题列表、只展开当前分组、`prev`/`next` 文字链接、首页 hero），只看文档和参考站的页面，不复制它的样式表；具体尺寸由 design.md v3 定。

**合并页**：机械合并（拼文件、标题降级、去手写页脚、改双链）没有现成工具，和导入脚本共用解析规则，自研为开发脚本 `scripts/merge-rewrite.mjs`。旧网址跳转用 Astro 自带的 `redirects` 做不到“跳到视图对应的小节 + 没有 JS 时显示说明”，改为自己生成跳转页（[ADR-0006](adr/0006-merged-pages-and-moved-urls.md)）。

缺口：没有。中文搜索的匹配质量（例如“时区”能否命中“改时区”）由 M6 的单元测试和 AC-28 覆盖。

## 5.2 v3.2 补充：订阅 Skill（2026-10-26）

依据需求 v0.15 的 FR-100–FR-117（M8）。新的复用需求有四个：Skill 包的格式和校验、各家 Agent 放 Skill 的目录（Q-24）、构建时打 zip、Agent 在读者电脑上非交互地跑一键脚本（Q-22）。检索方式：官方文档 + npm/PyPI 元数据（2026-10-26）+ 读本机 `~/Workspace/reality-setup` 的源码；另在仓库里试跑了一次 Vite 的 `runnerImport`（见下文“已验证”）。没有克隆、安装或运行第三方代码。

检索词：`agentskills.io specification SKILL.md frontmatter`、`skills-ref validate`、`Agent Skills supported agents skills directory Codex Gemini CLI Copilot OpenCode Qwen Code`、`node zip deterministic fflate yazl archiver`、`Windows OpenSSH SSH_ASKPASS SSH_ASKPASS_REQUIRE force`。

### 格式与校验

| 候选 | 覆盖 | 缺口 | 许可证 / 维护 | 结论 |
| --- | --- | --- | --- | --- |
| [Agent Skills 规范](https://agentskills.io/specification) | 目录 = `SKILL.md` + 可选 `references/`、`scripts/`、`assets/`；frontmatter 必填 `name`（1–64 字符，小写字母、数字和单个连字符，不以连字符开头结尾，**必须和目录名相同**）、`description`（1–1024 字符）；可选 `license`、`compatibility`（≤500）、`metadata`（字符串到字符串的映射）、`allowed-tools`（实验）；正文建议 <500 行、<5000 token，参考文件只从 `SKILL.md` 引一层 | 没有规定版本号字段，放进 `metadata` | 开放规范 | **采用**（文档核查）。需求 FR-100 的格式就是它 |
| [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref)（PyPI 0.1.1；npm 上另有同名包 0.1.5，来源未核实） | 官方参考校验器 `skills-ref validate <目录>`，查 frontmatter 和命名 | Python 工具，本项目工具链是 Node；只查 frontmatter，不查 FR-113 的其他几条（参考文件存在、Obsidian 写法残留、凭据） | 官方仓库；版本很新 | **仅作人工核对**（AC-40 “用校验工具检查通过”在交付时跑一次 `uvx skills-ref validate`）；构建里按规范自己实现同样的规则（约 30 行），不加 Python 依赖 |

### 各家 Agent 放 Skill 的目录（Q-24，官方文档核查）

| Agent | 用户级目录 | 说明 | 来源 |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/skills/<name>/` | 另有一批 Claude Code 独有的 frontmatter 字段，不认识的字段会被忽略；订阅 Skill 只用规范字段 | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/<name>/` | 说明基于开放的 Agent Skills 标准；`agents/openai.yaml` 是可选的 Codex 专用元数据，不需要 | [learn.chatgpt.com/docs/build-skills](https://learn.chatgpt.com/docs/build-skills) |
| Gemini CLI | `~/.gemini/skills/` 或别名 `~/.agents/skills/` | 有 `/skills enable/disable`；文档没写默认是否启用 | [geminicli.com/docs/cli/skills](https://geminicli.com/docs/cli/skills/) |
| Qwen Code | `~/.qwen/skills/` 或 `~/.agents/skills/` | 文档没写“遵循 Agent Skills 规范”，但格式相同（目录 + `SKILL.md` + YAML frontmatter）；国内直接能用 | [qwenlm.github.io/qwen-code-docs](https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/) |
| OpenCode | `~/.config/opencode/skills/`、`~/.claude/skills/`、`~/.agents/skills/` | 命名规则和规范一致（`^[a-z0-9]+(-[a-z0-9]+)*$`，必须等于目录名） | [opencode.ai/docs/skills](https://opencode.ai/docs/skills/) |

结论：**两个目录覆盖五家**——`~/.agents/skills/`（Codex、Gemini CLI、Qwen Code、OpenCode）和 `~/.claude/skills/`（Claude Code、OpenCode）。Skill 页按这两个目录写安装方法，再列出各家自己的目录作补充。GitHub Copilot、Cursor、Kimi CLI、Trae 等**本次未核实**官方文档，不写进 Skill 页。

人工验收（AC-43）选两家**读者在订阅成功之前就用得上**的：**Claude Code 接国内模型的 API**（读者群里最常见的用法）和 **Qwen Code**。Codex、Gemini CLI 要先能连上海外服务，作为补充。

### 打 zip

| 候选 | 覆盖 | 许可证 / 维护 | 结论 |
| --- | --- | --- | --- |
| [fflate](https://github.com/101arrowz/fflate) 0.8.3 | 纯 JS、零依赖，`zipSync` 一次生成整个 zip，可给每个文件固定 `mtime`，输出可重复 | MIT；2026-07 有发布 | **采用**（文档核查）。和 Astro、yaml 一样放进 `dependencies`（部署构建要用） |
| [archiver](https://github.com/archiverjs/node-archiver) 8.0.0 | 流式打包，功能最全 | MIT；2026-05 | 不采用：依赖树大，流式接口对几十 KB 的包没有收益 |
| [yazl](https://github.com/thejoshwolfe/yazl) 3.3.1 | 小巧的流式 zip 写入 | MIT；2024-11 | 不采用：维护较慢，流式接口同上 |
| JSZip 3.10.2 | 读写都支持 | MIT 或 GPL-3.0 | 不采用：异步接口、体积大，只需要写 |
| 自己写（`node:zlib` 的 `deflateRawSync` + `crc32`） | 不加依赖 | — | 不采用：zip 的中央目录、本地头和 Windows 资源管理器的兼容细节容易写错，省一个 8 KB 的依赖不值得 |

### 在构建外运行 TypeScript 的生成逻辑（已验证）

生成器要和站点共用 `src/lib/content/link-index.ts`（标题 → 页面标识、小标题 → 锚点）和 `src/lib/route/`。这些模块用不带扩展名的相对导入，Node 24 自带的类型剥离跑不了。**Vite 8.3.4 自带的 `runnerImport`**（Astro 已经依赖它）能按 Vite 的解析规则加载这些 TS 模块：2026-10-26 在仓库里试跑，`createLinkIndex()` 读出 18 个页面，正常。所以开发脚本 `scripts/build-skill.mjs` 用它加载 `src/lib/agent-skill/`，不加 `tsx` 之类的新依赖（**已验证**）。

### 一键脚本能不能非交互地跑（Q-22，源码核查）

读的是 `reality-setup` v2.0.1 的 `setup.sh`：

- 所有提问都在安装开始之前、用 `read -rp` 从标准输入读：①只有服务器上已经有 `/etc/x-ui` 时才问“删掉旧的重新装吗”；②服务器 IP 对不对（回车接受）；③住宅代理 IP（方案二回车跳过）；④填了住宅代理 IP 才继续问端口、用户名、密码。脚本注释写明“真正删除放在所有问题问完之后”。
- `read -p` 的提示只在标准输入是终端时显示；用管道喂答案时**看不到提问，但答案照常读入**。所以 Agent 要先用只读命令查 `/etc/x-ui` 在不在，再按上面的顺序拼答案。
- Debian 11 升级用 `DEBIAN_FRONTEND=noninteractive` 和 `--force-confold`，不弹对话框；之后的 `apt install -y` 没设这个变量，但到那时标准输入已经读完（EOF），debconf 会取默认值。
- 结论：**源码上看能跑通，不需要改 `reality-setup`**；Debian 11 升级要 5–15 分钟，会超过多数 Agent 单条命令的超时，所以放到服务器后台跑、再看日志（[architecture.md §16.6](architecture.md#166-代办在读者电脑上怎么做)）。还没在真服务器上跑过，留给 AC-44 的人工验收；跑不通再按需求的 Ask first 去改 `reality-setup`。

### SSH 怎么用读者贴来的密码（Q-26，新）

Agent 执行命令时没有终端，`ssh` 的密码提示读的是 `/dev/tty`，会卡住。候选：

| 做法 | 适用 | 问题 | 结论 |
| --- | --- | --- | --- |
| `SSH_ASKPASS` + `SSH_ASKPASS_REQUIRE=force`（OpenSSH ≥ 8.4），指向临时目录里一个只输出密码的小脚本 | macOS（系统自带 OpenSSH 9.x）、Linux | 密码要短暂落盘（权限 600、放系统临时目录、收尾删掉，符合 FR-108） | **采用**为首选（[OpenSSH 8.4 发布说明](https://www.openssh.com/txt/release-8.4)，文档核查） |
| 同上，Windows 自带的 Win32-OpenSSH | Windows | **没查到官方说明它是否支持 `SSH_ASKPASS_REQUIRE`**；askpass 程序要是 `.cmd` 能否被直接调起也没核实 | 待验证（Q-26），不能定为已采用 |
| 临时密钥：Agent 生成一对临时密钥，读者在自己的终端里跑**一条**命令（自己输一次密码）把公钥加到服务器，之后 Agent 用密钥；收尾时从 `authorized_keys` 删掉这一行、删掉本地私钥 | 三个系统都行，密码不经过 Agent | 读者要自己敲一条命令；会改服务器（要先征得同意，FR-106） | **采用**为退路：askpass 不可用（Windows 未验证、读者不想贴密码）时用它 |
| `sshpass` | Linux、macOS 需另装 | 要装软件；密码出现在命令行或环境变量里 | 不采用 |

### 推荐方向与缺口

- **自研**生成器、校验和 Skill 页（模块 M8），复用 M1 的链接索引和 M2 的路线图；只新增 `fflate` 一个依赖。
- Skill 内容只用规范字段，版本号和重写稿指纹放 `metadata`；Skill 页的安装方法写两个通用目录。
- 缺口：Windows 上 askpass 是否可用（Q-26）、一键脚本在真服务器上的非交互运行（Q-22）都要在测试服务器和 Windows 机器上人工验证；在那之前 Skill 里两条路都写上。

## 6. 证据链接

- Material for MkDocs 维护期：<https://discuss.privacyguides.net/t/mkdocs-material-is-now-in-maintenance-mode/32736>
- Zensical 路线图：<https://zensical.org/about/roadmap/>
- Astro Markdown 与 Sätteri：<https://docs.astro.build/en/guides/markdown-content/>
- Astro 内容集合：<https://docs.astro.build/en/guides/content-collections/>
- Astro 配置（`base`、`trailingSlash`、`build.format`）：<https://docs.astro.build/en/reference/configuration-reference/>
- Starlight frontmatter（`prev`/`next`）：<https://starlight.astro.build/reference/frontmatter/>
- Starlight 0.41/Astro 7：<https://astro.build/blog/whats-new-june-2026/>
- VitePress 状态：<https://www.opentechhub.io/vitepress/>
- Google Codelabs tools（已归档）：<https://github.com/googlecodelabs/tools>
- TutorialKit：<https://github.com/stackblitz/tutorialkit>
- rehype-callouts：<https://npmjs.com/package/rehype-callouts>
- Astro 中的 Callout 插件对比：<https://eikowagenknecht.com/posts/how-to-add-obsidian-style-callouts-to-astro/>
- 第三方门面模式：<https://web.dev/third-party-facades>
- B 站嵌入参数（社区）：<https://meta.discourse.org/t/discourse-embed-bilibili/282491>
- npm registry 元数据：2026-10-13 用 `npm view <包> version license` 查询
- opentype.js `Font.getPath()`：<https://github.com/opentypejs/opentype.js#fontgetpathtext-x-y-fontsize-options>（2026-10-15）
- 字体许可：<https://github.com/google/fonts/tree/main/ofl/cinzel>、<https://github.com/google/fonts/tree/main/ofl/cormorantgaramond>、<https://github.com/google/fonts/tree/main/ofl/robotocondensed>、<https://github.com/adobe-fonts/source-han-sans/blob/release/LICENSE.txt>（2026-10-15）
- v3 搜索候选（2026-10-21）：<https://pagefind.app/docs/>、<https://github.com/lucaong/minisearch>、<https://github.com/nextapps-de/flexsearch>、<https://github.com/krisk/Fuse>；npm registry 元数据 2026-10-21 查询
- VuePress 1 默认主题（搜索范围、侧边栏、首页）：<https://v1.vuepress.vuejs.org/theme/default-theme-config.html>；参考站：<https://docs.wallpaperengine.io/en/scene/first/gettingstarted.html>
- v3.2 订阅 Skill（2026-10-26）：<https://agentskills.io/specification>、<https://github.com/agentskills/agentskills/tree/main/skills-ref>、<https://code.claude.com/docs/en/skills>、<https://learn.chatgpt.com/docs/build-skills>、<https://geminicli.com/docs/cli/skills/>、<https://qwenlm.github.io/qwen-code-docs/en/users/features/skills/>、<https://opencode.ai/docs/skills/>、<https://github.com/101arrowz/fflate>、<https://www.openssh.com/txt/release-8.4>、<https://lists.mindrot.org/pipermail/openssh-bugs/2020-December/022174.html>（Windows 上 askpass 的讨论）；npm/PyPI 元数据 2026-10-26 查询；`reality-setup` 源码为本机 `~/Workspace/reality-setup` 的 v2.0.1
