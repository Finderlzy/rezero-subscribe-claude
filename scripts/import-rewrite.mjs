#!/usr/bin/env node
// 开发脚本（#23 建立，ADR-0005、架构 §3 M1；V10 改成 v3 单版本）：把重写稿的正文原样导入 src/content/。
//
// 用法：node scripts/import-rewrite.mjs [重写稿目录，默认 docs/v3-rewrite]
//
// 规则（v3，实施计划 §3.1）：
// - 一章一页、只有一版：重写稿目录下的 `*.md`（不含 `reference/`）按第一行 `# 标题` 对应站内
//   `principle/<id>.md`。参考页在 `reference/` 子目录，按标题对应站内 `reference/**/*.md`。
// - 保留站内文件的 frontmatter，正文整段换成重写稿原文，只做三件事：统一换行、去掉重写稿的 frontmatter（报告出来）、
//   把指向同目录其他 `.md` 的相对 Markdown 链接换成双链（`[文字](02-….md)` → `[[目标页标题|文字]]`，
//   文字与标题相同时省略 `|`，`#小节` 原样保留）。同页的 `[文字](#小节)` 不动。
// - 重写稿有、站内没有的页面只报告：新页面要先手建 principle/<id>.md（frontmatter + `# 标题`），
//   放进 route.yaml，再重跑脚本。
// - 正文嵌入的图片，src/assets/screenshots/ 里没有的从重写稿的 `附件/` 复制过去；不判断是否打码，
//   新复制的截图要逐张核对（三级边界 Never）。说明图（`.svg`，design §4.7）复制到 src/assets/diagrams/，
//   附件里的就是原稿，所以内容变了也覆盖。
// - 不改 route.yaml；内容没变的文件不重写，连跑两次第二次没有改动。

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 正文视频（2026-10-23）：文件自己放在 public/videos/，不从附件复制、也不按截图去找 */
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

