import metrics from '../assets/numerals/metrics.json';

/**
 * 固定字形的编号（design §3.2 D7，架构 §11.4 W-2）：数字事先转曲成 `<symbol id="numeral-…">`，
 * 只在找不到页由 NumeralSprite 内联一份（design v3 §3.2：固定字形只剩 404，章节号写成文字）。
 * 这里只用 `<use>` 拼出数字串，构建时由 `Numeral.astro` 调用。
 *
 * 尺寸：外层 `<svg>` 高 `1em`，`1em` 就是数字的高度（从最高的数字顶到圆形笔画压过基线的底），宽度按字宽算；
 * 用 `font-size` 控制大小，例如设计稿的“96px 的 404”就是 `font-size: 96px`。颜色是 `currentColor`。
 */

/** 能用固定字形写出的字符：0–9（design v3 §3.2：只剩找不到页的 404） */
export const NUMERAL_CHARS: readonly string[] = Object.freeze(Object.keys(metrics.advance));

const advance: Record<string, number> = metrics.advance;
/** HTML 属性值转义：写 class 和 aria-label 前用 */
const escapeAttr = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const em = (v: number) => String(Math.round(v * 1000) / 1000);

/**
 * 编号的 `<svg>` 标记。`label` 是读屏读到的文字（如“404”“第 2 步，共 5 步”“第 1 章”，design §5），
 * 不能为空；`text` 里有 0–9 以外的字符时抛错（例如找不到页的“404”）。
 */
export function numeralSvg(text: string, label: string, className?: string): string {
  if (!text) throw new Error('编号不能为空');
  if (!label.trim()) throw new Error(`编号“${text}”缺少读屏文字`);
  const { top, height } = metrics;
  const uses: string[] = [];
  let x = 0;
  for (const ch of text) {
    const w = advance[ch];
    if (w === undefined) throw new Error(`编号字形里没有“${ch}”，只能用 0–9`);
    uses.push(`<use href="#numeral-${ch}" x="${x}" y="${top}" width="${w}" height="${height}"/>`);
    x += w;
  }
  // 竖向范围的底比基线低一点（圆形笔画的下冲），整体下移同样的比例，数字才坐在文字基线上
  const sink = em((top + height) / height);
  const cls = className ? `numeral ${className}` : 'numeral';
  return (
    `<svg class="${escapeAttr(cls)}" role="img" aria-label="${escapeAttr(label)}" viewBox="0 ${top} ${x} ${height}"` +
    ` width="${em(x / height)}em" height="1em" fill="currentColor" style="vertical-align:-${sink}em">` +
    uses.join('') +
    '</svg>'
  );
}
