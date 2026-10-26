import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { AGENT_SKILL_PATH } from '../agent-skill/index';
import { UPDATE_LOG_PATH } from '../update-log';
import { joinBase } from '../with-base';

/**
 * sitemap 的 lastmod（2026-10-23，谷歌收录用）：每条网址写上它源文件最后一次提交的日期，
 * 谷歌据此判断这一页什么时候真的改过、要不要重抓。
 *
 * 不用构建时间：CI 每次 checkout 的 mtime 和构建时刻都会变，所有页面会是同一个“今天”，
 * 谷歌发现 lastmod 总在变就不再相信它。源文件没有 git 历史时（浅克隆、构建夹具的临时目录）就不写这一条，
 * 宁可没有，也不写一个假的日期。
 */

/** 更新日志页在 sitemap 里的路径（就是 UPDATE_LOG_PATH，单独取个别名让这里的用法更直白） */
const UPDATE_LOG_SITEMAP_PATH = UPDATE_LOG_PATH;

/** 一条 sitemap 网址和它的源文件。 */
export interface SitemapSource {
  /** 网址路径，含部署根路径，和 `joinBase()` 的结果一致 */
  path: string;
  /** 源文件，相对仓库根（`git log` 用这个形式） */
  file: string;
}

/** 目录里的 Markdown 文件名（不含路径）；目录不存在时为空 */
function markdownNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * 站点的每一页和生成它的文件，和路由约定一致（架构 §3 M3）：
 * 首页是 `index.astro`；正文和参考页一个 Markdown 文件一页，标识就是文件名去掉 `.md`，
 * 参考页的标识带一层目录（`ip-tests/decodo` → `/ip-tests/decodo/`）。
 */
export function sitemapSources(options: {
  /** 仓库根：算出相对路径给 git 用 */
  repoRoot: string;
  /** `src/content/` */
  contentRoot: string;
  /** `src/pages/` */
  pagesRoot: string;
  /** 部署根路径（`BASE_PATH`，默认 `/`） */
  base: string;
}): SitemapSource[] {
  const { repoRoot, contentRoot, pagesRoot, base } = options;
  const sources: SitemapSource[] = [];
  const add = (file: string, path: string) => {
    sources.push({ path, file: relative(repoRoot, file).split(sep).join('/') });
  };

  add(join(pagesRoot, 'index.astro'), joinBase(base, '/'));
  // 更新日志页（v0.13、FR-80）：独立页面，源文件是路由；条目数据变了不算这一页改过
  add(join(pagesRoot, 'update-log.astro'), joinBase(base, UPDATE_LOG_SITEMAP_PATH));
  // Agent Skill 页（v0.16、FR-115）：同样独立的页面，源文件也是路由
  add(join(pagesRoot, 'agent-skill.astro'), joinBase(base, AGENT_SKILL_PATH));
  for (const name of markdownNames(join(contentRoot, 'principle'))) {
    add(join(contentRoot, 'principle', name), joinBase(base, `/${name.slice(0, -'.md'.length)}/`));
  }

  const referenceRoot = join(contentRoot, 'reference');
  for (const entry of existsSync(referenceRoot) ? readdirSync(referenceRoot, { withFileTypes: true }) : []) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      add(join(referenceRoot, entry.name), joinBase(base, `/${entry.name.slice(0, -'.md'.length)}/`));
    } else if (entry.isDirectory()) {
      for (const name of markdownNames(join(referenceRoot, entry.name))) {
        add(join(referenceRoot, entry.name, name), joinBase(base, `/${entry.name}/${name.slice(0, -'.md'.length)}/`));
      }
    }
  }
  return sources;
}

/** 网址路径 → lastmod；`dateOf` 给不出日期的页面不进结果（sitemap 里就不写 lastmod） */
export function sitemapLastmods(
  sources: readonly SitemapSource[],
  dateOf: (file: string) => string | undefined,
): Map<string, string> {
  const lastmods = new Map<string, string>();
  for (const { path, file } of sources) {
    const date = dateOf(file);
    if (date !== undefined) lastmods.set(path, date);
  }
  return lastmods;
}

/** 日期必须是 `YYYY-MM-DD`，和 sitemap 的 `lastmod` 写法一致 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 一个文件最后一次提交的日期；没有 git、没有这段历史或输出不认识时返回 undefined */
export function gitLastModified(repoRoot: string, file: string): string | undefined {
  try {
    const output = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: repoRoot,
      encoding: 'utf8',
      // git 自己报错时不把噪声写进构建日志：拿不到日期就不要这一条
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return ISO_DATE.test(output) ? output : undefined;
  } catch {
    return undefined;
  }
}