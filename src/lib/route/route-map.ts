/**
 * M2 路线模块（架构 §3 M2）：校验路线图并算出页面需要的全部导航信息。
 *
 * 对外的入口：`buildRouteMap`（构建时校验并编译）、`routeMapFromData`（浏览器用
 * 序列化的 RouteData 重建）、`pathOf`（Stop → 站内路径）、错误类型 `RouteValidationError`，
 * 以及类型、保留字清单 `RESERVED_PAGE_IDS` 和已删除页面的跳转表 `REMOVED_PAGES`。
 * 纯函数，不碰文件系统和浏览器 API，构建时和浏览器里用同一份代码。
 */
import type {
  Choices,
  ForkId,
  OptionId,
  OutlineChapter,
  OutlineItem,
  OutlineStep,
  PageId,
  PageMeta,
  Progress,
  RouteData,
  RouteDataItem,
  RouteError,
  RouteMap,
  RouteSpec,
  RouteSpecChapter,
  RouteSpecItem,
  RouteView,
  Stop,
  ViewMode,
} from './types';

export type * from './types';

/** 不能用作页面标识的保留路径（ADR-0002）：参考页和构建产物占用的路径。 */
export const RESERVED_PAGE_IDS: readonly string[] = ['faq', 'ip-tests', '404', '_astro'];

/**
 * 已删除的页面：旧标识 → 旧地址跳到的页面（ADR-0002：已发布的 URL 不能失效）。
 * 构建时由 astro.config.mjs 的 `redirects` 生成跳转页；旧标识不能再分给别的页面，否则旧链接会指向别的内容。
 */
export const REMOVED_PAGES: Readonly<Record<PageId, PageId>> = {
  // 2026-10-19 作者改用方案二，删掉方案一的“一、白嫖 ISP”，旧地址跳到“选择方案”
  'plan1-free-isp': 'choose-plan',
};

const VIEW_MODES: readonly ViewMode[] = ['operation', 'principle'];
const HOME: Stop = { kind: 'home' };
const ROUTE_FILE = 'route.yaml';
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const pageFile = (id: string) => `principle/${id}.md`;

/** 路线图校验失败。`errors` 一次列出全部问题，`message` 每行一条“文件：说明”。 */
export class RouteValidationError extends Error {
  readonly errors: RouteError[];
  constructor(errors: RouteError[]) {
    super(`路线图校验失败（${errors.length} 处）：\n${errors.map((e) => `  ${e.file}：${e.message}`).join('\n')}`);
    this.name = 'RouteValidationError';
    this.errors = errors;
  }
}

/** Stop → 站内路径（不含 BASE_PATH），再由 `withBase()` 加前缀。 */
export function pathOf(stop: Stop): string {
  return stop.kind === 'home' ? '/' : `/${stop.id}/`;
}

/**
 * 校验路线图和页面元数据，并编译成 RouteMap。
 *
 * `spec` 是 route.yaml 解析后的值（`unknown`，这里逐项校验形状）。任何一条规则不满足都会
 * 抛出 `RouteValidationError`，其中每条错误写明 `route.yaml` 或 `principle/<id>.md`。
 */
export function buildRouteMap(spec: unknown, pages: PageMeta[]): RouteMap {
  const errors: RouteError[] = [];
  const parsed = parseSpec(spec, errors);
  if (parsed) checkSemantics(parsed, pages, errors);
  if (errors.length > 0) throw new RouteValidationError(errors);

  const map = routeMapFromData(compile(parsed!, pages));
  checkEveryRoute(map, errors);
  if (errors.length > 0) throw new RouteValidationError(errors);
  return map;
}

