#!/usr/bin/env node
// 一次性核对脚本（#28，FR-03、FR-21、AC-12、AC-13）：比对重写稿 docs/rewrite/ 和构建产物 dist/ 里的
// 命令、外链和截图，每个页面分别比对原理视图和操作视图。
//
// 用法：node scripts/compare-migration.mjs [重写稿目录]
//   重写稿目录默认是 docs/rewrite。脚本不负责构建：先跑 npm run build 再跑这个脚本。
//   dist/ 必须是当前 src/content/ 构建出来的；src/content/ 落后于重写稿时（改了重写稿没重跑导入），
//   先跑 node scripts/import-rewrite.mjs 再重新构建，否则报出来的差异是内容快照过期，不是脚本的问题。
//
// 比对规则：
// - 范围：route.yaml 里的步骤页、选择页、旁支页和参考页。首页（重写稿的目录页）不在比对范围，跳过。
// - 两种视图：原理视图对应 `原理版/<标题>.md`（导入到 src/content/principle/<id>.md，元数据在 frontmatter 里），
//   操作视图对应 `操作版/<标题>.md`（导入到 src/content/operation/<id>.md）。两版各自和产物里
//   `<div class="prose" data-body="principle|operation">` 的那一段比。重写稿里没有对应视图的文件时：
//   登记的“操作版缺失”页算待补项，原理独有步骤不算差异。
// - 命令：围栏代码块（连同语言标记，去掉 Callout 的 `>` 前缀和公共缩进后逐字比较）；行内代码按渲染出来的
//   正文文字找（表格单元格里的 `x` 渲染成不带标签的纯文本，产物里没有 <code>）。
// - 外链：重写稿正文里的外链（Markdown 链接、裸地址）必须原样出现在该视图的产物里，地址和链接文字都要对上；
//   围栏代码块和行内代码里的 `https://…` 是命令的一部分，不算外链。产物里的外链必须来自重写稿的链接、
//   登记的双链转换结果，或者是页面自己生成的（站内导航、参考页的“返回刚才的步骤”）。
//   Markdown 链接还要连同链接文字前后各 LINK_CONTEXT 个字一起对上。
// - 截图：重写稿的 `![[文件名|宽度]]` 在该视图的产物里要有同名的图片（比 `alt`，Astro 会把图片转成带哈希的
//   webp，`src` 不是重写稿里的名字）、宽度一致（重写稿写了宽度才比），且图片文件确实在 dist/ 里。
// - 双链：重写稿的每条双链都要能解析出来（按标题找页面、带 `#小标题` 的核对锚点、`[[04技术/…]]` 查
//   blog-links.yaml、目录页指向首页）；产物里的每个站内链接都要能追溯到重写稿的双链或页面生成。
// 允许的差异只有 ADR-0005 和 import-rewrite.mjs 规定的转换，逐条登记在 CONVERSIONS 里，运行时逐条打印。
// 都按集合比较：同一条命令、链接或截图在两版重复出现、产物里只剩一处时查不出来，这部分靠人工抽查。
//
// 退出码：0 = 没有差异，也没有待补项；1 = 有未登记的差异；2 = 只剩登记过的待补项。

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import GithubSlugger from 'github-slugger';
import { parse as parseYaml } from 'yaml';

const repoRoot = resolve(import.meta.dirname, '..');
const rewriteDir = resolve(process.argv[2] ?? join(repoRoot, 'docs', 'rewrite'));
const distDir = join(repoRoot, 'dist');
const contentRoot = join(repoRoot, 'src', 'content');

const PRINCIPLE_DIR = '原理版';
const OPERATION_DIR = '操作版';
/** 重写稿的目录页，不导入（import-rewrite.mjs 的 TABLE_OF_CONTENTS）；双链指向首页 */
const TABLE_OF_CONTENTS = ['如何订阅claude', '如何订阅claude（纯操作版）'];
/** 指向博客其他文章的双链前缀，目标查 blog-links.yaml（Q-11） */
const BLOG_PREFIX = '04技术/';

const VIEWS = [
  { view: 'principle', label: '原理视图', dir: PRINCIPLE_DIR, collection: 'principle' },
  { view: 'operation', label: '操作视图', dir: OPERATION_DIR, collection: 'operation' },
];

