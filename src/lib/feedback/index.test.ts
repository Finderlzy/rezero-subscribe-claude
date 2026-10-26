import { describe, expect, it } from 'vitest';
import { ALT_MAX, FEATURED_MAX, featuredEntries, formatFeedbackProblems, parseFeedback } from './index';

const images = ['a.png', 'b.png', 'c.png'];
const valid = [
  { image: 'a.png', alt: '读者留言“感谢作者”' },
  { image: 'b.png', alt: '付款成功的截图', featured: true },
  { image: 'c.png', alt: '按方法成功了' },
];

describe('parseFeedback', () => {
  it('合法内容按书写顺序返回，featured 默认 false', () => {
    const { entries, problems } = parseFeedback(valid, images);
    expect(problems).toEqual([]);
    expect(entries.map((entry) => [entry.image, entry.featured])).toEqual([
      ['a.png', false],
      ['b.png', true],
      ['c.png', false],
    ]);
  });

  it('空文件就是没有反馈', () => {
    expect(parseFeedback(null, [])).toEqual({ entries: [], problems: [] });
  });

  it('截图不存在、重复登记、缺 alt、alt 超长、字段不认识都指出第几条', () => {
    const { problems } = parseFeedback(
      [
        { image: 'x.png', alt: '不存在' },
        { image: 'a.png', alt: '' },
        { image: 'a.png', alt: '重复' },
        { image: 'b.png', alt: '长'.repeat(ALT_MAX + 1), date: '2026-10-26' },
        { image: 'c.png', alt: '好', featured: 'yes' },
      ],
      images,
    );
    expect(formatFeedbackProblems(problems)).toEqual([
      'src/content/feedback.yaml 第 1 条：image 写的 x.png 不在 src/assets/feedback/ 里',
      'src/content/feedback.yaml 第 2 条：缺少 alt（截图里写了什么，给读屏用）',
      'src/content/feedback.yaml 第 3 条：image a.png 和第 2 条重复了',
      'src/content/feedback.yaml 第 4 条：不认识的字段 date（只认 image、alt、featured）',
      `src/content/feedback.yaml 第 4 条：alt 有 ${ALT_MAX + 1} 个字符，超过 ${ALT_MAX} 个`,
      'src/content/feedback.yaml 第 5 条：featured 只能是 true 或 false（现在是 "yes"）',
    ]);
  });

  it('目录里有截图没登记时构建失败', () => {
    const { problems } = parseFeedback(valid.slice(0, 2), images);
    expect(formatFeedbackProblems(problems)).toEqual(['src/content/feedback.yaml：src/assets/feedback/c.png 没有写进 feedback.yaml']);
  });

  it(`精选超过 ${FEATURED_MAX} 张时构建失败`, () => {
    const many = Array.from({ length: FEATURED_MAX + 1 }, (_, index) => `${index}.png`);
    const { problems } = parseFeedback(
      many.map((image) => ({ image, alt: '好', featured: true })),
      many,
    );
    expect(formatFeedbackProblems(problems)).toEqual([
      `src/content/feedback.yaml：featured 有 ${FEATURED_MAX + 1} 张，首页最多放 ${FEATURED_MAX} 张`,
    ]);
  });
});

describe('featuredEntries', () => {
  it('只取标了 featured 的，保持书写顺序', () => {
    const { entries } = parseFeedback(
      [
        { image: 'a.png', alt: '甲', featured: true },
        { image: 'b.png', alt: '乙' },
        { image: 'c.png', alt: '丙', featured: true },
      ],
      images,
    );
    expect(featuredEntries(entries).map((entry) => entry.image)).toEqual(['a.png', 'c.png']);
  });
});
