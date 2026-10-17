/**
 * 说明图（design v2.1 §4.7、§9）：原理版里 `![[说明图-xxx.svg]]` 嵌入的单色线稿，由 remark-obsidian 原样内联进正文，
 * 线条用 currentColor 跟着 --text 变（深色模式自动变浅），本页讲的那一环包在 `class="accent"` 里由 prose.css 染成 --accent。
 *
 * 内联的 SVG 会和页面共用样式和 id，所以这里用白名单只放行线稿用得到的元素和属性：没有脚本、样式、外部资源、
 * 渐变滤镜和 id；颜色只能是 currentColor 或 none。图按 1:1 显示（宽度属性写成 viewBox 的宽），
 * viewBox 宽度不超过手机正文栏（360 宽减两边各 16px），这样手机上图中文字也是 14px，不会被缩小。
 */

/** viewBox 宽度上限：手机（360px）正文栏的宽度 */
export const DIAGRAM_MAX_WIDTH = 328;

export interface Diagram {
  /** `<title>` 的文字，作为图的替代文字 */
  title: string;
  /** viewBox 的宽高 */
  width: number;
  height: number;
  /** 根元素里面的原文（含 `<title>`、`<desc>`） */
  inner: string;
}

const ELEMENTS = new Set(['title', 'desc', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan']);
const ATTRIBUTES = new Set([
  'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'points', 'dx', 'dy', 'class',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline',
]);
const COLOR_ATTRIBUTES = new Set(['fill', 'stroke']);
const COLORS = new Set(['currentColor', 'none']);
/** 只有文字（和包文字的 <g>）可以填色，形状不填色（§4.7） */
const FILLABLE = new Set(['text', 'tspan', 'g']);
/** 画法固定的属性（§4.7）：线宽同图标、文字 14px、class 只用来标强调 */
const FIXED: Record<string, string> = { 'stroke-width': '1.5', 'font-size': '14', class: 'accent' };

const ROOT = /^<svg\b([^>]*)>([\s\S]*)<\/svg>$/;
// 引号里的 > 不算标签结束
const TAG = /<(\/?)([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/?>/g;
const ATTR = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** 带引号的属性；没加引号、没有值等认不出的写法放进 leftover，由调用方报错（不能让它们绕过白名单） */
function attributes(source: string): { list: [string, string][]; leftover: string } {
  const list = [...source.matchAll(ATTR)].map((m): [string, string] => [m[1]!, m[2] ?? m[3] ?? '']);
  return { list, leftover: source.replace(ATTR, ' ').replace(/[\s/]+/g, ' ').trim() };
}

/** 解析并检查一张说明图；不合格时返回全部问题 */
export function parseDiagram(text: string): Diagram | { errors: string[] } {
  const source = text
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  const root = ROOT.exec(source);
  if (!root) return { errors: ['说明图必须是一个 <svg> 根元素'] };
  const errors: string[] = [];
  const [, rootAttrs, inner] = root as unknown as [string, string, string];

  let width = 0;
  let height = 0;
  const rootParsed = attributes(rootAttrs);
  if (rootParsed.leftover) errors.push(`<svg> 的属性要写成 名字="值"：${rootParsed.leftover}`);
  const rootMap = new Map(rootParsed.list);
  for (const name of rootMap.keys()) {
    if (name !== 'xmlns' && name !== 'viewBox') errors.push(`<svg> 根元素只能写 xmlns 和 viewBox，去掉 ${name}（宽高按 viewBox 显示，线宽、字体写在里面的 <g> 上）`);
  }
  const box = /^0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)$/.exec((rootMap.get('viewBox') ?? '').trim());
  if (!box) errors.push('<svg> 要写 viewBox="0 0 宽 高"');
  else {
    width = Number(box[1]);
    height = Number(box[2]);
    if (width > DIAGRAM_MAX_WIDTH) errors.push(`viewBox 的宽度 ${width} 要不超过 ${DIAGRAM_MAX_WIDTH}（手机正文栏的宽度，图按 1:1 显示）`);
  }

  // 标签以外不能再有 <（CDATA、声明、残缺的标签）
  const stray = inner.replace(TAG, '').indexOf('<');
  if (stray !== -1) errors.push(`说明图里有认不出的标签：${inner.replace(TAG, '').slice(stray, stray + 20)}`);
  for (const m of inner.matchAll(TAG)) {
    const [, closing, name, attrs] = m as unknown as [string, string, string, string];
    if (closing) continue;
    if (!ELEMENTS.has(name)) {
      errors.push(`说明图里不支持 <${name}>：只用线条、形状和文字（${[...ELEMENTS].map((e) => `<${e}>`).join('、')}）`);
      continue;
    }
    const parsed = attributes(attrs);
    if (parsed.leftover) errors.push(`<${name}> 的属性要写成 名字="值"：${parsed.leftover}`);
    for (const [attr, value] of parsed.list) {
      if (!ATTRIBUTES.has(attr)) errors.push(`<${name}> 不支持属性 ${attr}（不用 id、style、transform、事件和链接）`);
      else if (COLOR_ATTRIBUTES.has(attr) && !COLORS.has(value)) errors.push(`颜色只能是 currentColor 或 none，强调色用 class="accent"：${attr}="${value}"`);
      else if (attr === 'fill' && value === 'currentColor' && !FILLABLE.has(name)) errors.push(`形状不填色，只有文字能 fill="currentColor"：<${name}>`);
      else if (attr in FIXED && value !== FIXED[attr]) errors.push(`${attr} 只能是 "${FIXED[attr]}"：${attr}="${value}"`);
    }
  }
  const title = decodeEntities(/<title>([^<]*)<\/title>/.exec(inner)?.[1]?.trim() ?? '');
  if (!title) errors.push('说明图要有 <title>（读屏读它，相当于截图的替代文字）');

  return errors.length > 0 ? { errors } : { title: title!, width, height, inner: inner.trim() };
}

/** `<title>` 的文字要放进 aria-label（序列化时会再转义），先还原常见的实体 */
function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e: string) => {
    if (e[0] !== '#') return named[e.toLowerCase()] ?? m;
    return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  });
}
