import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Mascot from './Mascot.astro';

// Claude Code 的官方像素小形象（design v2.2 D6、D7）：按参考图逐格描成的 SVG，纯装饰、不可点、没有动画。
async function render() {
  const container = await AstroContainer.create();
  return container.renderToString(Mascot);
}

describe('Mascot', () => {
  it('内联 <svg>，对读屏隐藏、不可聚焦、不是链接或按钮', async () => {
    const html = await render();
    expect(html.match(/<svg\b/g)).toHaveLength(1);
    expect(html).toMatch(/<svg class="mascot" aria-hidden="true" focusable="false"/);
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('tabindex');
  });

  it('逐格画的是参考图的形状：17×12 格、每格一个方块，眼睛两格，没有文字、没有动画', async () => {
    const html = await render();
    expect(html).toContain('viewBox="0 0 17 12"');
    expect(html).toContain('shape-rendering="crispEdges"');
    // 身体 8 块 + 眼睛 2 块；每块的坐标和宽高都是整数格，没有半格
    const rects = html.match(/<rect\b[^>]*>/g)!.filter((rect) => /width="/.test(rect));
    expect(rects).toHaveLength(8 + 2);
    for (const rect of rects) for (const [, d] of rect.matchAll(/\b(?:x|y|width|height)="([^"]*)"/g)) expect(d).toMatch(/^\d+$/);
    expect(html).toContain('class="mascot-eyes"');
    expect(html).not.toMatch(/<text\b|<animate\b|@keyframes|<style/);
  });

  it('参考图 1 格 3px（手机 2px），整体 51×36px', async () => {
    const html = await render();
    expect(html).toContain('width="51"');
    expect(html).toContain('height="36"');
  });

  it('颜色只用 --mascot（和眼睛的 --mascot-eye）：SVG 文件和组件里都不写别的色值（D7）', () => {
    const svg = readFileSync(new URL('../assets/mascot/mascot.svg', import.meta.url), 'utf8');
    const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map(([, value]) => value!);
    expect(fills).not.toHaveLength(0);
    for (const fill of fills) expect(fill).toMatch(/^var\(--mascot(?:-eye)?, #[0-9a-f]{6}\)$/);
    expect(svg).not.toMatch(/\b(stroke|stroke-width|opacity|filter)="/);
  });
});
