import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { parse as parseYaml } from 'yaml';
import type { AnchorHeading } from '../section-anchor';
import { scanHeadings } from './headings';
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
  /** 说明图目录（绝对路径），即 `src/assets/diagrams`（design §4.7） */
  readonly diagramsDir: string;
  /** 说明图文件名（`.svg`） */
  readonly diagrams: ReadonlySet<string>;
  /** 正文视频目录（绝对路径），即 `public/videos`（2026-10-23：视频自托管，见 remark-obsidian 的 convertVideo） */
  readonly videosDir: string;
  /** 视频文件名（`.mp4`，原样交给浏览器，不走 Astro 的图片管线） */
  readonly videos: ReadonlySet<string>;
  /** `principle/`、`reference/` 下的全部页面文件（ADR-0005） */
  readonly pages: readonly IndexedPage[];
  /** 标题 → 页面；标题重复时保留先扫描到的 */
  readonly titles: ReadonlyMap<string, IndexedPage>;
  /** `blog-links.yaml`，博客文章的双链目标 → 地址，待作者提供时为 null（Q-11） */
  readonly blogLinks: ReadonlyMap<string, string | null>;
  /** `blog-links.yaml` 读不懂时的说明，由 checkPages 报出 */
  readonly blogLinksError: string | undefined;
}

/** 两个内容集合（架构 §3 M1；v3 起没有操作版） */
export const COLLECTIONS = ['principle', 'reference'] as const;
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
  /**
   * 除第一行标题以外全部小标题：slug 与页面上的 id 相同（github-slugger，重复的加 -1、-2），
   * text 是去掉行内记号后的标题文字。v3 只有一版正文，所以只有这一份列表（架构 §13.4）。
   */
  headings: readonly AnchorHeading[];
  /** frontmatter 的 principleOnly（旧字段，v3 只有一个版本后统一为 false） */
  principleOnly: boolean;
}

/**
 * 扫描 `contentRoot` 下的两个内容集合、`blog-links.yaml`、截图目录、说明图目录和视频目录，目录不存在时视为空。
 * 标识取相对集合目录、去掉 `.md` 的路径；标题取正文第一行的 `# 标题`（缺失由 checkPages 报错）。
 */
export function createLinkIndex(
  contentRoot: string,
  screenshotsDir: string = resolve(contentRoot, '../assets/screenshots'),
  diagramsDir: string = resolve(contentRoot, '../assets/diagrams'),
  videosDir: string = resolve(contentRoot, '../../public/videos'),
): LinkIndex {
  const root = resolve(contentRoot);
  const pages = COLLECTIONS.flatMap((kind) => listMarkdownDeep(join(root, kind)).map((id) => scanPage(kind, id, join(root, kind, `${id}.md`))));
  const titles = new Map<string, IndexedPage>();
  for (const page of pages) {
    if (page.title !== undefined && !titles.has(page.title)) titles.set(page.title, page);
  }
  return {
    contentRoot: root,
    screenshotsDir: resolve(screenshotsDir),
    screenshots: new Set(listFiles(resolve(screenshotsDir))),
    diagramsDir: resolve(diagramsDir),
    diagrams: new Set(listFiles(resolve(diagramsDir))),
    videosDir: resolve(videosDir),
    videos: new Set(listFiles(resolve(videosDir))),
    pages,
    titles,
    ...readBlogLinks(join(root, 'blog-links.yaml')),
  };
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

/**
 * 读一个页面文件的标题和小标题。小标题的扫描规则在 `headings.ts`（和 `site.ts` 的跳转表校验共用）。
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
  return {
    kind,
    id,
    file,
    title,
    titleLine: (first === -1 ? 0 : first) + 1,
    headings: scanHeadings(content),
    principleOnly: kind === 'principle' && frontmatter.principleOnly === true,
  };
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
 * 页面之间的校验（架构 §3 M1，FR-03、FR-61）：缺第一行标题、全站标题重复和 blog-links.yaml 的形状。
 * v3 起只有一版正文，没有“两版标题不同”“操作版没有原理版”这类检查（实施计划 §3.1）。
 */
export function checkPages(index: LinkIndex): ContentProblem[] {
  const problems: ContentProblem[] = [];
  for (const page of index.pages) {
    const file = display(page.file);
    if (page.title === undefined) {
      problems.push({ file, line: page.titleLine, message: '缺少第一行标题：正文第一行要写“# 页面标题”（与重写稿文件名相同）' });
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
