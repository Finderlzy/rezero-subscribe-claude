// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

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
    // 默认的 Sätteri 不兼容 remark/rehype 插件；插件在 #2/#4 接入。
    processor: unified(),
  },
});
