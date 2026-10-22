import { describe, expect, it } from 'vitest';
import { buildSearchIndex, search, type SearchHit } from '../lib/search';
import { highlightSegments, moveActive, searchPanel } from './search';

// V08 顶栏搜索框（FR-24、AC-28、design §4.8）：这些纯函数只管“下拉里显示什么”，
// DOM 部分在 search.ts 的 initSearch 里。匹配、排序和最多 10 条由 M6（src/lib/search/）负责。

const pageHit = (path: string, pageTitle: string): SearchHit => ({ entry: { path, pageTitle, order: 0 }, href: path });
const headingHit = (path: string, pageTitle: string, heading: string, slug: string): SearchHit => ({
  entry: { path, pageTitle, heading, slug, order: 0 },
  href: `${path}#${slug}`,
});

describe('highlightSegments：匹配到的文字加粗（design §4.8）', () => {
  it('命中开头、中间、结尾时切开，只有命中的一段是 match', () => {
    expect(highlightSegments('改时区', '改')).toEqual([
      { text: '改', match: true },
      { text: '时区', match: false },
    ]);
    expect(highlightSegments('改时区', '时区')).toEqual([
      { text: '改', match: false },
      { text: '时区', match: true },
    ]);
    expect(highlightSegments('改时区', '时')).toEqual([
      { text: '改', match: false },
      { text: '时', match: true },
      { text: '区', match: false },
    ]);
  });

  it('大小写、全角半角和空白都不影响命中（和 M6 的规范化一致）', () => {
    // 全角“ＩＰ”在索引里和 ip 一样能搜到，下拉里也要加粗整段
    expect(highlightSegments('ＩＰ 地址', 'ip')).toEqual([
      { text: 'ＩＰ', match: true },
      { text: ' 地址', match: false },
    ]);
    expect(highlightSegments('IP 质量', 'ip')).toEqual([
      { text: 'IP', match: true },
      { text: ' 质量', match: false },
    ]);
    // 查询里带空白：规范化去掉空白后仍命中，加粗覆盖完整的原始片段
    expect(highlightSegments('改 时区', '改 时区')).toEqual([{ text: '改 时区', match: true }]);
  });

  it('没命中或查询为空时整段原样返回', () => {
    expect(highlightSegments('改时区', 'zzzz')).toEqual([{ text: '改时区', match: false }]);
    expect(highlightSegments('改时区', '')).toEqual([{ text: '改时区', match: false }]);
    expect(highlightSegments('改时区', '   ')).toEqual([{ text: '改时区', match: false }]);
  });
});

describe('highlightSegments 和 M6 的匹配口径一致', () => {
  it('M6 判定命中的条目，下拉里的高亮至少有一段 match（两边规范化漂移时会失败）', () => {
    const index = buildSearchIndex([
      { path: '/timezone/', title: '改时区', order: 0, headings: [] },
      {
        path: '/ip-tests/voyracloud/',
        title: '实测：VoyraCloud 住宅服务器',
        order: 1,
        headings: [{ depth: 2, slug: '我的第一台', text: '我的第一台' }],
      },
    ]);
    const queries = ['时区', '我的', 'voyracloud', 'ＶＯＹＲＡ'];
    for (const query of queries) {
      const hits = search(index, query);
      expect(hits.length, query).toBeGreaterThan(0);
      for (const hit of hits) {
        const field = 'heading' in hit.entry ? hit.entry.heading : hit.entry.pageTitle;
        expect(
          highlightSegments(field, query).some((segment) => segment.match),
          `${query} / ${field}`,
        ).toBe(true);
      }
    }
  });
});

describe('moveActive：上下键在结果之间移动', () => {
  it('还没选中时，下键选第一条，上键选最后一条', () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
  });

  it('到两头就停住，不绕着转', () => {
    expect(moveActive(0, 1, 3)).toBe(1);
    expect(moveActive(2, 1, 3)).toBe(2);
    expect(moveActive(0, -1, 3)).toBe(0);
  });

  it('没有结果时保持没选中', () => {
    expect(moveActive(-1, 1, 0)).toBe(-1);
    expect(moveActive(2, 1, 0)).toBe(-1);
  });
});

describe('searchPanel：下拉显示哪一块（design §4.8）', () => {
  it('输入为空时不显示下拉', () => {
    expect(searchPanel('', 'ready', [pageHit('/timezone/', '改时区')])).toEqual({ kind: 'hidden' });
    expect(searchPanel('   ', 'ready', [pageHit('/timezone/', '改时区')])).toEqual({ kind: 'hidden' });
  });

  it('索引还没下载完时不显示，下载失败显示“搜索暂时不可用”', () => {
    expect(searchPanel('时区', 'idle', [])).toEqual({ kind: 'hidden' });
    expect(searchPanel('时区', 'loading', [])).toEqual({ kind: 'hidden' });
    expect(searchPanel('时区', 'error', [])).toEqual({ kind: 'error' });
  });

  it('没有命中时显示“没有找到”', () => {
    expect(searchPanel('zzzz', 'ready', [])).toEqual({ kind: 'empty' });
  });

  it('有命中时按顺序列出，页面标题和小标题各自高亮', () => {
    expect(
      searchPanel('时区', 'ready', [pageHit('/timezone/', '改时区'), headingHit('/ip-tests/voyracloud/', '实测：VoyraCloud 住宅服务器', '改时区', '改时区')]),
    ).toEqual({
      kind: 'list',
      options: [
        {
          href: '/timezone/',
          title: [
            { text: '改', match: false },
            { text: '时区', match: true },
          ],
        },
        {
          href: '/ip-tests/voyracloud/#改时区',
          title: [{ text: '实测：VoyraCloud 住宅服务器', match: false }],
          heading: [
            { text: '改', match: false },
            { text: '时区', match: true },
          ],
        },
      ],
    });
  });
});
