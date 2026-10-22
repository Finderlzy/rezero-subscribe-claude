import type { MarkdownHeading } from 'astro';

/**
 * 侧边栏当前页下面列出的小节（design v3 §4.5，FR-16）：只取正文的 h2。
 * v3 页面固定原理视图（用户 2026-10-22 决定，架构 §13.12），所以只有一份列表、没有操作版。
 */
export interface TocSection {
  slug: string;
  text: string;
}

/** 从 `render()` 返回的 headings 里取出这一页的小节；h1、h3 及以下不进侧边栏。 */
export function tocSections(headings: readonly MarkdownHeading[]): TocSection[] {
  return headings.filter((heading) => heading.depth === 2).map(({ slug, text }) => ({ slug, text }));
}
