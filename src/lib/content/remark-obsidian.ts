import { readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import type { Blockquote, Html, Image, Link, Paragraph, Parent, PhrasingContent, Root, RootContent, Text } from 'mdast';
import { hashFragment, LAYOUT_ANCHOR_IDS, resolveSectionAnchor } from '../section-anchor';
import { joinBase } from '../with-base';
import { parseDiagram } from './diagram';
import { resolveLinkIndex, type IndexedPage, type LinkIndex } from './link-index';

/**
 * M1 的 Obsidian 写法插件（架构 §3 M1）：把双链、嵌入转换成链接、图片节点和内联的说明图，
 * 并检查 Callout 类型；任何找不到的目标或无法识别的写法都记为问题，整篇处理完后一次性抛出。
 */

/** 允许的 Callout 类型：两种视图都显示的提示框；1.0.0 的原理块 [!why] 已被整页切换取代（ADR-0004） */
export const CALLOUT_TYPES = ['note', 'caution'] as const;

/** 重写稿的目录页：原理版、纯操作版和博客里的纯操作版，都指向首页（架构 §3 M1） */
export const HOME_TARGETS: readonly string[] = ['如何订阅claude', '如何订阅claude（纯操作版）', '04技术/如何订阅claude（纯操作版）'];
/** 指向博客其他文章的双链前缀，目标查 blog-links.yaml（Q-11） */
export const BLOG_PREFIX = '04技术/';
/** 手写页脚那一段的开头（FR-04） */
const FOOTER_START = /^(上一步|下一步|回到)：/;
/** 作者待补段落的开头（FR-21） */
const TODO_START = /^TODO[：:]/;

/** 截图目录在仓库里的位置，只用于错误提示 */
const SCREENSHOTS_HINT = 'src/assets/screenshots/';
/** 说明图目录在仓库里的位置，只用于错误提示 */
const DIAGRAMS_HINT = 'src/assets/diagrams/';
/** 原文章的附件目录前缀：迁移时要去掉（评审 R5） */
const LEGACY_ATTACHMENT_PREFIX = '09附件/';

export interface RemarkObsidianOptions {
  /** 部署根路径，与 astro.config.mjs 的 `base` 相同；生成的 href 都经过 joinBase */
  base: string;
  /** 链接索引；传函数时每篇文档处理前调用一次（开发时新增的文件也能被找到） */
  linkIndex: LinkIndex | (() => LinkIndex);
  /** 收到问题时调用；不传时抛出 ContentError（渲染失败）。校验阶段用它收集问题 */
  onProblems?: (problems: ContentProblem[]) => void;
  /** 收到内容提示（作者待补、博客链接待填）时调用；提示不让构建失败，不传时忽略 */
  onHints?: (hints: ContentHint[]) => void;
}

export interface ContentProblem {
  /** 相对当前工作目录的文件路径 */
  file: string;
  line?: number;
  column?: number;
  message: string;
}

/**
 * 内容提示（FR-21、Q-11）：不让构建失败，构建结束时按 formatHints 汇总打印（架构 §3 M5）。
 * `page` 是提示所在的页面；作者待补带段落原文，博客链接带双链目标。
 */
export type ContentHint = { file: string; line?: number; page: { id: string; title: string } } & (
  | { kind: 'author-todo'; text: string }
  | { kind: 'blog-link'; target: string }
);

/** 内容提示的输出：每行一条，作者待补按页面合计处数，博客链接按目标去重（架构 §3 M5） */
export function formatHints(hints: readonly ContentHint[]): string[] {
  const lines = new Map<string, number>();
  const add = (line: string) => lines.set(line, (lines.get(line) ?? 0) + 1);
  const order = ['author-todo', 'blog-link'];
  // 同类提示排在一起，类内保持出现顺序
  const sorted = [...hints].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const hint of sorted) {
    if (hint.kind === 'author-todo') add(`作者待补：${hint.page.id} ${hint.page.title}`);
    else add(`博客链接待填：${hint.target}`);
  }
  return [...lines].map(([line, n]) => (line.startsWith('作者待补：') ? `${line}（${n} 处）` : line));
}

