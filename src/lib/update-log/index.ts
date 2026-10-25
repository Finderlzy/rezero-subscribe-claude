/**
 * M7 更新日志（需求 v0.13、FR-80–FR-89）。
 *
 * 更新日志是作者维护的站务数据，不是从重写稿导入的正文（不受 ADR-0005 约束）：唯一来源是
 * src/content/update-log.yaml，这里只放纯函数——解析、校验、分类、排序和取首页那 5 条。
 * 读文件交给构建期，所以这个模块不碰文件系统，单元测试可以直接传普通对象。
 *
 * 术语见 CONTEXT.md：更新日志、更新条目、更新类型、置顶。
 */

/** 更新类型：对应三个分类 tab（FR-81）；all 只是「全部」这个视图，不是条目的类型 */
export type UpdateType = 'notice' | 'content' | 'site';

/** 「全部」+ 三个分类，界面上按这个顺序排（FR-81） */
export type UpdateCategory = 'all' | UpdateType;

export const UPDATE_CATEGORIES: readonly UpdateCategory[] = ['all', 'notice', 'content', 'site'];

/** 分类的显示文字（界面和测试都用这一份） */
export const UPDATE_CATEGORY_LABEL: Record<UpdateCategory, string> = {
  all: '全部',
  notice: '公告',
  content: '内容',
  site: '站点',
};

export const UPDATE_TYPE_LABEL: Record<UpdateType, string> = {
  notice: '公告',
  content: '内容',
  site: '站点',
};

/** 标题和内容的长约束（FR-83）。按字符数（Array.from）算，不按字节，中文一个算一个 */
export const TITLE_MAX = 40;
export const BODY_MAX = 200;

/** 首页“最近更新”的条数（FR-87） */
export const HOME_LATEST = 5;

/** 更新日志页的地址；发布后不能改（FR-80、ADR-0002 的口径） */
export const UPDATE_LOG_PATH = '/update-log/';

/** 一个更新条目：update-log.yaml 里的一项，校验通过后就是这个形状 */
export interface UpdateEntry {
  /** 发布日期，YYYY-MM-DD（FR-83） */
  date: string;
  type: UpdateType;
  /** 一句话标题，不超过 TITLE_MAX 个字符 */
  title: string;
  /** 内容，不超过 BODY_MAX 个字符 */
  body: string;
  /** 公告可以置顶（FR-84）；只有 notice 合法 */
  pinned: boolean;
  /** 被改动的页面标识（可选，FR-83）；渲染成指向该页的文字链接 */
  page?: string;
}

/** 校验错误：entry 是第几条（从 1 数），和 FR-86 的输出口径一致 */
export interface UpdateLogProblem {
  entry: number;
  message: string;
}

/** YYYY-MM-DD，并且是日历上真实存在的一天（2026-02-30 不算） */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** value 是不是合法的 YYYY-MM-DD */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DAY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** 按字符数算长度（中文、emoji 都算一个） */
export function charLength(value: string): number {
  return Array.from(value).length;
}

function isUpdateType(value: unknown): value is UpdateType {
  return value === 'notice' || value === 'content' || value === 'site';
}

/**
 * 解析并校验 update-log.yaml 的内容（已经是 JS 值）。
 * 有错就返回全部问题（FR-86 要求指出第几条），没有错时返回**未排序**的条目（排序见 sortEntries）。
 * 不在这里判断 page 是否存在——那要路线图，由 loadSite() 接上。
 */
