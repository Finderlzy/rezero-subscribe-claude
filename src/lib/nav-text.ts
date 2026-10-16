import { escapeAttr, numeralSvg } from './numeral';
import type { Progress, RouteDataChapter, Stop } from './route/types';

/**
 * 导航文案（design §4.1）。构建时的页面和浏览器里的页面脚本共用，两边写出的文字一致。
 */

/** 首页作为导航目标时的文字（design §4.1，FR-11）：后记的下一步写“回到首页”，前言的上一步写“首页” */
export const HOME_TITLE = { prev: '首页', next: '回到首页' } as const;

/** 能数清第几步时的序号和步数（FR-10）：普通页、且本章前面没有没选的分叉点；选择页、旁支页没有 */
function stepCount(progress: Progress, current?: Stop): { index: number; total: number } | null {
  if (current !== undefined && current.kind !== 'step') return null;
  if (progress.index === undefined || progress.total === undefined) return null;
  return { index: progress.index, total: progress.total };
}

/**
 * 眉题的读屏文字（design §4.1）：“准备节点和住宅 IP，第 2 步，共 5 步”；数不清时和选择页只有章节名（FR-10）；
 * 旁支页“<章节名> · 旁支”（design §4.6）。眉题看得见的部分和页边栏编号不进无障碍树，由这句代读。
 */
export function progressText(progress: Progress, current?: Stop): string {
  if (current?.kind === 'side') return `${progress.chapter}${eyebrowSuffix(current)}`;
  const count = stepCount(progress, current);
  return count ? `${progress.chapter}，第 ${count.index} 步，共 ${count.total} 步` : progress.chapter;
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
 * 页边栏顶端（桌面）或 h1 前（平板和手机）的标记（design §4.1、§4.2、§4.6）：
 * 普通页是本章第几步（从 `01` 起）和“共 m 步”；数不清时是短横 `–`、不写步数；选择页写“选择”，旁支页写“旁支”。
 */
export type StepMark =
  | { kind: 'numeral'; text: '–' }
  | { kind: 'numeral'; text: string; index: number; total: string }
  | { kind: 'label'; text: '选择' | '旁支' };

/** 首页没有标记（null）：PageLayout 不会收到首页，这里兜住，构建时和页面脚本不必各写一遍判断 */
export function stepMark(progress: Progress, current: Stop): StepMark | null {
  if (current.kind === 'home') return null;
  if (current.kind === 'choose') return { kind: 'label', text: '选择' };
  if (current.kind === 'side') return { kind: 'label', text: '旁支' };
  const count = stepCount(progress, current);
  if (!count) return { kind: 'numeral', text: '–' };
  return { kind: 'numeral', text: String(count.index).padStart(2, '0'), index: count.index, total: `共 ${count.total} 步` };
}

/**
 * 标记的 HTML：构建时（PageLayout）和页面脚本（route-enhance）写进同一个挂载点。编号用固定字形（numeralSvg），
 * `data-step-no` 是编号原文，给样式和测试用；整块由挂载点的 aria-hidden 挡在无障碍树外，读屏读眉题里的 progressText。
 * numeralSvg 要求非空的读屏文字，这里给的 label 在 aria-hidden 里读不到，只为满足这个要求。
 */
export function stepMarkHtml(mark: StepMark | null): string {
  if (mark === null) return '';
  if (mark.kind === 'label') return `<span class="step-label">${mark.text}</span>`;
  const label = 'index' in mark ? `第 ${mark.index} 步` : '步数未定';
  const no = `<span class="step-no" data-step-no="${escapeAttr(mark.text)}">${numeralSvg(mark.text, label)}</span>`;
  return 'total' in mark ? `${no}<span class="step-total">${mark.total}</span>` : no;
}

/** 导航按钮里写出的目标标题；`dir` 是按钮的方向（“回到”算上一步那一侧）。 */
export function stopTitle(stop: Stop, dir: 'prev' | 'next'): string {
  return stop.kind === 'home' ? HOME_TITLE[dir] : stop.title;
}

/** 章节号：从 00 开始补足两位（design §2 “从零开始”），眉题、章节过场和目录共用。步骤编号也补足两位（stepMark）。 */
export function chapterNoText(chapterNo: number): string {
  return String(chapterNo).padStart(2, '0');
}

/** 是不是本章第一页（含选择页）：只有它在眉题上方多一块章节过场（design §4.1）。旁支页不算。 */
export function isChapterStart(chapters: RouteDataChapter[], progress: Progress, current: Stop): boolean {
  if (current.kind === 'home' || current.kind === 'side') return false;
  const first = chapters.find((chapter) => chapter.id === progress.chapterId)?.items[0];
  return first !== undefined && first.kind !== 'branch' && first.id === current.id;
}
