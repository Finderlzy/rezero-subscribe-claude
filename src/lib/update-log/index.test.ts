import { describe, expect, it } from 'vitest';
import {
  charLength,
  entriesByCategory,
  entriesOf,
  formatUpdateLogProblems,
  isIsoDate,
  latestEntries,
  parseUpdateLog,
  resolveEntryPages,
  sortEntries,
  UPDATE_CATEGORIES,
  type UpdateEntry,
} from './index';

// M7 更新日志的纯规则（FR-81–FR-87）：校验、分类、排序、置顶和首页 5 条。
const TODAY = '2026-10-23';

const entry = (over: Partial<UpdateEntry> = {}): UpdateEntry => ({
  date: '2026-10-20',
  type: 'content',
  title: '示例',
  body: '示例内容',
  pinned: false,
  ...over,
});

describe('读取和校验 update-log.yaml（FR-83、FR-86）', () => {
  it('四个必填字段齐全时读成条目，pinned 默认 false', () => {
    const { entries, problems } = parseUpdateLog(
      [{ date: '2026-10-20', type: 'content', title: '新增视频', body: '方案一第二节加了录屏' }],
      TODAY,
    );
    expect(problems).toEqual([]);
    expect(entries).toEqual([
      { date: '2026-10-20', type: 'content', title: '新增视频', body: '方案一第二节加了录屏', pinned: false },
    ]);
  });

  it('可选 page 原样保留；pinned 只在公告上合法', () => {
    const { entries, problems } = parseUpdateLog(
      [
        { date: '2026-10-20', type: 'notice', title: '群号变了', body: '新群号见首页', pinned: true },
        { date: '2026-10-19', type: 'content', title: '改了时区一节', body: '补充截图', page: 'client-desktop' },
      ],
      TODAY,
    );
    expect(problems).toEqual([]);
    expect(entries[0]!.pinned).toBe(true);
    expect(entries[1]!.page).toBe('client-desktop');
    expect(parseUpdateLog([{ date: '2026-10-20', type: 'content', title: 'T', body: 'B', pinned: true }], TODAY).problems).toEqual([
      { entry: 1, message: '只有公告（type: notice）能置顶' },
    ]);
  });

  it('空文件、空数组都合法（某一类没有条目时页面照常显示）', () => {
    expect(parseUpdateLog(undefined, TODAY)).toEqual({ entries: [], problems: [] });
    expect(parseUpdateLog([], TODAY)).toEqual({ entries: [], problems: [] });
  });

  it('每条错都指出第几条，从 1 数', () => {
    const { entries, problems } = parseUpdateLog(
      [
        { date: '2026-10-20', type: 'content', title: '对', body: '对' },
        { date: '2026-13-01', type: 'content', title: '月份不对', body: 'x' },
        { date: '2026-10-21', type: 'notice', title: '好的', body: 'x' },
      ],
      TODAY,
    );
    expect(entries).toHaveLength(2);
    expect(problems).toEqual([
      { entry: 2, message: 'date 要写成 YYYY-MM-DD（现在是 "2026-13-01"）' },
    ]);
  });

  it('类型拼错、缺字段、不认识的字段都失败', () => {
    const problems = parseUpdateLog(
      [
        { date: '2026-10-20', type: 'news', title: 'a', body: 'b' },
        { date: '2026-10-20', title: 'a', body: 'b' },
        { date: '2026-10-20', type: 'site', title: 'a', body: 'b', category: 'x' },
        { date: '2026-10-20', type: 'site', title: 'a', body: 'b', pinned: 'yes' },
        { date: '2026-10-20', type: 'site', title: 'a', body: 'b', page: '' },
        '不是对象',
      ],
      TODAY,
    ).problems.map((problem) => problem.entry);
    expect(problems).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('日期晚于构建当天失败（不预约未来）', () => {
    expect(parseUpdateLog([{ date: '2026-10-24', type: 'site', title: 'a', body: 'b' }], TODAY).problems).toEqual([
      { entry: 1, message: 'date（2026-10-24）晚于构建当天（2026-10-23），更新日志不能预约未来' },
    ]);
    expect(parseUpdateLog([{ date: TODAY, type: 'site', title: 'a', body: 'b' }], TODAY).problems).toEqual([]);
  });

  it('标题不超过 40 个字符、内容不超过 200 个字符，按字符数算', () => {
    const title = '标'.repeat(41);
    const body = '内'.repeat(201);
    expect(charLength('中文😀')).toBe(3);
    expect(parseUpdateLog([{ date: TODAY, type: 'site', title, body: 'b' }], TODAY).problems[0]!.message).toBe(
      'title 有 41 个字符，超过 40 个',
    );
    expect(parseUpdateLog([{ date: TODAY, type: 'site', title: 'a', body }], TODAY).problems[0]!.message).toBe(
      'body 有 201 个字符，超过 200 个',
    );
    expect(parseUpdateLog([{ date: TODAY, type: 'site', title: '标'.repeat(40), body: '内'.repeat(200) }], TODAY).problems).toEqual([]);
  });

  it('isIsoDate 只认真实存在的日期', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-2-3')).toBe(false);
    expect(isIsoDate(20261020)).toBe(false);
  });

  it('最外层不是数组时给一条文件级错误', () => {
    expect(parseUpdateLog({ items: [] }, TODAY).problems).toEqual([
      { entry: 0, message: 'update-log.yaml 的最外层必须是一个数组（每条更新一项）' },
    ]);
    expect(formatUpdateLogProblems(parseUpdateLog({ items: [] }, TODAY).problems)).toEqual([
      'src/content/update-log.yaml：update-log.yaml 的最外层必须是一个数组（每条更新一项）',
    ]);
  });
});

describe('分类和排序（FR-81、FR-84）', () => {
  const entries: UpdateEntry[] = [
    entry({ date: '2026-10-10', type: 'content', title: '旧内容' }),
    entry({ date: '2026-10-21', type: 'site', title: '站点更新' }),
    entry({ date: '2026-10-18', type: 'notice', title: '重要公告', pinned: true }),
    entry({ date: '2026-10-20', type: 'content', title: '新内容' }),
    entry({ date: '2026-10-22', type: 'content', title: '最新内容' }),
    entry({ date: '2026-10-19', type: 'notice', title: '普通公告' }),
  ];

  it('四个分类的顺序是 全部、公告、内容、站点', () => {
    expect(UPDATE_CATEGORIES).toEqual(['all', 'notice', 'content', 'site']);
  });

  it('分类内按日期倒序', () => {
    expect(entriesOf(entries, 'content').map((e) => e.title)).toEqual(['最新内容', '新内容', '旧内容']);
    expect(entriesOf(entries, 'site').map((e) => e.title)).toEqual(['站点更新']);
  });

  it('置顶只在「全部」和「公告」里把条目提到最前，置顶条目之间仍按日期倒序', () => {
    expect(entriesOf(entries, 'all').map((e) => e.title)).toEqual([
      '重要公告',
      '最新内容',
      '站点更新',
      '新内容',
      '普通公告',
      '旧内容',
    ]);
    expect(entriesOf(entries, 'notice').map((e) => e.title)).toEqual(['重要公告', '普通公告']);
  });

  it('同一天保持文件里的书写顺序（稳定排序）', () => {
    const sameDay = [
      entry({ date: '2026-10-20', title: '先写' }),
      entry({ date: '2026-10-20', title: '后写' }),
      entry({ date: '2026-10-19', title: '更早' }),
    ];
    expect(entriesOf(sameDay, 'all').map((e) => e.title)).toEqual(['先写', '后写', '更早']);
  });

  it('sortEntries 不改动传入的数组', () => {
    const input = [...entries];
    sortEntries(input, 'all');
    expect(input).toEqual(entries);
  });
});

describe('分类分组和首页 5 条（FR-82、FR-87）', () => {
  it('每个分类各一份，顺序和分类一致', () => {
    const grouped = entriesByCategory([entry({ title: 'a' })]);
    expect(grouped.map((group) => group.category)).toEqual(['all', 'notice', 'content', 'site']);
    expect(grouped[0]!.entries).toHaveLength(1);
    expect(grouped[1]!.entries).toHaveLength(0);
  });

  it('首页取「全部」最前的 5 条，不足 5 条时有多少给多少', () => {
    const many = Array.from({ length: 8 }, (_, index) => entry({ date: `2026-10-0${index + 1}`, title: `第${index}` }));
    const latest = latestEntries(many);
    expect(latest).toHaveLength(5);
    expect(latest.map((e) => e.title)).toEqual(['第7', '第6', '第5', '第4', '第3']);
    expect(latestEntries([])).toEqual([]);
  });

  it('置顶的公告也进首页那 5 条', () => {
    const entries = [
      entry({ date: '2026-10-10', type: 'notice', title: '置顶', pinned: true }),
      ...Array.from({ length: 6 }, (_, index) => entry({ date: `2026-10-1${index}`, title: `内容${index}` })),
    ];
    expect(latestEntries(entries)[0]!.title).toBe('置顶');
  });
});

describe('条目挂到页面（FR-83、FR-86）', () => {
  const titles = new Map([
    ['plan1', '方案一：搭建专属住宅代理节点'],
    ['client-desktop', '客户端配置与环境验证：电脑端'],
  ]);

  it('page 解析成页面标题；没写 page 的条目原样通过', () => {
    const { resolved, problems } = resolveEntryPages(
      [entry({ title: '有链接', page: 'plan1' }), entry({ title: '没有链接' })],
      titles,
    );
    expect(problems).toEqual([]);
    expect(resolved[0]!.pageTitle).toBe('方案一：搭建专属住宅代理节点');
    expect(resolved[1]!.pageTitle).toBeUndefined();
  });

  it('page 指向不存在的页面时指出第几条', () => {
    const { problems } = resolveEntryPages([entry(), entry({ page: 'nope' })], titles);
    expect(formatUpdateLogProblems(problems)).toEqual(['src/content/update-log.yaml 第 2 条：page 写的 nope 不是路线图里的页面或参考页']);
  });
});