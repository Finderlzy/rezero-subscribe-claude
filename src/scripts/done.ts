import type { RouteData } from '../lib/route/types';
import { CHOICES_CHANGED_EVENT, CLEAR_PROGRESS_CONFIRM, readerStoreFor } from './reader-store';

/**
 * 完成页的页面脚本（design §4.6，FR-19、FR-51）：接上“清除进度”。“回到目录”由目录脚本接上（`data-toc-open`）。
 *
 * 挂载点（由 done.astro 写出）：`[data-done-clear]` 按钮（构建时隐藏）和 `[data-done-status]`；
 * RouteData 由目录内嵌在 `#route-data`。
 * 和目录一样先确认再清空本机状态，然后通知目录重画（已读 ✓、选择都回到默认）。
 */
export function initDone(doc: Document): void {
  const button = doc.querySelector<HTMLButtonElement>('[data-done-clear]');
  const dataEl = doc.getElementById('route-data');
  if (!button || !dataEl?.textContent) return;

  const store = readerStoreFor(JSON.parse(dataEl.textContent) as RouteData);
  const status = doc.querySelector<HTMLElement>('[data-done-status]');
  button.addEventListener('click', () => {
    if (!doc.defaultView?.confirm(CLEAR_PROGRESS_CONFIRM)) return;
    store.clear();
    doc.dispatchEvent(new CustomEvent(CHOICES_CHANGED_EVENT));
    if (status) status.textContent = '已清除进度';
  });
  button.hidden = false;
}
