/**
 * M2 路线模块（架构 §3 M2）：校验路线图并算出页面需要的全部导航信息。
 *
 * 对外的入口：`buildRouteMap`（构建时校验并编译）、`routeMapFromData`（浏览器用
 * 序列化的 RouteData 重建）、`pathOf`（Stop → 站内路径）、错误类型 `RouteValidationError`，
 * 以及类型和保留字清单 `RESERVED_STEP_IDS`。
 * 纯函数，不碰文件系统和浏览器 API，构建时和浏览器里用同一份代码。
 */
import type {
  At,
  ChoiceMeta,
  Choices,
  ForkId,
  OptionId,
  OutlineChapter,
  OutlineItem,
  OutlineStep,
  RouteData,
  RouteDataItem,
  RouteError,
  RouteMap,
  RouteSpec,
  RouteSpecChapter,
  RouteSpecItem,
  RouteView,
  StepId,
  StepMeta,
  Stop,
} from './types';

export type * from './types';

/** 不能用作步骤标识的保留路径（ADR-0002）。 */
export const RESERVED_STEP_IDS: readonly string[] = ['choose', 'faq', 'done', '404', '_astro'];

const ROUTE_FILE = 'route.yaml';
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const stepFile = (id: string) => `steps/${id}.md`;
const choiceFile = (id: string) => `choices/${id}.md`;

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
  switch (stop.kind) {
    case 'step':
      return `/${stop.id}/`;
    case 'choose':
      return `/choose/${stop.fork}/`;
    case 'done':
      return '/done/';
  }
}

/**
 * 校验路线图、步骤元数据和选择页元数据，并编译成 RouteMap。
 *
 * `spec` 是 route.yaml 解析后的值（`unknown`，这里逐项校验形状）。任何一条规则不满足都会
 * 抛出 `RouteValidationError`，其中每条错误写明 `route.yaml`、`steps/<id>.md` 或 `choices/<id>.md`。
 */
export function buildRouteMap(spec: unknown, steps: StepMeta[], choices: ChoiceMeta[]): RouteMap {
  const errors: RouteError[] = [];
  const parsed = parseSpec(spec, errors);
  if (parsed) checkSemantics(parsed, steps, choices, errors);
  if (errors.length > 0) throw new RouteValidationError(errors);

  const map = routeMapFromData(compile(parsed!, steps, choices));
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
    err('路线图必须是一个对象，包含 defaults 和 chapters');
    return null;
  }
  for (const key of Object.keys(raw)) {
    if (key !== 'defaults' && key !== 'chapters') err(`未知字段 ${key}`);
  }

  const defaults: Record<ForkId, OptionId> = {};
  if (!isRecord(raw.defaults)) {
    err('defaults 必须是“分叉点: 默认选项”的映射');
  } else {
    for (const [fork, option] of Object.entries(raw.defaults)) {
      // 先挡住非 kebab-case 的键（含 __proto__），再写入对象
      if (!KEBAB.test(fork)) err(`defaults 里的分叉点标识 ${fork} 必须是英文 kebab-case`);
      else if (typeof option !== 'string') err(`defaults.${fork} 必须是选项标识`);
      else defaults[fork] = option;
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
      if (!['id', 'title', 'items'].includes(key)) err(`${where}有未知字段 ${key}`);
    }
    if (typeof chapter.id !== 'string' || !KEBAB.test(chapter.id)) err(`${where}的 id 必须是英文 kebab-case`);
    if (typeof chapter.title !== 'string' || chapter.title.trim() === '') err(`${where}缺少 title`);
    if (!Array.isArray(chapter.items) || chapter.items.length === 0) {
      err(`${where}的 items 必须是非空列表`);
      return;
    }
    const items: RouteSpecItem[] = [];
    chapter.items.forEach((item: unknown, ii) => {
      const parsedItem = parseItem(item, `${where}第 ${ii + 1} 项`, err);
      if (parsedItem !== null) items.push(parsedItem);
    });
    chapters.push({ id: String(chapter.id), title: String(chapter.title), items });
  });
  return { defaults, chapters };
}

