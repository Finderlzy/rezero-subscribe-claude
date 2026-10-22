/**
 * 小节锚点（架构 §13.4，ADR-0006）：把读者可读的小节标题解析成正文里的 id。
 *
 * v3 的页面固定原理视图、只有一版正文（用户 2026-10-22 决定），所以不再需要按视图选锚点；
 * 需要关心的只有两件事：
 * - 构建时把 `[[页面#小标题]]` 和同页的 `[文字](#小标题)` 解析成 github-slugger 生成的 slug，
 *   目标不存在就报错（FR-05 的“校验”）；
 * - 跳转表（V09）的 `section` 也按同一套规则找小节。
 */

/** 正文里的一个标题：`slug` 是渲染后标题的 id，`text` 是去掉行内记号后的标题文字 */
export interface AnchorHeading {
  slug: string;
  text: string;
  /** ATX 标题级别（2 = h2）；跳转表的 `section` 只认 h2、h3（ADR-0006），双链解析不看级别 */
  depth?: number;
}

/** 规范化标题文字：全角半角、大小写和连续空白不影响匹配（“ＩＰ”“ip”算同一个） */
export function normalizeSectionText(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * 按标题文字找唯一的 slug：先精确匹配，再按 `normalizeSectionText` 匹配。
 * 同一文字出现多次时页面里会生成 `-1`、`-2` 的 id，无法确定是哪一个小节，返回 undefined。
 */
export function sectionAnchor(headings: readonly AnchorHeading[], text: string): string | undefined {
  const wanted = text.trim();
  if (wanted === '') return undefined;

  const exact = headings.filter((heading) => heading.text === wanted);
  if (exact.length === 1) return exact[0]!.slug;
  if (exact.length > 1) return undefined;

  const normalized = normalizeSectionText(wanted);
  if (normalized === '') return undefined;
  const matches = headings.filter((heading) => normalizeSectionText(heading.text) === normalized);
  return matches.length === 1 ? matches[0]!.slug : undefined;
}

/**
 * 链接里的片段既可能是标题文字（`#第一步：购买海外 VPS`），也可能已经是 slug（`#第一步购买海外-vps`）。
 * 先按文字找，再按 slug 找；两者都找不到时返回 undefined，由调用方报错。
 */
export function resolveSectionAnchor(headings: readonly AnchorHeading[], fragment: string): string | undefined {
  return sectionAnchor(headings, fragment) ?? headings.find((heading) => heading.slug === fragment.trim())?.slug;
}

/**
 * 页面布局自带的 id，不是正文小节：`#main` 是“跳到正文”的落点，构建校验不把它当小节；
 * 页面脚本在 `.prose` 里找不到它，也自然交给浏览器。
 */
export const LAYOUT_ANCHOR_IDS: ReadonlySet<string> = new Set(['main']);

/**
 * 把 `location.hash` 或链接里的 `#…` 解码成小节名；没有 `#` 或只有 `#` 时返回 undefined。
 * 百分号编码写坏时按原文返回，交给后面的“小节不存在”判断，不让一个坏链接把脚本弄崩。
 */
export function hashFragment(hash: string): string | undefined {
  if (!hash.startsWith('#')) return undefined;
  const raw = hash.slice(1);
  if (raw === '') return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
