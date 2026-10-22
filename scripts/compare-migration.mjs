#!/usr/bin/env node
// 一次性核对脚本（#28 建立，V10 改成 v3 单版本；FR-03、FR-21、AC-12、AC-13）：比对重写稿和构建产物
// 里的命令、外链、截图和正文。
//
// 用法：node scripts/compare-migration.mjs [重写稿目录]
//   重写稿目录默认是 docs/v3-rewrite。脚本不负责构建：先跑 npm run build 再跑这个脚本。
//   dist/ 必须是当前 src/content/ 构建出来的；src/content/ 落后于重写稿时（改了重写稿没重跑导入），
//   先跑 node scripts/import-rewrite.mjs 再重新构建，否则报出来的差异是内容快照过期，不是脚本的问题。
//
// 比对规则（v3：一章一页、只有一版正文）：
// - 范围：route.yaml 里的 11 页 + 参考页（`reference/` 下的实测合集和各篇实测）。首页不在比对范围。
// - 对应关系：重写稿根目录的 `*.md` 按第一行的 `# 标题` 对应 `src/content/principle/<id>.md`；
//   参考页在 `reference/` 子目录，按标题对应 `src/content/reference/**`。产物里每页只有一段
//   `<div class="prose">` 正文。
// - 正文：重写稿的每一行（段落、列表项、标题、表格单元格）去掉 Markdown 记号后都要在产物正文里找到，
//   防止导入时丢段。代码块、图片嵌入、Callout 首行单独核对。
// - TODO 段落：段数要等于 PENDING.todos 的登记（和构建提示“作者待补”的处数一致）。
// - 命令：围栏代码块（连同语言标记，去掉 Callout 的 `>` 前缀和公共缩进后逐字比较）；行内代码按渲染出来的
//   正文文字找（表格单元格里的 `x` 渲染成不带标签的纯文本，产物里没有 <code>）。
// - 外链：重写稿正文里的外链（Markdown 链接、裸地址）必须原样出现在产物里，地址和链接文字都要对上；
//   围栏代码块和行内代码里的 `https://…` 是命令的一部分，不算外链。
// - 站内链接：`[文字](02-….md)` 和双链 `[[标题|文字]]` 都按标题解析成 `/<id>/`（导入时转成双链，
//   ADR-0005），带 `#小节` 的核对锚点存在；同页 `[文字](#小节)` 换成页面上的 slug。链接连同前后各
//   LINK_CONTEXT 个字比较。产物里的站内链接都要能追溯到重写稿或同页小节。
// - 截图：重写稿的 `![[文件名|宽度]]` 在产物里要有同名的图片（比 `alt`，Astro 会把图片转成带哈希的
//   webp，`src` 不是重写稿里的名字）、宽度一致（重写稿写了宽度才比），且图片文件确实在 dist/ 里。
//   说明图（`说明图-….svg`）是内联的 `<svg data-diagram>`，按 `<title>` 和 `附件/` 里的原稿比，张数也要一致。
// 允许的差异只有 ADR-0005 和 import-rewrite.mjs 规定的转换，逐条登记在 CONVERSIONS 里，运行时逐条打印。
// 都按集合比较：同一条命令、链接或截图重复出现、产物里只剩一处时查不出来，这部分靠人工抽查。
//
// 退出码：0 = 没有差异，也没有待补项；1 = 有未登记的差异；2 = 只剩登记过的待补项。

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import GithubSlugger from 'github-slugger';
import { parse as parseYaml } from 'yaml';

const repoRoot = resolve(import.meta.dirname, '..');
const rewriteDir = resolve(process.argv[2] ?? join(repoRoot, 'docs', 'v3-rewrite'));
const distDir = join(repoRoot, 'dist');
const contentRoot = join(repoRoot, 'src', 'content');

/** 参考页在重写稿里的子目录（导入脚本同样读这里） */
const REFERENCE_DIR = 'reference';
/** 指向博客其他文章的双链前缀，目标查 blog-links.yaml（Q-11） */
const BLOG_PREFIX = '04技术/';

// Markdown 链接连同前后各 LINK_CONTEXT 个字一起比较。重写稿原样导入，正文里的链接写法不用登记。
const LINK_CONTEXT = 4;

// 登记过的转换（ADR-0005、import-rewrite.mjs）。kind 说明差异是怎么来的，运行时逐条打印。
// - footer-drop：手写页脚（`---` + “上一步/下一步/回到：…”）由页面生成，不进产物（FR-04）。
// - frontmatter：重写稿的 frontmatter 是页面元数据，不进正文（ADR-0005）。
// - title-rule：标题下面紧跟的 `---` 是作者的分隔写法，页面已经有标题样式，不渲染（V10）。
// - link-rewrite：相对 Markdown 链接 `[文字](02-….md)` 导入时转成双链（V10）。
// - code-lang：不做语法高亮，语言标记在 `<code class="language-…">` 上，没写语言的按 plaintext 比。
// - autolink：正文里的裸地址按 GFM 渲染成链接，链接文字就是地址。
// - diagram-inline：说明图内联成 `<svg data-diagram>`，按 `<title>` 对回附件里的原稿。
const CONVERSIONS = [
  {
    kind: 'footer-drop',
    what: '手写页脚不导入：正文末尾的 `---` + “上一步/下一步/回到：…”，导航由页面生成（FR-04）',
    check: '每条记录都确认重写稿末尾有 `---` 和以“上一步：/下一步：/回到：”开头的一段，产物里没有这一段',
  },
  {
    kind: 'frontmatter',
    what: '重写稿的 frontmatter（页面元数据）不进正文，导入时保留在站内文件里（ADR-0005）',
    check: '站内文件的 frontmatter 与重写稿正文无关，脚本只核对正文',
  },
  {
    kind: 'title-rule',
    what: '标题下面紧跟的 `---` 是作者新稿的分隔写法（Obsidian），页面已经有标题样式，不渲染',
    check: 'remark-obsidian 的 preparePage 去掉标题后面的 thematic break；这里只按正文文字比，不受影响',
  },
  {
    kind: 'link-rewrite',
    what: '相对 Markdown 链接 `[文字](02-….md)` 导入时换成双链 `[[目标页标题|文字]]`，产物里是站内链接',
    check: '按文件名找重写稿的标题，再按页面标识算地址；链接文字原样保留',
  },
  {
    kind: 'code-lang',
    what: '围栏代码块不做语法高亮（v2.2 W4c），语言标记写在 `<code class="language-…">` 上；代码本身逐字不变',
    check: '重写稿里空的语言标记和产物里没有语言类都当成 `plaintext` 比较',
  },
  {
    kind: 'autolink',
    what: '正文里的裸地址按 GFM 渲染成链接，链接文字就是地址本身',
    check: '产物里链接文字等于地址的外链，要在重写稿的裸地址里找得到',
  },
  {
    kind: 'diagram-inline',
    what: '说明图 `![[说明图-….svg]]` 由 diagram.ts 内联成 `<svg data-diagram>`（design §4.7），不是 `<img>`',
    check: '产物里要有一张 `<title>` 和重写稿 `附件/` 里原稿相同的内联说明图',
  },
  {
    kind: 'todo-label',
    what: '`TODO：` 段落渲染成“作者待补 + 原文”（FR-21），正文文字不变，只多一个标签',
    check: '登记的页面里 TODO 段落数 = 产物里“作者待补”标签数',
  },
];

