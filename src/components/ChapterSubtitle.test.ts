import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ChapterSubtitle from './ChapterSubtitle.astro';

// 章节标题卡的英文副标题（design §3.2、§4.1、§5）：五条转曲好的 SVG，装饰，对读屏隐藏。
async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(ChapterSubtitle, { props });
}

describe('ChapterSubtitle', () => {
  it.each([0, 1, 2, 3])('第 %i 章：内联的转曲 <svg>，aria-hidden，只有路径', async (chapter) => {
    const html = await render({ chapter });
    expect(html.match(/<svg\b/g)).toHaveLength(1);
    expect(html).toMatch(/<svg class="chapter-subtitle" aria-hidden="true"/);
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toMatch(/<text\b|<use\b|@font-face|url\(|href=|role="img"/);
  });

  it('五章的图形各不相同', async () => {
    const all = await Promise.all([0, 1, 2, 3, 4].map((chapter) => render({ chapter })));
    expect(new Set(all).size).toBe(5);
  });

  it('没有的章节号抛错', async () => {
    await expect(render({ chapter: 5 })).rejects.toThrow('没有第 5 章');
  });
});