// ================================================================ 形状校验

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSpec(raw: unknown, errors: RouteError[]): RouteSpec | null {
  const err = (message: string) => errors.push({ file: ROUTE_FILE, message });
  if (!isRecord(raw)) {
    err('路线图必须是一个对象，包含 chapters（和可选的 side）');
    return null;
  }
  for (const key of Object.keys(raw)) {
    if (key !== 'chapters' && key !== 'side') err(`未知字段 ${key}`);
  }

  const side: Record<PageId, { returnTo: PageId }> = {};
  if (raw.side !== undefined) {
    if (!isRecord(raw.side)) {
      err('side 必须是“旁支页: { returnTo: <页面> }”的映射');
    } else {
      for (const [id, value] of Object.entries(raw.side)) {
        // 先挡住非 kebab-case 的键（含 __proto__），再写入对象
        if (!KEBAB.test(id)) err(`side 里的页面标识 ${id} 必须是英文 kebab-case`);
        else if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.returnTo !== 'string') {
          err(`side.${id} 要写成 { returnTo: <页面> }`);
        } else side[id] = { returnTo: value.returnTo };
      }
    }
  }

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    err('chapters 必须是非空列表');
    return null;
  }
  const chapters: RouteSpecChapter[] = [];
  raw.chapters.forEach((chapter: unknown, ci) => {
    const where = `第 ${ci + 1} 个章节`;
    if (!isRecord(chapter)) {
      err(`${where}必须是包含 id、title、items 的对象`);
      return;
    }
    for (const key of Object.keys(chapter)) {
      if (!['id', 'title', 'summary', 'items'].includes(key)) err(`${where}有未知字段 ${key}`);
    }
    if (typeof chapter.id !== 'string' || !KEBAB.test(chapter.id)) err(`${where}的 id 必须是英文 kebab-case`);
    if (typeof chapter.title !== 'string' || chapter.title.trim() === '') err(`${where}缺少 title`);
    const summary = chapter.summary;
    if (summary !== undefined && (typeof summary !== 'string' || summary.trim() === '')) err(`${where}的 summary 必须是非空的一段文字`);
    if (!Array.isArray(chapter.items) || chapter.items.length === 0) {
      err(`${where}的 items 必须是非空列表`);
      return;
    }
    const items: RouteSpecItem[] = [];
    chapter.items.forEach((item: unknown, ii) => {
      const parsedItem = parseItem(item, `${where}第 ${ii + 1} 项`, err);
      if (parsedItem !== null) items.push(parsedItem);
    });
    chapters.push({
      id: String(chapter.id),
      title: String(chapter.title),
      ...(typeof summary === 'string' && { summary }),
      items,
    });
  });
  return { chapters, side };
}

function parseItem(item: unknown, where: string, err: (m: string) => void): RouteSpecItem | null {
  if (typeof item === 'string') return item;
  if (isRecord(item) && 'choose' in item) {
    const extra = Object.keys(item).filter((k) => !['choose', 'page', 'default'].includes(k));
    if (typeof item.choose !== 'string' || typeof item.page !== 'string' || extra.length > 0 || ('default' in item && typeof item.default !== 'string')) {
      err(`${where}：选择页写作 { choose: <分叉点>, page: <选择页标识> }，可加 default: <选项>`);
      return null;
    }
    if (!KEBAB.test(item.choose)) {
      err(`${where}：分叉点标识 ${item.choose} 必须是英文 kebab-case`);
      return null;
    }
    return { choose: item.choose, page: item.page, ...(typeof item.default === 'string' && { default: item.default }) };
  }
  if (isRecord(item) && 'branch' in item) {
    const extra = Object.keys(item).filter((k) => k !== 'branch' && k !== 'options');
    if (typeof item.branch !== 'string' || !isRecord(item.options) || extra.length > 0) {
      err(`${where}：分支段写作 { branch: <分叉点>, options: { <选项>: [页面…] } }`);
      return null;
    }
    const options: Record<OptionId, PageId[]> = {};
    for (const [option, list] of Object.entries(item.options)) {
      if (!KEBAB.test(option)) {
        err(`${where}：选项标识 ${option} 必须是英文 kebab-case`);
        return null;
      }
      if (!Array.isArray(list) || !list.every((s) => typeof s === 'string')) {
        err(`${where}：选项 ${option} 必须是页面标识列表`);
        return null;
      }
      options[option] = list;
    }
    return { branch: item.branch, options };
  }
  err(`${where}：必须是页面标识、{ choose, page } 或 { branch, options }`);
  return null;
}