// 登记的待补项：重写稿没有、产物也就没有的内容。补上后从这里删掉。
const PENDING = {
  // 参考页正文还没写的页面：现在没有（参考页的正文都在重写稿里），留在这里方便以后登记
  pages: {},
  // 作者待补的 TODO 段落（构建提示“作者待补”的页面），按页面合计，和构建提示的处数一致。
  todos: {
    'reference/ip-tests/qsu-residential': 1,
  },
};

// ---- 重写稿 ----

const unescapePipe = (s) => s.replace(/\\\|/g, '|');

/** 重写稿正文：一行 `---` 加一段以“上一步：/下一步：/回到：”开头的页脚（FR-04） */
const FOOTER = /\n---\n+(?:上一步|下一步|回到)：[^\n]*\n*$/;

function splitRewrite(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  const fm = /^---\n[\s\S]*?\n---\n/.exec(normalized);
  const frontmatter = fm ? fm[0] : '';
  const rest = fm ? normalized.slice(fm[0].length) : normalized;
  const footer = FOOTER.exec(rest);
  return {
    frontmatter,
    footer: footer ? footer[0].trim() : undefined,
    body: footer ? rest.slice(0, footer.index + 1) : rest,
  };
}

/** 去掉 Callout 的 `>` 前缀后抽出围栏代码块（连同语言标记）和行内代码；返回的 blocks/inline 属于“命令” */
function splitCode(text) {
  const lines = text.split('\n').map((l) => l.replace(/^(\s*>\s?)+/, ''));
  const blocks = [];
  const prose = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*(`{3,})(.*)$/.exec(lines[i]);
    if (!open) {
      prose.push(lines[i]);
      continue;
    }
    const close = new RegExp(`^\\s*${open[1]}\`*\\s*$`);
    const body = [];
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) body.push(lines[j++]);
    const indent = body.length === 0 ? 0 : Math.min(...body.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length));
    const code = body.map((l) => l.slice(indent).trimEnd()).join('\n');
    // 没写语言的代码块按 plaintext 比（登记在 CONVERSIONS 的 code-lang）
    blocks.push({ line: i + 1, startLine: i + 1, endLine: j + 1, code: `${open[2].trim() || 'plaintext'}\n${code}` });
    i = j;
  }
  return { blocks, prose: prose.join('\n') };
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** TODO 段落（`TODO：` 开头的一段），标点后补的那段内容不算在内 */
function todoParagraphs(body) {
  return body.split(/\n\s*\n/).filter((p) => /^TODO[：:]/.test(p.trim()));
}

