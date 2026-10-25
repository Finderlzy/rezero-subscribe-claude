import type { ReaderStore } from '../lib/reader-state/reader-store';
import type { RouteData } from '../lib/route/types';

/**
 * 步骤页、选择页、旁支页的目录脚本（design §4.5，FR-16）。标记由 `Toc.astro`/`TocNav.astro` 写出。
 *
 * 目录只画当前路线：分叉点的另一条路线是一条普通链接（`a.toc-route-switch`），点击后照常导航，
 * 不在目录里改选，所以这里不再重画列表。脚本只负责：
 * - 抽屉：顶栏的 `[data-toc-open]` 构建时是链到首页目录的链接，这里换成打开 `<dialog>` 的按钮；
 * - 打开页面时侧边栏滚到当前项可见（只在首次加载做一次）；
 * - 给每份 `<nav>` 加 `data-toc-ready`，e2e 据此确认脚本已跑完。
 *
 * 章的开合是原生 `<details>`（V02），脚本不参与。
 */
export function initToc(doc: Document, data: RouteData, store: ReaderStore): void {
  // 目录内容由构建时按当前路线写好；data/store 保留在签名里，调用方不用改。
  void data;
  void store;
  const navs = [...doc.querySelectorAll<HTMLElement>('[data-toc]')];
  if (navs.length === 0) return;

  // 抽屉里的那份（aside 里的跟着侧边栏滚动，不需要换焦点位置）
  initDrawer(doc, navs.find((nav) => !nav.closest('[data-toc-sidebar]')) ?? navs[0]!);
  // 侧边栏：打开页面时滚到当前项可见（只做一次，之后读者自己滚）
  revealInSidebar(doc);
  for (const nav of navs) nav.dataset.tocReady = '';
}

/**
 * 侧边栏：打开页面时把当前项滚进侧边栏的可见范围。只滚侧边栏**自己的滚动区**（`.toc-sidebar-scroll`；
 * v0.13 起 aside 是两行，底部还钉着“更新日志”入口）：
 * v3 的顶栏不固定、侧边栏 sticky，用 scrollIntoView 会连页面一起往下滚，读者一打开页面就看不到顶栏和 h1。
 */
function revealInSidebar(doc: Document): void {
  const aside = doc.querySelector<HTMLElement>('aside[data-toc-sidebar]');
  const scroll = aside?.querySelector<HTMLElement>('.toc-sidebar-scroll');
  const current = scroll?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!aside || !scroll || !current || scroll.clientHeight === 0) return;
  const box = scroll.getBoundingClientRect();
  // 页面在顶部时侧边栏从顶栏下面开始、高 100vh，下面一截在视口外：只按看得见的那段高度算
  const visible = Math.min(scroll.clientHeight, (doc.defaultView?.innerHeight ?? scroll.clientHeight) - box.top);
  const top = current.getBoundingClientRect().top - box.top + scroll.scrollTop;
  const bottom = top + current.offsetHeight;
  // 当前项下面留出侧边栏的下内边距（.toc-sidebar-inner），不贴着视口底边
  const pad = parseFloat(getComputedStyle(scroll.firstElementChild ?? scroll).paddingBottom) || 0;
  if (top < scroll.scrollTop) scroll.scrollTop = top;
  else if (bottom > scroll.scrollTop + visible) scroll.scrollTop = bottom - visible + pad;
}

/**
 * 抽屉（design v3 §4.5、§5）：<720px 时目录在这里。Esc 由 `<dialog>` 原生支持，点遮罩或“关闭”关闭；
 * 关闭后把焦点还给打开它的按钮（不只靠 `<dialog>` 原生的恢复：Safari 点按钮时按钮不拿焦点，原生会落到 body）。滑入、滑出的过渡全在 toc.css（`allow-discrete`），脚本照常 `close()`。
 *
 * 顶栏的 `[data-toc-open]` 没有 JS 时是指向首页目录的链接（FR-16）；这里换成同样外观的 `<button>`（保留除 href
 * 以外的属性，组件样式照样选得中），读屏听到的是“按钮，打开对话框”，而不是一个会跳走的链接。
 * 章的开合是原生 `<details>`（V02），脚本不参与。
 */
function initDrawer(doc: Document, nav: HTMLElement): void {
  const dialog = doc.querySelector<HTMLDialogElement>('dialog[data-toc-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  // 抽屉本身没有内边距（留白在内层），点到 dialog 自身就是点在 ::backdrop 上。
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-toc-close]')?.addEventListener('click', () => dialog.close());
  // 点目录里的链接都不会让抽屉自己关：先关抽屉，再照常导航。
  // 小节锚点是页内跳转（V02），关掉后焦点还给“目录”按钮；点页面链接（含底部“更新日志”，v0.13）会换页，
  // 焦点留在即将卸载的文档上没有意义，所以不还。
  dialog.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a');
    if (!link) return;
    returnFocus = link.getAttribute('href')?.startsWith('#') ?? false;
    dialog.close();
  });
  let opener: HTMLElement | null = null;
  // 关掉后要不要把焦点还给“目录”按钮（默认还；点页面链接离开时不还）
  let returnFocus = true;
  dialog.addEventListener('close', () => {
    if (returnFocus) opener?.focus();
    else (doc.activeElement as HTMLElement | null)?.blur();
    returnFocus = true;
    opener = null;
  });

  for (const link of doc.querySelectorAll<HTMLElement>('[data-toc-open]')) {
    const button = doc.createElement('button');
    for (const { name, value } of link.attributes) if (name !== 'href') button.setAttribute(name, value);
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.append(...link.childNodes);
    button.addEventListener('click', () => {
      opener = button;
      dialog.showModal();
      nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'center' });
    });
    link.replaceWith(button);
  }
}