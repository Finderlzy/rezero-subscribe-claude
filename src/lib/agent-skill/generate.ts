import { createHash } from 'node:crypto';
import { convertRelativeLinks, splitFrontmatter } from '../../../scripts/import-rewrite.mjs';
import { scanHeadings } from '../content/headings';
import { BLOG_PREFIX, HOME_TARGETS } from '../content/remark-obsidian';
import type { RouteData } from '../route/types';
import { hashFragment, resolveSectionAnchor, type AnchorHeading } from '../section-anchor';
import { REWRITE_DIR, SKILL_SITE, SKILL_SOURCE_DIR } from './index';

/**
 * M8 生成器（架构 §16.3，ADR-0007）：从重写稿、链接索引、路线图和手写源稿生成订阅 Skill 的全部文件。
 * 纯函数，不读写磁盘（磁盘在 load.ts）；同样的输入得到逐字节相同的输出。
 * 不引用 src/lib/site.ts（它依赖 astro:content，§16.11 R1）。
 */

/** 一个重写稿文件：`path` 是仓库相对路径（`/` 分隔），如 `docs/v3-rewrite/00-前言.md` */
export interface RewriteFile {
  path: string;
  text: string;
}

/** 链接索引里的一个站内页面（`createLinkIndex()` 的 pages） */
export interface SkillPage {
  kind: 'principle' | 'reference';
  id: string;
  title: string | undefined;
}

export interface SkillInputs {
  /** `docs/v3-rewrite/` 下全部 `.md`（含 `reference/`），用来找标题和算锚点；只有 11 页和实测合集生成参考文件 */
  rewrite: readonly RewriteFile[];
  /** 站内页面：重写稿按第一行 `# 标题` 在这里找页面标识（和 import-rewrite.mjs 同一规则） */
  pages: readonly SkillPage[];
  /** `blog-links.yaml`：博客双链目标 → 地址，没有地址时为 null */
  blogLinks: ReadonlyMap<string, string | null>;
  /** 路线图（`assembleRoute().data`）：写 `SKILL.md` 的路线表 */
  route: RouteData;
  /** `agent-skill/source/SKILL.md` 模板原文 */
  template: string;
  /** `agent-skill/source/references/` 下的方法文件，原样复制；文件名要以 `agent-` 开头 */
  sourceReferences: readonly { name: string; text: string }[];
  /** `package.json` 的 version */
  version: string;
  /** `src/lib/group.ts` 的群号和加群链接 */
  group: { number: string; url: string };
}

/** 一条生成问题：`file` 是仓库相对路径 */
export interface SkillProblem {
  file: string;
  line?: number;
  message: string;
}

export function formatSkillProblem({ file, line, message }: SkillProblem): string {
  return `${file}${line === undefined ? '' : `:${line}`}：${message}`;
}

/** 生成失败：`problems` 逐条是“文件：说明” */
export class SkillGenerateError extends Error {
  readonly problems: readonly SkillProblem[];
  constructor(problems: readonly SkillProblem[]) {
    super(problems.map(formatSkillProblem).join('\n'));
    this.name = 'SkillGenerateError';
    this.problems = problems;
  }
}

export interface GeneratedSkill {
  /** 相对生成物目录的路径（如 `SKILL.md`、`references/preface.md`）→ 文本，按路径排序 */
  files: ReadonlyMap<string, string>;
  /** 同样的键 → 它的源文件（仓库相对路径），报“对不上”时指出要看哪个文件 */
  sources: ReadonlyMap<string, string>;
}

/** 除 11 页以外也生成参考文件的参考页（FR-101：IP 质量实测合集） */
export const SKILL_REFERENCE_PAGES: readonly string[] = ['ip-tests'];

/** 模板认识的占位（§16.3） */
export const TEMPLATE_PLACEHOLDERS = ['version', 'rewrite', 'route', 'group', 'site'] as const;

