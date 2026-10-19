import { getCollection, type CollectionEntry } from 'astro:content';
import { parseDocument } from 'yaml';
import routeText from '../content/route.yaml?raw';
import { buildRouteMap, RouteValidationError } from './route/route-map';
import type { PageMeta, RouteData, RouteError, RouteMap, Stop } from './route/types';

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
 * 把原理版条目映射成 M2 的输入并编译，再核对各章的 intro。路线图有错时抛出 `RouteValidationError`（第三层校验，FR-61），
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
  const route = buildRouteMap(spec, pages);
  const errors = checkChapterIntros(route.data, new Map(entries.map(({ id, body }) => [id, body ?? ''])));
  if (errors.length > 0) throw new RouteValidationError(errors);
  return route;
}

/**
 * 章节标题卡的一句话只能从重写稿取（design §4.1、ADR-0005）：它必须原样出现在这一章第一页（普通页或选择页）的
 * 原理版正文里。M2 不读正文，所以在这里核对（架构 §11.4 W-3）。按 Markdown 原文核对，页面把 intro 当纯文本输出，
 * 所以只摘不带加粗、双链等写法的句子。
 */
function checkChapterIntros(data: RouteData, bodies: ReadonlyMap<string, string>): RouteError[] {
  const errors: RouteError[] = [];
  for (const chapter of data.chapters) {
    if (chapter.intro === undefined) continue;
    const first = chapter.items[0];
    if (first === undefined || first.kind === 'branch') {
      errors.push({ file: 'route.yaml', message: `章节 ${chapter.id} 的第一项是分支段，没有显示 intro 的章首页` });
    } else if (!bodies.get(first.id)?.includes(chapter.intro)) {
      errors.push({
        file: 'route.yaml',
        message: `章节 ${chapter.id} 的 intro“${chapter.intro}”没有原样出现在这一章第一页 principle/${first.id}.md 的正文里`,
      });
    }
  }
  return errors;
}

/** 路线的第一页。路线图校验保证第一项是普通页面。 */
export function startOf(route: RouteMap): Stop {
  const first = route.data.chapters[0]?.items[0];
  if (first?.kind !== 'step') throw new Error('route.yaml：路线图的第一项必须是普通页面');
  return route.view(first.id, {}, 'operation').current;
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
