# 复用调研：Re:从零开始订阅 claude

- 检索日期：2026-10-13
- 依据：[CONTEXT.md](../CONTEXT.md)、[docs/requirements.md](requirements.md)（v0.1）
- 检索方式：网页检索 + 官方文档 + npm registry 元数据（`npm view`）。本机没有 `gh`，没有用 GitHub API；没有克隆、安装或运行任何第三方代码。
- 结论标记：**文档/源码核查** = 只读过 README、官方文档或 npm 元数据，没有实际运行过；**已验证** = 在本项目里跑通过（本次没有这一类）。

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
| Obsidian Callout | `rehype-callouts` 2.2.0 | 支持 Obsidian 主题和 `[!type]` 语法，可以用 `<details>` 折叠，不需要 JS；纯 ESM，Node ≥ 18 | MIT；2026-06 有更新 | **采用**（文档核查）。首个切片要核实：能否注册自定义类型 `why`，以及输出能不能加上视图属性 |
| Obsidian Callout | `remark-obsidian-callout` 1.5.1 | 能用 | Apache-2.0；最后更新 2024-10 | 备选 |
| Obsidian Callout | `@r4ai/remark-callout` 0.6.2 | 标题里可以写行内元素 | MIT；最后更新 2024-09 | 备选 |
| 双链 / 嵌入 | `@flowershow/remark-wiki-link` 4.0.0 | 解析 `[[...]]` | MIT；2026-06 有更新 | **仅作参考**：本项目的双链要按步骤和常见问题标识解析，找不到目标时要让构建失败（FR-61），这部分逻辑现成插件给不了，自己写一个小 remark 插件更直接 |
| 双链 / 嵌入 | `remark-obsidian`（heavycircle） | 支持链接、嵌入、Callout | MIT；1 star，2025-05 后无提交 | 不采用：维护不足 |
| 视频门面 | `lite-youtube-embed`（Paul Irish） | web.dev 推荐的门面模式实现；默认用 youtube-nocookie | 开源（未核实具体许可证） | **仅作参考**：它会从 `i.ytimg.com` 加载封面图，国内打不开，而且等于点击前就请求了第三方（NFR-03、NFR-04）。采用它的思路，自己写一个不发外部请求的门面 |
| 单元测试 | `vitest` 5.0.4 | Node `^22.12 \|\| ^24 \|\| >=26` | MIT；活跃 | 采用 |
| 端到端测试 | `@playwright/test` 1.64.0 | 可以设置视口、拦截域名，正好用来测 AC-16、AC-17 | Apache-2.0；活跃 | 采用 |
| 类型检查 | `@astrojs/check` 0.9.10 | peer 依赖 `typescript ^5 \|\| ^6`，而 TypeScript 最新版已经是 7.0.2 | MIT | 采用，**TypeScript 固定 6.x**，安装时再核实一遍 |
| 站内搜索 | `pagefind` 1.5.2 | 静态全文搜索 | MIT | 首期不需要，不引入 |

## 4. 推荐方向与缺口

- **推荐**：Astro 7（静态输出，不用文档主题）+ unified Markdown 处理器 + `rehype-callouts`。路线图、双链解析、视图切换、视频门面、目录、本机状态都自己写；这些正是项目的核心逻辑，现成方案都没有覆盖。
- **自研部分**：M2 路线（含构建校验）、Obsidian 双链和嵌入解析、视图切换、视频门面、步骤目录、M4 本机状态、全部页面和视觉设计。
- **缺口 / 待实施核实**：
  1. `rehype-callouts` 能否注册自定义 `why` 类型并输出视图属性（不行的话自己写一个约 50 行的 rehype 插件）；
  2. 自定义 remark 插件生成的图片节点，能否进入 Astro 的图片处理流程（不行的话把截图放进 `public/`，用普通 `<img>` 输出）；
  3. B 站嵌入参数（`bvid`、是否自动播放）没有官方文档，只有社区说法，实施时要在浏览器里实测；
  4. 换成 unified 处理器以后，Shiki 代码高亮是否仍然默认开启。
- 架构设计见 [architecture.md](architecture.md)，设计调研见 [design.md](design.md)。

## 5. 证据链接

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
