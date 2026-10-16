// 把 logo 文字、编号字形用开源字体转成 SVG 路径（需求 FR-70，design §3.2 D7，架构 §5 logo）。
// 用法：node scripts/build-logo.mjs [--out <目录>]（--out 默认是仓库根目录，测试用它把输出写到临时目录）
// 先把下面四个字体下载到 .cache/fonts/（不提交）。都是 SIL OFL 1.1，许可证核对见 docs/reuse-research.md §5。
// 地址固定到具体提交，重新下载得到的是同一份文件，输出的 SVG 也就相同。
//
//   Cinzel.ttf                 https://raw.githubusercontent.com/google/fonts/b7c8331cf620346575487ef8db0e2c729f014675/ofl/cinzel/Cinzel%5Bwght%5D.ttf
//   CormorantGaramond.ttf      https://raw.githubusercontent.com/google/fonts/b7c8331cf620346575487ef8db0e2c729f014675/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf
//   RobotoCondensed.ttf        https://raw.githubusercontent.com/google/fonts/b7c8331cf620346575487ef8db0e2c729f014675/ofl/robotocondensed/RobotoCondensed%5Bwght%5D.ttf
//   SourceHanSansCN-Heavy.otf  https://raw.githubusercontent.com/adobe-fonts/source-han-sans/a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2/SubsetOTF/CN/SourceHanSansCN-Heavy.otf
//
// 输出：src/assets/logo/{logo-zh,logo-en,mark}.svg（由 Logo.astro 内联）、public/favicon.svg；
// src/assets/numerals/ 的编号字形 symbols.svg + metrics.json（由 NumeralSprite.astro 和 lib/numeral.ts 使用）
// 和四条章节副标题 chapter-00.svg…chapter-03.svg（由 ChapterSubtitle.astro 内联）。
// 颜色：“Re”用 var(--logo-re, #5B3FA0)，其余用 currentColor；favicon 单独用文件，自带深浅配色。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, '.cache/fonts');
const outFlag = process.argv.indexOf('--out');
if (outFlag !== -1 && !process.argv[outFlag + 1]) throw new Error('--out 后面要写输出目录');
const outDir = outFlag === -1 ? root : resolve(process.argv[outFlag + 1]);

function loadFont(file, variation) {
  let buffer;
  try {
    buffer = readFileSync(join(fontDir, file));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(`缺少字体 .cache/fonts/${file}，下载地址见 scripts/build-logo.mjs 开头`);
  }
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  return { font, variation };
}

const fonts = {
  re: loadFont('CormorantGaramond.ttf', { wght: 500 }), // 细衬线“Re”
  reBold: loadFont('CormorantGaramond.ttf', { wght: 700 }), // favicon 用，16px 下笔画要够粗
  serif: loadFont('Cinzel.ttf', { wght: 900 }), // 冒号
  caps: loadFont('Cinzel.ttf', { wght: 800 }), // ZERO、CLAUDE
  han: loadFont('SourceHanSansCN-Heavy.otf', undefined), // 中文
  sub: loadFont('RobotoCondensed.ttf', { wght: 700 }), // 小号英文
};

const RE = 're';
const INK = 'ink';

// 排一段文字：逐字取路径，返回各颜色的路径数据和终点 x。
// 每个字可单独缩放（scale）和上下移动（dy，正数向下），用来做“A 小一号上移、U 下沉”的错落。
function run({ font: key, text, x, y, size, color = INK, tracking = 0, glyphs = {} }) {
  const { font, variation } = fonts[key];
  const out = { [RE]: [], [INK]: [] };
  let cursor = x;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    if (glyph.index === 0) throw new Error(`字体 ${key} 没有“${ch}”`);
    const adjust = glyphs[ch] ?? {};
    const s = size * (adjust.scale ?? 1);
    const path = glyph.getPath(cursor + (adjust.dx ?? 0), y + (adjust.dy ?? 0), s, variation ? { variation } : {}, font);
    out[color].push(path);
    // advanceWidth 在 getPath 之后才是当前字重的值
    cursor += (glyph.advanceWidth * s) / font.unitsPerEm + tracking + (adjust.after ?? 0);
  }
  return { paths: out, end: cursor - tracking };
}

