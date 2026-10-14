import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { parseDocument } from 'yaml';
import routeText from '../content/route.yaml?raw';
import { buildRouteMap, RouteValidationError } from './route/route-map';
import type { ChoiceMeta, RouteMap, StepMeta, Stop } from './route/types';

/**
 * 构建时装配（架构 §3 M3）：读取 M1 的内容集合和 route.yaml，交给 M2 编译成 RouteMap。
 * 页面都从 `loadSite()` 取数据；M2 不引用 M1 的类型，两边的形状在这里映射。
 */

/** 页面需要的全部构建时数据。 */
export interface Site {
  route: RouteMap;
  /** 路线的第一项（“开始之前”）：首页“直接开始”和完成页“重新开始”都指向它 */
  start: Stop;
  /** 步骤条目，按标识查找 */
  steps: ReadonlyMap<string, CollectionEntry<'steps'>>;
  /** 首页前言 `pages/home.md` */
  home: CollectionEntry<'pages'>;
  /** 完成页 `pages/done.md` */
  done: CollectionEntry<'pages'>;
}

/** 只取映射需要的字段，单元测试可以直接传普通对象。 */
type StepEntry = Pick<CollectionEntry<'steps'>, 'id'> & {
  data: Pick<CollectionEntry<'steps'>['data'], 'title' | 'skippable' | 'skipLabel' | 'placeholder'>;
};
type ChoiceEntry = Pick<CollectionEntry<'choices'>, 'id'> & {
  data: Pick<CollectionEntry<'choices'>['data'], 'question' | 'options'>;
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
 * 把内容条目映射成 M2 的输入并编译。路线图有错时抛出 `RouteValidationError`（第三层校验，FR-61），
 * 它的 message 每行一条“文件：说明”，构建输出里直接可读。
 */
export function assembleRoute(spec: unknown, steps: readonly StepEntry[], choices: readonly ChoiceEntry[]): RouteMap {
  const stepMeta: StepMeta[] = steps.map(({ id, data }) => ({
    id,
    title: data.title,
    skippable: data.skippable,
    ...(data.skipLabel !== undefined && { skipLabel: data.skipLabel }),
    placeholder: data.placeholder,
  }));
  const choiceMeta: ChoiceMeta[] = choices.map(({ id, data }) => ({
    id,
    title: data.question,
    // 对象键按书写顺序；选项标识以字母开头，不会被 JS 按整数键重排（schemas.ts ID_PATTERN）。
    options: Object.entries(data.options).map(([option, { title }]) => ({ id: option, title })),
  }));
  return buildRouteMap(spec, stepMeta, choiceMeta);
}

/** 路线的第一项。路线图校验保证至少有一章、每章至少一项，且第一项不会是分支段。 */
export function startOf(route: RouteMap): Stop {
  const first = route.data.chapters[0]?.items[0];
  if (first?.kind === 'step') return route.view({ kind: 'step', id: first.id }, {}).current;
  if (first?.kind === 'choose') return route.view({ kind: 'choose', fork: first.fork }, {}).current;
  throw new Error('route.yaml：路线图的第一项必须是步骤或选择页');
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
  const [steps, choices, home, done] = await Promise.all([
    getCollection('steps'),
    getCollection('choices'),
    getEntry('pages', 'home'),
    getEntry('pages', 'done'),
  ]);
  if (!home) throw new Error('缺少首页内容文件 src/content/pages/home.md');
  if (!done) throw new Error('缺少完成页内容文件 src/content/pages/done.md');

  let route: RouteMap;
  try {
    route = assembleRoute(parseRouteYaml(routeText), steps, choices);
  } catch (error) {
    // Astro 打印带 `errors` 数组的异常时只输出每项的 message，会丢掉“文件：”前缀，所以换成普通 Error 抛出。
    if (error instanceof RouteValidationError) throw new Error(error.message);
    throw error;
  }
  return {
    route,
    start: startOf(route),
    steps: new Map(steps.map((entry) => [entry.id, entry])),
    home,
    done,
  };
}