// ================================================================ 规则校验

function checkSemantics(spec: RouteSpec, pages: PageMeta[], errors: RouteError[]): void {
  const routeErr = (message: string) => errors.push({ file: ROUTE_FILE, message });

  // ---- 页面文件
  const byId = new Map<PageId, PageMeta>();
  for (const page of pages) {
    const file = pageFile(page.id);
    if (byId.has(page.id)) errors.push({ file, message: `页面标识重复：${page.id}` });
    byId.set(page.id, page);
    if (RESERVED_PAGE_IDS.includes(page.id)) {
      errors.push({ file, message: `页面标识 ${page.id} 是保留路径（${RESERVED_PAGE_IDS.join('、')}），请换一个` });
    } else if (Object.hasOwn(REMOVED_PAGES, page.id)) {
      errors.push({ file, message: `页面标识 ${page.id} 属于已删除的页面，旧地址跳到 ${REMOVED_PAGES[page.id]}，不能再用，请换一个` });
    } else if (!KEBAB.test(page.id)) {
      errors.push({ file, message: `页面标识 ${page.id} 必须是英文 kebab-case` });
    }
  }

  // ---- 章节标识
  const chapterIds = new Set<string>();
  for (const chapter of spec.chapters) {
    if (chapterIds.has(chapter.id)) routeErr(`章节标识重复：${chapter.id}`);
    chapterIds.add(chapter.id);
  }

  // ---- 逐项检查：一个标识空间、choose 在 branch 之前、选项一致、汇合
  /** 页面标识 → 所在位置（普通项 'item'、选择页 'choose'、旁支页 'side'、分支段 'branch:<序号>'）。 */
  const placement = new Map<PageId, string>();
  /** 分叉点 → 选择页的选项（选择页缺 options 时为空列表） */
  const forkOptions = new Map<ForkId, OptionId[]>();
  const branched = new Set<ForkId>();
  const flat = spec.chapters.flatMap((c) => c.items.map((item) => ({ item, chapter: c.id })));

  const place = (id: PageId, where: string, label: string) => {
    const before = placement.get(id);
    if (before === undefined) placement.set(id, where);
    else if (before !== where || !where.startsWith('branch:')) {
      routeErr(`页面 ${id} 在路线图里出现了多次（${label}）；一个页面只能是普通项、选择页、旁支页之一，或属于同一个分支段`);
    }
    if (!byId.has(id)) routeErr(`页面 ${id} 没有对应的文件 ${pageFile(id)}`);
  };

  flat.forEach(({ item, chapter }, k) => {
    if (typeof item === 'string') {
      place(item, 'item', `章节 ${chapter}`);
      return;
    }
    if ('choose' in item) {
      place(item.page, 'choose', `分叉点 ${item.choose} 的选择页`);
      if (forkOptions.has(item.choose)) routeErr(`分叉点 ${item.choose} 的选择页出现了多次`);
      const meta = byId.get(item.page);
      if (meta && !meta.options) {
        errors.push({ file: pageFile(item.page), message: `是分叉点 ${item.choose} 的选择页，frontmatter 要写 options` });
      }
      forkOptions.set(item.choose, meta?.options?.map((o) => o.id) ?? []);
      if (item.default !== undefined && meta?.options && !meta.options.some((o) => o.id === item.default)) {
        routeErr(`分叉点 ${item.choose} 的 default（${item.default}）不是选择页 options 里的选项`);
      }
      return;
    }

    const fork = item.branch;
    branched.add(fork);
    const expected = forkOptions.get(fork);
    if (expected === undefined) {
      routeErr(`分叉点 ${fork} 的分支段（章节 ${chapter}）出现在它的选择页 { choose: ${fork}, page: … } 之前，或路线图里没有这个分叉点的选择页`);
    } else if (expected.length > 0) {
      const actual = Object.keys(item.options);
      const missing = expected.filter((o) => !actual.includes(o));
      const extra = actual.filter((o) => !expected.includes(o));
      if (missing.length > 0 || extra.length > 0) {
        routeErr(
          `分叉点 ${fork} 的分支段（章节 ${chapter}）的选项与选择页的 options 不一致：` +
            [missing.length ? `缺少 ${missing.join('、')}` : '', extra.length ? `多出 ${extra.join('、')}` : ''].filter(Boolean).join('，'),
        );
      } else if (actual.join() !== expected.join()) {
        routeErr(`分叉点 ${fork} 的分支段（章节 ${chapter}）的选项顺序要与选择页的 options 一致：${expected.join('、')}`);
      }
    }
    for (const [option, list] of Object.entries(item.options)) {
      if (list.length === 0) routeErr(`分叉点 ${fork} 的选项 ${option}（章节 ${chapter}）没有页面`);
      else if (list.every((id) => byId.get(id)?.principleOnly)) {
        routeErr(`分叉点 ${fork} 的选项 ${option}（章节 ${chapter}）只有原理独有步骤：操作视图下这一段是空的`);
      }
      list.forEach((id, i) => {
        if (list.indexOf(id) !== i) routeErr(`页面 ${id} 在分叉点 ${fork} 的选项 ${option} 里出现了多次`);
        else place(id, `branch:${k}`, `章节 ${chapter} 的 ${fork}/${option}`);
      });
    }

    // 汇合：分支段之后必须有所有选项共用的项；同一分叉点紧挨着的下一段分支算在一起。
    const next = flat[k + 1]?.item;
    const sameForkNext = next !== undefined && typeof next !== 'string' && 'branch' in next && next.branch === fork;
    const merges = next !== undefined && (typeof next === 'string' || 'choose' in next);
    if (!merges && !sameForkNext) {
      routeErr(
        `分叉点 ${fork} 的分支段（章节 ${chapter}）之后没有汇合点：后面要接一个所有选项共用的页面或选择页` +
          (next !== undefined && typeof next !== 'string' && 'branch' in next ? `，现在接的是分叉点 ${next.branch} 的分支段` : ''),
      );
    }
  });

  for (const fork of forkOptions.keys()) {
    if (!branched.has(fork)) routeErr(`分叉点 ${fork} 有选择页，但没有任何分支段`);
  }

  // ---- 首尾：前言的上一步、后记的下一步是首页，两种视图都要经过它们
  for (const [label, entry] of [['第一项', flat[0]], ['最后一项', flat[flat.length - 1]]] as const) {
    const item = entry?.item;
    if (item === undefined) continue;
    if (typeof item !== 'string') routeErr(`路线的${label}必须是普通页面`);
    else if (byId.get(item)?.principleOnly) routeErr(`路线的${label} ${item} 不能是原理独有步骤：操作视图也要从这里开始和结束`);
  }

  // ---- 旁支页
  for (const [id, { returnTo }] of Object.entries(spec.side ?? {})) {
    place(id, 'side', `旁支页 ${id}`);
    if (placement.get(returnTo) !== 'item') routeErr(`旁支页 ${id} 的 returnTo（${returnTo}）必须是路线图里的普通页`);
  }

  for (const page of pages) {
    if (!placement.has(page.id)) errors.push({ file: pageFile(page.id), message: `页面 ${page.id} 不在路线图里` });
    else if (page.options && placement.get(page.id) !== 'choose') {
      errors.push({ file: pageFile(page.id), message: `写了 options，但在路线图里不是选择页 { choose: <分叉点>, page: ${page.id} }` });
    }
  }
}

