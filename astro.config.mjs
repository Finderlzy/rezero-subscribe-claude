// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeCallouts from 'rehype-callouts';

// M5 构建配置（架构 §3 M5）。站内链接一律用 src/lib/with-base.ts 生成。
export default defineConfig({
  output: 'static',
  base: process.env.BASE_PATH ?? '/',
  site: process.env.SITE_URL,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  markdown: {
    // 默认的 Sätteri 不兼容 remark/rehype 插件，所以用 unified 处理器；Shiki 高亮仍默认开启（reuse-research §4.1）。
    // M1 的 remark-obsidian 插件由 #4 加进 remarkPlugins。
    processor: unified({
      rehypePlugins: [
        [
          rehypeCallouts,
          {
            // 不用库自带的 Lucide 标题图标（design §3.3：图标全部自画，不引入图标库）。
            // 注意：可折叠写法 [!type]- / [!type]+ 仍会插入库自带的折叠箭头 SVG，由 #4 决定禁用或替换。
            showIndicator: false,
            // 原理块 > [!why]（ADR-0003）：输出 data-callout="why"，由 CSS 按视图展开或收起。
            callouts: { why: { title: '为什么' } },
          },
        ],
      ],
    }),
  },
});