function extractRewrite(text) {
  const { footer, body } = splitRewrite(text);
  const { blocks, prose } = splitCode(body);
  const inline = [...prose.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  // 外链只认正文里的：围栏代码块和行内代码里的 `https://…` 是命令的一部分，不是链接。
  // 掩掉代码时保留换行和每行长度，行号才对得上源文件。
  const masked = body
    .replace(/^([ \t]*>[ \t]?)+/gm, (m) => ' '.repeat(m.length))
    .split('\n')
    .map((line, i) => (blocks.some((b) => i + 1 >= b.startLine && i + 1 <= b.endLine) ? ' '.repeat(line.length) : line))
    .join('\n')
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
  const urls = [...masked.matchAll(/https?:\/\/[^\s<>()\[\]"'`，。）|]+/g)].map((m) => ({ url: m[0], line: lineOf(masked, m.index) }));
  const mdLinks = [];
  const relativeLinks = [];
  const hashLinks = [];
  // 链接文字和上下文要用“渲染成文字”的样子：行内代码的 `` ` `` 在页面上不显示，去掉再取上下文。
  body.split('\n').forEach((rawLine, i) => {
    if (blocks.some((b) => i + 1 >= b.startLine && i + 1 <= b.endLine)) return;
    const line = rawLine
      .replace(/^([ \t]*>[ \t]?)+/, '')
      // 列表记号（`- `、`1. `）在产物里由 <ol>/<ul> 生成，正文文字里没有，两边都去掉
      .replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')
      // 行内代码的反引号在页面上不显示
      .replace(/`([^`\n]*)`/g, '$1')
      // 双链在页面上显示成链接文字（`[[目标|文字]]` 显示“文字”，`[[文字]]` 显示“文字”）
      .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
      .replace(/\[\[([^\]|]*)\]\]/g, '$1');
    // 链接文字前后的上下文（按页面上显示的文字算：Markdown 链接只显示链接文字，加粗、行内代码的记号不显示）
    const shown = (s) =>
      s
        .replace(/(?<!!)\[([^\]\n]+)\]\((?:[^)\s]+)\)/g, '$1')
        .replace(/(\*\*|__)/g, '');
    for (const m of line.matchAll(/(?<!!)\[([^\]\n]+)\]\(([^)\s]+)\)/g)) {
      const end = m.index + m[0].length;
      const before = shown(line.slice(0, m.index)).slice(-LINK_CONTEXT);
      const after = shown(line.slice(end)).slice(0, LINK_CONTEXT);
      const item = { key: `${before}⟦[${m[1]}](${m[2]})⟧${after}`, label: m[1], url: m[2], line: i + 1 };
      if (/^https?:\/\//.test(m[2])) mdLinks.push(item);
      else if (m[2].startsWith('#')) hashLinks.push(item);
      else relativeLinks.push(item);
    }
  });
  const wikilinks = [];
  const embeds = [];
  for (const m of body.matchAll(/(!?)\[\[([^[\]\n]+)\]\]/g)) {
    const raw = unescapePipe(m[2]);
    const item = { raw, line: lineOf(body, m.index) };
    if (m[1]) embeds.push({ ...item, name: raw.split('|')[0].trim(), width: raw.includes('|') ? raw.split('|')[1].trim() : undefined });
    else wikilinks.push(item);
  }
  return { body, footer, blocks, inline, urls, mdLinks, relativeLinks, hashLinks, wikilinks, embeds };
}

// ---- 产物 ----

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(\w+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

const VOID_TAGS = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'track']);
const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/**
 * 从一个元素的开始标签往后找到配对的结束标签。
 * 按标签配对扫描，不靠固定的结束标签猜：图片、表格这些元素的子元素形状不固定。
 */
function elementAt(html, openIndex, tag) {
  TAG.lastIndex = openIndex;
  const first = TAG.exec(html);
  if (!first) return undefined;
  let depth = 0;
  let pos = openIndex;
  while (true) {
    TAG.lastIndex = pos;
    const m = TAG.exec(html);
    if (!m) return undefined;
    const [, slash, name, attrs] = m;
    if (name === tag && !VOID_TAGS.has(name) && !attrs.trimEnd().endsWith('/')) {
      if (slash) {
        depth -= 1;
        if (depth === 0) return { text: stripTags(html.slice(first.index + first[0].length, m.index)), end: TAG.lastIndex };
      } else {
        depth += 1;
      }
    }
    pos = TAG.lastIndex;
  }
}

function stripTags(html) {
  return decode(html.replace(/<[^>]*>/g, ''));
}

/** 页面里的正文：v3 只有一段不带 data-body 的 `<div class="prose">` */
function readBody(html) {
  const single = /<div class="prose"(?![^>]*data-body)[^>]*>/.exec(html);
  const body = single && elementAt(html, single.index, 'div');
  return body ? { html: html.slice(single.index, body.end), text: body.text } : undefined;
}

const CODE_BLOCK = /<pre(?:\s[^>]*)?>([\s\S]*?)<\/pre>/g;
const INLINE_CODE = /<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/g;

/** 渲染后正文里的命令：围栏代码块（连同语言标记）和行内代码 */
function extractCode(html) {
  const blocks = [];
  for (const m of html.matchAll(CODE_BLOCK)) {
    // 不做语法高亮（v2.2 W4c）：语言标记是 <code class="language-…">，没写语言时没有这个类，按 plaintext 比
    const lang = /\bclass="language-([\w-]+)"/.exec(m[0])?.[1] ?? 'plaintext';
    const text = decode(m[1].replace(/<[^>]*>/g, '')).replace(/\n+$/, '');
    blocks.push({ code: `${lang}\n${text}` });
  }
  // pre 里的 code 也是行内代码的形状，先挖掉再找行内代码
  const inline = [...html.replace(CODE_BLOCK, '').matchAll(INLINE_CODE)].map((m) => decode(m[1].replace(/<[^>]*>/g, '')));
  return { blocks, inline };
}

const EMBEDDED_IMAGE = /<img\b[^>]*data-zoom[^>]*>/g;

/**
 * 正文里的截图：文件名、宽度、产物里的图片地址。
 * 图片文件名取 `alt`：Astro 把图片转成 webp 后 `src` 是带哈希的新名字，`alt` 才是重写稿里的文件名
 * （remark-obsidian 的 convertEmbed 用 `basename(name, extname(name))` 做 alt）。
 */
function extractImages(html) {
  const images = [];
  for (const m of html.matchAll(EMBEDDED_IMAGE)) {
    const tag = m[0];
    const attr = (name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
    const src = attr('src') ?? '';
    images.push({
      file: decode(attr('alt') ?? ''),
      width: attr('width'),
      src: decode(src),
      line: lineOf(html, m.index),
    });
  }
  return images;
}

const isDiagram = (name) => /^说明图-.*\.svg$/.test(name);
const svgTitle = (svg) => /<title>([\s\S]*?)<\/title>/.exec(svg)?.[1].trim();

/** 正文里内联的说明图（diagram.ts）：取每张 `<svg … data-diagram>` 的 `<title>` */
function extractDiagrams(html) {
  return [...html.matchAll(/<svg\b[^>]*\bdata-diagram\b[^>]*>([\s\S]*?)<\/svg>/g)].map((m) => decode(svgTitle(m[1]) ?? ''));
}

/**
 * 正文里的链接。站内链接和博客外链在 HTML 里都是 `<a href>`，靠这句区分：
 * 页面上每条站内链接都有一个 `data-astro-cid-…`（Astro 给 .astro 模板里的元素加的），
 * 由 Markdown 生成的链接没有；参考页的参考链接（rehype 建的）也没有。
 */
function extractLinks(html) {
  const external = [];
  const internal = [];
  for (const m of html.matchAll(/<a\b([^>]*)>/g)) {
    const attrs = m[1];
    const href = /href="([^"]*)"/.exec(attrs)?.[1];
    const target = elementAt(html, m.index, 'a');
    if (href === undefined || !target) continue;
    const url = decode(href);
    const block = blockInfo(html, m.index);
    const item = {
      url,
      label: target.text,
      cid: /data-astro-cid-/.test(attrs),
      line: lineOf(html, m.index),
      // 链接所在的块（<p>/<li>）的文字和链接在块里的偏移（按去掉标签后的文字算），用于比前后文
      block: block?.text,
      blockOffset: block === undefined ? undefined : stripTags(html.slice(block.start, m.index)).length,
    };
    if (url.startsWith('http')) external.push(item);
    else if (!item.cid) internal.push(item);
  }
  return { external, internal };
}

/** 链接所在的段落：向上找到最近的 <p>/<li>/<td>，取它的文字和内容起点（用于算链接在段落里的偏移） */
function blockInfo(html, at) {
  const open = /<(p|li|td|th|h[1-6])(?:\s[^>]*)?>/g;
  let best;
  let m;
  while ((m = open.exec(html)) && m.index < at) best = m;
  if (!best) return undefined;
  const el = elementAt(html, best.index, best[1]);
  if (!el || el.end < at) return undefined;
  return { text: el.text, start: html.indexOf('>', best.index) + 1 };
}

/**
 * 产物里链接的上下文键：用链接所在块（<p>/<li>/<td>）的文字，取链接文字前后各 LINK_CONTEXT 个字。
 * 优先用链接在块里的偏移；同一段前面也提到过同样的文字（例如正文先写了 Chrome、后面才是链接）时，
 * 仍然按偏移取，不会拿错位置。
 */
function distLinkKey(body, link) {
  const text = (link.block ?? body).replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
  const at = link.blockOffset !== undefined && text.slice(link.blockOffset, link.blockOffset + link.label.length) === link.label
    ? link.blockOffset
    : text.indexOf(link.label);
  if (at === -1) return undefined;
  const before = text.slice(Math.max(0, at - LINK_CONTEXT), at);
  return `${before}⟦[${link.label}](${link.url})⟧${text.slice(at + link.label.length, at + link.label.length + LINK_CONTEXT)}`;
}

/** markdown 链接的上下文键：链接文字连同前后各 LINK_CONTEXT 个字 */
function linkKey(line, label, url) {
  const text = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
  const at = text.indexOf(label);
  if (at === -1) return undefined;
  const before = text.slice(Math.max(0, at - LINK_CONTEXT), at);
  return `${before}⟦[${label}](${url})⟧${text.slice(at + label.length, at + label.length + LINK_CONTEXT)}`;
}

/**
 * 重写稿的普通双链 `[[标题]]` / `[[标题#小标题|文字]]` 由 Markdown 插件按标题渲染成 `/<页面标识>/`
 * （ADR-0005），这是导入的基本转换，不用逐条登记：标题在 `src/content/principle|reference/` 里能找到
 * 就算对上；带 `#小标题` 的取该页面上同一条 slugger 规则算出的锚点（不存在就报差异）。
 */
function wikiLinkTarget(raw) {
  const [targetPart, headingPart] = splitOnce(splitOnce(raw, '|')[0], '#');
  const target = targetPart.trim();
  const heading = headingPart?.trim();
  if (target.startsWith(BLOG_PREFIX)) return undefined; // 博客外链走 blog-links.yaml，逐条登记
  const found = pagesByTitle.get(target);
  if (found === undefined) return undefined;
  const base = found.url;
  if (heading === undefined) return { kind: 'internal', url: base, pageId: found.id };
  const slug = headingAnchor(found.id, heading);
  if (slug === undefined) return { kind: 'internal', url: `${base}#（没有这个小标题）${heading}`, pageId: found.id, missing: heading };
  return { kind: 'internal', url: `${base}#${slug}`, pageId: found.id };
}

function splitOnce(text, sep) {
  const i = text.indexOf(sep);
  return i === -1 ? [text, undefined] : [text.slice(0, i), text.slice(i + 1)];
}

/** 小标题在页面上的锚点：用和页面同一条 github-slugger 规则（去行内记号、重复的加 -1、-2）。 */
function headingAnchor(id, heading) {
  const { body } = splitRewrite(readFileSync(contentFile(id), 'utf8'));
  const slugger = new GithubSlugger();
  let found;
  let fence;
  for (const line of body.split('\n')) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== undefined) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = undefined;
      continue;
    }
    if (f) {
      fence = f[1];
      continue;
    }
    const m = /^ {0,3}(#{2,6})[ \t]+(.*?)[ \t]*$/.exec(line);
    if (!m) continue;
    const plain = plainHeading(m[2]);
    const slug = slugger.slug(plain);
    if (found === undefined && (plain === heading || slug === heading)) found = slug;
  }
  return found;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  );
}

// ---- 读取 ----

if (!existsSync(rewriteDir)) {
  console.error(`找不到重写稿：${rewriteDir}\n用法：node scripts/compare-migration.mjs [重写稿目录]`);
  process.exit(1);
}
if (!existsSync(distDir)) {
  console.error(`找不到构建产物：${distDir}\n先跑 npm run build，再跑这个脚本（脚本不负责构建）。`);
  process.exit(1);
}

const route = parseYaml(readFileSync(join(contentRoot, 'route.yaml'), 'utf8'));
const blogLinks = parseYaml(readFileSync(join(contentRoot, 'blog-links.yaml'), 'utf8'));

/** 重写稿：根目录的 11 页 + reference/ 下的参考页；按第一行的 # 标题对应 */
const rewriteFiles = [
  ...readdirSync(rewriteDir)
    .filter((n) => n.endsWith('.md'))
    .sort()
    .map((n) => join(rewriteDir, n)),
  ...(existsSync(join(rewriteDir, REFERENCE_DIR))
    ? readdirSync(join(rewriteDir, REFERENCE_DIR))
        .filter((n) => n.endsWith('.md'))
        .sort()
        .map((n) => join(rewriteDir, REFERENCE_DIR, n))
    : []),
];
const rewriteByTitle = new Map();
for (const file of rewriteFiles) {
  const { body } = splitRewrite(readFileSync(file, 'utf8'));
  const title = /^# +(.+?)[ \t]*$/m.exec(body.split('\n').find((l) => l.trim() !== '') ?? '')?.[1];
  if (title !== undefined) rewriteByTitle.set(title, { file, body });
}

/** route.yaml 里的页面标识（步骤页、选择页） */
const pageIds = new Set();
for (const chapter of route.chapters) {
  for (const item of chapter.items) {
    if (typeof item === 'string') pageIds.add(item);
    else if (item.page) pageIds.add(item.page);
    else if (item.options) for (const list of Object.values(item.options)) for (const id of list) pageIds.add(id);
  }
}
for (const id of Object.keys(route.side ?? {})) pageIds.add(id);
/** 参考页的标识（相对 reference/，如 ip-tests、ip-tests/decodo） */
const referenceIds = walk(join(contentRoot, 'reference')).map((p) =>
  relative(join(contentRoot, 'reference'), p).split('\\').join('/').slice(0, -3),
);
const contentFile = (id) =>
  join(contentRoot, id.startsWith('reference/') ? 'reference' : 'principle', `${id.replace(/^reference\//, '')}.md`);

const titleOf = (id) => {
  const { body } = splitRewrite(readFileSync(contentFile(id), 'utf8'));
  return /^# +(.+?)[ \t]*$/m.exec(body.split('\n').find((l) => l.trim() !== '') ?? '')?.[1];
};

const pages = [
  ...[...pageIds].sort().map((id) => ({ id, title: titleOf(id), url: `/${id}/` })),
  ...referenceIds.sort().map((id) => ({ id: `reference/${id}`, title: titleOf(`reference/${id}`), url: `/${id}/` })),
];
const pagesByTitle = new Map(pages.map((p) => [p.title, p]));

/** 重写稿里的文件名（去掉 .md）→ 标题，用于相对 Markdown 链接 */
const titleOfRewriteFile = new Map();
for (const file of rewriteFiles) {
  const { body } = splitRewrite(readFileSync(file, 'utf8'));
  const title = /^# +(.+?)[ \t]*$/m.exec(body.split('\n').find((l) => l.trim() !== '') ?? '')?.[1];
  if (title !== undefined) titleOfRewriteFile.set(file.split(/[\\/]/).pop().replace(/\.md$/, ''), title);
}

const differences = { 正文: [], 命令: [], 链接: [], 截图: [] };
const pending = [];
/** 每页的 TODO 段数，和 PENDING.todos 核对 */
const todoCounts = new Map();
const notes = [];

// 登记过的双链去向：raw → { to, where }。普通双链（[[标题]]）走 wikiLinkTarget，不用逐条登记。
const wikiTargets = new Map();
const addTarget = (raw, to, where) => wikiTargets.set(raw, { to, where });

for (const [target, url] of Object.entries(blogLinks ?? {})) {
  if (url != null) addTarget(target, { kind: 'external', url }, `blog-links.yaml → ${url}（Q-11）`);
  else addTarget(target, { kind: 'plainText', text: target.slice(BLOG_PREFIX.length) }, `blog-links.yaml 的地址待作者填（Q-11），页面上只显示链接文字`);
}

const printedConversions = [];
const usedWiki = new Set();

/** 产物里允许出现的站内链接地址：由页面标题算出（双链按标题解析，ADR-0005），带 ?from= 时只比路径部分 */
const internalTargets = new Set(['/']);
for (const page of pages) {
  const url = page.url;
  internalTargets.add(url);
  for (const heading of headingsOf(page.id)) internalTargets.add(`${url}#${heading.slug}`);
}
// 产物里的站内链接地址：href 里是百分号编码（中文锚点），去掉 `?from=<步骤>`（FR-20）后 decode 再比
const internalPath = (url) => decodeURIComponent(url.replace(/\?[^#]*/, ''));

/** 页面正文里的小标题锚点（含文字），用于核对同页链接 */
function headingsOf(id) {
  const { body } = splitRewrite(readFileSync(contentFile(id), 'utf8'));
  const slugger = new GithubSlugger();
  const out = [];
  let fence;
  for (const line of body.split('\n')) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== undefined) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = undefined;
      continue;
    }
    if (f) {
      fence = f[1];
      continue;
    }
    const m = /^ {0,3}(#{2,6})[ \t]+(.*?)[ \t]*$/.exec(line);
    if (m) out.push({ slug: slugger.slug(plainHeading(m[2])), text: plainHeading(m[2]) });
  }
  return out;
}

/** 小标题去掉行内记号后的文字，和 src/lib/content/link-index.ts 的 plainHeading 一致 */
function plainHeading(text) {
  return text
    .replace(/!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, target, label) => label ?? target)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .trim();
}

/** 重写稿一行去掉 Markdown 记号后的正文文字（和产物里 stripTags 的文字比） */
function normalizeText(line) {
  return line
    .replace(/^(\s*>\s?)+/, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/^\[[ xX]\]\s+/, '')
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    // 没写文字的 `[[页面#小节]]` 在页面上显示成“页面 > 小节”（remark-obsidian 的写法）
    .replace(/\[\[([^\]|#]*)#([^\]|]*)\]\]/g, '$1 > $2')
    .replace(/\[\[([^\]|]*)\]\]/g, '$1')
    .replace(/(?<!!)\[([^\]\n]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 一行重写稿要拆成几段文字来核对：表格按单元格，其余按整行 */
function textPieces(line) {
  const trimmed = line.trim();
  if (trimmed === '' || /^---+$/.test(trimmed) || /^>?\s*\[!/.test(trimmed) || /^!\[\[/.test(trimmed)) return [];
  if (/^\|?\s*:?-{3,}/.test(trimmed) && /-{3,}/.test(trimmed)) return []; // 表格分隔行
  if (/^\s*\|/.test(trimmed)) {
    const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/);
    return cells.map((cell) => normalizeText(unescapePipe(cell))).filter((text) => text !== '');
  }
  const text = normalizeText(trimmed);
  return text === '' ? [] : [text];
}

/** 对比一页：命令、正文文字、外链、站内链接、截图和双链 */
function comparePage(page) {
  const source = rewriteByTitle.get(page.title);
  const distFile = join(distDir, page.url.slice(1), 'index.html');
  if (!existsSync(distFile)) {
    differences.链接.push(`产物里没有页面 ${page.id}`);
    return;
  }
  const html = readFileSync(distFile, 'utf8');
  const body = readBody(html);
  const where = `${source === undefined ? '（重写稿里没有这一页）' : relative(repoRoot, source.file).split('\\').join('/')}·${page.id}`;
  if (source === undefined) {
    notes.push(`${page.id}（${page.title}）没有重写稿：正文由页面自己写，不在比对范围`);
    return;
  }
  if (body === undefined) {
    differences.正文.push(`产物里没有正文（${where}）：找不到 <div class="prose">`);
    return;
  }

  const rewrite = extractRewrite(readFileSync(source.file, 'utf8'));
  const code = extractCode(body.html);
  const bodyText = body.text.replace(/\s+/g, ' ');

  // ---- 登记的转换：逐条核对 ----
  const todo = todoParagraphs(rewrite.body).length;
  const labelCount = (body.text.match(/作者待补/g) ?? []).length;
  if (todo !== labelCount) differences.命令.push(`TODO 段落和“作者待补”标签对不上（${where}）：重写稿 ${todo} 段、产物 ${labelCount} 处`);
  todoCounts.set(page.id, (todoCounts.get(page.id) ?? 0) + todo);

  // ---- 正文文字：每一行（表格按单元格）都要在产物正文里找到；第一行标题由布局输出，跳过 ----
  const lines = rewrite.body.split('\n');
  const titleLine = lines.findIndex((line) => line.trim() !== '');
  let fence;
  lines.forEach((line, i) => {
    if (i === titleLine) return;
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== undefined) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = undefined;
      return;
    }
    if (f) {
      fence = f[1];
      return;
    }
    for (const piece of textPieces(line)) {
      if (!bodyText.includes(piece)) differences.正文.push(`产物正文里找不到重写稿这一行（${where}:${i + 1}）：${piece}`);
    }
  });

  // ---- 命令 ----
  // 代码块：围栏块不进表格，逐字比。行内代码：Markdown 段落里的 `x` 渲染成 `<code>x</code>`，
  // 表格单元格里的 `x` 渲染成不带标签的纯文本，所以两边都按“渲染出来的正文文字”找，找不到才算差异。
  const sourceBlocks = rewrite.blocks.map((b) => b.code);
  const distBlocks = code.blocks.map((b) => b.code);
  for (const b of rewrite.blocks) if (!distBlocks.includes(b.code)) differences.命令.push(`产物缺少代码块（${where}:${b.line}）：\n${b.code}`);
  for (const b of code.blocks) if (!sourceBlocks.includes(b.code)) differences.命令.push(`产物多出重写稿没有的代码块（${where}）：\n${b.code}`);
  for (const c of new Set(rewrite.inline)) {
    if (!body.text.includes(c)) differences.命令.push(`产物的正文里找不到重写稿的行内代码（${where}）：\`${c}\``);
  }
  const sourceInline = new Set(rewrite.inline);
  for (const c of new Set(code.inline)) {
    if (!sourceInline.has(c)) differences.命令.push(`产物多出重写稿没有的行内代码（${where}）：\`${c}\``);
  }

  const links = extractLinks(body.html);

  // ---- 外链 ----
  const sourceUrls = new Set(rewrite.urls.map((u) => u.url));
  const distUrls = new Map();
  for (const l of links.external) if (!distUrls.has(l.url)) distUrls.set(l.url, l);
  // 双链转换出的外链（博客文章，ADR-0005）：登记的地址和重写稿里的裸地址可能是同一条
  const convertedUrls = new Set();
  for (const w of rewrite.wikilinks) {
    const registered = wikiTargets.get(splitOnce(w.raw, '|')[0].trim());
    if (registered?.to.kind === 'external') {
      convertedUrls.add(registered.to.url);
      printedConversions.push(`${where}:${w.line} [[${w.raw}]] → ${registered.to.url}（博客外链，${registered.where}）`);
    }
  }
  for (const u of rewrite.urls) {
    if (distUrls.has(u.url) || convertedUrls.has(u.url)) continue;
    differences.链接.push(`产物缺少重写稿的外链（${where}:${u.line}）：${u.url}`);
  }
  for (const [url, l] of distUrls) {
    if (sourceUrls.has(url) || convertedUrls.has(url)) continue;
    differences.链接.push(`产物多出重写稿没有的外链（${where}:${l.line}）：${url}`);
  }
  const autolinked = (l) => l.label === l.url && rewrite.urls.some((u) => u.url === l.url);

  // ---- Markdown 外链的上下文 ----
  const sourceKeys = new Set(rewrite.mdLinks.map((l) => l.key));
  const distKeys = new Set();
  for (const l of links.external) {
    if (convertedUrls.has(l.url) || autolinked(l)) continue;
    const key = distLinkKey(body.text, l);
    if (key === undefined) {
      differences.链接.push(`产物的链接文字没在正文里找到（${where}:${l.line}）：[${l.label}](${l.url})`);
      continue;
    }
    distKeys.add(key);
  }
  for (const l of rewrite.mdLinks) {
    if (!distKeys.has(l.key)) differences.链接.push(`产物缺少重写稿的链接（${where}:${l.line}）：${l.key}`);
  }
  for (const key of distKeys) {
    if (!sourceKeys.has(key)) differences.链接.push(`产物的链接上下文和重写稿不一致（${where}）：${key}`);
  }
  for (const l of links.external) {
    if (convertedUrls.has(l.url) || autolinked(l)) continue;
    if (!rewrite.mdLinks.some((s) => s.url === l.url && s.label === l.label)) {
      differences.链接.push(`产物的链接在重写稿里找不到出处（${where}:${l.line}）：[${l.label}](${l.url})`);
    }
  }

  // ---- 相对 Markdown 链接（导入时转成双链，V10）：按文件名找标题 → 页面地址 ----
  const headingList = headingsOf(page.id);
  for (const l of rewrite.relativeLinks) {
    const file = l.url.split('#')[0];
    const fragment = l.url.includes('#') ? l.url.split('#').slice(1).join('#') : undefined;
    const title = titleOfRewriteFile.get(file.replace(/\.md$/, ''));
    const target = title === undefined ? undefined : pagesByTitle.get(title);
    if (target === undefined) {
      differences.链接.push(`产物的站内链接找不到目标页（${where}:${l.line}）：[${l.label}](${l.url})，重写稿里没有标题对应的页面`);
      continue;
    }
    const slug = fragment === undefined ? undefined : headingAnchor(target.id, decodeURIComponent(fragment));
    if (fragment !== undefined && slug === undefined) {
      differences.链接.push(`相对链接的目标页里没有小标题“${fragment}”（${where}:${l.line}）：[${l.label}](${l.url})`);
      continue;
    }
    const expected = `${target.url}${slug === undefined ? '' : `#${slug}`}`;
    const candidates = links.internal.filter((x) => internalPath(x.url) === decodeURIComponent(expected));
    const found = candidates.find((x) => x.label === l.label) ?? candidates[0];
    if (!found) differences.链接.push(`产物缺少重写稿的站内链接（${where}:${l.line}）：[${l.label}](${l.url}) → ${expected}`);
    else if (found.label !== l.label) differences.链接.push(`站内链接的文字变了（${where}:${l.line}）：[${l.label}](${l.url}) 产物里是“${found.label}”`);
    printedConversions.push(`${where}:${l.line} [${l.label}](${l.url}) → ${expected}（相对链接转双链，V10）`);
  }

  // ---- 同页小节链接 ----
  for (const l of rewrite.hashLinks) {
    const fragment = l.url.slice(1);
    const slug =
      (headingList.find((h) => h.text === fragment) ?? headingList.find((h) => h.slug === fragment))?.slug ?? undefined;
    if (slug === undefined) {
      differences.链接.push(`同页链接找不到小标题（${where}:${l.line}）：[${l.label}](${l.url})`);
      continue;
    }
    const found = links.internal.find((x) => decodeURIComponent(x.url) === `#${slug}`);
    if (!found) differences.链接.push(`产物缺少同页小节链接（${where}:${l.line}）：[${l.label}](${l.url}) → #${slug}`);
    else if (found.label !== l.label) differences.链接.push(`同页链接的文字变了（${where}:${l.line}）：产物里是“${found.label}”`);
  }

  // ---- 截图 ----
  const stem = (name) => name.replace(/\.[^.]+$/, '');
  const distImages = new Map();
  for (const img of extractImages(body.html)) if (!distImages.has(img.file)) distImages.set(img.file, img);
  for (const e of rewrite.embeds) {
    if (isDiagram(e.name)) {
      // 说明图内联成 <svg data-diagram>（登记在 CONVERSIONS 的 diagram-inline），按 <title> 对回附件里的原稿；
      // 附件/ 不入库（.gitignore），没有时用导入后的副本 src/assets/diagrams/（导入脚本让它跟着原稿更新）
      const source = [join(rewriteDir, '附件', e.name), join(repoRoot, 'src', 'assets', 'diagrams', e.name)].find((f) => existsSync(f));
      const title = source ? svgTitle(readFileSync(source, 'utf8')) : undefined;
      if (title === undefined || !extractDiagrams(body.html).includes(title)) {
        differences.截图.push(`产物缺少说明图（${where}:${e.line}）：![[${e.raw}]]`);
      }
      continue;
    }
    const img = distImages.get(stem(e.name));
    if (img === undefined) {
      differences.截图.push(`产物缺少截图（${where}:${e.line}）：![[${e.raw}]]`);
      continue;
    }
    // 重写稿写了宽度才比宽度：没写时 Astro 会把图片的固有尺寸写进 width，不是重写稿里的值
    if (e.width !== undefined && img.width !== e.width) {
      differences.截图.push(`截图宽度不一致（${where}:${e.line}）：![[${e.raw}]]，产物 width=${img.width}`);
    }
    if (!existsSync(join(distDir, decodeURIComponent(img.src.split('?')[0])))) {
      differences.截图.push(`产物的图片文件不在 dist 里（${where}:${e.line}）：${img.src}`);
    }
  }
  const diagramEmbeds = rewrite.embeds.filter((e) => isDiagram(e.name)).length;
  if (extractDiagrams(body.html).length !== diagramEmbeds) {
    differences.截图.push(`说明图数量不一致（${where}）：重写稿 ${diagramEmbeds} 张、产物 ${extractDiagrams(body.html).length} 张`);
  }
  const sourceNames = new Set(rewrite.embeds.map((e) => stem(e.name)));
  for (const img of extractImages(body.html)) {
    if (!sourceNames.has(img.file)) differences.截图.push(`产物多出重写稿没有的截图（${where}:${img.line}）：${img.file}`);
  }

  // ---- 双链（ADR-0005）----
  for (const w of rewrite.wikilinks) {
    const [targetPart, rest] = splitOnce(w.raw, '|');
    const [title] = splitOnce(targetPart, '#');
    const registered = wikiTargets.get(title.trim());
    const to = registered?.to ?? wikiLinkTarget(w.raw);
    if (to === undefined) {
      differences.链接.push(`重写稿的双链没有登记去向，也不是能按标题解析的站内链接（${where}:${w.line}）：[[${w.raw}]]`);
      continue;
    }
    usedWiki.add(title.trim());
    const label = rest === undefined ? undefined : unescapePipe(rest);
    if (to.kind === 'external') {
      const found = links.external.find((l) => l.url === to.url);
      if (!found) differences.链接.push(`双链转换后不在产物里（${where}:${w.line}）：[[${w.raw}]] → ${to.url}`);
      else if (label !== undefined && found.label !== label) differences.链接.push(`双链的链接文字变了（${where}:${w.line}）：[[${w.raw}]] 产物里是“${found.label}”`);
    } else if (to.kind === 'plainText') {
      if (!body.text.includes(label ?? to.text)) differences.链接.push(`待填的博客双链在产物里找不到链接文字（${where}:${w.line}）：[[${w.raw}]]`);
    } else {
      if (to.missing !== undefined) {
        differences.链接.push(`目标页里没有小标题“${to.missing}”（${where}:${w.line}）：[[${w.raw}]]`);
      } else {
        const expected = label ?? (targetPart.includes('#') ? `${title} > ${targetPart.split('#')[1]}` : title);
        const candidates = links.internal.filter((l) => internalPath(l.url) === to.url);
        const found = candidates.find((l) => l.label === expected) ?? candidates[0];
        if (!found) differences.链接.push(`双链转换后不在产物里（${where}:${w.line}）：[[${w.raw}]] → ${to.url}`);
        else if (found.label !== expected) differences.链接.push(`双链的链接文字变了（${where}:${w.line}）：[[${w.raw}]] 产物里是“${found.label}”，应为“${expected}”`);
      }
      printedConversions.push(`${where}:${w.line} [[${w.raw}]] → ${to.url}（按标题解析的站内链接，ADR-0005）`);
    }
  }
  if (/\[\[/.test(body.text)) differences.链接.push(`产物里还留着双链写法（${where}）`);

  // ---- 产物里的站内链接都要有出处：路线图里的页面/小节，或本页的小节锚点 ----
  const localAnchors = new Set(headingList.map((h) => h.slug));
  const internalPaths = new Set([...internalTargets].map(internalPath));
  for (const l of links.internal) {
    const path = internalPath(l.url);
    if (internalPaths.has(path)) continue;
    if (l.url.startsWith('#') && localAnchors.has(decodeURIComponent(l.url.slice(1)))) continue;
    differences.链接.push(`产物的站内链接不在路线图里（${where}:${l.line}）：${l.url}`);
  }
}

for (const page of pages) {
  if (!rewriteByTitle.has(page.title) && PENDING.pages[page.id] !== undefined) {
    pending.push(`正文还没写：${page.id} ${page.title}`);
    continue;
  }
  comparePage(page);
}

// TODO 段落：和登记的一致；重写稿里补完了的也要报，提醒删掉登记
for (const id of new Set([...todoCounts.keys(), ...Object.keys(PENDING.todos)])) {
  const count = todoCounts.get(id) ?? 0;
  const registered = PENDING.todos[id] ?? 0;
  if (count !== registered) {
    differences.命令.push(`TODO 段落数和登记的待补数对不上（${id}）：重写稿 ${count} 段、登记 ${registered} 段，改脚本的 PENDING.todos`);
  } else if (count > 0) {
    pending.push(`作者待补：${id} ${count} 处`);
  }
}

// 登记过、但重写稿里没再出现的博客双链：只是说明（新稿可能暂时没引用，Q-11 的地址留着以后用）
for (const [raw, entry] of wikiTargets) {
  if (entry.to.kind !== 'external' || usedWiki.has(raw)) continue;
  notes.push(`blog-links.yaml 的 [[${raw}]] 在这一版重写稿里没有用到（地址留着）`);
}

// ---- 报告 ----

console.log('重写稿：');
console.log(`  ${rewriteFiles.length} 个文件（根目录 ${rewriteFiles.filter((f) => !f.includes(`${REFERENCE_DIR}/`)).length} 页 + 参考页 ${rewriteFiles.filter((f) => f.includes(`${REFERENCE_DIR}/`)).length} 个）`);
console.log(`产物：dist/，比对 ${pages.length} 个页面（11 页 + 参考页）\n`);

const section = (title, items) => {
  if (items.length === 0) return;
  console.log(`## ${title}（${items.length}）`);
  for (const item of items) console.log(`- ${item}`);
  console.log();
};

section('登记过的转换（ADR-0005、import-rewrite.mjs）', CONVERSIONS.map((c) => `${c.kind}：${c.what}\n    ${c.check}`));
section('本次比对里实际发生的转换', [...new Set(printedConversions)].sort());
const pendingPages = Object.entries(PENDING.pages);
section('登记的待补项（重写稿没有、产物也没有）', [
  ...(pendingPages.length ? [`正文还没写的页面 ${pendingPages.length} 页：${pendingPages.map(([id, t]) => `${id} ${t}`).join('、')}`] : []),
  `作者待补的 TODO 段落 ${Object.entries(PENDING.todos).map(([id, n]) => `${id} ${n} 处`).join('、')}`,
]);
section('说明（不进差异）', [...new Set(notes)]);
for (const [kind, items] of Object.entries(differences)) section(`${kind}差异`, items);

const total = Object.values(differences).reduce((n, items) => n + items.length, 0);
console.log(
  `比对范围：页面 ${pages.length} 个；正文差异 ${differences.正文.length}、命令差异 ${differences.命令.length}、` +
    `链接差异 ${differences.链接.length}、截图差异 ${differences.截图.length}；` +
    `登记的待补项：参考页 ${pendingPages.length} 页、作者待补 ${Object.keys(PENDING.todos).length} 页`,
);
process.exit(total ? 1 : pending.length ? 2 : 0);
