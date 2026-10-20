// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { contentValidation } from './src/lib/content/integration';
import { createLinkIndex } from './src/lib/content/link-index';
import { markdownPipeline } from './src/lib/content/markdown';
import { REMOVED_PAGES } from './src/lib/route/route-map';
import { joinBase } from './src/lib/with-base';

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
  // 已删除页面的旧地址（ADR-0002：已发布的 URL 不能失效）生成跳转页。Astro 不给跳转目标拼 base，所以这里自己拼。
  redirects: Object.fromEntries(
    Object.entries(REMOVED_PAGES).map(([from, to]) => [`/${from}/`, joinBase(base, `${to}/`)]),
  ),
  build: {
    format: 'directory',
  },
  // 构建开始时检查全部内容的双链、嵌入和 Callout，有问题就终止构建（FR-61）；
  // 路线图在页面调用 loadSite() 时校验（src/lib/site.ts）。构建结束时列出内容提示（FR-21）。
  // sitemap 要有 site 才生成（部署时由 SITE_URL 给出）；找不到页不进 sitemap。
  integrations: [
    contentValidation({ base, linkIndex }),
    sitemap({ filter: (page) => !new URL(page).pathname.endsWith('/404/') }),
  ],
  markdown: {
    // 默认的 Sätteri 不兼容 remark/rehype 插件，所以用 unified 处理器（reuse-research §4.1）。
    // 插件和 rehype-callouts 的配置见 src/lib/content/markdown.ts（M1 Obsidian 写法插件）。
    processor: unified(markdownPipeline({ base, linkIndex })),
    // 不做语法高亮（v2.2 W4c，design §4.7）：代码块是 --surface-muted 底、正文色的单色块。Shiki 会写内联的深色底和
    // 各段颜色，浅底上对比度不够（a11y.spec 的 axe 扫描），深浅两套主题又各要一份配色。
    syntaxHighlight: false,
  },
});