function parseItem(item: unknown, where: string, err: (m: string) => void): RouteSpecItem | null {
  if (typeof item === 'string') return item;
  if (isRecord(item) && 'choose' in item) {
    if (Object.keys(item).length !== 1 || typeof item.choose !== 'string') {
      err(`${where}：选择页写作 { choose: <分叉点> }`);
      return null;
    }
    return { choose: item.choose };
  }
  if (isRecord(item) && 'branch' in item) {
    const extra = Object.keys(item).filter((k) => k !== 'branch' && k !== 'options');
    if (typeof item.branch !== 'string' || !isRecord(item.options) || extra.length > 0) {
      err(`${where}：分支段写作 { branch: <分叉点>, options: { <选项>: [步骤…] } }`);
      return null;
    }
    const options: Record<OptionId, StepId[]> = {};
    for (const [option, list] of Object.entries(item.options)) {
      if (!KEBAB.test(option)) {
        err(`${where}：选项标识 ${option} 必须是英文 kebab-case`);
        return null;
      }
      if (!Array.isArray(list) || !list.every((s) => typeof s === 'string')) {
        err(`${where}：选项 ${option} 必须是步骤标识列表`);
        return null;
      }
      options[option] = list;
    }
    return { branch: item.branch, options };
  }
  err(`${where}：必须是步骤标识、{ choose } 或 { branch, options }`);
  return null;
}

// ================================================================ 规则校验

