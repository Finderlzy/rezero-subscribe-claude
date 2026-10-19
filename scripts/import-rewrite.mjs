#!/usr/bin/env node
// 开发脚本（#23，ADR-0005、架构 §3 M1）：把重写稿的正文原样导入 src/content/ 的 v2 内容集合。
//
// 用法：node scripts/import-rewrite.mjs [重写稿目录，默认 docs/rewrite]
//
// 规则：
// - 按标题匹配：站内 principle/*.md、reference/**/*.md 正文第一行的 `# 标题` 对应重写稿 `原理版/<标题>.md`。
//   保留站内文件的 frontmatter，正文整段换成重写稿原文（只把 Windows 换行统一成 \n）。
// - 操作版跟随原理版：重写稿有 `操作版/<标题>.md` 时写入 operation/<同一标识>.md（操作版不写 frontmatter，
//   标识由原理版决定，所以缺的操作版文件直接新建）。
// - 重写稿有、站内没有的页面（新页面）和站内有、重写稿没有的页面只报告：新页面要先手建
//   principle/<id>.md（frontmatter + `# 标题`）并在 route.yaml 放好位置，再重跑脚本。
// - 常见问题一问一页（FR-20）：《常见问题》是目录，每条问题是原理版里的一个文件，导入到 reference/faq/<id>.md
//   （和别的参考页一样按标题匹配）。文件名是标识（URL /faq/<id>/，ADR-0002），第一行的 # 标题对应重写稿文件名，
//   这就是标题和标识的唯一对应；构建时 link-index 的 checkFaqItems 核对每条都列在常见问题里。
//   《常见问题》链到、站内还没有的条目单独报告：先手建 reference/faq/<英文标识>.md（只写 `# 标题`），再重跑。
// - 正文嵌入的图片，src/assets/screenshots/ 里没有的从重写稿的 `附件/` 复制过去；不判断是否打码，
//   新复制的截图要逐张核对（三级边界 Never）。说明图（`.svg`，design §4.7）复制到 src/assets/diagrams/，
//   附件里的就是原稿，所以内容变了也覆盖。
// - 不改 route.yaml；内容没变的文件不重写，连跑两次第二次没有改动。

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 重写稿的目录页，不导入（原理版目录变成首页，纯操作版目录不单独成页） */
export const TABLE_OF_CONTENTS = ['如何订阅claude', '如何订阅claude（纯操作版）'];

