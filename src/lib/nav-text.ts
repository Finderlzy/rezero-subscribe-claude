import type { Progress, Stop } from './route/types';

/**
 * 导航文案（design v3 §4.1、§4.5）。构建时的页面和浏览器里的页面脚本共用，两边写出的文字一致。
 * h1 上方一行灰色眉题写清“这是哪一步”：`第 1 章 · 准备节点和住宅 IP · 第 2 步，共 10 步`；
 * 选择页写“· 选择”，旁支页写“· 旁支”，附录里的页面写“附录 · …”（W5）。
 */

/** 首页作为导航目标时的文字（design §4.1，FR-11）：后记的下一步写“回到首页”，前言的上一步写“首页” */
export const HOME_TITLE = { prev: '首页', next: '回到首页' } as const;

/** 附录这一章的标识（route.yaml）：附录不计入任何“共 m 步”，眉题只写“附录”（v2.2 计划 W5 第 1、6 条） */
const APPENDIX_CHAPTER = 'appendix';

/** 能数清第几步时的序号和步数（FR-10）：普通页、且本章前面没有没选的分叉点；选择页、旁支页、附录没有 */
function stepCount(progress: Progress, current?: Stop): { index: number; total: number } | null {
  if (current !== undefined && current.kind !== 'step') return null;
  if (progress.chapterId === APPENDIX_CHAPTER) return null;
  if (progress.index === undefined || progress.total === undefined) return null;
  return { index: progress.index, total: progress.total };
}

/** 眉题里“第 n 章”：章号从 0 起，用阿拉伯数字，不补零（design v3 §3.2：章节号一律写成文字） */
function chapterText(progress: Progress): string {
  return `第 ${progress.chapterNo} 章`;
}

/**
 * 眉题的读屏文字（design §4.1）：“准备节点和住宅 IP，第 2 步，共 5 步”；数不清时和选择页只有章节名（FR-10）；
 * 旁支页“<章节名> · 旁支”（design §4.6）；附录页只读“附录”（不计步数）。眉题看得见的部分不进无障碍树，由这句代读。
 */
export function progressText(progress: Progress, current?: Stop): string {
  if (current?.kind === 'side') return `${progress.chapter}${eyebrowSuffix(current)}`;
  const count = stepCount(progress, current);
  return count ? `${progress.chapter}，第 ${count.index} 步，共 ${count.total} 步` : progress.chapter;
}

/**
 * 眉题的看得见的文字（design v3 §4.1）。整行：
 * - 普通步骤：`第 1 章 · 准备节点和住宅 IP · 第 2 步，共 10 步`；数不清第几步时省掉步数；
 * - 选择页：`第 1 章 · 准备节点和住宅 IP · 选择`；
 * - 旁支页：`第 2 章 · 注册和订阅 · 旁支`；
 * - 附录页：只写 `附录`，不写章号和步数（W5 第 1 条）。
 * 章首页不再特殊处理（FR-72 去掉了章节标题卡，v2.2 在这里省掉章的部分）。
 * 附录里的参考页（常见问题、实测）由 ReferenceLayout 另外传眉题，不走这里。
 */
export function eyebrowText(progress: Progress, current: Stop): string {
  if (current.kind === 'home') return '';
  if (progress.chapterId === APPENDIX_CHAPTER) return progress.chapter;
  const count = stepCount(progress, current);
  const end = current.kind === 'choose' ? '选择' : current.kind === 'side' ? '旁支' : count ? `第 ${count.index} 步，共 ${count.total} 步` : '';
  return [`${chapterText(progress)} · ${progress.chapter}`, end].filter(Boolean).join(' · ');
}

/** 眉题章节名后固定的后缀：旁支页“ · 旁支”（design §4.6），其余为空 */
function eyebrowSuffix(current: Stop): string {
  return current.kind === 'side' ? ' · 旁支' : '';
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
