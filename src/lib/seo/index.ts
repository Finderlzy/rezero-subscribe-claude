/**
 * 站点 SEO 的纯逻辑（2026-10-25）：每页搜索摘要（description）、分享卡片（Open Graph / Twitter）和
 * 结构化数据（JSON-LD）用的数据都从这里出。
 *
 * 摘要的唯一来源是 src/content/seo.yaml（作者直接改，不是导入的正文，不受 ADR-0005 约束），
 * 读文件和校验在 ./load.ts，这里只放不碰文件系统的函数，单元测试可以直接传普通对象。
 *
 * 站点在搜索引擎里能拿到的东西：canonical、sitemap（含 lastmod）、robots.txt 早已有；
 * 这一层补的是搜索结果里的两行摘要、分享到微信/Telegram/X 等地方时的卡片，以及 Article/BreadcrumbList 结构化数据。
 */

/** 一条摘要：`seo.yaml` 里的一页，校验通过后就是这个形状 */
export interface SeoEntry {
  /** 页面键：路线图页面标识、参考页标识（`ip-tests/<id>`），或 `/`、`/update-log/` 这类没有正文文件的页面 */
  key: string;
  /** 搜索摘要，写进 <meta name="description"> */
  description: string;
  /** 分享卡片的大标题；不写时用页面标题 */
  title?: string;
}

/** 摘要的长度上下限（按字符数算，中文一个字算一个） */
export const DESCRIPTION_MIN = 40;
export const DESCRIPTION_MAX = 118;

/**
 * 页面键 → 摘要。`/`、`/update-log/` 和 `/agent-skill/` 是固定键：
 * 它们没有正文文件，但同样是独立页面，也需要自己的摘要。
 */
export const HOME_KEY = '/';
export const UPDATE_LOG_KEY = '/update-log/';
/** Agent Skill 页的页面键（v0.16、FR-115），值就是 src/lib/agent-skill 的 AGENT_SKILL_PATH */
export const AGENT_SKILL_KEY = '/agent-skill/';

/** 校验问题：key 是页面键（或出错的那一行），和构建报错的口径一致 */
export interface SeoProblem {
  key: string;
  message: string;
}

/**
 * 校验 `seo.yaml` 解析出来的对象。
 *
 * `pageKeys` 是构建时所有需要摘要的页面键：路线图的页面、参考页、首页和更新日志页。
 * 少写一页、写了一个不存在的键、摘要太长或太短都算问题——内容出错必须让构建失败。
 */
export function parseSeo(raw: unknown, pageKeys: readonly string[]): { entries: SeoEntry[]; problems: SeoProblem[] } {
  const problems: SeoProblem[] = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { entries: [], problems: [{ key: 'seo.yaml', message: '顶层必须是一组“页面键: 摘要”的映射' }] };
  }
  const entries: SeoEntry[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      problems.push({ key, message: '每一页要写成映射，至少有 description 一项' });
      continue;
    }
    const record = value as Record<string, unknown>;
    for (const field of Object.keys(record)) {
      if (field !== 'description' && field !== 'title') {
        problems.push({ key, message: `不认识的字段 ${field}（只能写 description 和 title）` });
      }
    }
    const description = record.description;
    if (typeof description !== 'string' || description.trim() === '') {
      problems.push({ key, message: '缺少 description，或者它是空的' });
      continue;
    }
    if (description !== description.trim()) {
      problems.push({ key, message: 'description 前后多了空格或换行' });
    }
    const length = Array.from(description).length;
    if (length < DESCRIPTION_MIN) {
      problems.push({ key, message: `description 只有 ${length} 个字符，至少要 ${DESCRIPTION_MIN} 个：写清这一页讲什么、看完能做什么` });
    }
    if (length > DESCRIPTION_MAX) {
      problems.push({ key, message: `description 有 ${length} 个字符，超过 ${DESCRIPTION_MAX} 个，搜索结果里会被截断` });
    }
    const title = record.title;
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        problems.push({ key, message: 'title 写了就要是一句非空的文字' });
        continue;
      }
      if (title !== title.trim()) problems.push({ key, message: 'title 前后多了空格或换行' });
    }
    if (!pageKeys.includes(key)) {
      problems.push({ key, message: '不是站点的页面：不存在这个页面标识，也没有这个固定键' });
    }
    entries.push({ key, description, ...(typeof title === 'string' && title.trim() !== '' && { title }) });
  }

  const written = new Set(entries.map((entry) => entry.key));
  for (const key of pageKeys) {
    if (!written.has(key)) problems.push({ key, message: '缺少这一页的摘要' });
  }
  return { entries, problems };
}

/** 把校验问题排成可以直接放进构建报错的几行，每行标明 seo.yaml 的哪个键 */
export function formatSeoProblems(problems: readonly SeoProblem[]): string[] {
  return problems.map(({ key, message }) => `src/content/seo.yaml 的 ${key}：${message}`);
}

/** 首页的兜底摘要（还没在 seo.yaml 里写时用它）；数据写全了就用不到 */
const DEFAULT_DESCRIPTION = '让 Claude 能看到的每一项信息，都指向一个 Claude 支持地区的普通用户，并且用得像个普通人。';

/** 按页面键取摘要；没写时回落到站点的默认一句，构建期的校验会在这之前就报错 */
export function describe(
  entries: ReadonlyMap<string, SeoEntry> | readonly SeoEntry[],
  key: string,
  fallback = DEFAULT_DESCRIPTION,
): string {
  const entry = 'get' in entries ? entries.get(key) : (entries as readonly SeoEntry[]).find((item) => item.key === key);
  return entry?.description ?? fallback;
}

// ---------------------------------------------------------------- 结构化数据

export const SITE_NAME = 'Re:从零开始订阅 claude';
export const SITE_LANG = 'zh-CN';

/** 一篇文章（路线图里的页面、参考页、更新日志）在 JSON-LD 里的样子 */
export interface ArticleJsonLdInput {
  headline: string;
  description: string;
  /** 规范网址（绝对地址） */
  url: string;
  /** 首页地址（绝对地址），当发布者 */
  siteUrl: string;
  lang?: string;
}

/**
 * 正文页的 Article 结构化数据：告诉谷歌这一页是一篇文章，标题、摘要、作者和站点分别是什么。
 * 不写 datePublished：这些页面的“发布日”没有可信来源（lastmod 只有日期、没有时刻）。
 */
export function articleJsonLd({ headline, description, url, siteUrl, lang = SITE_LANG }: ArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url,
    inLanguage: lang,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
  };
}

/** 一条面包屑：显示文字 + 绝对地址 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * 面包屑结构化数据：搜索结果里显示 “re0claude.us.ci › 准备节点和住宅 IP › 方案一” 这样的路径，比裸网址好点。
 * 每一项都要是真实存在的地址（首页、章节锚点、参考页上级）。
 */
export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** 首页的 WebSite 结构化数据：让谷歌认识站点名称和语言，知道要搜站名时找这个站 */
export function websiteJsonLd({ siteUrl, description, lang = SITE_LANG }: { siteUrl: string; description: string; lang?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: '从零开始订阅 Claude',
    url: siteUrl,
    description,
    inLanguage: lang,
  };
}

/**
 * 把结构化数据序列化成可以直接放进 <script type="application/ld+json"> 的字符串。
 * `<` 转义掉，标题或摘要里出现 `</script>` 也不会提前结束脚本（和路由数据的内嵌口径一致）。
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
