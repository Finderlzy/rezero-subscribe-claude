import { describe, expect, it } from 'vitest';
import { tocSections } from './toc-sections';

// 侧边栏小节（design v3 §4.5，FR-16）：只取正文的 h2；h1、h3 及以下都不进目录。
const heading = (depth: number, slug: string, text: string) => ({ depth, slug, text });

describe('tocSections', () => {
  it('只取 depth === 2，保留 slug 和文字', () => {
    const headings = [
      heading(1, '标题', '标题'),
      heading(2, '一-购买服务器', '一、购买服务器'),
      heading(3, '第一步', '第一步'),
      heading(2, '二-购买-isp-代理', '二、购买 ISP 代理'),
      heading(4, '细节', '细节'),
    ];
    expect(tocSections(headings)).toEqual([
      { slug: '一-购买服务器', text: '一、购买服务器' },
      { slug: '二-购买-isp-代理', text: '二、购买 ISP 代理' },
    ]);
  });

  it('没有 h2 时返回空数组', () => {
    expect(tocSections([heading(1, '标题', '标题'), heading(3, '小节', '小节')])).toEqual([]);
  });
});