/** 一篇内容里的全部问题；message 每行一个“文件:行:列 说明” */
export class ContentError extends Error {
  readonly problems: ContentProblem[];
  constructor(problems: ContentProblem[]) {
    super(problems.map(formatProblem).join('\n'));
    this.name = 'ContentError';
    this.problems = problems;
  }
}

export function formatProblem(p: ContentProblem): string {
  const where = p.line === undefined ? p.file : `${p.file}:${p.line}:${p.column ?? 1}`;
  return `${where} ${p.message}`;
}

interface Point {
  line: number;
  column: number;
}

interface DocContext {
  index: LinkIndex;
  base: string;
  /** 文档的绝对路径；没有时为 undefined */
  path: string | undefined;
  /** 当前文件是 principle/、reference/ 下的页面时为该页面（去标题和页脚、`?from=`、内容提示） */
  page: IndexedPage | undefined;
  report(message: string, at: Point | undefined): void;
  /** 记一条内容提示（不是页面文件时忽略） */
  hint(detail: { kind: 'author-todo'; text: string } | { kind: 'blog-link'; target: string }, at: Point | undefined): void;
}

export default function remarkObsidian(options: RemarkObsidianOptions) {
  return function transformer(tree: Root, file: { path?: string; value?: unknown }): void {
    const index = resolveLinkIndex(options.linkIndex);
    const path = file.path || undefined;
    const display = path ? relative(process.cwd(), path).split(sep).join('/') : '<未命名内容>';
    const shift = sourceShift(path, file.value);
    const problems: ContentProblem[] = [];
    const hints: ContentHint[] = [];
    const page = path ? index.pages.find((p) => p.file === path) : undefined;
    const ctx: DocContext = {
      index,
      base: options.base,
      path,
      page,
      report(message, at) {
        const point = at && shift(at);
        problems.push({ file: display, line: point?.line, column: point?.column, message });
      },
      hint(detail, at) {
        if (!page) return;
        hints.push({ ...detail, file: display, line: at && shift(at).line, page: { id: page.id, title: page.title ?? page.id } });
      },
    };
    if (ctx.page) preparePage(tree, ctx.page);
    walk(tree, ctx, false);
    if (hints.length > 0) options.onHints?.(hints);
    if (problems.length === 0) return;
    if (options.onProblems) options.onProblems(problems);
    else throw new ContentError(problems);
  };
}

/**
 * 内容集合渲染时，Astro 传进来的正文去掉了 frontmatter 并做了 trim（`body: content.trim()`），
 * 行号会比源文件少。这里读源文件算出被裁掉的行数，把报出的位置换回源文件里的行列。
 * 正文与源文件一致（校验阶段、单元测试）时不做换算。
 */
