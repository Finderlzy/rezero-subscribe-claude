import { getCollection, type CollectionEntry } from 'astro:content';
import { parseDocument } from 'yaml';
import routeText from '../content/route.yaml?raw';
import { buildRouteMap, RouteValidationError } from './route/route-map';
import type { PageId, PageMeta, RouteMap, Stop } from './route/types';

/**
 * 构建时装配（架构 §3 M3）：读取 M1 的三个内容集合和 route.yaml，交给 M2 编译成 RouteMap。
 * 页面都从 `loadSite()` 取数据；M2 不引用 M1 的类型，两边的形状在这里映射。
 */

/** 一个步骤、选择页或旁支页：两版正文同名（ADR-0004），元数据在原理版 */
export interface SitePage {
  id: string;
  title: string;
  principle: CollectionEntry<'principle'>;
  /** 原理独有步骤和还没写操作版的页面没有 */
  operation: CollectionEntry<'operation'> | undefined;
}

/** 参考页（常见问题、实测合集、各篇实测），只有一版正文 */
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
  /** 按标识查找：`faq`、`faq/<id>`、`ip-tests`、`ip-tests/<id>` */
  references: ReadonlyMap<string, SiteReference>;
  /** 目录里列在附录页下面的参考页：常见问题、IP 质量实测合集（design §4.5） */
  tocReferences: TocReference[];
}

export interface TocReference {
  id: string;
  title: string;
}

/** 目录里附录页下面的参考页，按这个顺序 */
const TOC_REFERENCES = ['faq', 'ip-tests'];

/** 只取映射需要的字段，单元测试可以直接传普通对象。 */
export type PrincipleEntry = Pick<CollectionEntry<'principle'>, 'id' | 'body'> & {
  data: Pick<CollectionEntry<'principle'>['data'], 'principleOnly' | 'skippable' | 'skipLabel' | 'options'>;
};

/** 解析 route.yaml 的文本。YAML 语法错误时报出文件和行号，形状交给 M2 校验。 */
export function parseRouteYaml(text: string): unknown {
  const doc = parseDocument(text, { prettyErrors: true });
  const [first] = doc.errors;
  if (first) {
    const line = first.linePos?.[0].line;
    throw new Error(`route.yaml${line ? ` 第 ${line} 行` : ''}：YAML 写法有误：${first.message}`);
  }
  return doc.toJS();
}

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

let cached: Promise<Site> | undefined;

/**
 * 读取并编译全站数据。构建时一次构建只算一次；开发服务器里每次重新读取，改了内容不用重启。
 */
export function loadSite(): Promise<Site> {
  if (!import.meta.env.PROD) return readSite();
  return (cached ??= readSite());
}

async function readSite(): Promise<Site> {
  const [principles, operations, references] = await Promise.all([
    getCollection('principle'),
    getCollection('operation'),
    getCollection('reference'),
  ]);

  let route: RouteMap;
  try {
    route = assembleRoute(parseRouteYaml(routeText), principles);
  } catch (error) {
    // Astro 打印带 `errors` 数组的异常时只输出每项的 message，会丢掉“文件：”前缀，所以换成普通 Error 抛出。
    if (error instanceof RouteValidationError) throw new Error(error.message);
    throw error;
  }
  const operationById = new Map(operations.map((entry) => [entry.id, entry]));
  const referenceById = new Map(
    references.map((entry) => [entry.id, { id: entry.id, title: pageTitle(entry.body, `src/content/reference/${entry.id}.md`), entry }]),
  );
  return {
    route,
    start: startOf(route),
    pages: new Map(
      principles.map((entry) => [
        entry.id,
        { id: entry.id, title: route.data.pages[entry.id]!.title, principle: entry, operation: operationById.get(entry.id) },
      ]),
    ),
    references: referenceById,
    tocReferences: TOC_REFERENCES.map((id) => {
      const reference = referenceById.get(id);
      if (!reference) throw new Error(`src/content/reference/${id}.md：缺少目录要列出的参考页`);
      return { id, title: reference.title };
    }),
  };
}
