import { readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { slug } from 'github-slugger';
import type { Blockquote, Image, Link, Parent, PhrasingContent, Root, Text } from 'mdast';
import { joinBase } from '../with-base';
import { resolveLinkIndex, type LinkIndex } from './link-index';

/**
 * M1 的 Obsidian 写法插件（架构 §3 M1）：把双链、嵌入转换成链接和图片节点，
 * 并检查 Callout 类型；任何找不到的目标或无法识别的写法都记为问题，整篇处理完后一次性抛出。
 */

/** 允许的 Callout 类型：why = 原理块（ADR-0003），note / caution = 两种视图都显示的提示框 */
export const CALLOUT_TYPES = ['why', 'note', 'caution'] as const;

/** 截图目录在仓库里的位置，只用于错误提示 */
const SCREENSHOTS_HINT = 'src/assets/screenshots/';
/** 原文章的附件目录前缀：迁移时要去掉（评审 R5） */
const LEGACY_ATTACHMENT_PREFIX = '09附件/';

export interface RemarkObsidianOptions {
  /** 部署根路径，与 astro.config.mjs 的 `base` 相同；生成的 href 都经过 joinBase */
  base: string;
  /** 链接索引；传函数时每篇文档处理前调用一次（开发时新增的文件也能被找到） */
  linkIndex: LinkIndex | (() => LinkIndex);
  /** 收到问题时调用；不传时抛出 ContentError（渲染失败）。校验阶段用它收集问题 */
  onProblems?: (problems: ContentProblem[]) => void;
}

export interface ContentProblem {
  /** 相对当前工作目录的文件路径 */
  file: string;
  line?: number;
  column?: number;
  message: string;
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
  /** 当前文件是步骤时为步骤标识，用于常见问题链接的 `?from=` */
  currentStep: string | undefined;
  report(message: string, at: Point | undefined): void;
}

export default function remarkObsidian(options: RemarkObsidianOptions) {
  return function transformer(tree: Root, file: { path?: string; value?: unknown }): void {
    const index = resolveLinkIndex(options.linkIndex);
    const path = file.path || undefined;
    const display = path ? relative(process.cwd(), path).split(sep).join('/') : '<未命名内容>';
    const shift = sourceShift(path, file.value);
    const problems: ContentProblem[] = [];
    const ctx: DocContext = {
      index,
      base: options.base,
      path,
      currentStep: stepIdOf(path, index),
      report(message, at) {
        const point = at && shift(at);
        problems.push({ file: display, line: point?.line, column: point?.column, message });
      },
    };
    walk(tree, ctx, false);
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

function stepIdOf(path: string | undefined, index: LinkIndex): string | undefined {
  if (!path || extname(path) !== '.md') return undefined;
  return dirname(path) === join(index.contentRoot, 'steps') ? basename(path, '.md') : undefined;
}

function walk(node: Parent, ctx: DocContext, inLink: boolean): void {
  if (node.type === 'blockquote') checkCallout(node as Blockquote, ctx);
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
    } else if ('children' in child) {
      walk(child, ctx, inLink || child.type === 'link' || child.type === 'linkReference');
    }
    // code / inlineCode / html 没有 children，其中的 [[...]] 原样保留。
  }
}

/** 与 rehype-callouts 的识别规则一致：引用第一段第一个文本节点里任意位置的 [!type]，类型不分大小写 */
const CALLOUT_MARK = /\[!([\w-]+)\]([+-]?)/;

/**
 * Callout 白名单：只允许小写的 why / note / caution，标记必须写在引用开头，且不允许可折叠写法
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

function convertLink(raw: string, source: string, at: Point | undefined, ctx: DocContext): Link | undefined {
  const [targetRaw, textRaw] = splitOnce(raw, '|');
  const [pathRaw, headingRaw] = splitOnce(targetRaw, '#');
  const target = pathRaw.trim();
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

  let path: string;
  let title: string | undefined;
  let query = '';
  if (target === 'done') {
    path = '/done/';
    title = ctx.index.doneTitle ?? '完成页';
  } else if (target.startsWith('faq/')) {
    const id = target.slice('faq/'.length);
    title = ctx.index.faq.get(id);
    if (title === undefined) {
      ctx.report(`找不到常见问题“${id}”（src/content/faq/${id}.md）：${source}`, at);
      return undefined;
    }
    path = `/faq/${id}/`;
    if (ctx.currentStep) query = `?from=${encodeURIComponent(ctx.currentStep)}`;
  } else if (target.startsWith('choose/')) {
    const id = target.slice('choose/'.length);
    title = ctx.index.choices.get(id);
    if (title === undefined) {
      ctx.report(`找不到选择页“${id}”（src/content/choices/${id}.md）：${source}`, at);
      return undefined;
    }
    path = `/choose/${id}/`;
  } else if (target.includes('/') || target === '') {
    ctx.report(`无法识别的链接目标“${target}”：只支持 [[步骤]]、[[faq/…]]、[[choose/…]]、[[done]]：${source}`, at);
    return undefined;
  } else {
    title = ctx.index.steps.get(target);
    if (title === undefined) {
      ctx.report(`找不到步骤“${target}”（src/content/steps/${target}.md）：${source}`, at);
      return undefined;
    }
    path = `/${target}/`;
  }

  const hash = heading ? `#${slug(heading)}` : '';
  return {
    type: 'link',
    url: joinBase(ctx.base, path + query + hash),
    title: null,
    children: [{ type: 'text', value: text ?? title }],
  };
}

function convertEmbed(raw: string, source: string, at: Point | undefined, ctx: DocContext): Image | undefined {
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
