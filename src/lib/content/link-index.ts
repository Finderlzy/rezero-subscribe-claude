import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

/**
 * 链接索引：Obsidian 写法插件判断“目标存不存在”和“链接文字缺省用什么”的唯一依据（架构 §3 M1）。
 * 同步扫描文件名生成，不依赖内容集合，所以校验结果不受页面渲染顺序和内容缓存影响。
 */
export interface LinkIndex {
  /** 内容根目录（绝对路径），即 `src/content` */
  readonly contentRoot: string;
  /** 截图目录（绝对路径），即 `src/assets/screenshots` */
  readonly screenshotsDir: string;
  /** 步骤标识 → 标题 */
  readonly steps: ReadonlyMap<string, string>;
  /** 常见问题标识 → 标题 */
  readonly faq: ReadonlyMap<string, string>;
  /** 分叉点标识 → 选择页的问题（`question`） */
  readonly choices: ReadonlyMap<string, string>;
  /** 截图文件名（含扩展名，可含空格和中文） */
  readonly screenshots: ReadonlySet<string>;
  /** 完成页标题（`pages/done.md` 的 `title`），没有该文件时为 undefined */
  readonly doneTitle: string | undefined;
}

/**
 * 扫描 `contentRoot` 下的 `steps/`、`faq/`、`choices/`、`pages/done.md` 和截图目录。
 * 目录不存在时视为空。标识取文件名去掉 `.md`；标题读 frontmatter，读不到时退回标识
 * （缺少必填元数据由内容集合的 Zod schema 报错，这里不重复校验）。
 */
export function createLinkIndex(
  contentRoot: string,
  screenshotsDir: string = resolve(contentRoot, '../assets/screenshots'),
): LinkIndex {
  const root = resolve(contentRoot);
  const donePath = join(root, 'pages', 'done.md');
  return {
    contentRoot: root,
    screenshotsDir: resolve(screenshotsDir),
    steps: scanMarkdown(join(root, 'steps'), 'title'),
    faq: scanMarkdown(join(root, 'faq'), 'title'),
    choices: scanMarkdown(join(root, 'choices'), 'question'),
    screenshots: new Set(listFiles(resolve(screenshotsDir))),
    doneTitle: existsSync(donePath) ? readField(donePath, 'title') : undefined,
  };
}

/** 链接索引可以直接给，也可以给一个每次调用都重新扫描的函数 */
export function resolveLinkIndex(index: LinkIndex | (() => LinkIndex)): LinkIndex {
  return typeof index === 'function' ? index() : index;
}

/** 目录下的 .md 文件名（不含隐藏文件，已排序）；目录不存在时为空 */
export function listMarkdown(dir: string): string[] {
  return listFiles(dir).filter((name) => extname(name) === '.md');
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

function scanMarkdown(dir: string, field: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of listMarkdown(dir)) {
    const id = basename(name, '.md');
    map.set(id, readField(join(dir, name), field) ?? id);
  }
  return map;
}

function readField(file: string, field: string): string | undefined {
  try {
    const { frontmatter } = parseFrontmatter(readFileSync(file, 'utf8'));
    const value = (frontmatter as Record<string, unknown>)[field];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  } catch {
    // frontmatter 写坏时由内容集合报错；这里退回标识，避免同一个错误报两遍。
    return undefined;
  }
}