// Markdown 链接连同前后各 LINK_CONTEXT 个字一起比较。重写稿原样导入，正文里的链接写法不用登记。
const LINK_CONTEXT = 4;

// 登记过的转换（ADR-0005、import-rewrite.mjs）。kind 说明差异是怎么来的，运行时逐条打印。
// - footer-drop：手写页脚（`---` + “上一步：… ｜ 下一步：…”）由路线图生成，不进产物（FR-04）。
// - frontmatter：frontmatter 是页面元数据，不是正文，导入时保留在站内文件里，不进正文（ADR-0005）。
// - todo-label：`TODO：` 段落前面加“作者待补”标签，原文原样保留（FR-21）。
const CONVERSIONS = [
  {
    kind: 'footer-drop',
    what: '手写页脚不导入：正文末尾的 `---` + “上一步：… ｜ 下一步：…”，导航由 route.yaml 生成（FR-04）',
    check: '每条记录都确认重写稿末尾有 `---` 和以“上一步：”开头的一段，产物里没有这一段（双链也在这一段里，不再解析）',
  },
  {
    kind: 'frontmatter',
    what: '原理版的 frontmatter（页面元数据：principleOnly、skippable、video、options 等）不进正文，导入时保留在站内文件里（ADR-0005）',
    check: '站内 principle/<id>.md 的 frontmatter 与重写稿正文无关，脚本只核对正文',
  },
  {
    kind: 'todo-label',
    what: '`TODO：` 段落渲染成“作者待补 + 原文”（FR-21），正文文字不变，只多一个标签',
    check: '登记的页面里 TODO 段落数 = 产物里“作者待补”标签数',
  },
];

