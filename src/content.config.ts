import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { choiceSchema, faqSchema, operationSchema, pageSchema, principleSchema, referenceSchema, stepSchema } from './lib/content/schemas';

/**
 * M1 内容集合（架构 §3 M1）。每个集合一层目录、每个文件一项；
 * 条目标识就是文件名去掉 .md，与链接索引（src/lib/content/link-index.ts）和 URL 一致。
 */
function markdownIn(dir: string, pattern = '*.md') {
  return glob({
    pattern,
    base: `./src/content/${dir}`,
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
    // 推迟到页面渲染时再处理 Markdown：同步阶段渲染的结果按“本文件”的摘要缓存，
    // 目标步骤改了标题而引用方没改时，缺省链接文字会一直是旧的。
    deferRender: true,
  });
}

export const collections = {
  steps: defineCollection({ loader: markdownIn('steps'), schema: stepSchema }),
  choices: defineCollection({ loader: markdownIn('choices'), schema: choiceSchema }),
  faq: defineCollection({ loader: markdownIn('faq'), schema: faqSchema }),
  pages: defineCollection({ loader: markdownIn('pages'), schema: pageSchema }),
  // v2.0（架构 §3 M1、ADR-0005）：正文由 scripts/import-rewrite.mjs 从重写稿原样导入。
  // 参考页带一层子目录（ip-tests/<id>），标识保留相对路径，与 URL /ip-tests/<id>/ 一致。
  principle: defineCollection({ loader: markdownIn('principle'), schema: principleSchema }),
  operation: defineCollection({ loader: markdownIn('operation'), schema: operationSchema }),
  reference: defineCollection({ loader: markdownIn('reference', '**/*.md'), schema: referenceSchema }),
};
