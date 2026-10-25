import { getCollection, type CollectionEntry } from 'astro:content';
import routeText from '../content/route.yaml?raw';
import { scanHeadings } from './content/headings';
import { buildRouteMap, movedEntries, RouteValidationError } from './route/route-map';
import { parseRouteYaml } from './route/route-yaml';
import type { ForkId, OptionId, PageId, PageMeta, RouteMap, RouteSpecMovedTarget, Stop } from './route/types';
import { sectionAnchor, type AnchorHeading } from './section-anchor';
import { loadUpdateLog } from './update-log/load';
import type { ResolvedUpdateEntry } from './update-log';

/**
 * 构建时装配（架构 §3 M3）：读取 M1 的内容集合和 route.yaml，交给 M2 编译成 RouteMap。
 * 页面都从 `loadSite()` 取数据；M2 不引用 M1 的类型，两边的形状在这里映射。
 */

/** 一个步骤页或选择页：v3 起只有一版正文（实施计划 §3.1），元数据写在 frontmatter 里 */
export interface SitePage {
  id: string;
  title: string;
  principle: CollectionEntry<'principle'>;
}

/** 参考页（IP 质量实测合集、各篇实测），只有一版正文 */
export interface SiteReference {
  id: string;
  title: string;
  entry: CollectionEntry<'reference'>;
}

/** 页面需要的全部构建时数据。 */
export interface Site {
  route: RouteMap;
  /** 路线的第一页（前言）：首页的“开始”指向它 */
  start: Stop;
  /** 按标识查找 */
  pages: ReadonlyMap<string, SitePage>;
  /** 按标识查找：`ip-tests`、`ip-tests/<id>` */
  references: ReadonlyMap<string, SiteReference>;
  /** 目录里列在“日常维护”章末尾的参考页：IP 质量实测合集（design §4.5、实施计划 §3.1） */
  tocReferences: TocReference[];
  /** 参考页在目录里挂在哪一章末尾（实施计划 §3.1：`TOC_REFERENCES` 挂在 `maintenance` 章末） */
  referenceChapter: { id: string; title: string };
  /** 跳转表的旧网址（FR-25、ADR-0006）：每个旧标识生成一页，不进目录、搜索和 sitemap */
  moved: MovedPage[];
  /**
   * 更新日志（M7，v0.13、FR-80–FR-89）：`src/content/update-log.yaml` 的全部条目，**未排序**，
   * 每次要用时交给 src/lib/update-log 的 entriesOf()/latestEntries() 按分类和日期排。
   * 条目里 `page` 已经解析出页面标题。它不进路线图，也不进目录、站内搜索和上一步/下一步。
   */
  updateLog: ResolvedUpdateEntry[];
}

/** 跳转的去向：构建时算好目标页标题和原理版小节锚点。 */
export interface MovedTarget {
  to: PageId;
  /** 目标页标题，写进“这一页已经并入《…》” */
  toTitle: string;
  /** `route.yaml` 里写的小节标题原文 */
  section?: string;
  /** 小节在目标页原理版正文里的 slug；没有 `section` 时跳到页顶 */
  anchor?: string;
}

/**
 * 一个旧网址的跳转页（FR-25、ADR-0006）。
 * 有 `choice` 时这些字段是兜底去向（没选过、读不到本机选择或没有 JS 时用），各选项的去向在 `choice.options`。
 */
export interface MovedPage extends MovedTarget {
  /** 旧网址：页面标识，或 `faq/<id>` 这类旧参考页路径；仍然生成一页，但不能分给新页面 */
  from: string;
  /** 按读者在 `fork` 上的选择分流（V11 的手机相关旧页） */
  choice?: { fork: ForkId; options: Record<OptionId, MovedTarget> };
}

export interface TocReference {
  id: string;
  title: string;
}

/** 目录里列在“日常维护”章末尾的参考页，按这个顺序（实施计划 §3.1：常见问题并进各章后只留实测） */
const TOC_REFERENCES = ['ip-tests'];
/** 参考页挂在目录的哪一章末尾（章标识，见 route.yaml） */
const REFERENCE_CHAPTER_ID = 'maintenance';

/** 只取映射需要的字段，单元测试可以直接传普通对象。 */
export type PrincipleEntry = Pick<CollectionEntry<'principle'>, 'id' | 'body'> & {
  data: Pick<CollectionEntry<'principle'>['data'], 'principleOnly' | 'skippable' | 'skipLabel' | 'options'>;
};

/**
 * 页面标题：正文第一个非空行的 `# 标题`（架构 §3 M1）。缺标题由构建开始时的内容校验（checkPages）报错，
 * 这里只在绕过那一层时兜底。
 */
export function pageTitle(body: string | undefined, file: string): string {
  const first = (body ?? '').split('\n').find((line) => line.trim() !== '');
  const match = first === undefined ? null : /^# +(.+?)[ \t]*$/.exec(first);
  if (!match) throw new Error(`${file}：缺少第一行标题“# 页面标题”`);
  return match[1]!;
}