function bbox(paths) {
  const b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const p of paths) {
    const pb = p.getBoundingBox();
    if (!Number.isFinite(pb.x1)) continue;
    b.x1 = Math.min(b.x1, pb.x1);
    b.y1 = Math.min(b.y1, pb.y1);
    b.x2 = Math.max(b.x2, pb.x2);
    b.y2 = Math.max(b.y2, pb.y2);
  }
  return b;
}

// 自己把路径命令写成 path data：opentype.js 的 toPathData 遇到 112.00000000000001 这类字号会输出 NaN。
// 默认保留两位小数；编号字形按 1000 单位/em 取，取整就够细。
function pathData(path, decimals = 2) {
  const scale = 10 ** decimals;
  const num = (v) => {
    const r = Math.round(v * scale) / scale;
    return Object.is(r, -0) ? '0' : String(r);
  };
  return path.commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${num(c.x)} ${num(c.y)}`;
        case 'Q':
          return `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
        case 'C':
          return `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
        case 'Z':
          return 'Z';
        default:
          throw new Error(`未知的路径命令 ${c.type}`);
      }
    })
    .join('');
}

// 把若干段文字合成一个 SVG：外框按字形实际范围加留白，路径按颜色各合成一条。
// 传了 style 时（favicon）配色全由 style 决定，不写内联颜色。logo 以外的图形（章节副标题）传 classes: false，
// 不带 .logo-re/.logo-ink，免得 logo 的约定波及它们。
function svg(runs, { pad = 4, style = '', classes = true } = {}) {
  const re = runs.flatMap((r) => r.paths[RE]);
  const ink = runs.flatMap((r) => r.paths[INK]);
  const b = bbox([...re, ...ink]);
  const x = Math.floor(b.x1 - pad);
  const y = Math.floor(b.y1 - pad);
  const w = Math.ceil(b.x2 + pad) - x;
  const h = Math.ceil(b.y2 + pad) - y;
  const d = (paths) => paths.map((p) => pathData(p)).join('');
  if (d(re).includes('NaN') || d(ink).includes('NaN')) throw new Error('路径里出现 NaN');
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">`];
  if (style) parts.push(`<style>${style}</style>`);
  const reFill = style ? '' : ' style="fill:var(--logo-re, #5B3FA0)"';
  const inkFill = style ? '' : ' fill="currentColor"';
  const cls = (name) => (classes ? ` class="${name}"` : '');
  if (re.length) parts.push(`<path${cls('logo-re')}${reFill} d="${d(re)}"/>`);
  if (ink.length) parts.push(`<path${cls('logo-ink')}${inkFill} d="${d(ink)}"/>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

// “Re:”：中英文版和标记共用。返回冒号之后的 x。
// colonSize 默认跟 Re 的字号走；Re 放大时冒号不必等比放大。gap 是 Re 和冒号的间距（字号的比例）。
function reColon(x, y, size, { reFont = 're', colonSize = size * 0.9, gap = 0.04, tight = 0 } = {}) {
  const re = run({ font: reFont, text: 'Re', x, y, size, color: RE, glyphs: { R: { after: -size * tight } } });
  const colon = run({ font: 'serif', text: ':', x: re.end + size * gap, y, size: colonSize });
  return { runs: [re, colon], end: colon.end };
}

// —— 中文版（E 版）——
// 第一行：Re : 从(小) 零(大)
// 中间行：Re: Zero − Starting Life with Claude
// 第二行（缩进）：开始(大) 订阅(小，中线偏上) CLAUDE（A 小一号上移、U 下沉）
function logoZh() {
  const big = 100;
  const line1 = 100;
  const head = reColon(0, line1, big * 1.38, { colonSize: big * 1.05 });
  const cong = run({ font: 'han', text: '从', x: head.end + 8, y: line1, size: big * 0.5 });
  const ling = run({ font: 'han', text: '零', x: cong.end + 2, y: line1 + 4, size: big });

  const mid = run({
    font: 'sub',
    text: 'Re: Zero − Starting Life with Claude',
    x: 40,
    y: line1 + 30,
    size: 17,
    tracking: 1.6,
  });

  const line2 = line1 + 128;
  const kaishi = run({ font: 'han', text: '开始', x: 70, y: line2, size: big });
  const dingyue = run({ font: 'han', text: '订阅', x: kaishi.end + 4, y: line2 - 34, size: big * 0.46 });
  const claude = run({
    font: 'caps',
    text: 'CLAUDE',
    x: dingyue.end + 10,
    y: line2,
    size: big * 0.92,
    tracking: 1,
    glyphs: { A: { scale: 0.8, dy: -16 }, U: { dy: 12 } },
  });
  return svg([...head.runs, cong, ling, mid, kaishi, dingyue, claude]);
}

// —— 英文版 ——：Re:ZERO（E 小一号上移、R 下沉），下面一行 −Starting Life with Claude−
function logoEn() {
  const big = 100;
  const line1 = 100;
  const head = reColon(0, line1, big * 1.12, { colonSize: big });
  const zero = run({
    font: 'caps',
    text: 'ZERO',
    x: head.end + 4,
    y: line1,
    size: big,
    tracking: 1,
    glyphs: { E: { scale: 0.8, dy: -14 }, R: { dy: 12 } },
  });
  const subSize = 22;
  const subText = '−Starting Life with Claude−';
  const probe = run({ font: 'sub', text: subText, x: 0, y: 0, size: subSize, tracking: 3 });
  const sub = run({
    font: 'sub',
    text: subText,
    x: (zero.end - probe.end) / 2 + 10,
    y: line1 + 44,
    size: subSize,
    tracking: 3,
  });
  return svg([...head.runs, zero, sub]);
}

// —— 页眉标记：Re: ——
function mark() {
  return svg(reColon(0, 100, 100).runs, { pad: 2 });
}

// —— favicon：Re:，自带深浅配色（不经过页面令牌）——
// 16px 下细衬线会消失：e 和冒号缩小、字距收紧让字填满方框，再给“Re”描一道同色边加粗笔画。
function favicon() {
  const style =
    '.logo-re{fill:#5B3FA0;stroke:#5B3FA0;stroke-width:7;stroke-linejoin:round}.logo-ink{fill:#1C1A22}' +
    '@media (prefers-color-scheme: dark){.logo-re{fill:#B9A4EE;stroke:#B9A4EE}.logo-ink{fill:#E8E5EE}}';
  const size = 100;
  const re = run({
    font: 'reBold',
    text: 'Re',
    x: 0,
    y: 100,
    size,
    color: RE,
    glyphs: { R: { after: -size * 0.08 }, e: { scale: 0.86 } },
  });
  const colon = run({ font: 'serif', text: ':', x: re.end - size * 0.02, y: 100, size: size * 0.9 });
  // 浏览器标签图标按正方形显示：把外框补成正方形，字形居中
  return square(svg([re, colon], { pad: 4, style }));
}

function square(text) {
  return text.replace(/viewBox="(\S+) (\S+) (\S+) (\S+)" width="\S+" height="\S+"/, (_, x, y, w, h) => {
    const side = Math.max(+w, +h);
    const nx = +x - (side - +w) / 2;
    const ny = +y - (side - +h) / 2;
    return `viewBox="${nx} ${ny} ${side} ${side}" width="${side}" height="${side}"`;
  });
}

// —— 编号字形（design §3.2、D7）——
// 和 logo“Re”同一种细衬线（Cormorant Garamond 500）的等高数字。这款字体默认是旧式数字（zero…），
// charToGlyph 会拿到半高的 0 和 1，所以按字形名取 zero.lf…nine.lf，短横取 endash（架构 §11.4 W-1）。
// 输出一份 <symbol> 雪碧图和字宽表：页面内联一次雪碧图，构建时和浏览器脚本都用 lib/numeral.ts 拼 <use>，
// 不必为每个数字串单独转曲（架构 §11.4 W-2）。坐标是字体单位（1000/em），y 向下、基线是 0。
const NUMERAL_GLYPHS = {
  0: 'zero.lf',
  1: 'one.lf',
  2: 'two.lf',
  3: 'three.lf',
  4: 'four.lf',
  5: 'five.lf',
  6: 'six.lf',
  7: 'seven.lf',
  8: 'eight.lf',
  9: 'nine.lf',
  '–': 'endash',
};
// symbol 的 id 后缀；短横不能直接放进 id
const numeralKey = (ch) => (ch === '–' ? 'dash' : ch);

function numerals() {
  const { font, variation } = fonts.re;
  const glyphs = Object.entries(NUMERAL_GLYPHS).map(([ch, name]) => {
    const glyph = font.nameToGlyph(name);
    if (!glyph || glyph.name !== name) throw new Error(`字体 re 没有字形 ${name}`);
    const path = glyph.getPath(0, 0, font.unitsPerEm, { variation }, font);
    // advanceWidth 在 getPath 之后才是当前字重的值
    return { ch, path, advance: Math.round(glyph.advanceWidth) };
  });
  // 所有字形共用一个竖向范围：上到最高的数字，下到圆形笔画压过基线的部分，数字之间才对得齐
  const b = bbox(glyphs.map((g) => g.path));
  const top = Math.floor(b.y1);
  const height = Math.ceil(b.y2) - top;
  const symbols = glyphs.map(({ ch, path, advance }) => {
    const d = pathData(path, 0);
    if (d.includes('NaN')) throw new Error('路径里出现 NaN');
    return `<symbol id="numeral-${numeralKey(ch)}" viewBox="0 ${top} ${advance} ${height}"><path d="${d}"/></symbol>`;
  });
  const metrics = {
    top,
    height,
    advance: Object.fromEntries(glyphs.map((g) => [g.ch, g.advance])),
  };
  return {
    symbols: `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join('\n')}\n</svg>\n`,
    metrics: JSON.stringify(metrics, null, 2) + '\n',
  };
}

// —— 章节标题卡的英文副标题（design §3.2、§4.1）：− CHAPTER 0n − ——
// Roboto Condensed 700，13px，字距 0.3em；两端是 24px 长、1px 粗的细短横，竖向落在大写字母的中线上。
function chapterSubtitle(n) {
  const size = 13;
  const dash = 24;
  const gap = size * 0.6;
  const { font } = fonts.sub;
  const capHeight = (font.tables.os2.sCapHeight * size) / font.unitsPerEm;
  // 短横的上下边落在整像素上，13px 原大显示时不发虚
  const y = Math.round(-capHeight / 2 - 0.5);
  const rule = (x) => {
    const p = new opentype.Path();
    p.moveTo(x, y);
    p.lineTo(x + dash, y);
    p.lineTo(x + dash, y + 1);
    p.lineTo(x, y + 1);
    p.close();
    return p;
  };
  const text = run({ font: 'sub', text: `CHAPTER ${String(n).padStart(2, '0')}`, x: dash + gap, y: 0, size, tracking: size * 0.3 });
  const ends = { paths: { [RE]: [], [INK]: [rule(0), rule(Math.round(text.end + gap))] } };
  return svg([ends, text], { pad: 0, classes: false });
}

const numeralOut = numerals();

const outputs = {
  'src/assets/logo/logo-zh.svg': logoZh(),
  'src/assets/logo/logo-en.svg': logoEn(),
  'src/assets/logo/mark.svg': mark(),
  'public/favicon.svg': favicon(),
  'src/assets/numerals/symbols.svg': numeralOut.symbols,
  'src/assets/numerals/metrics.json': numeralOut.metrics,
  ...Object.fromEntries([0, 1, 2, 3].map((n) => [`src/assets/numerals/chapter-0${n}.svg`, chapterSubtitle(n)])),
};

for (const [file, content] of Object.entries(outputs)) {
  const target = join(outDir, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`${file}  ${content.length} 字节`);
}