export function parseUpdateLog(value: unknown, today: string): { entries: UpdateEntry[]; problems: UpdateLogProblem[] } {
  const problems: UpdateLogProblem[] = [];
  const entries: UpdateEntry[] = [];
  if (value === null || value === undefined) return { entries, problems };
  if (!Array.isArray(value)) {
    problems.push({ entry: 0, message: 'update-log.yaml 的最外层必须是一个数组（每条更新一项）' });
    return { entries, problems };
  }

  value.forEach((raw, index) => {
    const at = index + 1;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      problems.push({ entry: at, message: '一条更新必须是对象（date、type、title、body）' });
      return;
    }
    const item = raw as Record<string, unknown>;
    const fail = (message: string) => problems.push({ entry: at, message });

    for (const key of Object.keys(item)) {
      if (!['date', 'type', 'title', 'body', 'pinned', 'page'].includes(key)) {
        fail(`不认识的字段 ${key}（只认 date、type、title、body、pinned、page）`);
      }
    }

    const { date, type, title, body, pinned, page } = item;
    if (!isIsoDate(date)) fail(`date 要写成 YYYY-MM-DD（现在是 ${JSON.stringify(date)}）`);
    else if (today.length === 10 && date > today) fail(`date（${date}）晚于构建当天（${today}），更新日志不能预约未来`);
    if (!isUpdateType(type)) fail(`type 只能是 notice、content、site（现在是 ${JSON.stringify(type)}）`);
    if (typeof title !== 'string' || title.trim() === '') fail('缺少 title（一句话标题）');
    else if (charLength(title.trim()) > TITLE_MAX) fail(`title 有 ${charLength(title.trim())} 个字符，超过 ${TITLE_MAX} 个`);
    if (typeof body !== 'string' || body.trim() === '') fail('缺少 body（内容）');
    else if (charLength(body.trim()) > BODY_MAX) fail(`body 有 ${charLength(body.trim())} 个字符，超过 ${BODY_MAX} 个`);
    if (pinned !== undefined && typeof pinned !== 'boolean') fail(`pinned 只能是 true 或 false（现在是 ${JSON.stringify(pinned)}）`);
    else if (pinned === true && type !== 'notice') fail('只有公告（type: notice）能置顶');
    if (page !== undefined && (typeof page !== 'string' || page.trim() === '')) fail(`page 要写页面标识（现在是 ${JSON.stringify(page)}）`);

    // 有问题的那条不进结果：构建在 loadSite() 那里就会失败，不会渲染出半个条目
    if (problems.some((problem) => problem.entry === at)) return;

    entries.push({
      date: date as string,
      type: type as UpdateType,
      title: (title as string).trim(),
      body: (body as string).trim(),
      pinned: pinned === true,
      ...(page !== undefined && { page: (page as string).trim() }),
    });
  });

  return { entries, problems };
}

/**
 * 排序（FR-84）：分类内部按日期倒序；同一天保持文件里的书写顺序（sort 是稳定排序，这一条靠它）。
 * 置顶只在「全部」和「公告」里生效，而且是**前置在整组之前**，置顶的条目之间仍按日期倒序。
 */
export function sortEntries(entries: readonly UpdateEntry[], category: UpdateCategory): UpdateEntry[] {
  const byDateDesc = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (category !== 'all' && category !== 'notice') return byDateDesc;
  const pinned = byDateDesc.filter((entry) => entry.pinned);
  const rest = byDateDesc.filter((entry) => !entry.pinned);
  return [...pinned, ...rest];
}

/** 一个分类里要显示的条目（all 返回全部） */
export function entriesOf(entries: readonly UpdateEntry[], category: UpdateCategory): UpdateEntry[] {
  const scoped = category === 'all' ? entries : entries.filter((entry) => entry.type === category);
  return sortEntries(scoped, category);
}

/** 四个分类各自要显示的条目——页面静态标记里四个分类各渲染一份（FR-82，没有 JS 时全都可见） */
export function entriesByCategory(entries: readonly UpdateEntry[]): { category: UpdateCategory; entries: UpdateEntry[] }[] {
  return UPDATE_CATEGORIES.map((category) => ({ category, entries: entriesOf(entries, category) }));
}

/** 首页“最近更新”的 5 条（FR-87）：和「全部」分类排在最前的 5 条完全一致 */
export function latestEntries(entries: readonly UpdateEntry[], limit = HOME_LATEST): UpdateEntry[] {
  return entriesOf(entries, 'all').slice(0, limit);
}

/** 校验通过、并且 page 已经解析出标题的条目 */
export interface ResolvedUpdateEntry extends UpdateEntry {
  /** page 指向的页面标题；没有 page 时没有 */
  pageTitle?: string;
}

/**
 * 条目里 page 指向的页面标题（FR-83）：pages 是“页面或参考页的标识 → 标题”。
 * 指向不存在的页面时构建失败（FR-86）；这里返回问题，由 loadSite() 拼进构建报错。
 */
export function resolveEntryPages(
  entries: readonly UpdateEntry[],
  pageTitles: ReadonlyMap<string, string>,
): { resolved: ResolvedUpdateEntry[]; problems: UpdateLogProblem[] } {
  const problems: UpdateLogProblem[] = [];
  const resolved: ResolvedUpdateEntry[] = [];
  entries.forEach((entry, index) => {
    if (entry.page === undefined) {
      resolved.push({ ...entry });
      return;
    }
    const title = pageTitles.get(entry.page);
    if (title === undefined) {
      problems.push({ entry: index + 1, message: `page 写的 ${entry.page} 不是路线图里的页面或参考页` });
      return;
    }
    resolved.push({ ...entry, pageTitle: title });
  });
  return { resolved, problems };
}

/** 把问题列表拼成构建报错的一行行文字（FR-86），每行带文件和“第几条” */
export function formatUpdateLogProblems(problems: readonly UpdateLogProblem[]): string[] {
  return problems.map(({ entry, message }) =>
    entry === 0 ? `src/content/update-log.yaml：${message}` : `src/content/update-log.yaml 第 ${entry} 条：${message}`,
  );
}