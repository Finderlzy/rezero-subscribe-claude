# Astro 静态站 + 自建路线图，不用文档主题

- 状态：accepted（2026-10-13）

引导站的核心是“按读者选择的路线计算上一步/下一步”。现成的文档站方案（作者博客用的 Material for MkDocs、Starlight、VitePress）都按固定的导航顺序分页：Starlight 的 `prev`/`next` 只能写静态值，Material for MkDocs 的关键修复支持也在 2026-11 前后结束。所以我们用 Astro 7 的静态输出、不加文档主题，自己写路线图模块（M2）。M2 是不依赖文件系统和浏览器的纯函数，构建时用它生成默认导航并校验路线，浏览器里用同一份代码按本机保存的选择改写链接。

## Considered Options

- **沿用博客的 MkDocs + Material**：作者熟悉，但即将停止维护，而且没有动态导航的入口。
- **Starlight 覆盖组件**：要覆盖分页、侧栏、页面骨架，最后剩下能复用的只有外壳。
- **Eleventy**：可行，但内容校验、图片处理、TypeScript 都要自己搭。

## Consequences

- 页面、样式、目录都要自己写，所以首期多了视觉设计的工作量，见 [design.md](../design.md)。
- 不运行 JS 时，只能看到默认路线和当前页所属分支的导航；本机保存的选择要靠页面脚本生效。
- Astro 7 默认的 Markdown 处理器 Sätteri 不兼容 remark/rehype 插件，所以要显式改用 unified 处理器。