function sourceShift(path: string | undefined, value: unknown): (p: Point) => Point {
  const same = (p: Point) => p;
  if (!path || typeof value !== 'string' || value === '') return same;
  let full: string;
  try {
    full = parseFrontmatter(readFileSync(path, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
  } catch {
    return same;
  }
  const lead = full.length - full.trimStart().length;
  if (lead === 0 || !full.slice(lead).startsWith(value)) return same;
  const cut = full.slice(0, lead).split('\n');
  const lineShift = cut.length - 1;
  const firstColumnShift = cut[cut.length - 1].length;
  return (p) => ({ line: p.line + lineShift, column: p.line === 1 ? p.column + firstColumnShift : p.column });
}

/**
 * 页面正文的结构调整（架构 §3 M1）：去掉第一行的 `# 标题`（布局输出 h1），
 * 去掉末尾手写的页脚（FR-04，页脚由路线图生成）。页脚里的双链不再解析。
 * 作者在新稿里习惯在每个标题下面写一行 `---` 当分隔（Obsidian 的写法）；标题的样式由页面负责，
 * 这行分隔线不渲染，否则会在每个 h2 下面多一条和 h2 下边线重复的线（design §3.2、§4.7）。
 */
function preparePage(tree: Root, page: IndexedPage): void {
  const [first] = tree.children;
  if (first?.type === 'heading' && first.depth === 1 && page.title !== undefined && plainText(first) === page.title) {
    tree.children.shift();
    // 标题下面那一行 `---` 紧跟着标题，标题去掉后它在最前面
    if (tree.children[0]?.type === 'thematicBreak') tree.children.shift();
  }
  for (let i = tree.children.length - 1; i > 0; i--) {
    if (tree.children[i]!.type === 'thematicBreak' && tree.children[i - 1]!.type === 'heading') tree.children.splice(i, 1);
  }
  const n = tree.children.length;
  const rule = tree.children[n - 2];
  const footer = tree.children[n - 1];
  if (rule?.type === 'thematicBreak' && footer?.type === 'paragraph' && startsWith(footer, FOOTER_START)) {
    tree.children.splice(n - 2, 2);
  }
}

function plainText(node: RootContent): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  return 'children' in node ? (node.children as RootContent[]).map(plainText).join('') : '';
}

/** 段落开头的文字是否匹配 */
function startsWith(node: Paragraph, pattern: RegExp): boolean {
  const head = node.children[0];
  return head?.type === 'text' && pattern.test(head.value);
}

/** `TODO：` 段落变成 `<aside class="author-todo">`，原文不动，前面加“作者待补”标签（FR-21） */
function markTodo(node: Paragraph, ctx: DocContext): void {
  // 双链还没转换，plainText 就是原文
  ctx.hint({ kind: 'author-todo', text: plainText(node).trim() }, node.position?.start);
  node.data = { ...node.data, hName: 'aside', hProperties: { className: ['author-todo'] } };
  node.children.unshift(
    { type: 'strong', data: { hProperties: { className: ['author-todo-label'] } }, children: [{ type: 'text', value: '作者待补' }] },
    { type: 'text', value: ' ' },
  );
}

function walk(node: Parent, ctx: DocContext, inLink: boolean): void {
  if (node.type === 'blockquote') checkCallout(node as Blockquote, ctx);
  if (ctx.page && node.type === 'paragraph' && startsWith(node as Paragraph, TODO_START)) markTodo(node as Paragraph, ctx);
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'text') {
      // 解析完还留在文字里的 ** 就是没成加粗的星号，会原样显示（#21）。
      if (child.value.includes('**')) {
        ctx.report('“**”没有解析成加粗：结尾的 ** 前是标点、后面紧跟文字时不算加粗，把标点移到 ** 外面', child.position?.start);
      }
      if (inLink) {
        if (child.value.includes('[[')) ctx.report('链接文字里不能再写双链或嵌入', child.position?.start);
        continue;
      }
      const replaced = convertText(child, ctx);
      if (replaced) {
        (node.children as PhrasingContent[]).splice(i, 1, ...replaced);
        i += replaced.length - 1;
      }
    } else if (child.type === 'link' && !inLink && ctx.page) {
      checkSectionLink(child, ctx);
      checkRelativeMarkdownLink(child, ctx);
      walk(child, ctx, true);
    } else if ('children' in child) {
      walk(child, ctx, inLink || child.type === 'link' || child.type === 'linkReference');
    }
    // code / inlineCode / html 没有 children，其中的 [[...]] 原样保留。
  }
}

/** 与 rehype-callouts 的识别规则一致：引用第一段第一个文本节点里任意位置的 [!type]，类型不分大小写 */
const CALLOUT_MARK = /\[!([\w-]+)\]([+-]?)/;

/**
 * Callout 白名单：只允许小写的 note / caution，标记必须写在引用开头，且不允许可折叠写法
 * （库自带的折叠箭头与 design §3.3“图标自画”冲突）。rehype-callouts 会把第一行任意位置的 [!type]
 * 都当成 Callout，也认 tip、warning 等内置类型，所以这里按它的规则找，再按白名单拦下。
 */
