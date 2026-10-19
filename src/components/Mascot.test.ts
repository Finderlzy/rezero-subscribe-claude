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

  it('逐格画的是参考图的形状：24×16 格、每格一个 1×1 方块，viewBox 正好包住整只，没有文字、没有动画', async () => {
    const html = await render();
    expect(html).toContain('viewBox="0 0 24 16"');
    expect(html).toContain('shape-rendering="crispEdges"');
    const cells = (group: string) =>
      [...html.split(`class="${group}"`)[1]!.split('</g>')[0]!.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1"\/>/g)].map(
        ([, x, y]) => [Number(x), Number(y)] as const,
      );
    const body = cells('mascot-body');
    const eyes = cells('mascot-eyes');
    // 每个 <rect> 都是一格（没有合并成大块、没有半格）
    expect(html.match(/<rect\b[^>]*\/>/g)).toHaveLength(body.length + eyes.length);
    // 两只眼睛各 2×2 格，在头部第 3、4 行
    expect(eyes).toHaveLength(8);
    for (const [, y] of eyes) expect([3, 4]).toContain(y);
    // 整只从第 0 列画到第 23 列、第 0 行画到第 15 行：左臂、右臂、头顶、脚底都在，没有被 viewBox 裁掉
    const all = [...body, ...eyes];
    expect(Math.min(...all.map(([x]) => x))).toBe(0);
    expect(Math.max(...all.map(([x]) => x))).toBe(23);
    expect(Math.min(...all.map(([, y]) => y))).toBe(0);
    expect(Math.max(...all.map(([, y]) => y))).toBe(15);
    // 最下一行是四条腿，各 2 格宽
    expect(body.filter(([, y]) => y === 15).map(([x]) => x)).toEqual([4, 5, 8, 9, 14, 15, 18, 19]);
    expect(html).not.toMatch(/<text\b|<animate\b|@keyframes|<style/);
  });

  it('尺寸只由令牌给（--mascot-width / --mascot-height），SVG 不写死宽高', async () => {
    const html = await render();
    const tag = html.match(/<svg\b[^>]*>/)![0];
    expect(tag).not.toMatch(/\b(?:width|height)="/);
    const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
    expect(tokens).toMatch(/--mascot-width: 24px;/);
    expect(tokens).toMatch(/--mascot-width: 36px;/);
  });

  it('颜色只用 --mascot（和眼睛的 --mascot-eye）：SVG 文件和组件里都不写别的色值（D7）', () => {
    const svg = readFileSync(new URL('../assets/mascot/mascot.svg', import.meta.url), 'utf8');
    const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map(([, value]) => value!);
    expect(fills).not.toHaveLength(0);
    for (const fill of fills) expect(fill).toMatch(/^var\(--mascot(?:-eye)?, #[0-9a-f]{6}\)$/);
    expect(svg).not.toMatch(/\b(stroke|stroke-width|opacity|filter)="/);
  });
});