/** 常见问题首页的标题：它是各条问题的目录（FR-20） */
const FAQ_TITLE = '常见问题';
/** 双链的目标标题（去掉 `#小标题` 和 `|显示文字`），不含嵌入 `![[…]]` */
const WIKI_LINK = /(?<!!)\[\[([^[\]|#\n]+)(?:#[^[\]|\n]*)?(?:\|[^[\]\n]*)?\]\]/g;
const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
const EMBED = /!\[\[([^[\]|\n]+)(?:\|[^[\]\n]*)?\]\]/g;

/** 统一换行，拆出 frontmatter 块（含结尾换行）和正文 */
export function splitFrontmatter(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  const match = FRONTMATTER.exec(normalized);
  return match ? { frontmatter: match[0], body: normalized.slice(match[0].length) } : { frontmatter: '', body: normalized };
}

/** 正文第一个非空行的 `# 标题`；没有时为 undefined */
export function readTitle(text) {
  const { body } = splitFrontmatter(text);
  const first = body.split('\n').find((line) => line.trim() !== '');
  return first === undefined ? undefined : /^# +(.+?)[ \t]*$/.exec(first)?.[1];
}

function listMarkdown(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .flatMap((entry) => {
      if (entry.isDirectory()) return listMarkdown(join(dir, entry.name), `${prefix}${entry.name}/`);
      return entry.isFile() && extname(entry.name) === '.md' ? [`${prefix}${entry.name}`] : [];
    })
    .sort();
}

/** 只在内容变化时写入；返回是否写了 */
function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, 'utf8') === text) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return true;
}

/**
 * 执行导入，返回报告（路径都相对 repoRoot）。
 * @param {{ repoRoot: string, rewriteDir: string }} options
 */
export function importRewrite({ repoRoot, rewriteDir }) {
  const contentRoot = join(repoRoot, 'src', 'content');
  const screenshotsDir = join(repoRoot, 'src', 'assets', 'screenshots');
  const diagramsDir = join(repoRoot, 'src', 'assets', 'diagrams');
  const principleSrc = join(rewriteDir, '原理版');
  const operationSrc = join(rewriteDir, '操作版');
  const attachments = join(rewriteDir, '附件');
  const rel = (file) => relative(repoRoot, file).split('\\').join('/');
  /** @type {{ written: string[], unchanged: number, newPages: string[], newFaqItems: string[], orphans: string[], untitled: string[], copied: string[], missingImages: string[], droppedFrontmatter: string[] }} */
  const report = { written: [], unchanged: 0, newPages: [], newFaqItems: [], orphans: [], untitled: [], copied: [], missingImages: [], droppedFrontmatter: [] };

  /** 重写稿正文：去掉 Obsidian 属性（frontmatter 不属于正文，报告出来） */
  const rewriteBody = (file) => {
    const { frontmatter, body } = splitFrontmatter(readFileSync(file, 'utf8'));
    if (frontmatter !== '') report.droppedFrontmatter.push(rel(file));
    return body;
  };
  const embeds = new Set();
  const importBody = (target, body) => {
    for (const m of body.matchAll(EMBED)) embeds.add(m[1].trim());
    const keep = existsSync(target) ? splitFrontmatter(readFileSync(target, 'utf8')).frontmatter : '';
    if (writeIfChanged(target, keep + body)) report.written.push(rel(target));
    else report.unchanged += 1;
  };

  // 站内页面：原理版和参考页按标题对应重写稿的原理版文件
  const matched = new Set();
  const principleIds = new Map(); // 标题 → 原理版标识（操作版跟随）
  for (const kind of ['principle', 'reference']) {
    for (const name of listMarkdown(join(contentRoot, kind))) {
      const target = join(contentRoot, kind, name);
      const title = readTitle(readFileSync(target, 'utf8'));
      if (title === undefined) {
        report.untitled.push(rel(target));
        continue;
      }
      const source = join(principleSrc, `${title}.md`);
      if (!existsSync(source)) {
        report.orphans.push(`${rel(target)}（重写稿里没有“原理版/${title}.md”）`);
        continue;
      }
      matched.add(title);
      if (kind === 'principle') principleIds.set(title, name.slice(0, -'.md'.length));
      importBody(target, rewriteBody(source));
    }
  }

  // 操作版：跟随同标题的原理版
  const operationMatched = new Set();
  for (const [title, id] of principleIds) {
    const source = join(operationSrc, `${title}.md`);
    const target = join(contentRoot, 'operation', `${id}.md`);
    if (existsSync(source)) {
      operationMatched.add(title);
      importBody(target, rewriteBody(source));
    } else if (existsSync(target)) {
      report.orphans.push(`${rel(target)}（重写稿里没有“操作版/${title}.md”）`);
    }
  }
  const operationIds = new Set(principleIds.values());
  for (const name of listMarkdown(join(contentRoot, 'operation'))) {
    if (!operationIds.has(name.slice(0, -'.md'.length))) report.orphans.push(`${rel(join(contentRoot, 'operation', name))}（没有对应的原理版页面）`);
  }

  // 重写稿里的新页面；《常见问题》链到的新条目单列（它们进 reference/faq/，不进 route.yaml）
  const faqIndex = join(principleSrc, `${FAQ_TITLE}.md`);
  const faqTitles = new Set(existsSync(faqIndex) ? [...readFileSync(faqIndex, 'utf8').matchAll(WIKI_LINK)].map((m) => m[1].trim()) : []);
  for (const [dir, seen] of [
    [principleSrc, matched],
    [operationSrc, operationMatched],
  ]) {
    for (const name of listMarkdown(dir)) {
      const title = basename(name, '.md');
      if (TABLE_OF_CONTENTS.includes(title) || seen.has(title)) continue;
      if (dir === principleSrc && faqTitles.has(title)) report.newFaqItems.push(rel(join(dir, name)));
      else report.newPages.push(rel(join(dir, name)));
    }
  }

  // 截图只复制缺的（站内的可能是打码后的版本）；说明图跟着附件里的原稿更新
  for (const name of [...embeds].sort()) {
    const diagram = extname(name).toLowerCase() === '.svg';
    const target = join(diagram ? diagramsDir : screenshotsDir, name);
    if (!diagram && existsSync(target)) continue;
    const source = join(attachments, name);
    if (!existsSync(source)) {
      if (!existsSync(target)) report.missingImages.push(name);
      continue;
    }
    if (diagram) {
      if (writeIfChanged(target, readFileSync(source, 'utf8'))) report.copied.push(rel(target));
    } else {
      mkdirSync(screenshotsDir, { recursive: true });
      copyFileSync(source, target);
      report.copied.push(rel(target));
    }
  }
  return report;
}

function printReport(report) {
  const section = (title, items) => {
    if (items.length === 0) return;
    console.log(`\n${title}（${items.length}）：`);
    for (const item of items) console.log(`  ${item}`);
  };
  console.log(`导入完成：写入 ${report.written.length} 个文件，${report.unchanged} 个没有变化。`);
  section('写入', report.written);
  section('重写稿里的新页面（先手建 principle/<id>.md 并放进 route.yaml，再重跑）', report.newPages);
  section('《常见问题》里的新条目（先手建 src/content/reference/faq/<英文标识>.md，只写一行 # 标题，再重跑；标识也是 URL，发布后不能改）', report.newFaqItems);
  section('站内有、重写稿里没有的页面（由作者决定是否删除）', report.orphans);
  section('站内文件缺少第一行的 # 标题，无法匹配', report.untitled);
  section('重写稿文件带 frontmatter，导入时已去掉', report.droppedFrontmatter);
  section('新复制的截图和更新的说明图：截图请逐张核对打码，记进 docs/migration-checklist.md', report.copied);
  section('附件里也找不到的图：截图请作者提供打码后的文件，放进 src/assets/screenshots/；说明图放进重写稿的附件/', report.missingImages);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const repoRoot = resolve(import.meta.dirname, '..');
  const rewriteDir = resolve(process.argv[2] ?? join(repoRoot, 'docs', 'rewrite'));
  if (!existsSync(join(rewriteDir, '原理版'))) {
    console.error(`找不到重写稿：${join(rewriteDir, '原理版')}`);
    process.exit(1);
  }
  printReport(importRewrite({ repoRoot, rewriteDir }));
}
