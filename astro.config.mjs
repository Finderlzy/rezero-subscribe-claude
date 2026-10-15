// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { contentValidation } from './src/lib/content/integration';
import { createLinkIndex } from './src/lib/content/link-index';
import { markdownPipeline } from './src/lib/content/markdown';

const base = process.env.BASE_PATH ?? '/';
const contentRoot = fileURLToPath(new URL('./src/content/', import.meta.url));
// 每篇文档处理前重新扫描文件名（几十个文件，开销很小），开发时新增的步骤或截图不用重启就能被找到。
const linkIndex = () => createLinkIndex(contentRoot);

// M5 构建配置（架构 §3 M5）。站内链接一律用 src/lib/with-base.ts 生成。
export default defineConfig({
  output: 'static',
  base,
  site: process.env.SITE_URL,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // 构建开始时检查全部内容的双链、嵌入和 Callout，有问题就终止构建（FR-61）；
  // 路线图在页面调用 loadSite() 时校验（src/lib/site.ts）。构建结束时列出内容提示（FR-21）。
  integrations: [contentValidation({ base, linkIndex })],
  markdown: {
    // 默认的 Sätteri 不兼容 remark/rehype 插件，所以用 unified 处理器；Shiki 高亮仍默认开启（reuse-research §4.1）。
    // 插件和 rehype-callouts 的配置见 src/lib/content/markdown.ts（M1 Obsidian 写法插件）。
    processor: unified(markdownPipeline({ base, linkIndex })),
  },
});