/** 重写稿里指向同目录文件的相对 Markdown 链接；`!` 开头的是图片嵌入，不算 */
const RELATIVE_LINK = /(?<!!)\[([^\]\n]*)\]\(([^)\s]+\.md)(#[^)\s]*)?\)/g;
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

function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.') && entry.isFile() && extname(entry.name) === '.md')
    .map((entry) => entry.name)
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
 * 把一段正文里的相对 Markdown 链接换成双链（V10）：目标按文件名查重写稿的标题。
 * 跳过围栏代码块和行内代码；查不到目标时不改这一处，交给 `badLinks` 报告。
 * @param {string} body
 * @param {Map<string, string>} titleOfFile 文件名（去掉 .md）→ 重写稿里的标题
 * @param {(link: { whole: string, label: string, file: string, ok: boolean }) => void} [onLink]
 */
export function convertRelativeLinks(body, titleOfFile, onLink = (_link) => {}) {
  const lines = body.split('\n');
  const out = [];
  let fence;
  for (const [lineNo, line] of lines.entries()) {
    const open = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence !== undefined) {
      out.push(line);
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length && line.trim() === open[1]) fence = undefined;
      continue;
    }
    if (open) {
      fence = open[1];
      out.push(line);
      continue;
    }
    // 表格行里的 `|` 会切开单元格，双链的竖线要写成 `\|`（remark-obsidian 支持，见表格用例）
    const inTable = /^\s*\|/.test(line);
    // 行内代码里的链接不转换：按反引号切开，只处理代码以外的片段
    out.push(
      line
        .split(/(`[^`\n]*`)/)
        .map((part, i) => {
          if (i % 2 === 1) return part;
          return part.replace(RELATIVE_LINK, (whole, label, file, fragment = '') => {
            const title = titleOfFile.get(basename(file, '.md'));
            if (title === undefined) {
              onLink({ whole, label, file, ok: false, line: lineNo + 1 });
              return whole;
            }
            onLink({ whole, label, file, ok: true, line: lineNo + 1 });
            const target = `${title}${fragment}`;
            const pipe = inTable ? '\\|' : '|';
            return label.trim() === title ? `[[${target}]]` : `[[${target}${pipe}${label}]]`;
          });
        })
        .join(''),
    );
  }
  return out.join('\n');
}

/**
 * 执行导入，返回报告（路径都相对 repoRoot）。
 * @param {{ repoRoot: string, rewriteDir: string }} options
 */
export function importRewrite({ repoRoot, rewriteDir }) {
  const contentRoot = join(repoRoot, 'src', 'content');
  const screenshotsDir = join(repoRoot, 'src', 'assets', 'screenshots');
  const diagramsDir = join(repoRoot, 'src', 'assets', 'diagrams');
  const attachments = join(rewriteDir, '附件');
  const referenceSrc = join(rewriteDir, 'reference');
  const rel = (file) => relative(repoRoot, file).split('\\').join('/');
  /** @type {{ written: string[], unchanged: number, newPages: string[], orphans: string[], untitled: string[], copied: string[], missingImages: string[], droppedFrontmatter: string[], badLinks: string[] }} */
  const report = { written: [], unchanged: 0, newPages: [], orphans: [], untitled: [], copied: [], missingImages: [], droppedFrontmatter: [], badLinks: [] };

  // 重写稿：新稿的文件名带编号（`00-前言.md`），所以按正文第一行的 # 标题对应站内页面；
  // 相对链接按文件名找标题，另记一份 文件名 → 标题。
  const sourceFiles = [...listMarkdown(rewriteDir).map((n) => join(rewriteDir, n)), ...listMarkdown(referenceSrc).map((n) => join(referenceSrc, n))];
  const sourceByTitle = new Map();
  const titleOfFile = new Map();
  for (const file of sourceFiles) {
    const title = readTitle(readFileSync(file, 'utf8'));
    if (title === undefined) continue;
    titleOfFile.set(basename(file, '.md'), title);
    sourceByTitle.set(title, file);
  }

  /** 重写稿正文：去掉 Obsidian 属性（frontmatter 不属于正文，报告出来），转换相对链接 */
  const rewriteBody = (file) => {
    const { frontmatter, body } = splitFrontmatter(readFileSync(file, 'utf8'));
    if (frontmatter !== '') report.droppedFrontmatter.push(rel(file));
    const converted = convertRelativeLinks(body, titleOfFile, ({ whole, file: target, ok, line }) => {
      if (!ok) report.badLinks.push(`${rel(file)}:${line} 链接目标没有对应的重写稿文件 ${target}（${whole}）`);
    });
    // 带空格的相对链接（`实测：Decodo ISP.md`）不匹配上面的规则，原样保留：明确报出来，别让它悄悄留在正文里
    converted.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/(?<!!)\]\(([^)]*\s[^)]*\.md)(?:#[^)]*)?\)/g)) {
        report.badLinks.push(`${rel(file)}:${i + 1} 相对链接的目标里有空格，Markdown 里要写成 <…> 或百分号编码：${m[1]}`);
      }
    });
    return converted;
  };
  const embeds = new Set();
  const importBody = (target, body) => {
    for (const m of body.matchAll(EMBED)) embeds.add(m[1].trim());
    const keep = existsSync(target) ? splitFrontmatter(readFileSync(target, 'utf8')).frontmatter : '';
    if (writeIfChanged(target, keep + body)) report.written.push(rel(target));
    else report.unchanged += 1;
  };

  // 站内页面：principle/ 和 reference/ 按标题对应重写稿（reference/ 取子目录，principle/ 取根目录）
  const matched = new Set();
  for (const [kind, sourceDir] of [
    ['principle', rewriteDir],
    ['reference', referenceSrc],
  ]) {
    for (const name of listMarkdownDeep(join(contentRoot, kind))) {
      const target = join(contentRoot, kind, `${name}.md`);
      const title = readTitle(readFileSync(target, 'utf8'));
      if (title === undefined) {
        report.untitled.push(rel(target));
        continue;
      }
      const source = sourceByTitle.get(title);
      if (source === undefined || !source.startsWith(sourceDir)) {
        report.orphans.push(`${rel(target)}（重写稿里没有标题是“${title}”的页面）`);
        continue;
      }
      matched.add(source);
      importBody(target, rewriteBody(source));
    }
  }

  // 重写稿有、站内没有的页面：只报告
  for (const file of sourceFiles) {
    if (!matched.has(file)) report.newPages.push(rel(file));
  }

  // 截图只复制缺的（站内的可能是打码后的版本）；说明图跟着附件里的原稿更新
  for (const name of [...embeds].sort()) {
    const extension = extname(name).toLowerCase();
    // 视频不复制也不找：它由作者（或代理）转成 mp4 后直接放进 public/videos/
    if (VIDEO_EXTENSIONS.has(extension)) continue;
    const diagram = extension === '.svg';
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

/** 目录下全部 .md 的相对路径（去掉 .md，用 / 分隔，已排序）；目录不存在时为空 */
function listMarkdownDeep(dir, prefix = '') {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...listMarkdownDeep(join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.isFile() && extname(entry.name) === '.md') out.push(prefix + basename(entry.name, '.md'));
  }
  return out.sort();
}

function printReport(report) {
  const section = (title, items) => {
    if (items.length === 0) return;
    console.log(`\n${title}（${items.length}）：`);
    for (const item of items) console.log(`  ${item}`);
  };
  console.log(`导入完成：写入 ${report.written.length} 个文件，${report.unchanged} 个没有变化。`);
  section('写入', report.written);
  section('重写稿里的新页面（先手建 principle/<id>.md、放进 route.yaml，再重跑）', report.newPages);
  section('站内有、重写稿里没有的页面（由作者决定是否删除）', report.orphans);
  section('站内文件缺少第一行的 # 标题，无法匹配', report.untitled);
  section('重写稿文件带 frontmatter，导入时已去掉', report.droppedFrontmatter);
  section('相对链接的目标找不到，按原样保留（要改重写稿的链接）', report.badLinks);
  section('新复制的截图和更新的说明图：截图请逐张核对打码，记进 docs/migration-checklist.md', report.copied);
  section('附件里也找不到的图：截图请作者提供打码后的文件，放进 src/assets/screenshots/；说明图放进重写稿的附件/', report.missingImages);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const repoRoot = resolve(import.meta.dirname, '..');
  const rewriteDir = resolve(process.argv[2] ?? join(repoRoot, 'docs', 'v3-rewrite'));
  if (!existsSync(rewriteDir)) {
    console.error(`找不到重写稿：${rewriteDir}`);
    process.exit(1);
  }
  const report = importRewrite({ repoRoot, rewriteDir });
  printReport(report);
  // 相对链接找不到目标时正文里会留下坏链接：让脚本失败，别让它悄悄进站点（FR-61）
  if (report.badLinks.length > 0) process.exit(1);
}