/**
 * 枚举全部选项组合 × 两种视图，沿“下一步”走：每条路线都要从第一项走到最后一项再回首页，不重复经过同一页，
 * 上一步与来路一致（架构 §3 M2）。
 *
 * 这是兜底的回归检查：在 checkSemantics 的规则（位置唯一、choose 在 branch 之前、必须汇合、首尾是普通页）都满足时，
 * 现有的数据形状不会触发这里的错误；它防的是以后改动导航算法或放宽前置规则时引入的环和断链。
 */
function checkEveryRoute(map: RouteMap, errors: RouteError[]): void {
  const { data } = map;
  const forkIds = Object.keys(data.forks);
  let combos: Record<ForkId, OptionId>[] = [{}];
  for (const fork of forkIds) {
    combos = combos.flatMap((c) => data.forks[fork]!.options.map((o) => ({ ...c, [fork]: o.id })));
  }
  const items = data.chapters.flatMap((c) => c.items);
  const first = items[0]!;
  const last = items[items.length - 1]!;
  if (first.kind !== 'step' || last.kind !== 'step') return; // 不可能：checkSemantics 已报“首尾必须是普通页面”
  const limit = Object.keys(data.pages).length + 1;

  for (const mode of VIEW_MODES) {
    for (const combo of combos) {
      const label = [...forkIds.map((f) => `${f}=${combo[f]}`), mode === 'operation' ? '操作视图' : '原理视图'].join('，');
      const fail = (message: string) => errors.push({ file: ROUTE_FILE, message: `路线（${label}）${message}` });
      let at: PageId = first.id;
      let prev: Stop = HOME;
      const seen = new Set<PageId>();
      for (let n = 0; ; n++) {
        if (seen.has(at) || n > limit) {
          fail(`出现环：再次经过 ${at}`);
          break;
        }
        seen.add(at);
        const view = map.view(at, combo, mode);
        if (forkIds.some((f) => view.choices[f] !== combo[f])) {
          fail(`在 ${at} 偏离了所选路线`);
          break;
        }
        if (!sameStop(view.prev, prev)) {
          fail(`在 ${at} 的上一步与来路不一致`);
          break;
        }
        if (view.next === null) {
          fail(`在 ${at} 没有下一步`);
          break;
        }
        if (view.next.kind === 'home') {
          if (at !== last.id) fail(`在 ${at} 就回到了首页，没有走到最后一项 ${last.id}`);
          break;
        }
        prev = view.current;
        at = view.next.id;
      }
    }
  }
}

