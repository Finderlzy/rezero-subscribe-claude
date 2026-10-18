import { eyebrowText, figurePrefix, progressText, stopTitle } from '../lib/nav-text';
import type { ReaderState, ReaderStore } from '../lib/reader-state/reader-store';
import { pathOf, routeMapFromData } from '../lib/route/route-map';
import type { ForkId, PageId, RouteData, RouteView, Stop, ViewMode } from '../lib/route/types';
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

/** `at` 是哪个分叉点的选择页；不是选择页时为 null */
export function forkOfChoosePage(data: RouteData, at: PageId): ForkId | null {
  return Object.keys(data.forks).find((fork) => data.forks[fork]!.page === at) ?? null;
}

// ---------------------------------------------------------------- DOM

/**
 * 页面里的挂载点（由 PageLayout、StepNav 写出）：
 * - `[data-route-at]`：当前页的标识（RouteData 由调用方用 readRouteData 读出后传入）；
 * - 进度（renderProgress）：`[data-route-eyebrow]` 是色带里看得见的眉题（“第 1 章 · … · 第 2 步，共 10 步”），
 *   `[data-route-progress]` 是眉题的读屏文字，`[data-figure-step]` 是正文里截图编号的步骤号；
 * - `[data-route-nav="prev|return|next|skip"]`：导航链接，其中的 `[data-route-title]` 是目标标题；
 *   跳过链接只改地址（文案是页面自己的），外层是 `[data-route-skip]`。没有目标时链接隐藏：
 *   选择页没选时没有“下一步”，选了之后才出现，所以 StepNav 总是写出“下一步”的链接，没有目标时带 `hidden`。
 * - 选择页正文里的 `section.option-block[data-option]`（M1 插件包出的选项块，两版正文各一份）。
 * 第一次计算完成后给 `[data-route-at]` 加上 `data-route-ready`，e2e 据此确认脚本已跑完。
 */
export function initRouteEnhance(doc: Document, data: RouteData, store: ReaderStore): void {
  const atEl = doc.querySelector<HTMLElement>('[data-route-at]');
  const at = atEl?.dataset.routeAt;
  if (!atEl || !at || !Object.hasOwn(data.pages, at)) return;

  const map = routeMapFromData(data);
  const mode = (): ViewMode => (doc.documentElement.dataset.view === 'principle' ? 'principle' : 'operation');

  const fork = forkOfChoosePage(data, at);
  const render = () => {
    const view = map.view(at, store.read().choices, mode());
    renderNav(doc, view);
    if (fork) markChoice(doc, view.choices[fork]);
  };
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
  if (fork) recordChoice(doc, fork, store);
}

/**
 * 选择页（FR-12）：点选项块里任何站内链接，先把这个选项写进本机选择，再照常跳转；整块的点击区域是
 * 块内第一个链接（CSS 撑满），所以点块内空白处也走这里。写完派发 CHOICES_CHANGED_EVENT，导航和目录重算。
 */
function recordChoice(doc: Document, fork: ForkId, store: ReaderStore): void {
  doc.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
    const block = link?.closest<HTMLElement>('.option-block[data-option]');
    const option = block?.dataset.option;
    if (!link || !option || link.origin !== doc.defaultView?.location.origin) return;
    store.write({ choices: { [fork]: option } });
    doc.dispatchEvent(new Event(CHOICES_CHANGED_EVENT));
  });
}

/** 本机保存的选项行：所在的一行加 data-selected，块标 aria-current 和“已选”；没选时都不标，也不标默认（FR-12） */
function markChoice(doc: Document, chosen: string | undefined): void {
  for (const block of doc.querySelectorAll<HTMLElement>('.option-block[data-option]')) {
    const current = block.dataset.option === chosen;
    let label = block.querySelector<HTMLElement>('.option-current');
    if (current && !label) {
      label = doc.createElement('span');
      label.className = 'option-current';
      label.textContent = '已选';
      (block.querySelector('.option-title') ?? block).append(' ', label);
    }
    if (label) label.hidden = !current;
    if (current) block.setAttribute('aria-current', 'true');
    else block.removeAttribute('aria-current');
    // 编号圆圈也在这一行里：整行一起标（v2.2 W4a）
    block.closest('.option-row')?.toggleAttribute('data-selected', current);
  }
}

/** 进度挂载点；只用到这几个属性，测试可以传普通对象 */
export interface ProgressSlots {
  /** 色带里看得见的眉题 */
  eyebrow?: { textContent: string | null } | null;
  /** 眉题的读屏文字 */
  text?: { textContent: string | null } | null;
  /** 两版正文里每个截图编号的步骤号（rehype-figures 的 `[data-figure-step]`） */
  figures?: Iterable<{ textContent: string | null }>;
  /** 这一页是不是本章第一页（色带里有副标题和章名，眉题省掉章的部分） */
  chapterStart: boolean;
}

/**
 * 改写进度（FR-10，design §4.1、§4.5）：眉题写清章和第几步，按当前路线和视图计数，切换视图、改选分叉点后跟着变；
 * 截图编号“图 02-1”的步骤号跟着同一个数（design §4.7），两版正文都写当前视图的号。
 * 和 PageLayout 构建时写出的是同一组函数，两边一致。
 */
export function renderProgress(slots: ProgressSlots, view: RouteView): void {
  const { progress, current } = view;
  if (slots.eyebrow) slots.eyebrow.textContent = eyebrowText(progress, current, slots.chapterStart);
  for (const figure of slots.figures ?? []) figure.textContent = figurePrefix(progress, current);
  if (slots.text) slots.text.textContent = progressText(progress, current);
}

function renderNav(doc: Document, view: RouteView): void {
  renderProgress(
    {
      eyebrow: doc.querySelector('[data-route-eyebrow]'),
      text: doc.querySelector('[data-route-progress]'),
      figures: doc.querySelectorAll('[data-figure-step]'),
      chapterStart: doc.querySelector<HTMLElement>('[data-route-at]')?.dataset.chapterStart !== undefined,
    },
    view,
  );

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
