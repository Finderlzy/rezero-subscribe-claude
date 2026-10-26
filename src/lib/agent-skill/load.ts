import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { createLinkIndex } from '../content/link-index';
import { GROUP_NUMBER, GROUP_URL } from '../group';
import { assembleRoute, type PrincipleEntry } from '../route/assemble';
import { parseRouteYaml } from '../route/route-yaml';
import { generateSkill, SkillGenerateError, type GeneratedSkill, type RewriteFile, type SkillInputs } from './generate';
import { REWRITE_DIR, SKILL_SOURCE_DIR } from './index';

/**
 * M8 的磁盘读取（架构 §16.3、§16.4）：把生成器要的输入从仓库里读出来，再读入库的生成物目录。
 * 构建集成（integration.ts）和开发脚本（scripts/build-skill.mjs，经 Vite 的 runnerImport 加载）共用。
 * 不引用 src/lib/site.ts：它依赖 astro:content，Astro 之外加载不了（§16.11 R1）。
 */

/** 读齐生成订阅 Skill 的全部输入。 */
export function loadSkillInputs(repoRoot: string): SkillInputs {
  const contentRoot = join(repoRoot, 'src', 'content');
  const index = createLinkIndex(contentRoot);
  const templateFile = join(repoRoot, SKILL_SOURCE_DIR, 'SKILL.md');
  if (!existsSync(templateFile)) {
    throw new SkillGenerateError([{ file: `${SKILL_SOURCE_DIR}/SKILL.md`, message: '缺少 SKILL.md 模板' }]);
  }
  const principles: PrincipleEntry[] = index.pages
    .filter((page) => page.kind === 'principle')
    .map((page) => {
      const parsed = parseFrontmatter(readFileSync(page.file, 'utf8'), { frontmatter: 'empty-with-spaces' });
      return { id: page.id, body: parsed.content, data: principleData(parsed.frontmatter as Record<string, unknown>) };
    });
  const route = assembleRoute(parseRouteYaml(readFileSync(join(contentRoot, 'route.yaml'), 'utf8')), principles);
  const referencesDir = join(repoRoot, SKILL_SOURCE_DIR, 'references');
  return {
    rewrite: listFiles(join(repoRoot, REWRITE_DIR))
      .filter((path) => path.endsWith('.md'))
      .map((path): RewriteFile => ({ path: `${REWRITE_DIR}/${path}`, text: readFileSync(join(repoRoot, REWRITE_DIR, path), 'utf8') })),
    pages: index.pages.map(({ kind, id, title }) => ({ kind, id, title })),
    blogLinks: index.blogLinks,
    route: route.data,
    template: readFileSync(templateFile, 'utf8'),
    sourceReferences: listFiles(referencesDir).map((name) => ({ name, text: readFileSync(join(referencesDir, name), 'utf8') })),
    version: (JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as { version: string }).version,
    group: { number: GROUP_NUMBER, url: GROUP_URL },
  };
}

/** 读输入并生成：`npm run skill` 和构建校验都走这一条 */
export function generateFromRepo(repoRoot: string): GeneratedSkill {
  return generateSkill(loadSkillInputs(repoRoot));
}

/**
 * 读一个目录下的全部文件（递归，跳过点开头的文件和目录）：相对路径（`/` 分隔）→ 文本，换行统一成 `\n`。
 * 目录不存在时为空。
 */
export function readSkillDir(dir: string): Map<string, string> {
  return new Map(listFiles(dir).map((path) => [path, readFileSync(join(dir, path), 'utf8').replace(/\r\n?/g, '\n')]));
}

/**
 * 路线装配只要这几个字段。frontmatter 的形状由内容集合的 schema 校验（构建时报错更清楚），
 * 这里不重复校验，写错时按缺省处理，交给站点构建报出来。
 */
function principleData(frontmatter: Record<string, unknown>): PrincipleEntry['data'] {
  const options = frontmatter['options'];
  return {
    principleOnly: frontmatter['principleOnly'] === true,
    skippable: frontmatter['skippable'] === true,
    ...(typeof frontmatter['skipLabel'] === 'string' && { skipLabel: frontmatter['skipLabel'] }),
    ...(options !== null && typeof options === 'object' && { options: options as Record<string, { title: string }> }),
  };
}

/** 目录下全部文件的相对路径（递归、已排序）；目录不存在时为空 */
function listFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.isFile()) out.push(prefix + entry.name);
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
