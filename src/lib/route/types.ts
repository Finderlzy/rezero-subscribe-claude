/**
 * M2 路线模块的公开类型（架构 §3 M2）。
 *
 * 术语见 CONTEXT.md：路线图、分叉点、选择页、旁支页、共享步骤、汇合点、可跳过步骤、操作视图。
 * 这里的类型在构建时（Node）和浏览器里共用，不依赖文件系统和浏览器 API。
 */

/** 步骤、选择页、旁支页共用一个标识空间，也是 URL `/<id>/`（ADR-0002） */
export type PageId = string;
export type ForkId = string;
export type OptionId = string;
export type ViewMode = 'operation' | 'principle';

/** 读者在各分叉点上的选择。没选的分叉点缺省（没有默认路线）。 */
export type Choices = Partial<Record<ForkId, OptionId>>;

/** 导航目标。`home` 是前言的上一步、后记的下一步（FR-11）。 */
export type Stop = { kind: 'step' | 'choose' | 'side'; id: PageId; title: string } | { kind: 'home' };

// ---------------------------------------------------------------- 输入

/**
 * route.yaml 解析后的结构。`buildRouteMap` 接收 `unknown` 并在运行时逐项校验，
 * 这个类型只说明合法的形状。
 */
export interface RouteSpec {
  chapters: RouteSpecChapter[];
  /** 旁支页：不在序列里，`returnTo` 是它挂靠的普通页（FR-19） */
  side?: Record<PageId, { returnTo: PageId }>;
}

export interface RouteSpecChapter {
  id: string;
  title: string;
  items: RouteSpecItem[];
}

/** 普通页 | 选择页（分叉点 + 页面标识）| 某个分叉点的一段分支（各选项的页面序列）。 */
export type RouteSpecItem = PageId | { choose: ForkId; page: PageId } | { branch: ForkId; options: Record<OptionId, PageId[]> };

/** 原理版 `principle/<id>.md` 里与路线有关的元数据（由 `loadSite()` 从 M1 映射而来，M2 不读文件）。 */
export interface PageMeta {
  id: PageId;
  title: string;
  /** 原理独有步骤：操作视图绕过 */
  principleOnly: boolean;
  skippable: boolean;
  /** 跳过按钮文案；缺省时由页面层决定 */
  skipLabel?: string;
  /** 只有选择页有：选项，顺序即选择页和目录里的顺序 */
  options?: { id: OptionId; title: string }[];
}

// ---------------------------------------------------------------- 错误

/** 一条路线图校验错误。`file` 相对 `src/content/`，如 `route.yaml`、`principle/preface.md`。 */
export interface RouteError {
  file: string;
  message: string;
}

// ---------------------------------------------------------------- 编译结果

/** 可序列化的路线数据：浏览器用它重建 RouteMap（`routeMapFromData`），不再另取数据。 */
export interface RouteData {
  chapters: RouteDataChapter[];
  /** 路线图里的全部页面（含选择页和旁支页） */
  pages: Record<PageId, RouteDataPage>;
  forks: Record<ForkId, RouteDataFork>;
  /** 旁支页 → 挂靠的普通页 */
  side: Record<PageId, PageId>;
}

export interface RouteDataChapter {
  id: string;
  title: string;
  items: RouteDataItem[];
}

export type RouteDataItem =
  | { kind: 'step'; id: PageId }
  | { kind: 'choose'; fork: ForkId; id: PageId }
  | { kind: 'branch'; fork: ForkId; options: Record<OptionId, PageId[]> };

export interface RouteDataPage {
  title: string;
  principleOnly: boolean;
  skippable: boolean;
  skipLabel?: string;
}

export interface RouteDataFork {
  /** 选择页的标识 */
  page: PageId;
  options: { id: OptionId; title: string }[];
}

// ---------------------------------------------------------------- 页面视图

export interface Progress {
  chapterId: string;
  /** 章节标题，例如“准备节点和住宅 IP” */
  chapter: string;
  /** 章节序号，从 0 开始（design：“从零开始”的章节号） */
  chapterNo: number;
  /** 当前步骤在本章（当前路线和视图）步骤中的序号，从 1 开始；数不清时（未选的分支、选择页、旁支页）没有 */
  index?: number;
  total?: number;
}

export interface OutlineStep {
  kind: 'step';
  id: PageId;
  title: string;
  skippable: boolean;
  principleOnly: boolean;
  /** 是否在当前路线和视图上：其他选项的步骤、操作视图下的原理独有步骤为 false；分叉点没选时它的各选项都算在路线上 */
  onRoute: boolean;
  current: boolean;
}

export interface OutlineChoose {
  kind: 'choose';
  fork: ForkId;
  id: PageId;
  title: string;
  current: boolean;
}

/** 目录里的“或”分组：一个分叉点的一段分支。共享步骤会出现在它所属的每个选项下。 */
export interface OutlineBranch {
  kind: 'branch';
  fork: ForkId;
  options: { id: OptionId; title: string; selected: boolean; steps: OutlineStep[] }[];
}

export type OutlineItem = OutlineStep | OutlineChoose | OutlineBranch;

export interface OutlineChapter {
  id: string;
  title: string;
  items: OutlineItem[];
}

/** 一个页面需要的全部导航信息。 */
export interface RouteView {
  /** 生效的选择 = 本机保存的选择（失效项忽略）← 当前页所属选项；没选的分叉点缺省 */
  choices: Choices;
  current: Stop;
  /** 旁支页为 null；第一页是首页 */
  prev: Stop | null;
  /** 选择页未选时为 null（FR-12）；最后一页是首页 */
  next: Stop | null;
  /** 只有可跳过步骤才有：跳过从当前页开始连续的可跳过步骤后的第一项（可以跨章节，FR-15） */
  skipTo: Stop | null;
  /** 只有旁支页才有：它挂靠的普通页（FR-19） */
  returnTo: Stop | null;
  progress: Progress;
  outline: OutlineChapter[];
}

export interface RouteMap {
  /** `stored` 是本机保存的选择，可以为空；其中失效的分叉点或选项会被忽略。不在路线图里的 `at` 会抛错。 */
  view(at: PageId, stored: Choices, mode: ViewMode): RouteView;
  /**
   * 只按本机选择画的目录：和 `view().outline` 不同，不让当前页所属选项覆盖本机选择，
   * 所以在目录里改选后，当前页可以落在其他路线上（FR-14）；没有当前页（首页、参考页、找不到页）时传 null。
   */
  outline(stored: Choices, current: PageId | null, mode: ViewMode): OutlineChapter[];
  readonly data: RouteData;
}
