import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import GithubSlugger from 'github-slugger';
import { parse as parseYaml } from 'yaml';
import type { ContentProblem } from './remark-obsidian';

/**
 * 链接索引：Obsidian 写法插件判断“目标存不存在”和“链接文字缺省用什么”的唯一依据（架构 §3 M1）。
 * 同步扫描文件名生成，不依赖内容集合，所以校验结果不受页面渲染顺序和内容缓存影响。
 */
export interface LinkIndex {
  /** 内容根目录（绝对路径），即 `src/content` */
  readonly contentRoot: string;
  /** 截图目录（绝对路径），即 `src/assets/screenshots` */
  readonly screenshotsDir: string;
  /** 截图文件名（含扩展名，可含空格和中文） */
  readonly screenshots: ReadonlySet<string>;
  /** `principle/`、`operation/`、`reference/` 下的全部页面文件（ADR-0005） */
  readonly pages: readonly IndexedPage[];
  /** 标题 → 页面，只收原理版和参考页（操作版与原理版同 URL）；标题重复时保留先扫描到的 */
  readonly titles: ReadonlyMap<string, IndexedPage>;
  /** `blog-links.yaml`，博客文章的双链目标 → 地址，待作者提供时为 null（Q-11） */
  readonly blogLinks: ReadonlyMap<string, string | null>;
  /** `blog-links.yaml` 读不懂时的说明，由 checkPages 报出 */
  readonly blogLinksError: string | undefined;
}

/** 三个内容集合（架构 §3 M1） */
export const COLLECTIONS = ['principle', 'operation', 'reference'] as const;
export type PageKind = (typeof COLLECTIONS)[number];

export interface IndexedPage {
  kind: PageKind;
  /** 集合内的标识：相对集合目录、去掉 .md 的路径，如 `preface`、`ip-tests/decodo`；也是 URL `/<id>/` */
  id: string;
  /** 绝对路径 */
  file: string;
  /** 正文第一行（frontmatter 之后第一个非空行）的 `# 标题`；没有时为 undefined */
  title: string | undefined;
  /** 标题所在的源文件行号（1 起）；没有标题时为正文第一行 */
  titleLine: number;
  /** 除第一行标题以外全部小标题的 slug，与页面上的 id 相同（github-slugger，重复的加 -1、-2） */
  headings: ReadonlySet<string>;
  /** 原理版 frontmatter 的 principleOnly */
  principleOnly: boolean;
  /** 选择页原理版 frontmatter 的 `options`：选项标识 → 块标题原文（heading），按书写顺序；其他页面没有 */
  options: ReadonlyMap<string, string> | undefined;
}

/**
 * 扫描 `contentRoot` 下的三个内容集合、`blog-links.yaml` 和截图目录，目录不存在时视为空。
 * 标识取相对集合目录、去掉 `.md` 的路径；标题取正文第一行的 `# 标题`（缺失由 checkPages 报错）。
 */
export function createLinkIndex(
  contentRoot: string,
  screenshotsDir: string = resolve(contentRoot, '../assets/screenshots'),
): LinkIndex {
  const root = resolve(contentRoot);
  const pages = COLLECTIONS.flatMap((kind) => listMarkdownDeep(join(root, kind)).map((id) => scanPage(kind, id, join(root, kind, `${id}.md`))));
  const titles = new Map<string, IndexedPage>();
  for (const page of pages) {
    if (page.kind !== 'operation' && page.title !== undefined && !titles.has(page.title)) titles.set(page.title, page);
  }
  return {
    contentRoot: root,
    screenshotsDir: resolve(screenshotsDir),
    screenshots: new Set(listFiles(resolve(screenshotsDir))),
    pages,
    titles,
    ...readBlogLinks(join(root, 'blog-links.yaml')),
  };
}

/** frontmatter 的 options 里写了 heading 的选项；形状不对时由内容集合的 schema 报错，这里只取能用的部分 */
function readOptions(raw: unknown): Map<string, string> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const options = new Map<string, string>();
  for (const [id, value] of Object.entries(raw)) {
    const heading = (value as { heading?: unknown } | null)?.heading;
    if (typeof heading === 'string' && heading.trim() !== '') options.set(id, heading.trim());
  }
  return options;
}

/** 链接索引可以直接给，也可以给一个每次调用都重新扫描的函数 */
export function resolveLinkIndex(index: LinkIndex | (() => LinkIndex)): LinkIndex {
  return typeof index === 'function' ? index() : index;
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

/** 目录下全部 .md 的相对路径（去掉 .md，用 / 分隔，已排序）；目录不存在时为空 */
function listMarkdownDeep(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...listMarkdownDeep(join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.isFile() && extname(entry.name) === '.md') out.push(prefix + basename(entry.name, '.md'));
  }
  return out.sort();
}

