import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Numeral from './Numeral.astro';
import NumeralSprite from './NumeralSprite.astro';

// 固定字形的编号（design v3 §3.2）：只剩找不到页的 404。Numeral 输出一个 role="img" 的 <svg>，
// 用 <use> 引用页面里的 NumeralSprite；读屏只读 aria-label。页面不加载字体。
async function render(component: Parameters<AstroContainer['renderToString']>[0], props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}
const refs = (html: string) => [...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]);

describe('Numeral', () => {
  it.each([
    ['04', '04', ['numeral-0', 'numeral-4']],
    ['404', '404', ['numeral-4', 'numeral-0', 'numeral-4']],
  ])('“%s”：一个 role="img" 的 <svg>，读屏名称是 aria-label，按字引用字形', async (text, label, ids) => {
    const html = await render(Numeral, { text, label });
    expect(html.match(/<svg\b/g)).toHaveLength(1);
    expect(html).toMatch(/<svg\b[^>]*\brole="img"/);
    expect(html).toContain(`aria-label="${label}"`);
    expect(refs(html)).toEqual(ids);
    expect(html).not.toMatch(/<text\b|@font-face|url\(/);
    // 数字本身不作为文字出现，读屏不会读两遍
    expect(html.replace(/<[^>]+>/g, '')).toBe('');
  });

  it('class 加在外层 <svg> 上', async () => {
    expect(await render(Numeral, { text: '1', label: '第 1 章', class: 'chapter-no' })).toMatch(
      /<svg class="numeral chapter-no"/,
    );
  });
});

describe('NumeralSprite', () => {
  it('内联 0–9 的 <symbol>，不显示、对读屏隐藏', async () => {
    const html = await render(NumeralSprite);
    const ids = [...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual([...'0123456789'].map((d) => `numeral-${d}`));
    expect(html).toMatch(/<svg\b[^>]*\baria-hidden="true"/);
    // 还要 role="presentation"：<svg> 的默认 role 是 img，只加 aria-hidden 会被 axe 判为 simple-img（图片缺替代文字）
    expect(html).toMatch(/<svg\b[^>]*\brole="presentation"/);
    expect(html).toMatch(/<svg\b[^>]*\bwidth="0" height="0"/);
    expect(html).not.toMatch(/<text\b|@font-face|url\(/);
  });
});
