// @ts-check
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { contentValidation } from './src/lib/content/integration';
import { createLinkIndex } from './src/lib/content/link-index';
import { markdownPipeline } from './src/lib/content/markdown';
import { movedEntries } from './src/lib/route/route-map';
import { parseRouteYaml } from './src/lib/route/route-yaml';
import { gitLastModified, sitemapLastmods, sitemapSources } from './src/lib/sitemap/lastmod';
import { joinBase } from './src/lib/with-base';

const base = process.env.BASE_PATH ?? '/';
const contentRoot = fileURLToPath(new URL('./src/content/', import.meta.url));
// 每篇文档处理前重新扫描文件名（几十个文件，开销很小），开发时新增的步骤或截图不用重启就能被找到。
const linkIndex = () => createLinkIndex(contentRoot);
// 跳转表的旧地址（FR-25、ADR-0006）：旧网址仍然由 [page].astro 生成跳转页，但不进 sitemap。
// 这里只为过滤读一遍 route.yaml，解析和报错和构建期共用 route-yaml.ts；moved 的形状、目标页和小节由 M2、site.ts 校验。
const routeSpec = parseRouteYaml(readFileSync(fileURLToPath(new URL('./src/content/route.yaml', import.meta.url)), 'utf8'));
const movedPaths = new Set(movedEntries(routeSpec).map((entry) => joinBase(base, `${entry.from}/`)));
// sitemap 的 lastmod（2026-10-23）：每条网址写源文件最后一次提交的日期，谷歌据此安排重抓。
// 没有 git 历史时（构建夹具的临时目录、代码压缩包）这些页面就不写 lastmod，不拿构建时间凑数。
const repoRoot = fileURLToPath(new URL('./', import.meta.url));
const lastmods = sitemapLastmods(
  sitemapSources({ repoRoot, contentRoot, pagesRoot: fileURLToPath(new URL('./src/pages/', import.meta.url)), base }),
  (file) => gitLastModified(repoRoot, file),
);

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
  // sitemap 要有 site 才生成（部署时由 SITE_URL 给出）；找不到页和跳转页不进 sitemap，其余补上 lastmod。
  integrations: [
    contentValidation({ base, linkIndex }),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        // 整条路径比较（含 base），不用 endsWith：否则 /ip-tests/<旧标识>/ 这类地址会被误伤
        return !pathname.endsWith('/404/') && !movedPaths.has(pathname);
      },
      serialize: (item) => {
        const lastmod = lastmods.get(new URL(item.url).pathname);
        return lastmod === undefined ? item : { ...item, lastmod };
      },
    }),
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