function sameStop(a: Stop | null, b: Stop | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && pathOf(a) === pathOf(b);
}

// ================================================================ 编译

function compile(spec: RouteSpec, pages: PageMeta[]): RouteData {
  const data: RouteData = { chapters: [], pages: {}, forks: {}, side: {} };
  const byId = new Map(pages.map((p) => [p.id, p]));
  for (const page of pages) {
    data.pages[page.id] = {
      title: page.title,
      principleOnly: page.principleOnly,
      skippable: page.skippable,
      ...(page.skipLabel !== undefined ? { skipLabel: page.skipLabel } : {}),
    };
  }
  data.chapters = spec.chapters.map((c) => ({
    id: c.id,
    title: c.title,
    ...(c.summary !== undefined && { summary: c.summary }),
    items: c.items.map((item): RouteDataItem => {
      if (typeof item === 'string') return { kind: 'step', id: item };
      if ('choose' in item) {
        const options = byId.get(item.page)!.options!.map((o) => ({ id: o.id, title: o.title }));
        data.forks[item.choose] = { page: item.page, options, ...(item.default !== undefined && { default: item.default }) };
        return { kind: 'choose', fork: item.choose, id: item.page };
      }
      return { kind: 'branch', fork: item.branch, options: structuredClone(item.options) };
    }),
  }));
  for (const [id, { returnTo }] of Object.entries(spec.side ?? {})) data.side[id] = returnTo;
  return data;
}

// ================================================================ 运行时

/**
 * 当前路线上的一项。`fold` 是没选、也没有默认选项的分叉点的一段分支：它两侧的页面把“下一步”“上一步”指向该分叉点的选择页（FR-13）。
 */
