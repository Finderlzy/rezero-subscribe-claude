// 生成分享卡片图 public/og-image.png（1200×630，SEO 2026-10-25：Open Graph / Twitter 的 og:image）。
//
// 版式用站点自己的样子：白底、紫色“Re:”logo（和网站同一个 SVG，不改画）、站名、一句话、一行章节名。
// 只用仓库里的素材和系统字体，不画新图、不加装饰；文字是渲染时烘进 PNG 的，所以图片进仓库，构建时不跑这个脚本。
//
// 用法：node scripts/build-og-image.mjs
// 字体：系统的 Noto Sans CJK（/usr/share/fonts/opentype/noto/NotoSansCJK-*.ttc，SIL OFL 1.1）。
// 改了 logo 或站名后重新跑一次，产物覆盖 public/og-image.png。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const OUT = `${repoRoot}public/og-image.png`;
const WIDE = 1200;
const TALL = 630;

// 和 src/styles/tokens.css 的浅色令牌一致
const BG = '#ffffff';
const TEXT = '#18181b';
const TEXT_MUTED = '#52525b';
const ACCENT = '#5b4ba8';
const BORDER = '#e4e4e7';

const SITE_NAME = 'Re:从零开始订阅 claude';
const TAGLINE = '从买服务器、搭住宅 IP 节点，到注册账号、订阅 Claude';
const TAGLINE_2 = '一步一步跟着做的教程';
const CHAPTERS = ['开始', '准备节点和住宅 IP', '客户端配置与订阅', '日常维护', '结尾'];

// logo 是转曲 SVG：把两处取色换成写死的颜色（图片里没有 CSS 变量可用）
function logoDataUri() {
  const svg = readFileSync(`${repoRoot}src/assets/logo/logo-zh.svg`, 'utf8')
    .replaceAll('var(--logo-re, #5B3FA0)', ACCENT)
    .replaceAll('currentColor', TEXT)
    .replace(/(<svg[^>]*?)\swidth="\d+"\s+height="\d+"/, '$1');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** 文字的宽度估算：中文全角按 1em、西文和空格按 0.55em，只用来给章节名排一行。 */
function approximateWidth(text, fontSize) {
  return [...text].reduce((sum, ch) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55), 0) * fontSize;
}

const logoWidth = 600;
const logoHeight = Math.round((logoWidth * 250) / 784);
const logoTop = 118;
const taglineSize = 34;
const chapterSize = 24;
const chapterY = 545;

// 章节名一行排开，用中点分隔
const chapterLine = CHAPTERS.join('   ·   ');
const chapterWidth = approximateWidth(chapterLine, chapterSize);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDE}" height="${TALL}" viewBox="0 0 ${WIDE} ${TALL}">
  <rect width="${WIDE}" height="${TALL}" fill="${BG}"/>
  <rect x="0" y="0" width="${WIDE}" height="6" fill="${ACCENT}"/>
  <image x="${(WIDE - logoWidth) / 2}" y="${logoTop}" width="${logoWidth}" height="${logoHeight}" href="${logoDataUri()}"/>
  <text x="${WIDE / 2}" y="418" text-anchor="middle" fill="${TEXT_MUTED}" font-family="Noto Sans CJK SC, sans-serif" font-size="${taglineSize}">${escapeXml(TAGLINE)}</text>
  <text x="${WIDE / 2}" y="466" text-anchor="middle" fill="${TEXT_MUTED}" font-family="Noto Sans CJK SC, sans-serif" font-size="${taglineSize}">${escapeXml(TAGLINE_2)}</text>
  <line x1="${(WIDE - chapterWidth - 160) / 2}" y1="${chapterY - 40}" x2="${(WIDE + chapterWidth + 160) / 2}" y2="${chapterY - 40}" stroke="${BORDER}" stroke-width="1"/>
  <text x="${WIDE / 2}" y="${chapterY}" text-anchor="middle" fill="${TEXT_MUTED}" font-family="Noto Sans CJK SC, sans-serif" font-size="${chapterSize}">${escapeXml(chapterLine)}</text>
</svg>`;

await sharp(Buffer.from(svg), { density: 144 }).png({ palette: false, compressionLevel: 9 }).toFile(OUT);
console.log(`已生成 ${OUT}`);