// 登记的待补项：重写稿没有、产物也就没有的内容。补上后从这里删掉。
const PENDING = {
  operations: {
    'leak-protection': '防泄漏',
    'iphone-proxy': 'iPhone：导入代理软件',
    'plan1-make-node': '三、把服务器变成节点',
    'plan1-buy-isp': '四、购买 ISP 代理',
    'plan1-panel': '五、安装面板',
    'plan2-residential-server': '方案二：住宅 IP 服务器',
    'iphone-app-store-austria': 'iPhone：把 App Store 改到奥地利',
    'google-appeal': '被封了：申诉解封',
    'android-subscribe': '安卓：订阅',
  },
  // 参考页正文还没写的页面：现在没有（参考页的正文都在重写稿里），留在这里方便以后登记
  pages: {},
  // 作者待补的 TODO 段落（构建提示“作者待补”的页面），段里的命令、链接和截图还没写，不参与比对
  todos: {
    'leak-protection': 1,
    'plan1-buy-isp': 2,
    'plan1-make-node': 1,
    'plan1-panel': 1,
    'plan2-residential-server': 1,
    'iphone-proxy': 1,
    'iphone-app-store-austria': 1,
    'google-appeal': 1,
    'android-subscribe': 1,
    'reference/ip-tests/qsu-residential': 1,
    'reference/ip-tests/decodo': 1,
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
    const indent = Math.min(...body.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length));
    const code = body.map((l) => l.slice(indent).trimEnd()).join('\n');
    blocks.push({ line: i + 1, startLine: i + 1, endLine: j + 1, code: `${open[2].trim()}\n${code}` });
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
  // 链接文字和上下文要用“渲染成文字”的样子：行内代码的 `` ` `` 在页面上不显示，去掉再取上下文。
  // 外链判定要跳过围栏代码块（里面的地址是命令的一部分）。
  body.split('\n').forEach((rawLine, i) => {
    if (blocks.some((b) => i + 1 >= b.startLine && i + 1 <= b.endLine)) return;
    const line = rawLine
      .replace(/^([ \t]*>[ \t]?)+/, '')
      // 列表记号（`- `、`1. `）在产物里由 <ol>/<ul> 生成，正文文字里没有，两边都去掉
      .replace(/^\s*(?:[-*]|\d+\.)\s+/, '')
      // 行内代码的反引号在页面上不显示
      .replace(/`([^`\n]*)`/g, '$1')
      // 双链在页面上显示成链接文字（`[[目标|文字]]` 显示“文字”，`[[文字]]` 显示“文字”）
      .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
      .replace(/\[\[([^\]|]*)\]\]/g, '$1');
    for (const m of line.matchAll(/(?<!!)\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
      const end = m.index + m[0].length;
      const before = line.slice(Math.max(0, m.index - LINK_CONTEXT), m.index);
      mdLinks.push({ key: `${before}⟦${m[0]}⟧${line.slice(end, end + LINK_CONTEXT)}`, label: m[1], url: m[2], line: i + 1 });
    }
  });
  const wikilinks = [];
  const embeds = [];
  const todoIndex = new Set(todoParagraphs(body).map((p) => body.indexOf(p)));
  for (const m of body.matchAll(/(!?)\[\[([^[\]\n]+)\]\]/g)) {
    const raw = unescapePipe(m[2]);
    // TODO 段落里的嵌入是“作者待补”的占位写法，产物里没有这个标签，不参与比对
    const inTodo = [...todoIndex].some((start) => m.index >= start && m.index < body.indexOf('\n\n', start) + 2);
    const item = { raw, line: lineOf(body, m.index), inTodo };
    if (m[1]) embeds.push({ ...item, name: raw.split('|')[0].trim(), width: raw.includes('|') ? raw.split('|')[1].trim() : undefined });
    else wikilinks.push(item);
  }
  return { body, footer, blocks, inline, urls, mdLinks, wikilinks, embeds };
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

/** 页面里两个视图的正文：`html` 是原始 HTML（链接、图片要从这里取），`text` 是去掉标签后的正文文字 */
function readBodies(html) {
  const out = {};
  const open = /<div class="prose"[^>]*data-body="(principle|operation)"/g;
  let m;
  while ((m = open.exec(html))) {
    const body = elementAt(html, m.index, 'div');
    if (body) out[m[1]] = { html: html.slice(m.index, body.end), text: body.text };
  }
  return out;
}

const CODE_BLOCK = /<pre(?:\s[^>]*)?>([\s\S]*?)<\/pre>/g;
const INLINE_CODE = /<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/g;

/** 渲染后正文里的命令：围栏代码块（连同语言标记）和行内代码 */
function extractCode(html) {
  const blocks = [];
  for (const m of html.matchAll(CODE_BLOCK)) {
    // 语言标记由 Shiki 写在 <pre data-language="…"> 上
    const lang = /\bdata-language="([\w-]+)"/.exec(m[0])?.[1] ?? '';
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
      // alt 是去掉扩展名的文件名（remark-obsidian 的 convertEmbed 用 basename(name, extname(name))）
      file: decode(attr('alt') ?? ''),
      width: attr('width'),
      src: decode(src),
      line: lineOf(html, m.index),
    });
  }
  return images;
}

/**
 * 正文里的链接。站内链接和博客外链在 HTML 里都是 `<a href>`，靠这句区分：
 * 页面上每条站内链接都有一个 `data-astro-cid-…`（Astro 给 .astro 模板里的元素加的），
 * 由 Markdown 生成的链接没有；参考页的参考链接（rehype 建的）也没有。
 * 这样“正文里的站内链接”和“页面自己生成的导航和返回链接”能分开。
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
    const item = {
      url,
      label: target.text,
      cid: /data-astro-cid-/.test(attrs),
      line: lineOf(html, m.index),
      // 链接所在的块（<p>/<li>）的文字，用于比重写稿里的同一段前后文
      block: blockText(html, m.index),
    };
    if (url.startsWith('http')) external.push(item);
    else if (!item.cid) internal.push(item);
  }
  return { external, internal };
}

/** 链接所在的段落文字：向上找到最近的 <p>/<li>/<td>，取它的文字 */
function blockText(html, at) {
  const open = /<(p|li|td|th|h[1-6])(?:\s[^>]*)?>/g;
  let best;
  let m;
  while ((m = open.exec(html)) && m.index < at) best = m;
  if (!best) return undefined;
  const el = elementAt(html, best.index, best[1]);
  if (!el || el.end < at) return undefined;
  return el.text;
}

/**
 * 产物里链接的上下文键：用链接所在块（<p>/<li>/<td>）的文字，取链接文字前后各 LINK_CONTEXT 个字。
 * 重写稿的一行通常就是产物里的一个块，块开头的列表记号在产物里由 <ol>/<ul> 生成，两边都去掉。
 */
function distLinkKey(body, link) {
  const text = (link.block ?? body).replace(/^\s*(?:[-*]|\d+\.)\s+/, '');
  const at = text.indexOf(link.label);
  if (at === -1) return undefined;
  const before = text.slice(Math.max(0, at - LINK_CONTEXT), at);
  return `${before}⟦[${link.label}](${link.url})⟧${text.slice(at + link.label.length, at + link.label.length + LINK_CONTEXT)}`;
}

/**
 * markdown 链接的上下文键：链接文字连同前后各 LINK_CONTEXT 个字。
 * 重写稿里的一行通常就是产物里的一个块（`<p>`、`<li>`、`<td>`），两边都去掉块开头的列表记号再比，
 * 这样互换地址、改链接文字、把链接挪到别的句子里都会报出来。
 */
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
  if (TABLE_OF_CONTENTS.includes(target)) return { kind: 'home' };
  if (target.startsWith(BLOG_PREFIX)) return undefined; // 博客外链走 blog-links.yaml，逐条登记
  const found = pagesByTitle.get(target);
  if (found === undefined) return undefined;
  const base = `/${found.id.replace(/^reference\//, '')}/`;
  if (heading === undefined) return { kind: 'internal', url: base, pageId: found.id };
  const slug = headingAnchor(found.id, heading);
  if (slug === undefined) return { kind: 'internal', url: `${base}#（没有这个小标题）${heading}`, pageId: found.id, missing: heading };
  return { kind: 'internal', url: `${base}#${slug}`, pageId: found.id };
}

function splitOnce(text, sep) {
  const i = text.indexOf(sep);
  return i === -1 ? [text, undefined] : [text.slice(0, i), text.slice(i + 1)];
}

/**
 * 小标题在页面上的锚点：用和页面同一条 github-slugger 规则（去行内记号、重复的加 -1、-2）。
 * 找不到这个文字的小标题时返回 undefined。
 */
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
    if (plain === heading && found === undefined) found = slug;
  }
  return found;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  );
}

