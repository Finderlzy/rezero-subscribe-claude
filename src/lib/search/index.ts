import type { MarkdownHeading } from 'astro';
import { withBase } from '../with-base';

/**
 * M6 站内搜索（FR-24、架构 §13.2）：把页面标题和正文的 h2、h3 变成一份小索引，
 * 在浏览器里按读者输入找出最多 10 条结果。这里只有纯函数，规范化、排序都藏在里面。
 *
 * 索引在构建时由 `src/pages/search-index.json.ts` 用 `buildSearchIndex()` 生成；
 * 浏览器取到后只调用 `search()`，输入的文字不离开浏览器。
 */

/** 构建时的一个页面：页面路径、页面标题、目录顺序和正文的标题。 */
export interface SearchSource {
  /** 站内路径：页面是 `/<id>/`，参考页是 `/ip-tests/<id>/` */
  path: string;
  title: string;
  /** 目录顺序：同分时靠前的排前面 */
  order: number;
  headings: readonly MarkdownHeading[];
}

/**
 * 索引里的一条。页面标题本身算一条（没有 `heading`、`slug`），
 * 每个 h2、h3 各算一条；同一小标题出现在多个页面时各算一条。
 * 小标题条目的 `heading` 和 `slug` 成对出现，用判别联合保证不会只有其中一个。
 */
export type SearchEntry =
  | { path: string; pageTitle: string; order: number }
  | { path: string; pageTitle: string; heading: string; slug: string; order: number };

/** `href` 已经拼上部署根路径，页面标题命中不带锚点。 */
export interface SearchHit {
  entry: SearchEntry;
  href: string;
}

/** 索引里只收正文的 h2、h3（FR-24）。 */
const HEADING_DEPTHS = new Set([2, 3]);

/** 查询和条目文字都按这个规范化：全角半角、大小写和空白都不影响匹配。 */
function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/**
 * 构建时生成索引：每页先出一条页面标题，再给每个非空文字的 h2、h3 各出一条。
 * 顺序沿用来源顺序（页面按目录、参考页排在各章后面）。
 */
export function buildSearchIndex(sources: readonly SearchSource[]): SearchEntry[] {
  const index: SearchEntry[] = [];
  for (const source of sources) {
    index.push({ path: source.path, pageTitle: source.title, order: source.order });
    for (const heading of source.headings) {
      if (!HEADING_DEPTHS.has(heading.depth)) continue;
      if (heading.text.trim() === '') continue;
      index.push({
        path: source.path,
        pageTitle: source.title,
        heading: heading.text,
        slug: heading.slug,
        order: source.order,
      });
    }
  }
  return index;
}

/**
 * 浏览器里匹配。条目包含查询就算命中：页面标题条目只看标题，小标题条目只看小标题，
 * 所以标题命中不会把同一页的小标题重复列一遍。排序依次是
 * 页面标题 > 小标题、开头命中 > 中间命中、目录顺序；默认最多 10 条。
 */
export function search(index: readonly SearchEntry[], query: string, limit = 10): SearchHit[] {
  const needle = normalizeSearchText(query);
  if (needle === '' || limit <= 0) return [];

  const hits: { entry: SearchEntry; href: string; field: number; at: number }[] = [];
  for (const entry of index) {
    if ('heading' in entry) {
      const at = normalizeSearchText(entry.heading).indexOf(needle);
      if (at === -1) continue;
      hits.push({ entry, href: withBase(`${entry.path}#${entry.slug}`), field: 1, at });
    } else {
      const at = normalizeSearchText(entry.pageTitle).indexOf(needle);
      if (at === -1) continue;
      hits.push({ entry, href: withBase(entry.path), field: 0, at });
    }
  }

  hits.sort((a, b) => a.field - b.field || Number(a.at > 0) - Number(b.at > 0) || a.entry.order - b.entry.order);
  return hits.slice(0, limit).map(({ entry, href }) => ({ entry, href }));
}