function checkSemantics(spec: RouteSpec, steps: StepMeta[], choices: ChoiceMeta[], errors: RouteError[]): void {
  const routeErr = (message: string) => errors.push({ file: ROUTE_FILE, message });

  // ---- 步骤文件
  const stepIds = new Set<StepId>();
  for (const step of steps) {
    const file = stepFile(step.id);
    if (stepIds.has(step.id)) errors.push({ file, message: `步骤标识重复：${step.id}` });
    stepIds.add(step.id);
    if (RESERVED_STEP_IDS.includes(step.id)) {
      errors.push({ file, message: `步骤标识 ${step.id} 是保留路径（${RESERVED_STEP_IDS.join('、')}），请换一个` });
    } else if (!KEBAB.test(step.id)) {
      errors.push({ file, message: `步骤标识 ${step.id} 必须是英文 kebab-case` });
    }
  }

  // ---- 选择页文件
  const forks = new Map<ForkId, ChoiceMeta>();
  for (const choice of choices) {
    const file = choiceFile(choice.id);
    if (forks.has(choice.id)) errors.push({ file, message: `分叉点标识重复：${choice.id}` });
    if (!KEBAB.test(choice.id)) errors.push({ file, message: `分叉点标识 ${choice.id} 必须是英文 kebab-case` });
    const optionIds = choice.options.map((o) => o.id);
    if (optionIds.length < 2) errors.push({ file, message: '分叉点至少要有两个选项' });
    for (const [i, id] of optionIds.entries()) {
      if (optionIds.indexOf(id) !== i) errors.push({ file, message: `选项标识重复：${id}` });
      if (!KEBAB.test(id)) errors.push({ file, message: `选项标识 ${id} 必须是英文 kebab-case` });
    }
    forks.set(choice.id, choice);
  }

  // ---- 章节标识
  const chapterIds = new Set<string>();
  for (const chapter of spec.chapters) {
    if (chapterIds.has(chapter.id)) routeErr(`章节标识重复：${chapter.id}`);
    chapterIds.add(chapter.id);
  }

  // ---- 逐项检查：位置唯一、choose 在 branch 之前、选项一致、汇合
  /** 步骤标识 → 所在位置（普通项为 'item'，分支段为 'branch:<序号>'）。 */
  const placement = new Map<StepId, string>();
  const chosen = new Set<ForkId>();
  const branched = new Set<ForkId>();
  const flat = spec.chapters.flatMap((c) => c.items.map((item) => ({ item, chapter: c.id })));

  const place = (id: StepId, where: string, label: string) => {
    const before = placement.get(id);
    if (before === undefined) placement.set(id, where);
    else if (before !== where || where === 'item') {
      routeErr(`步骤 ${id} 在路线图里出现了多次（${label}）；一个步骤只能是普通项，或属于同一个分支段`);
    }
    if (!stepIds.has(id)) routeErr(`步骤 ${id} 没有对应的文件 ${stepFile(id)}`);
  };

  flat.forEach(({ item, chapter }, k) => {
    if (typeof item === 'string') {
      place(item, 'item', `章节 ${chapter}`);
      return;
    }
    if ('choose' in item) {
      if (!forks.has(item.choose)) routeErr(`选择页 ${item.choose} 没有对应的文件 ${choiceFile(item.choose)}`);
      if (chosen.has(item.choose)) routeErr(`分叉点 ${item.choose} 的选择页出现了多次`);
      chosen.add(item.choose);
      return;
    }

    const fork = item.branch;
    branched.add(fork);
    const meta = forks.get(fork);
    if (!meta) routeErr(`分支段引用的分叉点 ${fork} 没有对应的文件 ${choiceFile(fork)}`);
    if (!chosen.has(fork)) routeErr(`分叉点 ${fork} 的分支段（章节 ${chapter}）出现在它的选择页 { choose: ${fork} } 之前`);
    if (meta) {
      const expected = meta.options.map((o) => o.id);
      const actual = Object.keys(item.options);
      const missing = expected.filter((o) => !actual.includes(o));
      const extra = actual.filter((o) => !expected.includes(o));
      if (missing.length > 0 || extra.length > 0) {
        routeErr(
          `分叉点 ${fork} 的分支段（章节 ${chapter}）的选项与 ${choiceFile(fork)} 不一致：` +
            [missing.length ? `缺少 ${missing.join('、')}` : '', extra.length ? `多出 ${extra.join('、')}` : '']
              .filter(Boolean)
              .join('，'),
        );
      }
    }
    for (const [option, list] of Object.entries(item.options)) {
      if (list.length === 0) routeErr(`分叉点 ${fork} 的选项 ${option}（章节 ${chapter}）没有步骤`);
      list.forEach((id, i) => {
        if (list.indexOf(id) !== i) routeErr(`步骤 ${id} 在分叉点 ${fork} 的选项 ${option} 里出现了多次`);
        else place(id, `branch:${k}`, `章节 ${chapter} 的 ${fork}/${option}`);
      });
    }

    // 汇合：分支段之后必须有所有选项共用的项；同一分叉点紧挨着的下一段分支算在一起。
    const next = flat[k + 1]?.item;
    const sameForkNext = next !== undefined && typeof next !== 'string' && 'branch' in next && next.branch === fork;
    const merges = next !== undefined && (typeof next === 'string' || 'choose' in next);
    if (!merges && !sameForkNext) {
      routeErr(
        `分叉点 ${fork} 的分支段（章节 ${chapter}）之后没有汇合点：后面要接一个所有选项共用的步骤或选择页` +
          (next !== undefined && typeof next !== 'string' && 'branch' in next ? `，现在接的是分叉点 ${next.branch} 的分支段` : ''),
      );
    }
  });

  for (const fork of chosen) {
    if (!branched.has(fork)) routeErr(`分叉点 ${fork} 有选择页，但没有任何分支段`);
  }
  for (const step of steps) {
    if (!placement.has(step.id)) errors.push({ file: stepFile(step.id), message: `步骤 ${step.id} 不在路线图里` });
  }
  for (const choice of choices) {
    if (!chosen.has(choice.id)) {
      errors.push({ file: choiceFile(choice.id), message: `路线图里没有分叉点 ${choice.id} 的选择页 { choose: ${choice.id} }` });
    }
  }

  // ---- 默认路线
  for (const [fork, option] of Object.entries(spec.defaults)) {
    const meta = forks.get(fork);
    if (!meta || !chosen.has(fork)) routeErr(`defaults 里的 ${fork} 不是路线图里的分叉点`);
    else if (!meta.options.some((o) => o.id === option)) routeErr(`defaults.${fork} 的值 ${option} 不是这个分叉点的选项`);
  }
  for (const fork of chosen) {
    if (!Object.hasOwn(spec.defaults, fork)) routeErr(`defaults 缺少分叉点 ${fork} 的默认选项`);
  }
}

/**
 * 枚举全部选项组合，沿“下一步”走：每条路线都要走到完成页，不重复经过同一项，上一步与下一步互逆（架构 §3 M2）。
 *
 * 这是兜底的回归检查：在 checkSemantics 的规则（位置唯一、choose 在 branch 之前、必须汇合）都满足时，
 * 现有的数据形状不会触发这里的错误；它防的是以后改动导航算法或放宽前置规则时引入的环和断链。
 */