// ---- 读取 ----

if (!existsSync(join(rewriteDir, PRINCIPLE_DIR))) {
  console.error(`找不到重写稿：${join(rewriteDir, PRINCIPLE_DIR)}\n用法：node scripts/compare-migration.mjs [重写稿目录]`);
  process.exit(1);
}
if (!existsSync(distDir)) {
  console.error(`找不到构建产物：${distDir}\n先跑 npm run build，再跑这个脚本（脚本不负责构建）。`);
  process.exit(1);
}

const route = parseYaml(readFileSync(join(contentRoot, 'route.yaml'), 'utf8'));
const blogLinks = parseYaml(readFileSync(join(contentRoot, 'blog-links.yaml'), 'utf8'));
const listP = (dir) => readdirSync(dir).filter((n) => n.endsWith('.md')).sort();
const rewriteFiles = { principle: listP(join(rewriteDir, PRINCIPLE_DIR)), operation: listP(join(rewriteDir, OPERATION_DIR)) };
const rewriteFile = (view, title) => rewriteFiles[view].find((n) => n.slice(0, -3) === title);

/** route.yaml 里的页面标识 → 标题（principle/<id>.md 正文第一行的 `# 标题`，参考页在 reference/ 下） */
const contentFile = (id) =>
  join(contentRoot, id.startsWith('reference/') ? 'reference' : 'principle', `${id.replace(/^reference\//, '')}.md`);

const titleOf = (id) => {
  const { body } = splitRewrite(readFileSync(contentFile(id), 'utf8'));
  return /^# +(.+?)[ \t]*$/m.exec(body.split('\n').find((l) => l.trim() !== '') ?? '')?.[1];
};

/** 页面里的小标题锚点：从站内文件的正文（导入后的快照）里算，和页面上生成的 id 一致 */
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
    if (m) out.push(slugger.slug(plainHeading(m[2])));
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

const pageIds = new Set();
for (const chapter of route.chapters) {
  for (const item of chapter.items) {
    if (typeof item === 'string') pageIds.add(item);
    else if (item.page) pageIds.add(item.page);
    else if (item.options) for (const list of Object.values(item.options)) for (const id of list) pageIds.add(id);
  }
}
for (const id of Object.keys(route.side ?? {})) pageIds.add(id);
const referenceIds = walk(join(contentRoot, 'reference')).map((p) => `reference/${relative(join(contentRoot, 'reference'), p).split('\\').join('/').slice(0, -3)}`);
for (const id of referenceIds) pageIds.add(id);
const pages = [...pageIds].sort().map((id) => ({ id, title: titleOf(id), url: `/${id.replace(/^reference\//, '')}/` }));
const pagesByTitle = new Map(pages.map((p) => [p.title, p]));

