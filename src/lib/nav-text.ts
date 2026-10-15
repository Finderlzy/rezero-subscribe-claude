import type { Progress, Stop } from './route/types';

/**
 * 导航文案（design §4.1）。构建时的页面和浏览器里的页面脚本共用，两边写出的文字一致。
 */

/** 首页作为导航目标时的文字（design §4.1，FR-11）：后记的下一步写“回到首页”，前言的上一步写“首页” */
export const HOME_TITLE = { prev: '首页', next: '回到首页' } as const;

/**
 * 顶部眉题，例如“准备节点和住宅 IP · 第 2 步，共 5 步”；数不清时只有章节名（FR-10）；
 * 旁支页写“<章节名> · 旁支”（design §4.6）。
 */
export function progressText(progress: Progress, current?: Stop): string {
  if (current?.kind === 'side') return `${progress.chapter} · 旁支`;
  if (progress.index === undefined || progress.total === undefined) return progress.chapter;
  return `${progress.chapter} · 第 ${progress.index} 步，共 ${progress.total} 步`;
}

/** 导航按钮里写出的目标标题；`dir` 是按钮的方向（“回到”算上一步那一侧）。 */
export function stopTitle(stop: Stop, dir: 'prev' | 'next'): string {
  return stop.kind === 'home' ? HOME_TITLE[dir] : stop.title;
}
