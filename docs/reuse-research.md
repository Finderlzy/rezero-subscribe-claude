# 复用调研：Re:从零开始订阅 claude

- 检索日期：2026-10-13
- 依据：[CONTEXT.md](../CONTEXT.md)、[docs/requirements.md](requirements.md)（v0.1）
- 检索方式：网页检索 + 官方文档 + npm registry 元数据（`npm view`）。本机没有 `gh`，没有用 GitHub API；没有克隆、安装或运行任何第三方代码。
- v2.0 补充（2026-10-15）：只为新增的 logo 转曲需求补做检索，见 §5；其余能力没有新的复用需求，沿用下文结论。本次用 `gh api` 和 npm registry 查询。
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
| 站内搜索 | `pagefind` 1.5.2 | 静态全文搜索 | MIT | 首期不需要，不引入 |

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

缺口：没有现成工具做“仿某个标题字风格”的版式，这部分是 `scripts/build-logo.mjs` 里的自研排版参数，由作者对照参考图确认（AC-20）。

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
