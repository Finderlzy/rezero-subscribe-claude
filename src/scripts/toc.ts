import { routeMapFromData } from '../lib/route/route-map';
import type { At, OutlineChapter, OutlineStep, RouteData } from '../lib/route/types';
import { CHOICES_CHANGED_EVENT, readerStoreFor } from './reader-store';

/**
 * 步骤目录的页面脚本（design §4.5，FR-14、FR-16、FR-51）。标记由 `Toc.astro`/`TocNav.astro` 写出。
 *
 * - 按本机选择改写目录：哪个选项在当前路线上、“其他路线”标记、已读 ✓、当前项（M2 `outline()`）；
 * - “切换”：写入这个分叉点的选择，重画目录，并通知 route-enhance 重画上一步/下一步（FR-14）；
 * - “清除进度”：确认后清空本机状态（FR-51），目录和导航回到默认路线；
 * - 抽屉：`[data-toc-open]` 打开 `<dialog>`；步骤页上（sidebar 模式）把侧栏里的 `<nav>` 移进抽屉，关闭时移回。
 *
 * 步骤页和选择页先运行 route-enhance（写入打开这一页的阅读进度），再运行本脚本，目录里才有这一页的 ✓。
 */
export function initToc(doc: Document): void {
  const nav = doc.querySelector<HTMLElement>('[data-toc]');
  const dialog = doc.querySelector<HTMLDialogElement>('dialog[data-toc-dialog]');
  const dataEl = doc.getElementById('route-data');
  if (!nav || !dialog || !dataEl?.textContent) return;

  const data = JSON.parse(dataEl.textContent) as RouteData;
  const atJson = doc.querySelector<HTMLElement>('[data-route-at]')?.dataset.routeAt;
  const at = atJson ? (JSON.parse(atJson) as At) : null;
  const map = routeMapFromData(data);
  const store = readerStoreFor(data);

  const render = () => {
    const state = store.read();
    renderOutline(nav, map.outline(state.choices, at), new Set(state.visited));
  };
  const status = nav.querySelector<HTMLElement>('[data-toc-status]');
  const changed = () => {
    if (status) status.textContent = '';
    render();
    doc.dispatchEvent(new CustomEvent(CHOICES_CHANGED_EVENT));
  };

  for (const button of nav.querySelectorAll<HTMLButtonElement>('[data-toc-switch]')) {
    button.addEventListener('click', () => {
      store.write({ choices: { [button.dataset.tocSwitch!]: button.value } });
      changed();
      // 按下的按钮随即隐藏，焦点交给新选项的第一步，键盘读者不会丢失位置。
      button.closest('[data-toc-option]')?.querySelector<HTMLElement>('[data-toc-step] a')?.focus();
    });
  }

  const clearArea = nav.querySelector<HTMLElement>('[data-toc-clear-area]');
  nav.querySelector('[data-toc-clear]')?.addEventListener('click', () => {
    if (!doc.defaultView?.confirm('清除本机保存的阅读进度和路线选择？')) return;
    store.clear();
    changed();
    if (status) status.textContent = '已清除进度';
  });
  if (clearArea) clearArea.hidden = false;

  initDrawer(doc, nav, dialog);
  render();
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (event.persisted) render();
  });
  nav.dataset.tocReady = '';
}

/**
 * 把 outline 写到目录上。标记和 outline 按文档顺序一一对应（Toc.astro 的标记契约），
 * 两边是同一份 RouteData 生成的，数量对不上说明页面不是这份数据生成的，就不动它。
 */
function renderOutline(nav: HTMLElement, outline: OutlineChapter[], visited: Set<string>): void {
  const steps: OutlineStep[] = [];
  const options: { selected: boolean }[] = [];
  const chooses: { current: boolean }[] = [];
  for (const item of outline.flatMap((chapter) => chapter.items)) {
    if (item.kind === 'step') steps.push(item);
    else if (item.kind === 'choose') chooses.push(item);
    else
      for (const option of item.options) {
        options.push(option);
        steps.push(...option.steps);
      }
  }
  const stepEls = nav.querySelectorAll<HTMLElement>('[data-toc-step]');
  const optionEls = nav.querySelectorAll<HTMLElement>('[data-toc-option]');
  const chooseEls = nav.querySelectorAll<HTMLElement>('[data-toc-choose]');
  if (stepEls.length !== steps.length || optionEls.length !== options.length || chooseEls.length !== chooses.length) return;

  stepEls.forEach((el, i) => {
    const step = steps[i]!;
    el.toggleAttribute('data-off-route', !step.onRoute);
    const other = el.querySelector<HTMLElement>('[data-toc-other]');
    if (other) other.hidden = step.onRoute;
    const mark = el.querySelector<HTMLElement>('[data-toc-visited]');
    if (mark) mark.hidden = !visited.has(step.id);
    setCurrent(el.querySelector('a'), step.current);
  });
  optionEls.forEach((el, i) => {
    const { selected } = options[i]!;
    el.toggleAttribute('data-selected', selected);
    const button = el.querySelector<HTMLButtonElement>('[data-toc-switch]');
    if (button) button.hidden = selected;
  });
  chooseEls.forEach((el, i) => setCurrent(el.querySelector('a'), chooses[i]!.current));
}

function setCurrent(link: HTMLAnchorElement | null, current: boolean): void {
  if (current) link?.setAttribute('aria-current', 'step');
  else link?.removeAttribute('aria-current');
}

/** 抽屉：Esc 由 `<dialog>` 原生支持，点背景或关闭按钮关闭。≥1100px 的步骤页有常驻侧栏，打开按钮由 CSS 隐藏。 */
function initDrawer(doc: Document, nav: HTMLElement, dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal !== 'function') return;
  const body = dialog.querySelector<HTMLElement>('[data-toc-dialog-body]')!;
  const sidebar = doc.querySelector<HTMLElement>('[data-toc-sidebar]');
  const win = doc.defaultView;

  const open = () => {
    if (sidebar) body.append(nav);
    dialog.showModal();
    nav.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: 'center' });
  };
  dialog.addEventListener('close', () => {
    if (sidebar) sidebar.append(nav);
  });
  // 抽屉本身没有内边距（留白在内层），点到 dialog 自身就是点在 ::backdrop 上。
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-toc-close]')?.addEventListener('click', () => dialog.close());
  // 抽屉开着时把窗口拉宽到出现侧栏，就关掉抽屉，目录回到侧栏。
  if (sidebar) win?.matchMedia('(min-width: 1100px)').addEventListener('change', (event) => {
    if (event.matches && dialog.open) dialog.close();
  });

  for (const button of doc.querySelectorAll<HTMLButtonElement>('[data-toc-open]')) {
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', open);
    button.hidden = false;
  }

  // 常驻侧栏里，把当前项滚到侧栏可见处（只滚侧栏，不动页面）。
  const current = nav.querySelector<HTMLElement>('[aria-current="step"]');
  if (sidebar && current && sidebar.clientHeight > 0) {
    sidebar.scrollTop = current.offsetTop - sidebar.clientHeight / 3;
  }
}