function checkCallout(node: Blockquote, ctx: DocContext): void {
  const first = node.children[0];
  if (first?.type !== 'paragraph') return;
  const head = first.children[0];
  if (head?.type !== 'text') return;
  const match = CALLOUT_MARK.exec(head.value);
  if (!match) return;
  const [mark, type, fold] = match;
  const at = head.position?.start;
  if (!(CALLOUT_TYPES as readonly string[]).includes(type)) {
    ctx.report(`不支持的 Callout 类型“${mark}”，只能用 ${CALLOUT_TYPES.map((t) => `[!${t}]`).join('、')}（小写）`, at);
  } else if (fold) {
    ctx.report(`Callout 不支持折叠写法“${mark}”，去掉“${fold}”`, at);
  } else if (head.value.slice(0, match.index).trim() !== '') {
    ctx.report(`Callout 标记“${mark}”要写在引用第一行的开头`, at);
  }
}

const WIKI = /(!?)\[\[([^[\]\n]*)\]\]/g;

/** 把一个文本节点里的双链和嵌入换成节点；没有可转换的内容时返回 undefined */
function convertText(node: Text, ctx: DocContext): PhrasingContent[] | undefined {
  const value = node.value;
  if (!value.includes('[[')) return undefined;
  const out: PhrasingContent[] = [];
  let last = 0;
  const pushText = (text: string, offset: number) => {
    if (text === '') return;
    if (text.includes('[[')) {
      ctx.report(`无法识别的写法“${text.trim()}”：双链和嵌入要写成 [[…]]、![[…]]，中间不能换行或加格式`, pointAt(node, offset + text.indexOf('[[')));
    }
    out.push({ type: 'text', value: text });
  };
  for (const match of value.matchAll(WIKI)) {
    const offset = match.index;
    pushText(value.slice(last, offset), last);
    const at = pointAt(node, offset);
    const converted = match[1] === '!' ? convertEmbed(match[2], match[0], at, ctx) : convertLink(match[2], match[0], at, ctx);
    out.push(converted ?? { type: 'text', value: match[0] });
    last = offset + match[0].length;
  }
  pushText(value.slice(last), last);
  return out;
}

/** 文本节点内偏移量对应的源码位置（文本里有转义时列号可能略有偏差，行号准确） */
function pointAt(node: Text, offset: number): Point | undefined {
  const start = node.position?.start;
  if (!start) return undefined;
  const before = node.value.slice(0, offset);
  const lines = before.split('\n');
  if (lines.length === 1) return { line: start.line, column: start.column + offset };
  return { line: start.line + lines.length - 1, column: lines[lines.length - 1].length + 1 };
}

function splitOnce(raw: string, sepChar: string): [string, string | undefined] {
  const i = raw.indexOf(sepChar);
  return i === -1 ? [raw, undefined] : [raw.slice(0, i), raw.slice(i + 1)];
}

interface WikiTarget {
  target: string;
  text: string | undefined;
  heading: string | undefined;
}

/** 拆开 `目标#小标题|文字`；文字或小标题写了却为空时报错并返回 undefined */
function parseWikiTarget(raw: string, source: string, at: Point | undefined, ctx: DocContext): WikiTarget | undefined {
  const [targetRaw, textRaw] = splitOnce(raw, '|');
  const [pathRaw, headingRaw] = splitOnce(targetRaw, '#');
  const text = textRaw?.trim();
  const heading = headingRaw?.trim();
  if (textRaw !== undefined && !text) {
    ctx.report(`链接文字为空：${source}`, at);
    return undefined;
  }
  if (headingRaw !== undefined && !heading) {
    ctx.report(`“#”后面缺少小标题：${source}`, at);
    return undefined;
  }
  return { target: pathRaw.trim(), text, heading };
}

/**
 * 同页小节链接 `[文字](#小标题)`（V07、架构 §13.4）：v3 的一章一页里有大量页内目录链接，
 * 片段可以写标题原文，也可以写 slug；解析成页面上的 slug 后写回链接，找不到就构建失败。
 * 只处理 `#` 开头的链接，外链和别的页面不受影响。
 */
/**
 * 相对 Markdown 链接（`[文字](02-….md)`）要在导入时换成双链（V10，import-rewrite.mjs）。
 * 这里兜底：正文里还留着 `.md` 链接，说明重写稿有导入脚本没认出来的写法（比如目标里有空格），
 * 或者有人手改了正文；构建失败（FR-61），不要让它变成站内 404。
 */