/**
 * 把原理版条目映射成 M2 的输入并编译。路线图有错时抛出 `RouteValidationError`（第三层校验，FR-61），
 * 它的 message 每行一条“文件：说明”，构建输出里直接可读。
 */
export function assembleRoute(spec: unknown, entries: readonly PrincipleEntry[]): RouteMap {
  const pages: PageMeta[] = entries.map(({ id, body, data }) => ({
    id,
    title: pageTitle(body, `src/content/principle/${id}.md`),
    principleOnly: data.principleOnly,
    skippable: data.skippable,
    ...(data.skipLabel !== undefined && { skipLabel: data.skipLabel }),
    // 对象键按书写顺序；选项标识以字母开头，不会被 JS 按整数键重排（schemas.ts ID_PATTERN）。
    ...(data.options !== undefined && { options: Object.entries(data.options).map(([option, { title }]) => ({ id: option, title })) }),
  }));
  return buildRouteMap(spec, pages);
}

/** 路线的第一页。路线图校验保证第一项是普通页面。 */
export function startOf(route: RouteMap): Stop {
  const first = route.data.chapters[0]?.items[0];
  if (first?.kind !== 'step') throw new Error('route.yaml：路线图的第一项必须是普通页面');
  return route.view(first.id, {}, 'principle').current;
}

/**
 * 把 `route.yaml` 的跳转表编译成跳转页（FR-25、ADR-0006）：`to` 的页面标题取自路线图，
 * `section` 用 M1 的小标题扫描按标题文字找 slug（V07 的 `sectionAnchor`），认 h2 和 h3
 * （常见问题并进各章后是一问一个 h3，实施计划 §3.1）。
 * 目标页或小节不存在时构建失败。
 */
export function buildMovedPages(
  spec: unknown,
  route: RouteMap,
  headingsOf: (id: PageId) => readonly AnchorHeading[] | undefined,
  /** 现有的参考页路径（`faq/<id>`）：旧网址不能和它们同址 */
  existingPaths: ReadonlySet<string> = new Set(),
): MovedPage[] {
  return movedEntries(spec).map(({ from, to, section, choice }): MovedPage => {
    if (existingPaths.has(from)) {
      throw new Error(`route.yaml：moved.${from} 和现有的页面同址（${from}），旧网址不能再分给现有的页面或参考页`);
    }
    const where = `moved.${from}`;
    const fallback = resolveMovedTarget(where, { to, ...(section !== undefined && { section }) }, route, headingsOf);
    if (choice === undefined) return { from, ...fallback };
    const options: Record<OptionId, MovedTarget> = {};
    for (const [option, target] of Object.entries(choice.options)) {
      options[option] = resolveMovedTarget(`${where}.choice.options.${option}`, target, route, headingsOf);
    }
    return { from, ...fallback, choice: { fork: choice.fork, options } };
  });
}

/** 选择页末尾选项卡片的锚点；卡片不在导入的正文里，由 ChoiceCards.astro 输出这个 id。 */
const NEXT_STEP_ANCHOR = '下一步';

/** 把一条去向解析成目标页标题和小节锚点；目标页或小节不存在时构建失败。 */
function resolveMovedTarget(
  where: string,
  { to, section }: RouteSpecMovedTarget,
  route: RouteMap,
  headingsOf: (id: PageId) => readonly AnchorHeading[] | undefined,
): MovedTarget {
  const target = route.data.pages[to];
  if (target === undefined) throw new Error(`route.yaml：${where} 的 to（${to}）不是路线图里的页面`);
  if (section === undefined) return { to, toTitle: target.title };
  // 选择页的选项卡片不是导入正文里的标题（ChoiceCards 挂在正文末尾，带 id="下一步"），
  // 但旧“选择手机系统”和手机旧页的兜底都要落在这些卡片上（实施计划 §3.1），所以单独认这一个锚点。
  if (section === NEXT_STEP_ANCHOR && Object.values(route.data.forks).some((fork) => fork.page === to)) {
    return { to, toTitle: target.title, section, anchor: NEXT_STEP_ANCHOR };
  }
  const sections = (headingsOf(to) ?? []).filter((heading) => heading.depth === 2 || heading.depth === 3);
  const anchor = sectionAnchor(sections, section);
  if (anchor === undefined) {
    throw new Error(`route.yaml：${where}.section 写的“${section}”在 ${to} 的原理版正文里找不到唯一的小标题（h2 或 h3）`);
  }
  return { to, toTitle: target.title, section, anchor };
}

/**
 * 站内搜索的页面顺序（架构 §13.2）：路线图里的全部页面——步骤、选择页和分叉的各个选项——
 * 按目录顺序排，旁支页不在章里，跟在最后。共享步骤出现在同一分叉段的多个选项里时
 * 只算第一次（首次出现的顺序就是目录顺序），调用方用下标作 `order`。
 */