const TEMPLATE_FILE = `${SKILL_SOURCE_DIR}/SKILL.md`;
const VIDEO_EXTENSION = /\.(?:mp4|webm|mov|m4v)$/i;
/** 和 headings.ts 的扫描规则一致：ATX 标题、围栏代码块、第一行的页面标题 */
const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const TITLE = /^# +(.+?)[ \t]*$/;
const CALLOUT = /^>[ \t]*\[!([A-Za-z]+)\][+-]?[ \t]*(.*)$/;
const CALLOUT_LABELS: Readonly<Record<string, string>> = { caution: '注意', note: '说明' };
const TODO_START = /^TODO[：:][ \t]*/;
/** 双链和嵌入：`[[目标#小节|文字]]`、`![[文件|宽度]]`；表格里的竖线写成 `\|` */
const WIKI = /(!?)\[\[([^[\]\n]+?)\]\]/g;
/** 普通 Markdown 图片 `![说明](地址)` */
const IMAGE = /!\[[^\]\n]*\]\([^)\n]*\)/g;
/** 同页小节链接 `[文字](#小节)` */
const LOCAL_LINK = /(?<!!)\[([^\]\n]*)\]\((#[^)\s]*)\)/g;
/** 没转换掉的相对 Markdown 链接（目标里带空格或找不到文件） */
const LEFTOVER_RELATIVE = /(?<!!)\]\(([^)]*\.md)(?:#[^)]*)?\)/g;

const pageUrl = (id: string) => `${SKILL_SITE}/${id}/`;
const referenceFile = (id: string) => `references/${id}.md`;

/** 重写稿指纹（§16.3）：参与生成的源文件按路径排序、统一换行后的 SHA-256 前 12 位 */
export function rewriteFingerprint(files: readonly RewriteFile[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort((a, b) => compare(a.path, b.path))) {
    hash.update(`${file.path}\n${normalize(file.text)}\n`);
  }
  return hash.digest('hex').slice(0, 12);
}

/** 生成订阅 Skill。有任何问题时抛出 `SkillGenerateError`，列出全部问题。 */
export function generateSkill(inputs: SkillInputs): GeneratedSkill {
  const problems: SkillProblem[] = [];
  const pageOfTitle = new Map<string, SkillPage>();
  for (const page of inputs.pages) {
    if (page.title !== undefined && !pageOfTitle.has(page.title)) pageOfTitle.set(page.title, page);
  }

  // 全部重写稿：文件名 → 标题（相对链接用），标题 → 小标题（锚点按重写稿本身算，§16.11 R2）
  const drafts = inputs.rewrite.map((file) => {
    const { body }: { body: string } = splitFrontmatter(file.text);
    const title = TITLE.exec(body.split('\n').find((line) => line.trim() !== '') ?? '')?.[1];
    return { ...file, body, title, headings: scanHeadings(body) };
  });
  const titleOfFile = new Map<string, string>();
  const draftOfTitle = new Map<string, (typeof drafts)[number]>();
  for (const draft of drafts) {
    if (draft.title === undefined) continue;
    titleOfFile.set(baseName(draft.path), draft.title);
    if (!draftOfTitle.has(draft.title)) draftOfTitle.set(draft.title, draft);
  }

  // 参与生成的源文件：重写稿根目录的每一页，加 reference/ 里属于 SKILL_REFERENCE_PAGES 的参考页
  const sources: { draft: (typeof drafts)[number]; page: SkillPage }[] = [];
  for (const draft of drafts) {
    const inRoot = !draft.path.slice(REWRITE_DIR.length + 1).includes('/');
    if (draft.title === undefined) {
      if (inRoot) problems.push({ file: draft.path, line: 1, message: '缺少第一行标题“# 页面标题”' });
      continue;
    }
    const page = pageOfTitle.get(draft.title);
    if (inRoot) {
      if (page === undefined || page.kind !== 'principle') {
        problems.push({
          file: draft.path,
          message: `站内没有标题是“${draft.title}”的页面：新页面要先按导入流程建好 src/content/principle/<id>.md、放进 route.yaml，再运行 npm run skill`,
        });
        continue;
      }
      sources.push({ draft, page });
    } else if (page !== undefined && page.kind === 'reference' && SKILL_REFERENCE_PAGES.includes(page.id)) {
      sources.push({ draft, page });
    }
  }
  for (const id of SKILL_REFERENCE_PAGES) {
    if (!sources.some((source) => source.page.id === id)) {
      problems.push({ file: `${REWRITE_DIR}/reference/`, message: `找不到参考页 ${id} 的重写稿（按第一行 # 标题对应 src/content/reference/${id}.md）` });
    }
  }

  const files = new Map<string, string>();
  const fileSources = new Map<string, string>();
  for (const { draft, page } of sources) {
    const resolveTarget = (title: string) => {
      const target = draftOfTitle.get(title);
      const targetPage = pageOfTitle.get(title);
      return target === undefined || targetPage === undefined ? undefined : { id: targetPage.id, headings: target.headings };
    };
    const body = convertBody(draft.body, {
      file: draft.path,
      pageId: page.id,
      headings: draft.headings,
      titleOfFile,
      resolveTarget,
      blogLinks: inputs.blogLinks,
      problems,
    });
    const header = [`> 引导站：${pageUrl(page.id)}`, `> 本文件由 \`npm run skill\` 从 \`${draft.path}\` 生成，不要手改。`, '', ''].join('\n');
    files.set(referenceFile(page.id), `${header}${body.replace(/^\n+/, '').replace(/\n*$/, '\n')}`);
    fileSources.set(referenceFile(page.id), draft.path);
  }

  for (const { name, text } of inputs.sourceReferences) {
    const source = `${SKILL_SOURCE_DIR}/references/${name}`;
    if (!/^agent-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name)) {
      problems.push({ file: source, message: '方法文件名要写成 agent-<小写英文>.md，和页面参考文件区分开' });
      continue;
    }
    files.set(`references/${name}`, normalize(text));
    fileSources.set(`references/${name}`, source);
  }

  const values: Record<(typeof TEMPLATE_PLACEHOLDERS)[number], () => string> = {
    version: () => inputs.version,
    rewrite: () => rewriteFingerprint(sources.map(({ draft }) => draft)),
    route: () => routeTable(inputs.route, inputs.pages),
    group: () => `QQ 群 ${inputs.group.number}（加群链接：${inputs.group.url}）`,
    site: () => SKILL_SITE,
  };
  files.set('SKILL.md', fillTemplate(normalize(inputs.template), values, problems));
  fileSources.set('SKILL.md', TEMPLATE_FILE);

  if (problems.length > 0) throw new SkillGenerateError(problems);
  const keys = [...files.keys()].sort(compare);
  return { files: new Map(keys.map((key) => [key, files.get(key)!])), sources: new Map(keys.map((key) => [key, fileSources.get(key)!])) };
}

interface BodyContext {
  file: string;
  pageId: string;
  headings: readonly AnchorHeading[];
  titleOfFile: Map<string, string>;
  resolveTarget: (title: string) => { id: string; headings: readonly AnchorHeading[] } | undefined;
  blogLinks: ReadonlyMap<string, string | null>;
  problems: SkillProblem[];
}

/**
 * 把一页重写稿正文转成普通 Markdown（§16.3）：相对链接先统一成双链（R3），双链和同页小节链接换成完整网址，
 * 图片和视频换成“看图/看视频”行，h2/h3 下加小节网址，Callout 换成普通引用块，`TODO：` 段落标成作者待补。
 * 围栏代码块和行内代码原样保留（FR-101：命令逐字不变）。
 */
function convertBody(body: string, ctx: BodyContext): string {
  const linked = convertRelativeLinks(body, ctx.titleOfFile, ({ ok, whole, file }) => {
    if (!ok) ctx.problems.push({ file: ctx.file, message: `相对链接的目标没有对应的重写稿文件 ${file}（${whole}）` });
  });
  const lines = linked.split('\n');
  const first = lines.findIndex((line) => line.trim() !== '');
  const titleLine = first !== -1 && TITLE.test(lines[first]!) ? first : -1;
  const out: string[] = [];
  let fence: string | undefined;
  let headingNo = 0;
  let section = pageUrl(ctx.pageId);
  lines.forEach((line, i) => {
    const at = { file: ctx.file, line: i + 1 };
    const f = FENCE.exec(line);
    if (fence !== undefined) {
      if (f && f[1]![0] === fence[0] && f[1]!.length >= fence.length && line.trim() === f[1]) fence = undefined;
      out.push(line);
      return;
    }
    if (f) {
      fence = f[1];
      out.push(line);
      return;
    }
    if (i === titleLine) {
      out.push(line);
      return;
    }
    const heading = ATX_HEADING.exec(line);
    if (heading) {
      const scanned = ctx.headings[headingNo++];
      out.push(convertInline(line, section, ctx, at));
      const depth = heading[1]!.length;
      if (scanned !== undefined && (depth === 2 || depth === 3)) {
        section = `${pageUrl(ctx.pageId)}#${scanned.slug}`;
        out.push('', `> 引导站小节：${section}`);
        if ((lines[i + 1] ?? '').trim() !== '') out.push('');
      }
      return;
    }
    const callout = CALLOUT.exec(line);
    if (callout) {
      const label = CALLOUT_LABELS[callout[1]!.toLowerCase()];
      if (label === undefined) {
        ctx.problems.push({ ...at, message: `不认识的 Callout 类型 [!${callout[1]}]：只支持 ${Object.keys(CALLOUT_LABELS).join('、')}` });
        out.push(line);
        return;
      }
      const title = callout[2]!.trim();
      out.push(`> **${label}**${title === '' ? '' : `：${convertInline(title, section, ctx, at)}`}`);
      return;
    }
    const todo = TODO_START.exec(line);
    if (todo && (i === 0 || lines[i - 1]!.trim() === '')) {
      out.push(`作者待补：${convertInline(line.slice(todo[0].length), section, ctx, at)}`);
      return;
    }
    out.push(convertInline(line, section, ctx, at));
  });
  if (headingNo !== ctx.headings.length) {
    // 两处扫描规则不一致时锚点会错位：宁可失败，也不生成错的小节网址
    ctx.problems.push({ file: ctx.file, message: `小标题扫描对不上（${headingNo} / ${ctx.headings.length}），检查 headings.ts 和 generate.ts 的规则` });
  }
  return out.join('\n');
}

/** 一行里代码以外的部分：嵌入、双链、同页小节链接；行内代码原样保留 */
function convertInline(line: string, section: string, ctx: BodyContext, at: { file: string; line: number }): string {
  return line
    .split(/(`[^`\n]*`)/)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      // 网址后面紧跟着文字时空一格，免得被当成网址的一部分
      const pointer = (kind: string, rest: string) => `${kind}：${section}${/^[^\s]/.test(rest) ? ' ' : ''}`;
      let text = part.replace(IMAGE, (whole, offset: number, all: string) => pointer('看图', all.slice(offset + whole.length)));
      text = text.replace(WIKI, (whole, bang: string, inner: string, offset: number, all: string) => {
        if (bang === '!') {
          const name = splitPipe(inner)[0].trim();
          return pointer(VIDEO_EXTENSION.test(name) ? '看视频' : '看图', all.slice(offset + whole.length));
        }
        return convertWikiLink(whole, inner, ctx, at) ?? whole;
      });
      text = text.replace(LOCAL_LINK, (whole, label: string, hash: string) => {
        const fragment = hashFragment(hash);
        const anchor = fragment === undefined ? undefined : resolveSectionAnchor(ctx.headings, fragment);
        if (anchor === undefined) {
          ctx.problems.push({ ...at, message: `这一页里没有小标题“${fragment ?? ''}”：${whole}` });
          return whole;
        }
        return `[${label}](${pageUrl(ctx.pageId)}#${anchor})`;
      });
      for (const m of text.matchAll(LEFTOVER_RELATIVE)) {
        if (!/^[a-z]+:\/\//i.test(m[1]!)) ctx.problems.push({ ...at, message: `相对链接没有转换：${m[1]}（目标里有空格要写成 <…> 或百分号编码）` });
      }
      return text;
    })
    .join('');
}