type Entry = { kind: 'step' | 'choose'; id: PageId; chapter: number } | { kind: 'fold'; fork: ForkId; chapter: number };

/**
 * 用序列化的 RouteData 重建 RouteMap（浏览器端）。RouteData 来自 `buildRouteMap(...).data`，
 * 这里不再校验。
 */
export function routeMapFromData(data: RouteData): RouteMap {
  /** 分支页面 → 所属分叉点和它出现的选项（共享步骤有多个）。 */
  const branchHome = new Map<PageId, { fork: ForkId; options: OptionId[] }>();
  /** 序列里的页面（普通页、选择页、分支页面）；旁支页不在其中 */
  const onMap = new Set<PageId>();
  /** 选择页 → 分叉点 */
  const forkOfPage = new Map(Object.entries(data.forks).map(([fork, { page }]) => [page, fork]));
  for (const chapter of data.chapters) {
    for (const item of chapter.items) {
      if (item.kind !== 'branch') {
        onMap.add(item.id);
        continue;
      }
      for (const option of data.forks[item.fork]!.options) {
        for (const id of item.options[option.id] ?? []) {
          onMap.add(id);
          const home = branchHome.get(id) ?? { fork: item.fork, options: [] };
          home.options.push(option.id);
          branchHome.set(id, home);
        }
      }
    }
  }

  const isOption = (fork: ForkId, option: unknown): option is OptionId =>
    typeof option === 'string' && Object.hasOwn(data.forks, fork) && data.forks[fork]!.options.some((o) => o.id === option);

  /** 默认选项 ← 本机保存的选择（失效项忽略）← 当前页所属选项（`at` 为 null 时不看当前页）。 */
  function effectiveChoices(at: PageId | null, stored: Choices): Choices {
    const choices: Choices = {};
    const safeStored: Choices = isRecord(stored) ? stored : {}; // stored 来自本机存储，不信任它的形状
    for (const fork of Object.keys(data.forks)) {
      const saved = Object.hasOwn(safeStored, fork) ? safeStored[fork] : undefined;
      const fallback = data.forks[fork]!.default;
      if (isOption(fork, saved)) choices[fork] = saved;
      else if (fallback !== undefined) choices[fork] = fallback;
    }
    const home = at === null ? undefined : branchHome.get(at);
    // 共享步骤属于多个选项：本机已选的在其中就沿用，否则取第一个
    if (home && !home.options.includes(choices[home.fork] ?? '')) choices[home.fork] = home.options[0]!;
    return choices;
  }

  const visible = (id: PageId, mode: ViewMode) => mode === 'principle' || !data.pages[id]!.principleOnly;

  function sequence(choices: Choices, mode: ViewMode): Entry[] {
    const entries: Entry[] = [];
    data.chapters.forEach((chapter, ci) => {
      for (const item of chapter.items) {
        if (item.kind === 'branch') {
          const option = choices[item.fork];
          if (option === undefined) entries.push({ kind: 'fold', fork: item.fork, chapter: ci });
          else for (const id of item.options[option] ?? []) if (visible(id, mode)) entries.push({ kind: 'step', id, chapter: ci });
        } else if (item.kind === 'choose' || visible(item.id, mode)) {
          entries.push({ kind: item.kind, id: item.id, chapter: ci });
        }
      }
    });
    return entries;
  }

  const pageStop = (kind: 'step' | 'choose' | 'side', id: PageId): Stop => ({ kind, id, title: data.pages[id]!.title });
  const toStop = (entry: Entry | undefined): Stop =>
    entry === undefined ? HOME : entry.kind === 'fold' ? pageStop('choose', data.forks[entry.fork]!.page) : pageStop(entry.kind, entry.id);

  function outline(at: PageId | null, choices: Choices, mode: ViewMode): OutlineChapter[] {
    // 共享步骤在每个选项下各列一份，只有一份标当前项：当前路线上的那份；都不在当前路线上时取它所属的第一个选项。
    const home = at === null ? undefined : branchHome.get(at);
    const chosen = home && choices[home.fork];
    const currentOption = home && (chosen !== undefined && home.options.includes(chosen) ? chosen : home.options[0]!);
    const stepItem = (id: PageId, onRoute: boolean, option?: OptionId): OutlineStep => ({
      kind: 'step',
      id,
      title: data.pages[id]!.title,
      skippable: data.pages[id]!.skippable,
      principleOnly: data.pages[id]!.principleOnly,
      onRoute: onRoute && visible(id, mode),
      current: at === id && (option === undefined || option === currentOption),
    });
    return data.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      items: chapter.items.map((item): OutlineItem => {
        if (item.kind === 'step') return stepItem(item.id, true);
        if (item.kind === 'choose') {
          return { kind: 'choose', fork: item.fork, id: item.id, title: data.pages[item.id]!.title, current: at === item.id };
        }
        const option = choices[item.fork];
        return {
          kind: 'branch',
          fork: item.fork,
          options: data.forks[item.fork]!.options.map(({ id, title }) => ({
            id,
            title,
            selected: option === id,
            steps: (item.options[id] ?? []).map((step) => stepItem(step, option === undefined || option === id, id)),
          })),
        };
      }),
    }));
  }

  function chapterProgress(ci: number): Progress {
    const chapter = data.chapters[ci]!;
    return { chapterId: chapter.id, chapter: chapter.title, chapterNo: ci };
  }

  function view(at: PageId, stored: Choices, mode: ViewMode): RouteView {
    if (Object.hasOwn(data.side, at)) {
      // 旁支页（FR-19）：没有上一步，“回到”挂靠的普通页，“下一步”是那一页在当前路线和视图下的下一步
      const back = view(data.side[at]!, stored, mode);
      return {
        choices: back.choices,
        current: pageStop('side', at),
        prev: null,
        next: back.next,
        skipTo: null,
        returnTo: back.current,
        progress: chapterProgress(back.progress.chapterNo),
        outline: outline(at, back.choices, mode),
      };
    }
    if (!onMap.has(at)) throw new Error(`不在路线图里的页面：${at}`);

    const choices = effectiveChoices(at, stored);
    let entries = sequence(choices, mode);
    let i = entries.findIndex((e) => e.kind !== 'fold' && e.id === at);
    // 原理独有步骤在操作视图下被直接打开：它不在操作序列里，按原理视图的序列计算它自己的导航（V5）
    const fallback = i === -1;
    if (fallback) {
      entries = sequence(choices, 'principle');
      i = entries.findIndex((e) => e.kind !== 'fold' && e.id === at);
    }
    const here = entries[i] as Extract<Entry, { kind: 'step' | 'choose' }>;

    let skipTo: Stop | null = null;
    if (here.kind === 'step' && data.pages[here.id]!.skippable) {
      let j = i;
      while (entries[j]?.kind === 'step' && data.pages[(entries[j] as { id: PageId }).id]!.skippable) j++;
      skipTo = toStop(entries[j]);
    }

    const progress = chapterProgress(here.chapter);
    const inChapter = entries.filter((e) => e.chapter === here.chapter);
    if (here.kind === 'step' && !fallback && !inChapter.some((e) => e.kind === 'fold')) {
      const steps = inChapter.filter((e) => e.kind === 'step');
      progress.index = steps.indexOf(here) + 1;
      progress.total = steps.length;
    }

    // 选择页未选（也没有默认选项）时没有下一步（FR-12）
    const unchosen = here.kind === 'choose' && choices[forkOfPage.get(here.id)!] === undefined;
    return {
      choices,
      current: toStop(here),
      prev: toStop(entries[i - 1]),
      next: unchosen ? null : toStop(entries[i + 1]),
      skipTo,
      returnTo: null,
      progress,
      outline: outline(at, choices, mode),
    };
  }

  return { view, outline: (stored, current, mode) => outline(current, effectiveChoices(null, stored), mode), data };
}
