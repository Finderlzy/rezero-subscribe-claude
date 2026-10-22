import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSearchIndex, search, type SearchEntry, type SearchSource } from './index';

const heading = (depth: number, slug: string, text: string) => ({ depth, slug, text });

const headingOf = (entry: SearchEntry) => ('heading' in entry ? entry.heading : undefined);

const source = (path: string, title: string, order: number, headings: SearchSource['headings'] = []): SearchSource => ({
  path,
  title,
  order,
  headings,
});

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildSearchIndex', () => {
  it('每页先出一条页面标题，再给每个 h2、h3 各一条', () => {
    const index = buildSearchIndex([
      source('/timezone/', '改时区', 3, [
        heading(1, 'page-title', '页面标题不是条目'),
        heading(2, 'change', '改时区'),
        heading(3, 'why', '为什么要改'),
        heading(4, 'deep', '太深的小标题'),
      ]),
    ]);

    expect(index).toEqual([
      { path: '/timezone/', pageTitle: '改时区', order: 3 },
      { path: '/timezone/', pageTitle: '改时区', heading: '改时区', slug: 'change', order: 3 },
      { path: '/timezone/', pageTitle: '改时区', heading: '为什么要改', slug: 'why', order: 3 },
    ]);
  });

  it('没有文字的 h2、h3 不进索引', () => {
    const index = buildSearchIndex([source('/a/', '甲', 1, [heading(2, 'blank', '   ')])]);

    expect(index).toHaveLength(1);
  });

  it('按来源顺序排列，页面标题和参考页路径原样保留', () => {
    const index = buildSearchIndex([
      source('/overview/', '选择方案', 0, [heading(2, 'next', '接下来怎么选')]),
      source('/ip-tests/voyracloud/', '实测：VoyraCloud 住宅服务器', 8),
    ]);

    expect(index.map((entry) => [entry.path, headingOf(entry) ?? null])).toEqual([
      ['/overview/', null],
      ['/overview/', '接下来怎么选'],
      ['/ip-tests/voyracloud/', null],
    ]);
  });
});

describe('search：匹配', () => {
  const index = buildSearchIndex([
    source('/overview/', '整体思路与方案选型', 0, [heading(2, 'ip', '修改 IP 地址')]),
    source('/timezone/', '改时区', 3, [heading(2, 'change', '改时区')]),
    source('/ip-tests/voyracloud/', '实测：VoyraCloud 住宅服务器', 8),
  ]);

  it('空查询和只有空白的查询返回空', () => {
    expect(search(index, '')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });

  it('查询“时区”命中“改时区”，并给出小节锚点', () => {
    const hit = search(index, '时区').find((result) => headingOf(result.entry) === '改时区');

    expect(hit?.entry).toEqual({ path: '/timezone/', pageTitle: '改时区', heading: '改时区', slug: 'change', order: 3 });
    expect(hit?.href).toBe('/timezone/#change');
  });

  it('大小写和全角半角都能匹配', () => {
    expect(search(index, 'ip').map((hit) => headingOf(hit.entry))).toContain('修改 IP 地址');
    expect(search(index, 'ＩＰ').map((hit) => headingOf(hit.entry))).toContain('修改 IP 地址');
  });

  it('查询里的空白不影响匹配', () => {
    expect(search(index, '改 时区').map((hit) => hit.href)).toContain('/timezone/#change');
  });

  it('页面标题命中时 href 不带锚点', () => {
    const [hit] = search(index, '住宅服务器');

    expect(hit === undefined ? undefined : headingOf(hit.entry)).toBeUndefined();
    expect(hit?.href).toBe('/ip-tests/voyracloud/');
  });

  it('页面标题命中不重复列出同一页的小标题', () => {
    const onlyTitle = buildSearchIndex([source('/maintenance/', '日常维护', 1, [heading(2, 'habit', '继续像普通人一样用')])]);

    expect(search(onlyTitle, '维护')).toHaveLength(1);
  });

  it('同一个小标题在多个页面出现时各算一条', () => {
    const repeated = buildSearchIndex([
      source('/a/', '甲', 1, [heading(2, 'same', '时区')]),
      source('/b/', '乙', 2, [heading(2, 'same', '时区')]),
    ]);

    expect(search(repeated, '时区')).toHaveLength(2);
  });
});

describe('search：排序和上限', () => {
  it('页面标题命中排在小标题命中前面', () => {
    const index = buildSearchIndex([
      source('/a/', '甲', 1, [heading(2, 'x', '代理配置')]),
      source('/b/', '代理配置', 9),
    ]);

    expect(search(index, '代理').map((hit) => hit.entry.path)).toEqual(['/b/', '/a/']);
  });

  it('同类里开头命中排在中间命中前面', () => {
    const index = buildSearchIndex([
      source('/a/', '设置代理', 1),
      source('/b/', '代理设置', 2),
    ]);

    expect(search(index, '代理').map((hit) => hit.entry.path)).toEqual(['/b/', '/a/']);
  });

  it('小标题里开头命中也排在中间命中前面', () => {
    const index = buildSearchIndex([
      source('/a/', '甲', 1, [heading(2, 'x', '设置代理')]),
      source('/b/', '乙', 2, [heading(2, 'y', '代理设置')]),
    ]);

    expect(search(index, '代理').map((hit) => hit.entry.path)).toEqual(['/b/', '/a/']);
  });

  it('同分按目录顺序', () => {
    const index = buildSearchIndex([source('/later/', '后一页设置', 5), source('/earlier/', '前一页设置', 2)]);

    expect(search(index, '设置').map((hit) => hit.entry.path)).toEqual(['/earlier/', '/later/']);
  });

  it('默认最多 10 条，可以传入更小的上限', () => {
    const index = buildSearchIndex(Array.from({ length: 12 }, (_, i) => source(`/p${i}/`, `第 ${i} 页`, i)));

    expect(search(index, '页')).toHaveLength(10);
    expect(search(index, '页', 3)).toHaveLength(3);
    expect(search(index, '页', 0)).toEqual([]);
  });

  it('先排序再截断', () => {
    const index = buildSearchIndex([
      ...Array.from({ length: 10 }, (_, i) => source(`/middle${i}/`, `中间${i}时区`, i)),
      source('/prefix/', '时区设置', 99),
    ]);

    expect(search(index, '时区')[0]?.entry.path).toBe('/prefix/');
  });
});

describe('search：部署子路径', () => {
  it('href 拼上 BASE_URL', () => {
    vi.stubEnv('BASE_URL', '/sub/');
    const index = buildSearchIndex([source('/timezone/', '改时区', 1, [heading(2, 'change', '改时区')])]);

    expect(search(index, '改时区').map((hit) => hit.href)).toEqual(['/sub/timezone/', '/sub/timezone/#change']);
  });
});
