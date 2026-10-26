/**
 * M9 读者反馈（需求 v0.16、FR-118–FR-125）。
 *
 * 读者反馈是作者维护的站务数据，不是从重写稿导入的正文（不受 ADR-0005 约束）：唯一来源是
 * src/content/feedback.yaml，截图放在 src/assets/feedback/。这里只放纯函数——解析、校验和取首页精选；
 * 读文件和图片目录交给构建期（./load.ts），单元测试可以直接传普通对象。
 *
 * 术语见 CONTEXT.md：读者反馈、反馈截图、精选。
 */

/** 读者反馈页的地址；发布后不能改（FR-118、ADR-0002 的口径） */
export const FEEDBACK_PATH = '/feedback/';

/** 首页精选最多几张（FR-121） */
export const FEATURED_MAX = 6;

/** alt 的长度上限（FR-119）：按字符数算，中文一个算一个 */
export const ALT_MAX = 80;

/** 一张反馈截图：feedback.yaml 里的一项，校验通过后就是这个形状 */
export interface FeedbackEntry {
  /** src/assets/feedback/ 下的文件名 */
  image: string;
  /** 截图里写了什么：给读屏和图片挂掉时用，页面上不显示 */
  alt: string;
  /** 是否上首页精选 */
  featured: boolean;
}

/** 校验错误：entry 是第几条（从 1 数），0 表示整份文件或图片目录的问题 */
export interface FeedbackProblem {
  entry: number;
  message: string;
}

function charLength(value: string): number {
  return Array.from(value).length;
}

/**
 * 解析并校验 feedback.yaml 的内容（已经是 JS 值）。`images` 是 src/assets/feedback/ 里现有的文件名。
 * 有错就返回全部问题（FR-125 要求指出第几条），没有错时按文件里的书写顺序返回条目（页面就按这个顺序排）。
 */
export function parseFeedback(value: unknown, images: readonly string[]): { entries: FeedbackEntry[]; problems: FeedbackProblem[] } {
  const problems: FeedbackProblem[] = [];
  const entries: FeedbackEntry[] = [];
  if (value === null || value === undefined) value = [];
  if (!Array.isArray(value)) {
    problems.push({ entry: 0, message: 'feedback.yaml 的最外层必须是一个数组（每张截图一项）' });
    return { entries, problems };
  }

  const available = new Set(images);
  const used = new Map<string, number>();

  value.forEach((raw, index) => {
    const at = index + 1;
    const fail = (message: string) => problems.push({ entry: at, message });
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      fail('一张截图必须是对象（image、alt）');
      return;
    }
    const item = raw as Record<string, unknown>;
    for (const key of Object.keys(item)) {
      if (!['image', 'alt', 'featured'].includes(key)) fail(`不认识的字段 ${key}（只认 image、alt、featured）`);
    }

    const { image, alt, featured } = item;
    if (typeof image !== 'string' || image.trim() === '') {
      fail('缺少 image（src/assets/feedback/ 下的文件名）');
    } else if (!available.has(image.trim())) {
      fail(`image 写的 ${image.trim()} 不在 src/assets/feedback/ 里`);
    } else if (used.has(image.trim())) {
      fail(`image ${image.trim()} 和第 ${used.get(image.trim())} 条重复了`);
    } else {
      used.set(image.trim(), at);
    }
    if (typeof alt !== 'string' || alt.trim() === '') fail('缺少 alt（截图里写了什么，给读屏用）');
    else if (charLength(alt.trim()) > ALT_MAX) fail(`alt 有 ${charLength(alt.trim())} 个字符，超过 ${ALT_MAX} 个`);
    if (featured !== undefined && typeof featured !== 'boolean') fail(`featured 只能是 true 或 false（现在是 ${JSON.stringify(featured)}）`);

    if (problems.some((problem) => problem.entry === at)) return;
    entries.push({ image: (image as string).trim(), alt: (alt as string).trim(), featured: featured === true });
  });

  const featuredCount = entries.filter((entry) => entry.featured).length;
  if (featuredCount > FEATURED_MAX) {
    problems.push({ entry: 0, message: `featured 有 ${featuredCount} 张，首页最多放 ${FEATURED_MAX} 张` });
  }
  // 放进目录却没写进 feedback.yaml 的截图：多半是忘了登记，构建失败提醒（FR-125）
  for (const name of images) {
    if (!used.has(name)) problems.push({ entry: 0, message: `src/assets/feedback/${name} 没有写进 feedback.yaml` });
  }

  return { entries, problems };
}

/** 首页的精选（FR-121）：标了 featured 的，按文件里的书写顺序 */
export function featuredEntries<T extends FeedbackEntry>(entries: readonly T[]): T[] {
  return entries.filter((entry) => entry.featured);
}

/** 把问题列表拼成构建报错的一行行文字（FR-125），每行带文件和“第几条” */
export function formatFeedbackProblems(problems: readonly FeedbackProblem[]): string[] {
  return problems.map(({ entry, message }) =>
    entry === 0 ? `src/content/feedback.yaml：${message}` : `src/content/feedback.yaml 第 ${entry} 条：${message}`,
  );
}