function checkEveryRoute(map: RouteMap, errors: RouteError[]): void {
  const { data } = map;
  const forkIds = Object.keys(data.forks);
  let combos: Record<ForkId, OptionId>[] = [{}];
  for (const fork of forkIds) {
    combos = combos.flatMap((c) => data.forks[fork]!.options.map((o) => ({ ...c, [fork]: o.id })));
  }
  const first = data.chapters[0]!.items[0]!;
  if (first.kind === 'branch') return; // 不可能：checkSemantics 已报“分支段出现在选择页之前”
  const toAt = (stop: Stop): At | null =>
    stop.kind === 'done' ? null : stop.kind === 'step' ? { kind: 'step', id: stop.id } : { kind: 'choose', fork: stop.fork };
  const limit = Object.keys(data.steps).length + forkIds.length + 1;

  for (const combo of combos) {
    const label = forkIds.map((f) => `${f}=${combo[f]}`).join('，');
    const fail = (message: string) => errors.push({ file: ROUTE_FILE, message: `路线（${label}）${message}` });
    let at: At | null = first.kind === 'choose' ? { kind: 'choose', fork: first.fork } : { kind: 'step', id: first.id };
    let prev: Stop | null = null;
    const seen = new Set<string>();
    for (let n = 0; at; n++) {
      const key = at.kind === 'step' ? at.id : `choose/${at.fork}`;
      if (seen.has(key) || n > limit) {
        fail(`出现环：再次经过 ${key}`);
        break;
      }
      seen.add(key);
      const view = map.view(at, combo);
      if (forkIds.some((f) => view.choices[f] !== combo[f])) {
        fail(`在 ${key} 偏离了所选路线`);
        break;
      }
      if (!sameStop(view.prev, prev)) {
        fail(`在 ${key} 的上一步与来路不一致`);
        break;
      }
      prev = view.current;
      at = toAt(view.next);
    }
  }
}

function sameStop(a: Stop | null, b: Stop | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && pathOf(a) === pathOf(b);
}

// ================================================================ 编译

function compile(spec: RouteSpec, steps: StepMeta[], choices: ChoiceMeta[]): RouteData {
  const data: RouteData = { defaults: { ...spec.defaults }, chapters: [], steps: {}, forks: {} };
  for (const choice of choices) {
    data.forks[choice.id] = { title: choice.title, options: choice.options.map((o) => ({ id: o.id, title: o.title })) };
  }
  for (const step of steps) {
    data.steps[step.id] = {
      title: step.title,
      skippable: step.skippable ?? false,
      ...(step.skipLabel !== undefined ? { skipLabel: step.skipLabel } : {}),
      placeholder: step.placeholder ?? false,
    };
  }
  data.chapters = spec.chapters.map((c) => ({
    id: c.id,
    title: c.title,
    items: c.items.map((item): RouteDataItem => {
      if (typeof item === 'string') return { kind: 'step', id: item };
      if ('choose' in item) return { kind: 'choose', fork: item.choose };
      return { kind: 'branch', fork: item.branch, options: structuredClone(item.options) };
    }),
  }));
  return data;
}

// ================================================================ 运行时

/** 当前路线上的一项。 */
type Entry = { kind: 'step'; id: StepId; chapter: number } | { kind: 'choose'; fork: ForkId; chapter: number };

/**
 * 用序列化的 RouteData 重建 RouteMap（浏览器端）。RouteData 来自 `buildRouteMap(...).data`，
 * 这里不再校验。
 */
