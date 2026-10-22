import { render } from 'astro:content';
import type { APIRoute } from 'astro';
import { buildSearchIndex, type SearchSource } from '../lib/search';
import { loadSite, searchPageIds, searchReferences } from '../lib/site';

/**
 * 站内搜索索引（FR-24、架构 §13.2）：构建时生成 `search-index.json`，随站点一起发布，
 * 浏览器取到后只在本地匹配，输入的文字不离开浏览器。
 *
 * 范围是路线图里的全部页面（步骤、选择页、分叉的各个选项和旁支页）和保留的参考页
 * （IP 质量实测合集与各篇实测）。首页、找不到页、跳转页（V09 的 `moved:`）不进索引。
 */
export const GET: APIRoute = async () => {
  const site = await loadSite();
  const sources: SearchSource[] = [];
  let order = 0;

  for (const id of searchPageIds(site.route)) {
    const page = site.pages.get(id);
    if (!page) throw new Error(`src/content/principle/${id}.md：路线图里的页面没有内容`);
    const { headings } = await render(page.principle);
    sources.push({ path: `/${id}/`, title: page.title, order: order++, headings });
  }

  for (const reference of searchReferences(site.references)) {
    const { headings } = await render(reference.entry);
    sources.push({ path: `/${reference.id}/`, title: reference.title, order: order++, headings });
  }

  return new Response(JSON.stringify(buildSearchIndex(sources)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