const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * 读一个页面文件的标题和小标题。不跑完整的 Markdown 解析：重写稿的小标题都是纯文字，
 * 这里只认 ATX 标题、跳过代码块，再去掉常见的行内记号，与渲染后的标题文字一致。
 */
function scanPage(kind: PageKind, id: string, file: string): IndexedPage {
  const source = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  let content = source;
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = parseFrontmatter(source, { frontmatter: 'empty-with-spaces' });
    content = parsed.content;
    frontmatter = parsed.frontmatter as Record<string, unknown>;
  } catch {
    // frontmatter 写坏时由内容集合报错；这里按原文扫描
  }
  const lines = content.split('\n');
  const first = lines.findIndex((line) => line.trim() !== '');
  const titleMatch = first === -1 ? null : /^# +(.+?)[ \t]*$/.exec(lines[first]);
  const title = titleMatch?.[1];
  const slugger = new GithubSlugger();
  const headings = new Set<string>();
  let fence: string | undefined;
  lines.forEach((line, i) => {
    const f = FENCE.exec(line);
    if (fence !== undefined) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = undefined;
      return;
    }
    if (f) {
      fence = f[1];
      return;
    }
    if (title !== undefined && i === first) return;
    const h = ATX_HEADING.exec(line);
    if (h) headings.add(slugger.slug(plainHeading(h[2])));
  });
  return {
    kind,
    id,
    file,
    title,
    titleLine: (first === -1 ? 0 : first) + 1,
    headings,
    principleOnly: kind === 'principle' && frontmatter.principleOnly === true,
    options: kind === 'principle' ? readOptions(frontmatter.options) : undefined,
  };
}

/** 小标题去掉行内记号后的文字：`**加粗**`、`` `代码` ``、`[[目标|文字]]`、`[文字](地址)` */
export function plainHeading(text: string): string {
  return text
    .replace(/!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .trim();
}

function readBlogLinks(file: string): { blogLinks: Map<string, string | null>; blogLinksError: string | undefined } {
  const blogLinks = new Map<string, string | null>();
  if (!existsSync(file)) return { blogLinks, blogLinksError: undefined };
  let data: unknown;
  try {
    data = parseYaml(readFileSync(file, 'utf8'));
  } catch (error) {
    return { blogLinks, blogLinksError: `YAML 写法有误：${(error as Error).message.split('\n')[0]}` };
  }
  if (data === null || data === undefined) return { blogLinks, blogLinksError: undefined };
  if (typeof data !== 'object' || Array.isArray(data)) {
    return { blogLinks, blogLinksError: '要写成“双链目标: 博客地址或 null”的映射' };
  }
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && !(typeof value === 'string' && /^https?:\/\/\S+$/.test(value))) {
      return { blogLinks: new Map(), blogLinksError: `“${key}”的值要是博客地址（http/https）或 null` };
    }
    blogLinks.set(key, value);
  }
  return { blogLinks, blogLinksError: undefined };
}

function display(file: string): string {
  return relative(process.cwd(), file).split(sep).join('/');
}

/**
 * 页面之间的校验（架构 §3 M1，FR-03、FR-61）：缺第一行标题、全站标题重复、两版标题不同、
 * 操作版没有原理版、原理独有步骤却有操作版，以及 blog-links.yaml 的形状。
 */
export function checkPages(index: LinkIndex): ContentProblem[] {
  const problems: ContentProblem[] = [];
  const principles = new Map(index.pages.filter((p) => p.kind === 'principle').map((p) => [p.id, p]));
  for (const page of index.pages) {
    const file = display(page.file);
    if (page.title === undefined) {
      problems.push({ file, line: page.titleLine, message: '缺少第一行标题：正文第一行要写“# 页面标题”（与重写稿文件名相同）' });
      continue;
    }
    if (page.kind === 'operation') {
      const principle = principles.get(page.id);
      if (principle === undefined) {
        problems.push({ file, message: `没有同名的原理版 principle/${page.id}.md：页面元数据写在原理版里，先建原理版文件` });
      } else if (principle.principleOnly) {
        problems.push({ file, message: '原理版写了 principleOnly: true（原理独有步骤），就不能再有操作版' });
      } else if (principle.title !== undefined && principle.title !== page.title) {
        problems.push({
          file,
          line: page.titleLine,
          message: `操作版标题“${page.title}”与原理版“${principle.title}”不同：两版同名页的标题必须相同（FR-03）`,
        });
      }
      continue;
    }
    const owner = index.titles.get(page.title);
    if (owner !== undefined && owner !== page) {
      problems.push({ file, line: page.titleLine, message: `标题“${page.title}”与 ${relative(index.contentRoot, owner.file).split(sep).join('/')} 重复：双链按标题解析，全站标题不能重复` });
    }
  }
  if (index.blogLinksError !== undefined) {
    problems.push({ file: display(join(index.contentRoot, 'blog-links.yaml')), message: index.blogLinksError });
  }
  return problems;
}
