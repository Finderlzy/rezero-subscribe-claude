import type { Progress, Stop } from './route/types';

/**
 * 导航文案（design §4.1）。构建时的页面和浏览器里的页面脚本共用，两边写出的文字一致。
 */

/** 顶部进度，例如“一、准备住宅 IP · 第 2 步，共 5 步”（FR-10）。 */
export function progressText(progress: Progress): string {
  return `${progress.chapter} · 第 ${progress.index} 步，共 ${progress.total} 步`;
}

/** 导航按钮里写出的目标标题；完成页的标题由页面层传入。 */
export function stopTitle(stop: Stop, doneTitle: string): string {
  return stop.kind === 'done' ? doneTitle : stop.title;
}
