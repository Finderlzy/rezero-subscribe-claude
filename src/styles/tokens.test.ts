import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 实测 design §3.1 的每一组颜色（#21）：正文和控件上的文字与背景 ≥ 4.5:1，
// 控件边界、状态标识（按下的切换、焦点环）、作者待补和风险提示的竖线 ≥ 3:1。
// 色值直接从 tokens.css 读，改令牌时这里会把不达标的组合报出来。
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** 取出一段 CSS 里写成 #rrggbb 的颜色令牌。 */
function hexTokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [name, hex]));
}

/** 取出某个选择器后面那一段 `{ ... }`（令牌块里没有嵌套的花括号，深色块是 @media 里套 :root）。 */
function block(after: string): string {
  const start = css.indexOf(after);
  if (start < 0) throw new Error(`tokens.css 里找不到“${after}”`);
  const open = css.indexOf('{', css.indexOf(':root', start));
  return css.slice(open, css.indexOf('}', open));
}

const light = hexTokens(block(':root {'));
// 深色只覆盖颜色，没写的令牌沿用浅色值。深色写两遍（跟随系统、顶栏手动选深色），两块要一样
const darkOnly = hexTokens(block('@media (prefers-color-scheme: dark)'));
const darkManual = hexTokens(block(":root[data-theme='dark'] {"));
const dark = { ...light, ...darkOnly };

/** WCAG 2.x 相对亮度 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * [前景令牌, 背景令牌, 最低对比度, 用在哪里]（design v3 §3.1）。
 * 橙色（--mascot）只画小形象、不上文字，这里只核对它和顶栏底色的区分度。
 */
const PAIRS: [string, string, number, string][] = [
  ['--text', '--bg', 4.5, '正文'],
  ['--text', '--surface', 4.5, '抽屉、浮层里的文字'],
  ['--text-muted', '--bg', 4.5, '次要文字、弱化的其他路线'],
  ['--text-muted', '--surface', 4.5, '浮层里的次要文字'],
  ['--text', '--surface-muted', 4.5, '行悬停、代码块、提示块、表格隔行里的文字'],
  ['--accent', '--surface-muted', 4.5, '提示块、表格隔行里的链接'],
  ['--text', '--accent-soft', 4.5, '当前选择的卡片、搜索选中行里的文字'],
  ['--text-muted', '--accent-soft', 4.5, '当前选择的卡片说明、搜索选中行的小标题'],
  ['--text-faint', '--bg', 4.5, '白底上的元信息（页脚、截图编号、目录章标题）'],
  ['--text-faint', '--surface-muted', 4.5, '代码块上的复制按钮'],
  ['--accent', '--bg', 4.5, '链接、文字按钮'],
  ['--accent', '--surface', 4.5, '浮层里的链接'],
  ['--accent', '--accent-soft', 4.5, '“当前选择”标签、搜索选中行的标题'],
  ['--primary-fg', '--primary-bg', 4.5, '主按钮上的文字'],
  ['--primary-fg', '--primary-bg-hover', 4.5, '主按钮悬停时的文字'],
  ['--todo-rule', '--todo-bg', 4.5, '“作者待补”标签（13px）'],
  ['--text', '--todo-bg', 4.5, '作者待补提示正文'],
  ['--text-muted', '--todo-bg', 4.5, '提示里的次要文字'],
  ['--accent', '--todo-bg', 4.5, '提示里的链接'],
  ['--caution-rule', '--caution-bg', 4.5, '“注意”标签（13px）'],
  ['--text', '--caution-bg', 4.5, '风险提示正文'],
  ['--text-muted', '--caution-bg', 4.5, '风险提示里的次要文字'],
  ['--accent', '--caution-bg', 4.5, '风险提示里的链接'],
  ['--video-fg', '--video-bg', 4.5, '视频门面上的文字'],
  ['--control-border', '--bg', 3, '控件边界'],
  ['--control-border', '--surface', 3, '控件边界（浮层上）'],
  ['--control-border', '--accent-soft', 3, '当前选择卡片里的控件边界'],
  ['--focus', '--bg', 3, '键盘焦点环'],
  ['--focus', '--surface', 3, '键盘焦点环（浮层上）'],
  ['--focus', '--accent-soft', 3, '键盘焦点环（当前选择的卡片、搜索选中行）'],
  ['--focus', '--surface-muted', 3, '键盘焦点环（代码块、提示块）'],
  ['--focus', '--todo-bg', 3, '键盘焦点环（提示里）'],
  ['--focus', '--caution-bg', 3, '键盘焦点环（风险提示里）'],
  ['--mascot', '--bg', 3, '小形象在顶栏站名旁'],
];