const differences = { 命令: [], 链接: [], 截图: [] };
const pending = [];
const notes = [];

// 登记过的双链去向：raw → { to, where }。普通双链（[[标题]]）走 wikiLinkTarget，不用逐条登记。
const wikiTargets = new Map();
const addTarget = (raw, to, where) => wikiTargets.set(raw, { to, where });

for (const [target, url] of Object.entries(blogLinks ?? {})) {
  if (url != null) addTarget(target, { kind: 'external', url }, `blog-links.yaml → ${url}（Q-11）`);
  else addTarget(target, { kind: 'plainText', text: target.slice(BLOG_PREFIX.length) }, `blog-links.yaml 的地址待作者填（Q-11），页面上只显示链接文字`);
}
addTarget('如何订阅claude', { kind: 'home' }, '重写稿的目录页指向首页（ADR-0005）');
addTarget('如何订阅claude（纯操作版）', { kind: 'home' }, '重写稿的目录页指向首页（ADR-0005）');
addTarget('04技术/如何订阅claude（纯操作版）', { kind: 'home' }, '目录页的双链指向首页（ADR-0005）');

const printedConversions = [];
const usedWiki = new Set();

// 产物里允许出现的站内链接地址：由页面标题算出（双链按标题解析，ADR-0005），
// 参考页从步骤链过去时带 `?from=<步骤>`（FR-20），所以只比路径部分。
const internalTargets = new Set(['/']);
for (const page of pages) {
  const url = `/${page.id.replace(/^reference\//, '')}/`;
  internalTargets.add(url);
  for (const hash of headingsOf(page.id)) internalTargets.add(`${url}#${hash}`);
}
// 产物里的站内链接地址：href 里是百分号编码（中文锚点），去掉 `?from=<步骤>`（FR-20）后 decode 再比
const internalPath = (url) => decodeURIComponent(url.replace(/\?[^#]*/, ''));

function compareView(page, view) {
  const source = rewriteFile(view.view, page.title);
  const html = readFileSync(join(distDir, page.id.replace(/^reference\//, ''), 'index.html'), 'utf8');
  const bodies = readBodies(html);
  if (bodies[view.view] === undefined) return; // 这一页没有这个视图（原理独有步骤、还没写操作版、选择页）
  const where = `${path(source)}·${page.id}`;

  if (source === undefined) {
    // 有视图没有重写稿：新建的页面（选择页、参考页等），正文不是从重写稿来的，登记在 notes 里
    notes.push(`${page.id} · ${view.label} 没有对应的重写稿文件，正文由页面自己的内容组成（不在比对范围）`);
    return;
  }

  const rewrite = extractRewrite(readFileSync(join(rewriteDir, view.dir, source), 'utf8'));
  const body = bodies[view.view].text;
  const bodyHtml = bodies[view.view].html;
  const code = extractCode(bodyHtml);
  const images = extractImages(bodyHtml);
  const links = extractLinks(bodyHtml);

  // ---- 登记过的转换：逐条核对两边都对得上 ----
  if (rewrite.footer === undefined) {
    differences.链接.push(`重写稿末尾没有手写页脚（${where}）：${join(PRINCIPLE_DIR, source)}`);
  }
  const todo = todoParagraphs(rewrite.body).length;
  const labelCount = (body.match(/作者待补/g) ?? []).length;
  if (todo !== labelCount) differences.命令.push(`TODO 段落和“作者待补”标签对不上（${where}）：重写稿 ${todo} 段、产物 ${labelCount} 处`);
  if (todo > 0) {
    const registered = PENDING.todos[page.id];
    if (registered === undefined) {
      differences.命令.push(`重写稿里有 TODO 段落，还没登记（${where}）：${todo} 段，补进脚本的 PENDING.todos`);
    } else if (todo !== registered) {
      differences.命令.push(`TODO 段落数和登记的待补数对不上（${where}）：重写稿 ${todo} 段、登记 ${registered} 段`);
    }
  }

  // ---- 命令 ----
  // 代码块：围栏块不进表格，逐字比。行内代码：Markdown 段落里的 `x` 渲染成 `<code>x</code>`，
  // 表格单元格里的 `x` 渲染成不带标签的纯文本，所以两边都按“渲染出来的正文文字”找，找不到才算差异。
  const sourceBlocks = rewrite.blocks.map((b) => b.code);
  const distBlocks = code.blocks.map((b) => b.code);
  for (const b of rewrite.blocks) if (!distBlocks.includes(b.code)) differences.命令.push(`产物缺少代码块（${where}:${b.line}）：\n${b.code}`);
  for (const b of code.blocks) if (!sourceBlocks.includes(b.code)) differences.命令.push(`产物多出重写稿没有的代码块（${where}）：\n${b.code}`);
  const distText = body.replace(/&/g, '&');
  for (const c of new Set(rewrite.inline)) {
    if (!distText.includes(c)) differences.命令.push(`产物的正文里找不到重写稿的行内代码（${where}）：\`${c}\``);
  }
  const sourceInline = new Set(rewrite.inline);
  for (const c of new Set(code.inline)) {
    if (!sourceInline.has(c)) differences.命令.push(`产物多出重写稿没有的行内代码（${where}）：\`${c}\``);
  }

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

  // Markdown 链接：地址和链接文字都要原样（重写稿原样导入）。
  // 上下文按“链接所在的块”比：产物里的段落是 <p>/<li>/<td>，重写稿里的一行就是一个块，
  // 两边都把块开头的列表记号去掉，取链接文字前后各 LINK_CONTEXT 个字。
  const sourceKeys = new Set(rewrite.mdLinks.map((l) => l.key));
  const distKeys = new Set();
  for (const l of links.external) {
    if (convertedUrls.has(l.url)) continue; // 双链转换出来的外链，链接文字由重写稿的双链决定
    const key = distLinkKey(body, l);
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
    if (convertedUrls.has(l.url)) continue;
    if (!rewrite.mdLinks.some((s) => s.url === l.url && s.label === l.label)) {
      differences.链接.push(`产物的链接在重写稿里找不到出处（${where}:${l.line}）：[${l.label}](${l.url})`);
    }
  }

  // ---- 截图 ----
  // 产物里的文件名是 alt（去掉扩展名），重写稿写的是带扩展名的裸文件名，两边按去扩展名比较
  const stem = (name) => name.replace(/\.[^.]+$/, '');
  const distImages = new Map();
  for (const img of images) if (!distImages.has(img.file)) distImages.set(img.file, img);
  for (const e of rewrite.embeds) {
    const img = distImages.get(stem(e.name));
    if (img === undefined) {
      if (e.inTodo) continue;
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
  const sourceNames = new Set(rewrite.embeds.map((e) => stem(e.name)));
  for (const img of images) {
    if (!sourceNames.has(img.file)) differences.截图.push(`产物多出重写稿没有的截图（${where}:${img.line}）：${img.file}`);
  }

  // ---- 双链（ADR-0005）----
  // 站内链接和链接文字都从重写稿的双链来：普通双链按标题解析，`[[04技术/…]]` 查 blog-links.yaml，
  // 目录页指向首页。登记过的一律打印；对不上的报差异。
  for (const w of rewrite.wikilinks) {
    if (w.inTodo) continue;
    const [targetPart, rest] = splitOnce(w.raw, '|');
    const [title] = splitOnce(targetPart, '#');
    const registered = wikiTargets.get(title.trim());
    const to = registered?.to ?? wikiLinkTarget(w.raw, page);
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
      // 博客地址待作者填（Q-11）：产物里只有链接文字，没有 <a>
      if (!body.includes(label ?? to.text)) differences.链接.push(`待填的博客双链在产物里找不到链接文字（${where}:${w.line}）：[[${w.raw}]]`);
    } else if (to.kind === 'home') {
      const found = links.internal.find((l) => l.url === '/');
      if (!found) differences.链接.push(`双链转换后不在产物里（${where}:${w.line}）：[[${w.raw}]] → 首页`);
      else if (label !== undefined && found.label !== label) differences.链接.push(`双链的链接文字变了（${where}:${w.line}）：[[${w.raw}]] 产物里是“${found.label}”`);
      printedConversions.push(`${where}:${w.line} [[${w.raw}]] → /（重写稿的目录页指向首页，ADR-0005）`);
    } else {
      if (to.missing !== undefined) {
        differences.链接.push(`目标页里没有小标题“${to.missing}”（${where}:${w.line}）：[[${w.raw}]]`);
      } else {
        const found = links.internal.find((l) => internalPath(l.url) === to.url);
        if (!found) differences.链接.push(`双链转换后不在产物里（${where}:${w.line}）：[[${w.raw}]] → ${to.url}`);
        else {
          // 链接文字：写了 `|文字` 就是它，没写就是标题（带小标题时是“标题 > 小标题”）
          const expected = label ?? (targetPart.includes('#') ? `${title} > ${targetPart.split('#')[1]}` : title);
          if (found.label !== expected) differences.链接.push(`双链的链接文字变了（${where}:${w.line}）：[[${w.raw}]] 产物里是“${found.label}”，应为“${expected}”`);
        }
      }
      printedConversions.push(`${where}:${w.line} [[${w.raw}]] → ${to.url}（按标题解析的站内链接，ADR-0005）`);
    }
  }
  if (/\[\[/.test(body)) differences.链接.push(`产物里还留着双链写法（${where}）`);

  // ---- 产物里的站内链接都要有出处 ----
  const internalPaths = new Set([...internalTargets].map(internalPath));
  for (const l of links.internal) {
    if (internalPaths.has(internalPath(l.url))) continue;
    differences.链接.push(`产物的站内链接不在路线图里（${where}:${l.line}）：${l.url}`);
  }
}

function path(name) {
  return name ?? '（重写稿里没有这一页）';
}

// 每个页面分别比对两种视图
for (const page of pages) {
  const has = {
    principle: rewriteFile('principle', page.title) !== undefined,
    operation: rewriteFile('operation', page.title) !== undefined,
  };
  if (!has.principle && !has.operation) {
    notes.push(`${page.id} 没有重写稿（${page.title}）：正文由页面自己写，不在比对范围`);
  }
  for (const view of VIEWS) {
    if (view.view === 'operation' && !has.operation) {
      if (PENDING.operations[page.id] !== undefined) pending.push(`操作版缺失：${page.id} ${page.title}`);
      else notes.push(`${page.id} · 操作视图：重写稿里没有“${OPERATION_DIR}/${page.title}.md”，产物显示原理版（原理独有步骤）`);
      continue;
    }
    if (!existsSync(join(distDir, page.id.replace(/^reference\//, ''), 'index.html'))) {
      differences.链接.push(`产物里没有页面 ${page.id}`);
      continue;
    }
    compareView(page, view);
  }
}

// 登记过、但重写稿里没再出现的双链
for (const [raw, entry] of wikiTargets) {
  if (entry.to.kind !== 'external') continue; // 目录页指向首页的登记只在出现时核对
  if (!usedWiki.has(raw)) differences.链接.push(`登记的双链在重写稿里找不到：[[${raw}]]（${entry.where}）`);
}

// ---- 报告 ----

console.log('重写稿：');
for (const view of VIEWS) console.log(`  ${view.label}（${view.dir}）${rewriteFiles[view.view].length} 个文件`);
console.log(`产物：dist/，比对 ${pages.length} 个页面（步骤页、选择页、旁支页和参考页，不含首页）\n`);

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
  `操作版缺失 ${Object.keys(PENDING.operations).length} 页：${Object.entries(PENDING.operations).map(([id, t]) => `${id} ${t}`).join('、')}`,
  ...(pendingPages.length ? [`正文还没写的页面 ${pendingPages.length} 页：${pendingPages.map(([id, t]) => `${id} ${t}`).join('、')}`] : []),
  `作者待补的 TODO 段落 ${Object.entries(PENDING.todos).map(([id, n]) => `${id} ${n} 处`).join('、')}`,
]);
section('说明（不进差异）', [...new Set(notes)]);
for (const [kind, items] of Object.entries(differences)) section(`${kind}差异`, items);

const total = differences.命令.length + differences.链接.length + differences.截图.length;
console.log(
  `比对范围：页面 ${pages.length} 个、两种视图各一遍；命令差异 ${differences.命令.length}、` +
    `链接差异 ${differences.链接.length}、截图差异 ${differences.截图.length}；` +
    `登记的待补项：操作版 ${Object.keys(PENDING.operations).length} 页、参考页 ${pendingPages.length} 页、作者待补 ${Object.keys(PENDING.todos).length} 页`,
);
process.exit(total ? 1 : pending.length ? 2 : 0);
