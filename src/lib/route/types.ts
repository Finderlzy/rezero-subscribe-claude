/**
 * M2 路线模块的公开类型（架构 §3 M2）。
 *
 * 术语见 CONTEXT.md：路线图、分叉点、共享步骤、汇合点、可跳过步骤、默认路线。
 * 这里的类型在构建时（Node）和浏览器里共用，不依赖文件系统和浏览器 API。
 */

export type StepId = string;
export type ForkId = string;
export type OptionId = string;

/** 读者在各分叉点上的选择。缺省的分叉点按默认路线。 */
export type Choices = Partial<Record<ForkId, OptionId>>;

/** 当前所在的页面：步骤页或选择页。 */
export type At = { kind: 'step'; id: StepId } | { kind: 'choose'; fork: ForkId };

/** 导航目标。`title` 用于“下一步：<标题>”；完成页的标题由页面层决定。 */
export type Stop =
  | { kind: 'step'; id: StepId; title: string }
  | { kind: 'choose'; fork: ForkId; title: string }
  | { kind: 'done' };

// ---------------------------------------------------------------- 输入

/**
 * route.yaml 解析后的结构。`buildRouteMap` 接收 `unknown` 并在运行时逐项校验，
 * 这个类型只说明合法的形状。
 */
export interface RouteSpec {
  /** 默认路线：每个分叉点一个默认选项。 */
  defaults: Record<ForkId, OptionId>;
  chapters: RouteSpecChapter[];
}

export interface RouteSpecChapter {
  id: string;
  title: string;
  items: RouteSpecItem[];
}

/** 普通步骤 | 选择页 | 某个分叉点的一段分支（各选项的步骤序列）。 */
export type RouteSpecItem =
  | StepId
  | { choose: ForkId }
  | { branch: ForkId; options: Record<OptionId, StepId[]> };

/** 步骤文件 `steps/<id>.md` 中与路线有关的元数据（由 M1 提供）。 */
export interface StepMeta {
  id: StepId;
  title: string;
  skippable?: boolean;
  /** 跳过按钮文案；缺省时由页面层用“已有，跳过”。 */
  skipLabel?: string;
  placeholder?: boolean;
}

/** 选择页文件 `choices/<fork-id>.md` 中与路线有关的元数据（由 M1 提供）。 */
export interface ChoiceMeta {
  id: ForkId;
  /** 选择页标题，用于“下一步：<标题>”和目录（M1 可取 frontmatter 的 question）。 */
  title: string;
  /** 选项，顺序即选择页和目录里的顺序。 */
  options: { id: OptionId; title: string }[];
}

// ---------------------------------------------------------------- 错误

/** 一条路线图校验错误。`file` 相对 `src/content/`，如 `route.yaml`、`steps/run-script.md`。 */
export interface RouteError {
  file: string;
  message: string;
}

// ---------------------------------------------------------------- 编译结果

/** 可序列化的路线数据：浏览器用它重建 RouteMap（`routeMapFromData`），不再另取数据。 */
export interface RouteData {
  defaults: Record<ForkId, OptionId>;
  chapters: RouteDataChapter[];
  steps: Record<StepId, RouteDataStep>;
  forks: Record<ForkId, RouteDataFork>;
}

export interface RouteDataChapter {
  id: string;
  title: string;
  items: RouteDataItem[];
}

export type RouteDataItem =
  | { kind: 'step'; id: StepId }
  | { kind: 'choose'; fork: ForkId }
  | { kind: 'branch'; fork: ForkId; options: Record<OptionId, StepId[]> };

export interface RouteDataStep {
  title: string;
  skippable: boolean;
  skipLabel?: string;
  placeholder: boolean;
}

export interface RouteDataFork {
  title: string;
  options: { id: OptionId; title: string }[];
}

// ---------------------------------------------------------------- 页面视图

export interface Progress {
  chapterId: string;
  /** 章节标题，例如“一、准备住宅 IP”。 */
  chapter: string;
  /** 当前步骤在本章（当前路线）步骤中的序号，从 1 开始；选择页不计入。 */
  index: number;
  total: number;
}

export interface OutlineStep {
  kind: 'step';
  id: StepId;
  title: string;
  skippable: boolean;
  placeholder: boolean;
  /** 是否在当前路线上；不在的显示为“其他路线”。 */
  onRoute: boolean;
  current: boolean;
}

export interface OutlineChoose {
  kind: 'choose';
  fork: ForkId;
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
  /** 实际生效的选择 = 默认路线 ← 本机保存的选择 ← 当前页所属选项。总是覆盖全部分叉点。 */
  choices: Record<ForkId, OptionId>;
  current: Stop;
  /** 路线第一项时为 null。 */
  prev: Stop | null;
  /** 最后一项之后是 `{ kind: 'done' }`。 */
  next: Stop;
  /** 只有可跳过步骤才有：跳过本章内从当前步骤起连续的可跳过步骤后的第一项。 */
  skipTo: Stop | null;
  /** 选择页为 null。 */
  progress: Progress | null;
  outline: OutlineChapter[];
}

export interface RouteMap {
  /** `stored` 是本机保存的选择，可以为空；其中失效的分叉点或选项会被忽略。不在路线图里的 `at` 会抛错。 */
  view(at: At, stored: Choices): RouteView;
  /**
   * 只按本机选择画的目录：和 `view().outline` 不同，不让当前页所属选项覆盖本机选择，
   * 所以在目录里改选后，当前页可以落在“其他路线”上（FR-14）；没有当前页（常见问题、找不到页）时传 null。
   */
  outline(stored: Choices, current: At | null): OutlineChapter[];
  readonly data: RouteData;
}