/** 双链换成引导站的完整网址；目标找不到时记一条问题，返回 undefined（原样保留，交给残留检查） */
function convertWikiLink(whole: string, inner: string, ctx: BodyContext, at: { file: string; line: number }): string | undefined {
  const [targetRaw, label] = splitPipe(inner);
  const hashAt = targetRaw.indexOf('#');
  const target = (hashAt === -1 ? targetRaw : targetRaw.slice(0, hashAt)).trim();
  const heading = hashAt === -1 ? undefined : targetRaw.slice(hashAt + 1).trim();
  const fail = (message: string) => {
    ctx.problems.push({ ...at, message: `${message}：${whole}` });
    return undefined;
  };

  if (HOME_TARGETS.includes(target)) return `[${label ?? target.slice(target.lastIndexOf('/') + 1)}](${SKILL_SITE}/)`;
  if (target.startsWith(BLOG_PREFIX)) {
    if (!ctx.blogLinks.has(target)) return fail(`blog-links.yaml 里没有“${target}”`);
    const text = label ?? target.slice(BLOG_PREFIX.length);
    const url = ctx.blogLinks.get(target);
    return url == null ? text : `[${text}](${url})`;
  }
  // 同页的 `[[#小节]]`
  const resolved = target === '' ? { id: ctx.pageId, headings: ctx.headings } : ctx.resolveTarget(target);
  if (resolved === undefined) return fail(`找不到标题为“${target}”的重写稿或站内页面`);
  let url = pageUrl(resolved.id);
  if (heading !== undefined && heading !== '') {
    const anchor = resolveSectionAnchor(resolved.headings, heading);
    if (anchor === undefined) return fail(`“${target || '这一页'}”的重写稿里没有小标题“${heading}”`);
    url += `#${anchor}`;
  }
  const text = label ?? (heading ? `${target} > ${heading}` : target);
  return `[${text}](${url})`;
}

