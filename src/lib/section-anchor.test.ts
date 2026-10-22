import { describe, expect, it } from 'vitest';
import { hashFragment, normalizeSectionText, resolveSectionAnchor, sectionAnchor } from './section-anchor';

const headings = [
  { slug: '风控在看什么', text: '风控在看什么' },
  { slug: 'ip-的归属地和类型', text: 'IP 的归属地和类型' },
  { slug: '改时区', text: '改时区' },
];

describe('normalizeSectionText：全角半角、大小写和空白不影响匹配', () => {
  it('做 NFKC、转小写、合并连续空白', () => {
    expect(normalizeSectionText('  ＩＰ\t的  归属地 ')).toBe('ip 的 归属地');
  });
});

describe('sectionAnchor：按标题文字找唯一的 slug', () => {
  it('先精确匹配标题文字', () => {
    expect(sectionAnchor(headings, '修改 Google 账号地区')).toBeUndefined();
    expect(sectionAnchor(headings, '改时区')).toBe('改时区');
    expect(sectionAnchor(headings, 'IP 的归属地和类型')).toBe('ip-的归属地和类型');
  });

  it('精确匹配不到时按规范化后的文字匹配（全角、大小写、多个空格）', () => {
    expect(sectionAnchor(headings, 'ＩＰ 的归属地和类型')).toBe('ip-的归属地和类型');
    expect(sectionAnchor(headings, 'ip   的归属地和类型')).toBe('ip-的归属地和类型');
    expect(sectionAnchor(headings, '  风控在看什么 ')).toBe('风控在看什么');
  });

  it('只认完整标题，不做包含匹配', () => {
    expect(sectionAnchor(headings, '风控')).toBeUndefined();
    expect(sectionAnchor(headings, '改时')).toBeUndefined();
  });

  it('同一文字出现多次时无法确定是哪个小节，返回 undefined', () => {
    expect(sectionAnchor([{ slug: '我的', text: '我的' }, { slug: '我的-1', text: '我的' }], '我的')).toBeUndefined();
  });

  it('空文字或空列表返回 undefined', () => {
    expect(sectionAnchor(headings, '   ')).toBeUndefined();
    expect(sectionAnchor([], '改时区')).toBeUndefined();
  });
});

describe('resolveSectionAnchor：片段也可能是已经写好的 slug', () => {
  it('先按标题文字找，再按 slug 找', () => {
    expect(resolveSectionAnchor(headings, '改时区')).toBe('改时区');
    expect(resolveSectionAnchor(headings, 'ip-的归属地和类型')).toBe('ip-的归属地和类型');
    expect(resolveSectionAnchor(headings, '没有这一条')).toBeUndefined();
  });

  it('重复文字的 -1、-2 只能按 slug 精确找', () => {
    const repeated = [
      { slug: '我的', text: '我的' },
      { slug: '我的-1', text: '我的' },
    ];
    expect(resolveSectionAnchor(repeated, '我的-1')).toBe('我的-1');
    // 虽然标题文字重复，但“我的”确实是第一个小节的 slug
    expect(resolveSectionAnchor(repeated, '我的')).toBe('我的');
  });
});

describe('hashFragment：解码 location.hash 或链接片段', () => {
  it('去掉 # 并解码百分号编码', () => {
    expect(hashFragment('#改时区')).toBe('改时区');
    expect(hashFragment('#%E6%94%B9%E6%97%B6%E5%8C%BA')).toBe('改时区');
    expect(hashFragment('#ssh-%E6%8F%90%E7%A4%BA')).toBe('ssh-提示');
  });

  it('没有 #、只有 # 时返回 undefined', () => {
    expect(hashFragment('改时区')).toBeUndefined();
    expect(hashFragment('#')).toBeUndefined();
    expect(hashFragment('')).toBeUndefined();
  });

  it('百分号编码写坏时按原文返回，交给“小节不存在”判断', () => {
    expect(hashFragment('#%E6%94%B9%')).toBe('%E6%94%B9%');
  });
});
