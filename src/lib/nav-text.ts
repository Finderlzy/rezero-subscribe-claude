import type { Progress, RouteDataChapter, Stop } from './route/types';

/**
 * 导航文案（design §4.1、§4.5，v2.2）。构建时的页面和浏览器里的页面脚本共用，两边写出的文字一致。
 * 页头色带上方一行眉题写清“这是哪一步”：`第 1 章 · 准备节点和住宅 IP · 第 2 步，共 10 步`；
 * 选择页写“· 选择”，旁支页写“· 旁支”，附录里的页面写“附录 · …”（W5）。
 */

/** 首页作为导航目标时的文字（design §4.1，FR-11）：后记的下一步写“回到首页”，前言的上一步写“首页” */
export const HOME_TITLE = { prev: '首页', next: '回到首页' } as const;

/** 能数清第几步时的序号和步数（FR-10）：普通页、且本章前面没有没选的分叉点；选择页、旁支页没有 */
function stepCount(progress: Progress, current?: Stop): { index: number; total: number } | null {
  if (current !== undefined && current.kind !== 'step') return null;
  if (progress.index === undefined || progress.total === undefined) return null;
  return { index: progress.index, total: progress.total };
}

/** 眉题里“第 n 章”：章号和首页、目录的 00–04、章首页的 CHAPTER 00 一样从 0 起，用阿拉伯数字，不补零（v2.2 D10、计划 W2 第 1 条） */
export function chapterText(progress: Progress): string {
  return `第 ${progress.chapterNo} 章`;
}

/**
 * 眉题的读屏文字（design §4.1）：“准备节点和住宅 IP，第 2 步，共 5 步”；数不清时和选择页只有章节名（FR-10）；
 * 旁支页“<章节名> · 旁支”（design §4.6）。眉题看得见的部分不进无障碍树，由这句代读。
 */
export function progressText(progress: Progress, current?: Stop): string {
  if (current?.kind === 'side') return `${progress.chapter}${eyebrowSuffix(current)}`;
  const count = stepCount(progress, current);
  return count ? `${progress.chapter}，第 ${count.index} 步，共 ${count.total} 步` : progress.chapter;
}

/**
 * 眉题的看得见的文字（design §4.1，v2.2 D4、D10）。从上到下整行：
 * - 普通步骤：`第 1 章 · 准备节点和住宅 IP · 第 2 步，共 10 步`；数不清第几步时省掉步数；
 * - 选择页：`第 1 章 · 准备节点和住宅 IP · 选择`；
 * - 旁支页：`第 2 章 · 注册和订阅 · 旁支`；
 * - 章首页（含选择页）：色带上面已经写了副标题和章名，省掉章的部分，只写 `第 1 步，共 10 步` 或 `选择`。
 * 附录里的页面（常见问题、实测）由 W5 另外传眉题，不走这里。
 */
export function eyebrowText(progress: Progress, current: Stop, chapterStart = false): string {
  if (current.kind === 'home') return '';
  const count = stepCount(progress, current);
  const end = current.kind === 'choose' ? '选择' : current.kind === 'side' ? '旁支' : count ? `第 ${count.index} 步，共 ${count.total} 步` : '';
  const head = chapterStart ? '' : `${chapterText(progress)} · ${progress.chapter}`;
  return [head, end].filter(Boolean).join(' · ');
}

/** 眉题章节名后固定的后缀：旁支页“ · 旁支”（design §4.6），其余为空 */
export function eyebrowSuffix(current: Stop): string {
  return current.kind === 'side' ? ' · 旁支' : '';
}

/** 平板和手机的眉题在章节名后多写的步数（design §4.1）：“ · 共 5 步”；数不清时、选择页和旁支页为空 */
export function eyebrowTotal(progress: Progress, current?: Stop): string {
  const count = stepCount(progress, current);
  return count ? ` · 共 ${count.total} 步` : '';
}

/**
 * 本章第几步和共几步（FR-10）：普通页、且本章前面没有没选的分叉点；选择页、旁支页为 null（不计步数）。
 * 截图编号“图 02-1”的步骤号用它补足两位（design §4.7，架构 §11.4 W-4）。
 */
export function stepNumber(progress: Progress, current: Stop): { index: number; total: number } | null {
  return stepCount(progress, current);
}

/**
 * 截图编号“图 02-1”的前半（design §4.7）：数得清第几步时是“步骤号-”（补足两位）；
 * 数不清、选择页、旁支页为空，只用序号“图 1”。
 */
export function figurePrefix(progress: Progress, current: Stop): string {
  const count = stepCount(progress, current);
  return count ? `${String(count.index).padStart(2, '0')}-` : '';
}

/** 导航按钮里写出的目标标题；`dir` 是按钮的方向（“回到”算上一步那一侧）。 */
export function stopTitle(stop: Stop, dir: 'prev' | 'next'): string {
  return stop.kind === 'home' ? HOME_TITLE[dir] : stop.title;
}

/** 章节号：从 00 开始补足两位（design §2 “从零开始”），首页的章级索引和目录共用（页头色带写“第 n 章”，不补零，v2.2 D10）。 */
export function chapterNoText(chapterNo: number): string {
  return String(chapterNo).padStart(2, '0');
}

/** 是不是本章第一页（含选择页）：只有页头色带里多写副标题、章名和一句话，眉题省掉章的部分（design §4.1）。旁支页不算。 */
export function isChapterStart(chapters: RouteDataChapter[], progress: Progress, current: Stop): boolean {
  if (current.kind === 'home' || current.kind === 'side') return false;
  const first = chapters.find((chapter) => chapter.id === progress.chapterId)?.items[0];
  return first !== undefined && first.kind !== 'branch' && first.id === current.id;
}
