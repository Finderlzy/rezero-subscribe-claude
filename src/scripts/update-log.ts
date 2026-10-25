/**
 * 更新日志的分类切换（v0.13，FR-81、FR-82）。
 *
 * 页面构建时已经把四个分类的条目都写进 HTML（没有 JS 时全部可见）。这里只做收口：
 * 把分类按钮变成 tab 的交互——点分类（或按左右/Home/End 键）只显示那一个面板，默认选中“全部”。
 * 不改 URL、不写本机（FR-81）：刷新或再进来都是“全部”。
 *
 * 标记契约（UpdateLogLayout.astro 输出）：
 *   [data-update-tabs]：分类那一排；[data-update-tab="<分类>"]：每个按钮；
 *   [data-update-panel="<分类>"]：对应的面板（面板里的 [hidden] 由这里切换）。
 * 跑起来后给 <html> 加 data-update-log-ready，CSS 用它收起面板标题。
 */
import { UPDATE_LOG_READY_ATTR } from '../lib/update-log/ready';

const TAB_KEY = 'data-update-tab';
const PANEL_KEY = 'data-update-panel';
// 页面地址（UpdateLogLayout）和这里共用一份，避免两边各写一个字符串导致收口静默失效（v0.13 踩过一次）
const ROOT_SELECTOR = '[data-update-tabs]';

/**
 * 切换选中的分类，并把焦点放到它的按钮上（键盘操作也用这个）。
 * 按钮在 tab 那一排里，面板是它的**兄弟**节点（都在正文栏里），所以面板要从整份文档里找。
 */
function select(document: Document, bar: HTMLElement, category: string, focus: boolean): void {
  for (const tab of bar.querySelectorAll<HTMLButtonElement>(`[${TAB_KEY}]`)) {
    const selected = tab.getAttribute(TAB_KEY) === category;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.setAttribute('tabindex', selected ? '0' : '-1');
    if (selected && focus) tab.focus();
  }
  for (const panel of document.querySelectorAll<HTMLElement>(`[${PANEL_KEY}]`)) {
    panel.hidden = panel.getAttribute(PANEL_KEY) !== category;
  }
}

export function initUpdateLog(document: Document): void {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>(`[${TAB_KEY}]`)];
  if (tabs.length === 0) return;

  document.documentElement.setAttribute(UPDATE_LOG_READY_ATTR, '');

  root.addEventListener('click', (event) => {
    const tab = (event.target as Element | null)?.closest<HTMLButtonElement>(`[${TAB_KEY}]`);
    if (!tab) return;
    select(document, root, tab.getAttribute(TAB_KEY)!, false);
  });

  // 键盘：左右键在分类间移动，Home/End 跳到第一个/最后一个（WAI-ARIA 的 tabs 模式）
  root.addEventListener('keydown', (event) => {
    const current = (event.target as Element | null)?.closest<HTMLButtonElement>(`[${TAB_KEY}]`);
    if (!current) return;
    const index = tabs.indexOf(current);
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === -1) return;
    event.preventDefault();
    select(document, root, tabs[next]!.getAttribute(TAB_KEY)!, true);
  });

  // 构建时四个面板都展开（没有 JS 时全都读到，FR-82）：换成 tab 之后按默认的「全部」收口（FR-81）
  select(document, root, 'all', false);
}