it('浅色、深色两块令牌都读到了', () => {
  // 深色块读空时 dark 会退回浅色值，下面的深色用例就白测了
  expect(Object.keys(light).length).toBeGreaterThanOrEqual(15);
  expect(Object.keys(darkOnly).length).toBeGreaterThanOrEqual(15);
  expect(darkOnly['--bg']).not.toBe(light['--bg']);
});

// 昼夜切换（用户 2026-10-22 决定）：跟随系统的深色块和手动选深色的块必须写同样的值，否则两种进入深色的方式颜色不一样
it('跟随系统的深色和手动选的深色两块令牌完全一致', () => {
  expect(darkManual).toEqual(darkOnly);
  const full = (sel: string) => block(sel).replace(/\s+/g, ' ').trim();
  expect(full(":root[data-theme='dark'] {")).toBe(full('@media (prefers-color-scheme: dark)'));
  expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme='light'\]\) \{/);
});

// design §3.1：主按钮从 v2.2 的墨色改成主色（V4）
it('主按钮用主色', () => {
  expect(light['--primary-bg']).toBe(light['--accent']);
  expect(darkOnly['--primary-bg']).toBe(darkOnly['--accent']);
});

// design §5（D11）：开启“减少动态效果”时去掉所有过渡和位移。组件里的过渡时长和位移都取这几个令牌，
// 令牌在 reduced-motion 块里归零，就不用每个组件各写一遍。
it('减少动态效果时，动效时长和位移令牌都归零', () => {
  const motion = Object.fromEntries(
    [...block(':root {').matchAll(/(--(?:duration|nudge|press)[\w-]*):\s*([^;]+);/g)].map(([, name, value]) => [name, value!.trim()]),
  );
  expect(Object.keys(motion).sort()).toEqual(
    ['--duration-drawer-in', '--duration-drawer-out', '--duration-fade', '--nudge', '--press-shift'].sort(),
  );
  const reduced = block('@media (prefers-reduced-motion: reduce)');
  for (const name of Object.keys(motion)) {
    expect(reduced, `${name} 没有在 reduced-motion 里归零`).toMatch(new RegExp(`${name}:\\s*0(ms|px)?\\s*;`));
  }
});

// design v3 §3.3（V10）：按钮、卡片、代码块、提示块、下拉 6px，截图 4px，搜索框是唯一的胶囊。
it('圆角收小：--radius 6px、截图 4px、胶囊 999px（v2.2 的 control/panel 合并）', () => {
  const radii = Object.fromEntries(
    [...block(':root {').matchAll(/(--radius-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value!.trim()]),
  );
  expect(radii).toEqual({ '--radius-image': '4px', '--radius-pill': '999px' });
  expect(block(':root {')).toMatch(/--radius:\s*6px;/);
});

describe.each([
  ['浅色', light],
  ['深色', dark],
])('%s主题的对比度', (_theme, tokens) => {
  it.each(PAIRS)('%s 对 %s ≥ %d:1（%s）', (fg, bg, min) => {
    expect(tokens[fg], `${fg} 没有写成 #rrggbb`).toBeDefined();
    expect(tokens[bg], `${bg} 没有写成 #rrggbb`).toBeDefined();
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
