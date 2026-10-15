import { progressText, stopTitle } from '../lib/nav-text';
import type { ReaderState, ReaderStore } from '../lib/reader-state/reader-store';
import { pathOf, routeMapFromData } from '../lib/route/route-map';
import type { PageId, RouteData, RouteView, Stop, ViewMode } from '../lib/route/types';
import { withBase } from '../lib/with-base';
import { CHOICES_CHANGED_EVENT, VIEW_CHANGED_EVENT } from './reader-store';

/**
 * 步骤页、选择页、旁支页的页面脚本（架构 §3 M3“导航改写”）：按本机保存的选择和当前视图重新计算导航，
 * 改写上一步/下一步/跳过/回到和进度（FR-11、FR-13、FR-15），收到视图或选择变化时重算；
 * 打开只属于一个分支的页面时记下它的选项（FR-17）。
 *
 * 这是渐进增强：没有 JS 时页面保持构建时按“操作视图 + 未选”写好的导航。本机存储不可用时
 * M4 退到 `window.name` 或内存，不报错（AC-18）。
 */

/**
 * 打开一页时要写入的本机状态：只属于一个分支的页面写下它所属的选项，其余（普通页、选择页、旁支页、
 * 属于多个选项的共享步骤）返回 null，本机已有的选择保持不变（架构 §3 M4“写入时机”）。
 */
export function openPatch(data: RouteData, at: PageId): Pick<ReaderState, 'choices'> | null {
  for (const chapter of data.chapters) {
    for (const item of chapter.items) {
      if (item.kind !== 'branch') continue;
      const options = Object.keys(item.options).filter((option) => item.options[option]!.includes(at));
      if (options.length === 1) return { choices: { [item.fork]: options[0]! } };
      if (options.length > 1) return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------- DOM

/**
 * 页面里的挂载点（由 PageLayout、StepNav 写出）：
 * - `[data-route-at]`：当前页的标识（RouteData 由调用方用 readRouteData 读出后传入）；
 * - `[data-route-progress]`：顶部进度；
 * - `[data-route-nav="prev|return|next|skip"]`：导航链接，其中的 `[data-route-title]` 是目标标题；
 *   跳过链接只改地址（文案是页面自己的），外层是 `[data-route-skip]`。没有目标时链接隐藏：
 *   选择页没选时没有“下一步”，选了之后才出现，所以 StepNav 总是写出“下一步”的链接，没有目标时带 `hidden`。
 * 第一次计算完成后给 `[data-route-at]` 加上 `data-route-ready`，e2e 据此确认脚本已跑完。
 */
export function initRouteEnhance(doc: Document, data: RouteData, store: ReaderStore): void {
  const atEl = doc.querySelector<HTMLElement>('[data-route-at]');
  const at = atEl?.dataset.routeAt;
  if (!atEl || !at || !Object.hasOwn(data.pages, at)) return;

  const map = routeMapFromData(data);
  const mode = (): ViewMode => (doc.documentElement.dataset.view === 'principle' ? 'principle' : 'operation');

  const render = () => renderNav(doc, map.view(at, store.read().choices, mode()));
  const open = () => {
    const patch = openPatch(data, at);
    if (patch) store.write(patch);
    render();
  };

  open();
  atEl.dataset.routeReady = '';
  // 从往返缓存恢复的页面不会重新运行脚本，而本机选择和视图可能已在别的页面改过；读者重新打开了这一页，照常记下选项。
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (event.persisted) open();
  });
  // 在本页切换视图、在选择页或目录里改选时只重算：读者没有重新打开这一页，不应把当前页所属的选项写回去。
  doc.addEventListener(VIEW_CHANGED_EVENT, render);
  doc.addEventListener(CHOICES_CHANGED_EVENT, render);
}

function renderNav(doc: Document, view: RouteView): void {
  const progressEl = doc.querySelector('[data-route-progress]');
  if (progressEl) progressEl.textContent = progressText(view.progress, view.current);

  const targets: [string, Stop | null, 'prev' | 'next'][] = [
    ['prev', view.prev, 'prev'],
    ['return', view.returnTo, 'prev'],
    ['next', view.next, 'next'],
    ['skip', view.skipTo, 'next'],
  ];
  for (const [nav, stop, dir] of targets) {
    const link = doc.querySelector<HTMLAnchorElement>(`[data-route-nav="${nav}"]`);
    if (!link) continue;
    const box = nav === 'skip' ? (link.closest<HTMLElement>('[data-route-skip]') ?? link) : link;
    box.hidden = stop === null;
    if (stop === null) {
      link.removeAttribute('href');
      continue;
    }
    link.href = withBase(pathOf(stop));
    const title = link.querySelector('[data-route-title]');
    if (title) title.textContent = stopTitle(stop, dir);
  }
}