export function searchPageIds(route: RouteMap): PageId[] {
  const ids: PageId[] = [];
  const seen = new Set<PageId>();
  const add = (id: PageId) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const chapter of route.data.chapters) {
    for (const item of chapter.items) {
      if (item.kind === 'branch') {
        for (const steps of Object.values(item.options)) for (const step of steps) add(step);
      } else {
        add(item.id);
      }
    }
  }
  for (const id of Object.keys(route.data.side)) add(id);
  return ids;
}

/** 站内搜索保留的参考页是 IP 质量实测合集和各篇实测；常见问题并进各章后没有独立页面（实施计划 §3.1）。 */
const SEARCH_REFERENCE_ROOT = 'ip-tests';

/**
 * 站内搜索的参考页顺序：合集在前，各篇实测按标识排序，跟在路线图的页面后面。
 * 跳转页（V09 的 `moved:`）和常见问题不在这里，因此不会进索引。
 */
export function searchReferences<T extends { id: string }>(references: ReadonlyMap<string, T>): T[] {
  return [...references.values()]
    .filter((reference) => reference.id === SEARCH_REFERENCE_ROOT || reference.id.startsWith(`${SEARCH_REFERENCE_ROOT}/`))
    .sort((a, b) => {
      if (a.id === SEARCH_REFERENCE_ROOT) return -1;
      if (b.id === SEARCH_REFERENCE_ROOT) return 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

/** 参考页挂在目录里的那一章（`route.yaml` 的 `maintenance`）：标题用于参考页的眉题 */
function referenceChapterOf(route: RouteMap): { id: string; title: string } {
  const chapter = route.data.chapters.find((entry) => entry.id === REFERENCE_CHAPTER_ID);
  if (chapter === undefined) {
    throw new Error(`route.yaml：缺少参考页所属的章节 ${REFERENCE_CHAPTER_ID}（实施计划 §3.1）`);
  }
  return { id: chapter.id, title: chapter.title };
}

let cached: Promise<Site> | undefined;

/**
 * 读取并编译全站数据。构建时一次构建只算一次；开发服务器里每次重新读取，改了内容不用重启。
 */
export function loadSite(): Promise<Site> {
  if (!import.meta.env.PROD) return readSite();
  return (cached ??= readSite());
}

async function readSite(): Promise<Site> {
  const [principles, references] = await Promise.all([getCollection('principle'), getCollection('reference')]);

  let spec: unknown;
  let route: RouteMap;
  try {
    spec = parseRouteYaml(routeText);
    route = assembleRoute(spec, principles);
  } catch (error) {
    // Astro 打印带 `errors` 数组的异常时只输出每项的 message，会丢掉“文件：”前缀，所以换成普通 Error 抛出。
    if (error instanceof RouteValidationError) throw new Error(error.message);
    throw error;
  }
  const referenceById = new Map(
    references.map((entry) => [entry.id, { id: entry.id, title: pageTitle(entry.body, `src/content/reference/${entry.id}.md`), entry }]),
  );
  // 跳转表的 section 用 M1 的小标题扫描（和双链解析同一套规则，架构 §13.4）。直接扫内容集合里的正文：
  // Astro 构建把页面代码打包到 <outDir>/.prerender/ 再执行，不能靠 import.meta.url 找 src/content。
  const principleHeadings = new Map(principles.map((entry) => [entry.id, scanHeadings(entry.body ?? '')]));
  return {
    route,
    start: startOf(route),
    moved: buildMovedPages(spec, route, (id) => principleHeadings.get(id), new Set(referenceById.keys())),
    pages: new Map(
      principles.map((entry) => [entry.id, { id: entry.id, title: route.data.pages[entry.id]!.title, principle: entry }]),
    ),
    references: referenceById,
    tocReferences: TOC_REFERENCES.map((id) => {
      const reference = referenceById.get(id);
      if (!reference) throw new Error(`src/content/reference/${id}.md：缺少目录要列出的参考页`);
      return { id, title: reference.title };
    }),
    referenceChapter: referenceChapterOf(route),
    // 更新日志（M7）：page 要按页面标题解析，所以放在路线图和参考页都读出来之后（FR-83、FR-86）。
    // 可以指向路线图里的页面，也可以指向参考页（如 ip-tests），不能指向跳转页。
    updateLog: loadUpdateLog(
      new Map([
        ...Object.entries(route.data.pages).map(([id, page]): [string, string] => [id, page.title]),
        ...[...referenceById.values()].map((reference): [string, string] => [reference.id, reference.title]),
      ]),
      todayOfBuild(),
    ),
  };
}

/** 构建当天的日期（本地时区），用于更新日志“不能写未来日期”的校验（FR-86） */
function todayOfBuild(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}