/** 按第一个竖线（含表格里的 `\|`）拆成目标和文字 */
function splitPipe(inner: string): [string, string | undefined] {
  const m = /^(.*?)\\?\|(.*)$/.exec(inner);
  return m ? [m[1]!, m[2]!] : [inner, undefined];
}

/** 替换模板的占位；不认识的占位、替换后还留着 `{{` 都记成问题 */
function fillTemplate(template: string, values: Record<string, () => string>, problems: SkillProblem[]): string {
  const lines = template.split('\n').map((line, i) =>
    line.replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (whole, name: string) => {
      const value = values[name];
      if (value === undefined) {
        problems.push({ file: TEMPLATE_FILE, line: i + 1, message: `不认识的占位 ${whole}：只能用 ${TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join('、')}` });
        return whole;
      }
      return value();
    }),
  );
  const filled = lines.join('\n');
  if (problems.every((p) => p.file !== TEMPLATE_FILE)) {
    filled.split('\n').forEach((line, i) => {
      if (line.includes('{{')) problems.push({ file: TEMPLATE_FILE, message: `生成后的 SKILL.md 第 ${i + 1} 行还留着“{{”：${line.trim()}` });
    });
  }
  return filled.replace(/\n*$/, '\n');
}

/**
 * 路线表（§16.3 `{{route}}`）：按目录顺序列出每一页的章、页面标识、标题、参考文件、引导站网址，
 * 以及它是哪个分叉点的选择页、属于哪个分叉点的哪个选项；表后另列 IP 质量实测合集这类参考页。
 */
