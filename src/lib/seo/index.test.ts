import { describe, expect, it } from 'vitest';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  describe as describePage,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  formatSeoProblems,
  parseSeo,
  serializeJsonLd,
  websiteJsonLd,
} from './index';

const PAGE_KEYS = ['/', '/update-log/', 'preface', 'ip-tests', 'ip-tests/decodo'];

/** 一条正好合法的摘要：长度落在区间里 */
const ok = (text = '这一页讲的是把节点装进电脑，再把系统时区改到 Claude 支持的地区，并给出验收清单。') => ({ description: text });

describe('parseSeo', () => {
  it('写全每一页时没有报错，并保留写过的顺序', () => {
    const { entries, problems } = parseSeo(
      { '/': ok(), '/update-log/': ok(), preface: ok(), 'ip-tests': ok(), 'ip-tests/decodo': ok() },
      PAGE_KEYS,
    );
    expect(problems).toEqual([]);
    expect(entries.map((entry) => entry.key)).toEqual(PAGE_KEYS);
  });

  it('少写一页时报错，并指出是哪一页', () => {
    const { problems } = parseSeo({ '/': ok(), '/update-log/': ok(), preface: ok(), 'ip-tests': ok() }, PAGE_KEYS);
    expect(problems).toEqual([{ key: 'ip-tests/decodo', message: '缺少这一页的摘要' }]);
  });

  it('写了不存在的页面键时报错', () => {
    const { problems } = parseSeo(
      { '/': ok(), '/update-log/': ok(), preface: ok(), 'ip-tests': ok(), 'ip-tests/decodo': ok(), nope: ok() },
      PAGE_KEYS,
    );
    expect(problems[0]).toMatchObject({ key: 'nope', message: expect.stringContaining('不是站点的页面') });
  });

  it('摘要太短、太长都报错，并写出实际长度', () => {
    const short = parseSeo({ preface: { description: '太短了' } }, ['preface']);
    expect(short.problems[0]!.message).toContain(`至少要 ${DESCRIPTION_MIN}`);
    const long = parseSeo({ preface: { description: '长'.repeat(DESCRIPTION_MAX + 1) } }, ['preface']);
    expect(long.problems[0]!.message).toContain(`超过 ${DESCRIPTION_MAX}`);
  });

  it('长度按字符数算：118 个中文正好合法，119 个报错', () => {
    const exact = parseSeo({ preface: { description: '字'.repeat(DESCRIPTION_MAX) } }, ['preface']);
    expect(exact.problems).toEqual([]);
    const over = parseSeo({ preface: { description: '字'.repeat(DESCRIPTION_MAX + 1) } }, ['preface']);
    expect(over.problems).toHaveLength(1);
  });

  it('缺 description、写了不认识的字段都报错', () => {
    expect(parseSeo({ preface: {} }, ['preface']).problems[0]!.message).toContain('缺少 description');
    expect(parseSeo({ preface: { description: ok().description, desc: 'x' } }, ['preface']).problems[0]!.message).toContain('不认识的字段 desc');
  });

  it('title 可写可不写；写了就带出来', () => {
    const { entries } = parseSeo(
      { preface: ok(), overview: { ...ok(), title: '方案怎么选' } },
      ['preface', 'overview'],
    );
    expect(entries[0]!.title).toBeUndefined();
    expect(entries[1]!.title).toBe('方案怎么选');
  });

  it('顶层不是映射时报错', () => {
    expect(parseSeo([], PAGE_KEYS).problems[0]!.key).toBe('seo.yaml');
  });

  it('报错行带上 seo.yaml 和页面键', () => {
    expect(formatSeoProblems([{ key: 'preface', message: '缺少这一页的摘要' }])).toEqual([
      'src/content/seo.yaml 的 preface：缺少这一页的摘要',
    ]);
  });
});

describe('describe', () => {
  it('按页面键取摘要，Map 和数组都认', () => {
    const entry = { key: 'preface', description: '前言的一句话。' };
    expect(describePage(new Map([[entry.key, entry]]), 'preface')).toBe('前言的一句话。');
    expect(describePage([entry], 'preface')).toBe('前言的一句话。');
  });

  it('没写时回落到传入的默认一句', () => {
    expect(describePage([], 'preface', '兜底')).toBe('兜底');
  });
});

describe('结构化数据', () => {
  it('Article 带上标题、摘要、规范网址和发布者', () => {
    const data = articleJsonLd({
      headline: '方案一',
      description: '一句话',
      url: 'https://re0claude.us.ci/plan1/',
      siteUrl: 'https://re0claude.us.ci/',
    });
    expect(data).toMatchObject({
      '@type': 'Article',
      headline: '方案一',
      description: '一句话',
      url: 'https://re0claude.us.ci/plan1/',
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'WebSite', url: 'https://re0claude.us.ci/' },
    });
    // 没有可信的发布日，不写 datePublished
    expect(data).not.toHaveProperty('datePublished');
  });

  it('面包屑按顺序编号', () => {
    const data = breadcrumbJsonLd([
      { name: '首页', url: 'https://x/' },
      { name: '日常维护', url: 'https://x/maintenance/' },
    ]);
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(data.itemListElement[1]!.name).toBe('日常维护');
  });

  it('首页给 WebSite，带站名和语言', () => {
    const data = websiteJsonLd({ siteUrl: 'https://re0claude.us.ci/', description: '一句话' });
    expect(data).toMatchObject({ '@type': 'WebSite', url: 'https://re0claude.us.ci/', inLanguage: 'zh-CN' });
  });

  it('序列化后尖括号被转义，摘要里出现 </script> 也不会截断脚本', () => {
    const text = serializeJsonLd({ description: '</script><script>alert(1)</script>' });
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text).description).toBe('</script><script>alert(1)</script>');
  });
});
