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

  it('逐格画的是参考图的形状：37×25 格，眼睛两格，没有文字、没有动画', async () => {
    const html = await render();
    expect(html).toContain('viewBox="0 0 37 25"');
    expect(html).toContain('shape-rendering="crispEdges"');
    expect(html.match(/<rect\b/g)!.length).toBe(8 + 2);
    expect(html).toContain('class="mascot-eyes"');
    expect(html).not.toMatch(/<text\b|<animate\b|@keyframes|<style/);
  });

  it('颜色只用 --mascot：SVG 文件和组件里都不写别的色值（D7）', () => {
    const svg = readFileSync(new URL('../assets/mascot/mascot.svg', import.meta.url), 'utf8');
    const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map(([, value]) => value!);
    expect(fills).not.toHaveLength(0);
    for (const fill of fills) expect(fill).toMatch(/^var\(--mascot(?:-eye)?, #[0-9a-f]{6}\)$/);
    expect(svg).not.toMatch(/\b(stroke|stroke-width|opacity|filter)="/);
  });
});