export function routeMapFromData(data: RouteData): RouteMap {
  /** 分支步骤 → 所属分叉点和它出现的选项（共享步骤有多个）。普通步骤不在表里。 */
  const branchHome = new Map<StepId, { fork: ForkId; options: OptionId[] }>();
  const plainSteps = new Set<StepId>();
  for (const chapter of data.chapters) {
    for (const item of chapter.items) {
      if (item.kind === 'step') plainSteps.add(item.id);
      if (item.kind !== 'branch') continue;
      for (const option of data.forks[item.fork]!.options) {
        for (const id of item.options[option.id] ?? []) {
          const home = branchHome.get(id) ?? { fork: item.fork, options: [] };
          home.options.push(option.id);
          branchHome.set(id, home);
        }
      }
    }
  }

  const isOption = (fork: ForkId, option: unknown): option is OptionId =>
    typeof option === 'string' && Object.hasOwn(data.forks, fork) && data.forks[fork]!.options.some((o) => o.id === option);

  /** 默认路线 ← 本机保存的选择 ← 当前页所属选项。 */
  function effectiveChoices(at: At, stored: Choices): Record<ForkId, OptionId> {
    const choices: Record<ForkId, OptionId> = {};
    const safeStored: Choices = isRecord(stored) ? stored : {}; // stored 来自 localStorage，不信任它的形状
    for (const fork of Object.keys(data.forks)) {
      const saved = Object.hasOwn(safeStored, fork) ? safeStored[fork] : undefined;
      choices[fork] = isOption(fork, saved) ? saved : data.defaults[fork]!;
    }
    if (at.kind === 'step') {
      const home = branchHome.get(at.id);
      if (home && !home.options.includes(choices[home.fork]!)) {
        const fallback = data.defaults[home.fork]!;
        choices[home.fork] = home.options.includes(fallback) ? fallback : home.options[0]!;
      }
    }
    return choices;
  }

  function sequence(choices: Record<ForkId, OptionId>): Entry[] {
    const entries: Entry[] = [];
    data.chapters.forEach((chapter, ci) => {
      for (const item of chapter.items) {
        if (item.kind === 'step') entries.push({ kind: 'step', id: item.id, chapter: ci });
        else if (item.kind === 'choose') entries.push({ kind: 'choose', fork: item.fork, chapter: ci });
        else for (const id of item.options[choices[item.fork]!] ?? []) entries.push({ kind: 'step', id, chapter: ci });
      }
    });
    return entries;
  }

  const toStop = (entry: Entry | undefined): Stop =>
    entry === undefined
      ? { kind: 'done' }
      : entry.kind === 'step'
        ? { kind: 'step', id: entry.id, title: data.steps[entry.id]!.title }
        : { kind: 'choose', fork: entry.fork, title: data.forks[entry.fork]!.title };

  function outline(at: At, choices: Record<ForkId, OptionId>): OutlineChapter[] {
    const stepItem = (id: StepId, onRoute: boolean): OutlineStep => ({
      kind: 'step',
      id,
      title: data.steps[id]!.title,
      skippable: data.steps[id]!.skippable,
      placeholder: data.steps[id]!.placeholder,
      onRoute,
      current: at.kind === 'step' && at.id === id,
    });
    return data.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      items: chapter.items.map((item): OutlineItem => {
        if (item.kind === 'step') return stepItem(item.id, true);
        if (item.kind === 'choose') {
          return {
            kind: 'choose',
            fork: item.fork,
            title: data.forks[item.fork]!.title,
            current: at.kind === 'choose' && at.fork === item.fork,
          };
        }
        return {
          kind: 'branch',
          fork: item.fork,
          options: data.forks[item.fork]!.options.map((option) => {
            const selected = choices[item.fork] === option.id;
            return {
              id: option.id,
              title: option.title,
              selected,
              steps: (item.options[option.id] ?? []).map((id) => stepItem(id, selected)),
            };
          }),
        };
      }),
    }));
  }

  function view(at: At, stored: Choices): RouteView {
    if (at.kind === 'step' && !plainSteps.has(at.id) && !branchHome.has(at.id)) {
      throw new Error(`不在路线图里的步骤：${at.id}`);
    }
    if (at.kind === 'choose' && !Object.hasOwn(data.forks, at.fork)) throw new Error(`不在路线图里的分叉点：${at.fork}`);

    const choices = effectiveChoices(at, stored);
    const entries = sequence(choices);
    const i = entries.findIndex((e) =>
      at.kind === 'step' ? e.kind === 'step' && e.id === at.id : e.kind === 'choose' && e.fork === at.fork,
    );
    const here = entries[i]!;

    let skipTo: Stop | null = null;
    if (here.kind === 'step' && data.steps[here.id]!.skippable) {
      let j = i;
      while (j < entries.length) {
        const e = entries[j]!;
        if (e.kind !== 'step' || e.chapter !== here.chapter || !data.steps[e.id]!.skippable) break;
        j++;
      }
      skipTo = toStop(entries[j]);
    }

    let progress: RouteView['progress'] = null;
    if (here.kind === 'step') {
      const inChapter = entries.filter((e) => e.kind === 'step' && e.chapter === here.chapter);
      const chapter = data.chapters[here.chapter]!;
      progress = { chapterId: chapter.id, chapter: chapter.title, index: inChapter.indexOf(here) + 1, total: inChapter.length };
    }

    return {
      choices,
      current: toStop(here),
      prev: i > 0 ? toStop(entries[i - 1]) : null,
      next: toStop(entries[i + 1]),
      skipTo,
      progress,
      outline: outline(at, choices),
    };
  }

  return { view, data };
}