export function routeTable(route: RouteData, pages: readonly SkillPage[]): string {
  const rows: string[] = ['| 章 | 页面标识 | 标题 | 参考文件 | 引导站 | 分叉 |', '| --- | --- | --- | --- | --- | --- |'];
  const optionTitle = (fork: string, option: string) => route.forks[fork]?.options.find((o) => o.id === option)?.title ?? option;
  const row = (chapter: string, id: string, fork: string) =>
    rows.push(`| ${chapter} | \`${id}\` | ${route.pages[id]?.title ?? id} | \`${referenceFile(id)}\` | ${pageUrl(id)} | ${fork} |`);
  for (const chapter of route.chapters) {
    for (const item of chapter.items) {
      if (item.kind === 'step') row(chapter.title, item.id, '—');
      else if (item.kind === 'choose') {
        const fork = route.forks[item.fork]!;
        const options = fork.options.map((o) => `\`${o.id}\`（${o.title}）`).join(' / ');
        const fallback = fork.default === undefined ? '' : `，推荐 \`${fork.default}\``;
        row(chapter.title, item.id, `选择页：分叉点 \`${item.fork}\`，选项 ${options}${fallback}`);
      } else {
        for (const [option, ids] of Object.entries(item.options)) {
          for (const id of ids) row(chapter.title, id, `分叉点 \`${item.fork}\` 选 \`${option}\`（${optionTitle(item.fork, option)}）时走`);
        }
      }
    }
  }
  const extras = SKILL_REFERENCE_PAGES.map((id) => {
    const title = pages.find((page) => page.kind === 'reference' && page.id === id)?.title ?? id;
    return `- ${title}：\`${referenceFile(id)}\`，引导站 ${pageUrl(id)}`;
  });
  return [...rows, '', '不在路线里、需要时再读的参考页：', '', ...extras].join('\n');
}

function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
