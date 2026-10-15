import { progressText, stopTitle } from '../lib/nav-text';
import type { ReaderState, ReaderStore } from '../lib/reader-state/reader-store';
import { pathOf, routeMapFromData } from '../lib/route/route-map';
import type { At, Choices, ForkId, RouteData, RouteMap, RouteView } from '../lib/route/types';
import { withBase } from '../lib/with-base';
import { CHOICES_CHANGED_EVENT, readerStoreFor } from './reader-store';

/**
 * 步骤页和选择页的页面脚本（架构 §3 M3“浏览器里”）：按本机保存的路线选择重新计算导航，
 * 改写上一步/下一步和进度（FR-11、FR-13、FR-17），记录阅读进度和选择（FR-12、FR-50）。
 *
 * 这是渐进增强：没有 JS 时页面保持构建时按默认路线写好的导航。本机存储不可用时 M4 换成内存，
 * 导航按默认路线（加上当前页所属的选项）计算，不报错（AC-18）。
 */

/**
 * 打开一页时要写入的本机状态；选择页返回 null。步骤页写 `lastStep`、`visited`，
 * 步骤属于某个分叉点的分支时，再写下这一页实际生效的选项（架构 §3 M4“写入时机”）。
 * 普通步骤不写选择，读者没选过的分叉点继续跟随默认路线。
 */
export function openPatch(data: RouteData, at: At, view: RouteView): Partial<ReaderState> | null {
  if (at.kind !== 'step') return null;
  const choices: Choices = {};
  for (const fork of branchForksOf(data, at.id)) choices[fork] = view.choices[fork]!;
  return { lastStep: at.id, visited: [at.id], choices };
}

/** 步骤出现在哪些分叉点的分支里（M2 保证至多一个，这里不依赖这一点）。 */
function branchForksOf(data: RouteData, id: string): Set<ForkId> {
  const forks = new Set<ForkId>();
  for (const chapter of data.chapters) {
    for (const item of chapter.items) {
      if (item.kind === 'branch' && Object.values(item.options).some((ids) => ids.includes(id))) forks.add(item.fork);
    }
  }
  return forks;
}

// ---------------------------------------------------------------- DOM

/**
 * 页面里的挂载点（由 StepLayout、StepNav、ChoiceOption 写出）：
 * - `[data-route-at]`：当前页的 `At`（JSON）；`#route-data`：RouteData；
 * - `[data-route-progress]`：顶部进度；`[data-route-nav="prev|next"]` 内的 `[data-route-title]`：目标标题，
 *   `[data-route-nav="skip"]`：可跳过步骤的跳过链接（只改地址，文案不变），外层是 `[data-route-skip]`，
 *   `[data-done-title]`：完成页标题；
 * - 选择页的 `[data-route-option]`：选项链接，其中 `[data-route-current]` 是“当前选择”标记。
 * 第一次计算完成后给 `[data-route-at]` 加上 `data-route-ready`，e2e 据此确认脚本已跑完。
 */
export function initRouteEnhance(doc: Document): void {
  const dataEl = doc.getElementById('route-data');
  const atEl = doc.querySelector<HTMLElement>('[data-route-at]');
  if (!dataEl?.textContent || !atEl?.dataset.routeAt) return;

  const data = JSON.parse(dataEl.textContent) as RouteData;
  const at = JSON.parse(atEl.dataset.routeAt) as At;
  const map = routeMapFromData(data);
  const store = readerStoreFor(data);

  const render = () => {
    const stored = store.read().choices;
    const view = map.view(at, stored);
    renderNav(doc, view);
    if (at.kind === 'choose') renderOptions(doc, map, at.fork, stored);
    return view;
  };
  const refresh = () => {
    const patch = openPatch(data, at, render());
    if (patch) store.write(patch);
  };

  if (at.kind === 'choose') recordChoiceOnClick(doc, at.fork, store);
  refresh();
  atEl.dataset.routeReady = '';
  // 从往返缓存恢复的页面不会重新运行脚本，而本机选择可能已在别的页面改过。
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (event.persisted) refresh();
  });
  // 在目录里改选或清除进度时只重画：读者没有重新打开这一页，不应把当前页所属的选项写回去。
  doc.addEventListener(CHOICES_CHANGED_EVENT, render);
}

function renderNav(doc: Document, view: RouteView): void {
  const progressEl = doc.querySelector('[data-route-progress]');
  if (progressEl && view.progress) progressEl.textContent = progressText(view.progress);

  const doneTitle = doc.querySelector<HTMLElement>('[data-done-title]')?.dataset.doneTitle ?? '';
  const links = { prev: view.prev, next: view.next, skip: view.skipTo };
  for (const [dir, stop] of Object.entries(links)) {
    const link = doc.querySelector<HTMLAnchorElement>(`[data-route-nav="${dir}"]`);
    if (!link) continue;
    // 只有路线的第一项没有上一步，是否可跳过也只看步骤本身，都和选择无关（M2 保证），所以构建时有没有
    // 这两个链接，和这里算出的一致：构建时没写的，这里也不会需要补；构建时写了而这里没有的，只为保险删掉。
    if (!stop) {
      (dir === 'skip' ? link.closest('[data-route-skip]') ?? link : link).remove();
      continue;
    }
    link.href = withBase(pathOf(stop));
    const title = link.querySelector('[data-route-title]');
    if (title) title.textContent = stopTitle(stop, doneTitle);
  }
}

/** 每个选项进入“选了它”的路线上的下一项；本机选过的选项标“当前选择”（design §4.2）。 */
function renderOptions(doc: Document, map: RouteMap, fork: ForkId, stored: Choices): void {
  for (const link of doc.querySelectorAll<HTMLAnchorElement>('[data-route-option]')) {
    const option = link.dataset.routeOption!;
    link.href = withBase(pathOf(map.view({ kind: 'choose', fork }, { ...stored, [fork]: option }).next));
    const isCurrent = stored[fork] === option;
    const current = link.querySelector<HTMLElement>('[data-route-current]');
    if (current) current.hidden = !isCurrent;
    if (isCurrent) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}

/** 点选项就记录选择（FR-12）；写入是同步的，跳转到下一页之前就已保存。 */
function recordChoiceOnClick(doc: Document, fork: ForkId, store: ReaderStore): void {
  for (const link of doc.querySelectorAll<HTMLAnchorElement>('[data-route-option]')) {
    link.addEventListener('click', () => store.write({ choices: { [fork]: link.dataset.routeOption! } }));
  }
}
