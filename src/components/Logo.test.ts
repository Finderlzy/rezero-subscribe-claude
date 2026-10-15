import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Logo from './Logo.astro';

// logo（FR-70，需求 Q-15）：三种版式都是内联的转曲 SVG，页面不加载字体，也不引用外部文件；
// 无障碍名称来自 title。
async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(Logo, { props });
}

describe('Logo', () => {
  it.each(['zh', 'en', 'mark'] as const)('%s：内联 <svg>，带 role="img" 和 aria-label，只有路径', async (variant) => {
    const html = await render({ variant, title: '本站首页' });
    expect(html.match(/<svg\b/g)).toHaveLength(1);
    expect(html).toMatch(/<svg\b[^>]*\brole="img"/);
    expect(html).toMatch(/<svg\b[^>]*\baria-label="本站首页"/);
    expect(html).toContain('<path');
    expect(html).not.toMatch(/<text\b|<image\b|<use\b|<img\b|@import|@font-face|url\(|href=/);
  });

  it('“Re”用 --logo-re，其余跟随文字颜色', async () => {
    const html = await render({ variant: 'zh' });
    expect(html).toContain('var(--logo-re, #5B3FA0)');
    expect(html).toContain('fill="currentColor"');
  });

  it('不传 title 时用站名作无障碍名称，title 里的引号会转义', async () => {
    expect(await render({ variant: 'zh' })).toMatch(/aria-label="Re:从零开始订阅 claude"/);
    expect(await render({ variant: 'en' })).toMatch(/aria-label="Re:Zero − Starting Life with Claude"/);
    expect(await render({ variant: 'mark', title: '' })).toMatch(/aria-label="Re:从零开始订阅 claude"/);
    expect(await render({ variant: 'mark', title: '"<x>' })).toMatch(/aria-label="&quot;&lt;x&gt;"/);
  });
});