function checkRelativeMarkdownLink(node: Link, ctx: DocContext): void {
  if (/^https?:/.test(node.url)) return;
  if (!/\.md(?:#|$)/.test(node.url)) return;
  ctx.report(`相对 Markdown 链接没有在导入时转换：${node.url}（改重写稿的写法或重跑 import-rewrite.mjs）`, node.position?.start);
}

function checkSectionLink(node: Link, ctx: DocContext): void {
  if (ctx.page === undefined || !node.url.startsWith('#')) return;
  const fragment = hashFragment(node.url);
  if (fragment === undefined) {
    ctx.report(`小节链接“${node.url}”没有写小标题：要写成 [文字](#小标题)`, node.position?.start);
    return;
  }
  // #main 这类布局自带的落点不是小节，原样交给浏览器
  if (LAYOUT_ANCHOR_IDS.has(fragment)) return;
  const anchor = resolveSectionAnchor(ctx.page.headings, fragment);
  if (anchor === undefined) {
    ctx.report(`这一页里没有小标题“${fragment}”：${node.url}`, node.position?.start);
    return;
  }
  node.url = `#${anchor}`;
}

/**
 * 双链（架构 §3 M1、ADR-0005）：目标是页面标题（重写稿的文件名），链到 `/<id>/`；
 * `#小标题` 要在目标页存在；从步骤链到参考页时带 `?from=<当前页>`（FR-20）；
 * 目录页指向首页；`04技术/…` 查 blog-links.yaml，地址待填时只输出文字（Q-11）。
 */
function convertLink(raw: string, source: string, at: Point | undefined, ctx: DocContext): PhrasingContent | undefined {
  const parsed = parseWikiTarget(raw, source, at, ctx);
  if (!parsed) return undefined;
  const { target, text, heading } = parsed;
  const link = (url: string, label: string): Link => ({ type: 'link', url, title: null, children: [{ type: 'text', value: label }] });

  if (HOME_TARGETS.includes(target)) {
    if (heading) {
      ctx.report(`目录页（首页）的链接不能带小标题：${source}`, at);
      return undefined;
    }
    return link(joinBase(ctx.base, '/'), text ?? target.slice(target.lastIndexOf('/') + 1));
  }

  if (target.startsWith(BLOG_PREFIX)) {
    if (heading) {
      ctx.report(`博客文章的链接不支持小标题：${source}`, at);
      return undefined;
    }
    if (!ctx.index.blogLinks.has(target)) {
      ctx.report(`blog-links.yaml 里没有“${target}”：先在表里加上这一项（地址待定写 null）：${source}`, at);
      return undefined;
    }
    const label = text ?? target.slice(BLOG_PREFIX.length);
    const url = ctx.index.blogLinks.get(target);
    if (url == null) {
      ctx.hint({ kind: 'blog-link', target }, at);
      return { type: 'text', value: label };
    }
    return link(url, label);
  }

  if (target === '' || target.includes('/')) {
    ctx.report(`无法识别的链接目标“${target}”：双链要写页面标题（如 [[选择方案]]），或 [[${BLOG_PREFIX}…]]：${source}`, at);
    return undefined;
  }
  const page = ctx.index.titles.get(target);
  if (page === undefined) {
    ctx.report(`找不到标题为“${target}”的页面：双链按页面标题（正文第一行的 # 标题）解析：${source}`, at);
    return undefined;
  }
  const anchor = heading === undefined ? undefined : resolveSectionAnchor(page.headings, heading);
  if (heading !== undefined && anchor === undefined) {
    ctx.report(`“${target}”里没有小标题“${heading}”：${source}`, at);
    return undefined;
  }
  const hash = anchor === undefined ? '' : `#${anchor}`;
  const fromStep = page.kind === 'reference' && ctx.page !== undefined && ctx.page.kind !== 'reference';
  const query = fromStep ? `?from=${encodeURIComponent(ctx.page!.id)}` : '';
  const out = link(joinBase(ctx.base, `/${page.id}/${query}${hash}`), text ?? (heading ? `${target} > ${heading}` : target));
  out.data = { targetPage: page.id };
  return out;
}

function convertEmbed(raw: string, source: string, at: Point | undefined, ctx: DocContext): Image | Html | undefined {
  const [nameRaw, widthRaw] = splitOnce(raw, '|');
  const name = nameRaw.trim();
  if (name.startsWith(LEGACY_ATTACHMENT_PREFIX)) {
    ctx.report(`嵌入只接受裸文件名，去掉“${LEGACY_ATTACHMENT_PREFIX}”前缀：${source}`, at);
    return undefined;
  }
  if (name === '' || name.includes('/') || name.includes('\\')) {
    ctx.report(`嵌入只接受裸文件名（截图放在 ${SCREENSHOTS_HINT}）：${source}`, at);
    return undefined;
  }
  if (/[#?%]/.test(name)) {
    // encodeURI 不编码 # 和 ?，% 会被 Astro 的 decodeURI 误解码，这三个字符都会让图片路径出错。
    ctx.report(`截图文件名不能含 #、?、%，请改名后再嵌入：${source}`, at);
    return undefined;
  }
  if (extname(name).toLowerCase() === '.svg') return convertDiagram(name, widthRaw, source, at, ctx);
  let width: number | undefined;
  if (widthRaw !== undefined) {
    const w = widthRaw.trim();
    if (!/^[1-9]\d*$/.test(w)) {
      ctx.report(`嵌入的宽度只能是正整数像素，例如 ![[${name}|262]]：${source}`, at);
      return undefined;
    }
    width = Number(w);
  }
  if (!ctx.index.screenshots.has(name)) {
    ctx.report(`找不到图片“${name}”（应放在 ${SCREENSHOTS_HINT}）：${source}`, at);
    return undefined;
  }

  const from = ctx.path ? dirname(ctx.path) : ctx.index.contentRoot;
  let rel = relative(from, join(ctx.index.screenshotsDir, name)).split(sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  // 键名原样成为 <img> 属性，所以写字面的 'data-zoom'（reuse-research §4.1）；供看大图组件识别。
  const hProperties: Record<string, unknown> = { 'data-zoom': '' };
  if (width !== undefined) {
    hProperties.width = width;
    // 写了显示宽度时图片服务只生成该宽度；再要一份 2x，高分屏和看大图都不至于太糊。
    hProperties.densities = [1, 2];
  }
  return {
    type: 'image',
    // Astro 收集图片时会 decodeURI，所以这里统一 encodeURI（reuse-research §4.1）。
    url: encodeURI(rel),
    alt: basename(name, extname(name)),
    title: null,
    data: { hProperties },
  };
}

/**
 * 说明图（design §4.7）：`.svg` 嵌入从说明图目录读出、检查后原样内联，线条才能跟着 --text 和 --accent 变色。
 * 输出 html 节点（Astro 允许原始 HTML，由 rehype-raw 解析），hName 让它在 hast 里是一个 svg 元素，
 * rehype-figures 才能把它当图版编号。宽高写成 viewBox 的宽高，按 1:1 显示，CSS 再限制不超过正文栏。
 */
function convertDiagram(name: string, widthRaw: string | undefined, source: string, at: Point | undefined, ctx: DocContext): Html | undefined {
  if (widthRaw !== undefined) {
    ctx.report(`说明图不写宽度（按 viewBox 显示）：${source}`, at);
    return undefined;
  }
  if (!ctx.index.diagrams.has(name)) {
    ctx.report(`找不到说明图“${name}”（应放在 ${DIAGRAMS_HINT}）：${source}`, at);
    return undefined;
  }
  const diagram = parseDiagram(readFileSync(join(ctx.index.diagramsDir, name), 'utf8'));
  if ('errors' in diagram) {
    for (const error of diagram.errors) ctx.report(`说明图“${name}”：${error}`, at);
    return undefined;
  }
  return {
    type: 'html',
    value: diagram.inner,
    data: {
      hName: 'svg',
      hProperties: {
        viewBox: `0 0 ${diagram.width} ${diagram.height}`,
        width: diagram.width,
        height: diagram.height,
        role: 'img',
        ariaLabel: diagram.title,
        className: ['diagram-svg'],
        dataDiagram: '',
      },
    },
  };
}
