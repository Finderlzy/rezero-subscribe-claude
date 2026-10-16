import type { ReaderStore } from '../lib/reader-state/reader-store';
import { routeMapFromData } from '../lib/route/route-map';
import type { OutlineChapter, OutlineStep, RouteData, ViewMode } from '../lib/route/types';
import { CHOICES_CHANGED_EVENT, VIEW_CHANGED_EVENT } from './reader-store';

/**
 * 步骤页、选择页、旁支页的目录脚本（design §4.5，FR-14、FR-16）。标记由 `Toc.astro`/`TocNav.astro` 写出。
 *
 * - 按本机选择和当前视图改写目录（M2 `outline()`）：哪个选项在当前路线上、“其他路线”标记、
 *   操作视图下弱化原理独有步骤、当前项；收到视图或选择变化时重画；
 * - “切换”：写入这个分叉点的选择，派发 CHOICES_CHANGED_EVENT，目录和上一步/下一步一起重算（FR-14）；
 * - 抽屉：页眉的 `[data-toc-open]` 构建时是链到首页目录的链接，这里换成打开 `<dialog>` 的按钮。
 *
 * 页面先运行 route-enhance（打开分支页时写入它的选项），再运行本脚本，目录才按这一页所在的路线画。
 * 跑完给 `<nav>` 加 `data-toc-ready`。
 */
export function initToc(doc: Document, data: RouteData, store: ReaderStore): void {
  const nav = doc.querySelector<HTMLElement>('[data-toc]');
  const at = doc.querySelector<HTMLElement>('[data-route-at]')?.dataset.routeAt ?? null;
  if (!nav || (at !== null && !Object.hasOwn(data.pages, at))) return;

  const map = routeMapFromData(data);
  const mode = (): ViewMode => (doc.documentElement.dataset.view === 'principle' ? 'principle' : 'operation');
  const render = () => renderOutline(nav, map.outline(store.read().choices, at, mode()));

  for (const button of nav.querySelectorAll<HTMLButtonElement>('[data-toc-switch]')) {
    button.addEventListener('click', () => {
      store.write({ choices: { [button.dataset.tocSwitch!]: button.value } });
      doc.dispatchEvent(new Event(CHOICES_CHANGED_EVENT));
      // 按下的按钮随即隐藏，焦点交给新选项的第一步，键盘读者不会丢失位置。
      button.closest('[data-toc-option]')?.querySelector<HTMLElement>('[data-toc-step] a')?.focus();
    });
  }
  // 目录自己、选择页的选项块改了选择，或切换了视图，都在这里重画。
  doc.addEventListener(CHOICES_CHANGED_EVENT, render);
  doc.addEventListener(VIEW_CHANGED_EVENT, render);
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (event.persisted) render();
  });

  render();
  initDrawer(doc, nav);
  nav.dataset.tocReady = '';
}

/**
 * 把 outline 写到目录上。标记和 outline 按文档顺序一一对应（Toc.astro 的标记契约），
 * 两边是同一份 RouteData 生成的，数量对不上说明页面不是这份数据生成的，就不动它。
 */
function renderOutline(nav: HTMLElement, outline: OutlineChapter[]): void {
  /** `other`：分叉点选了别的选项，这一步在“其他路线”上（只按分支判断；操作视图下的原理独有步骤只弱化，不标） */
  const steps: { step: OutlineStep; other: boolean }[] = [];
  const options: { selected: boolean }[] = [];
  const chooses: { current: boolean }[] = [];
  for (const item of outline.flatMap((chapter) => chapter.items)) {
    if (item.kind === 'step') steps.push({ step: item, other: false });
    else if (item.kind === 'choose') chooses.push(item);
    else {
      const chosen = item.options.some((option) => option.selected);
      for (const option of item.options) {
        options.push(option);
        steps.push(...option.steps.map((step) => ({ step, other: chosen && !option.selected })));
      }
    }
  }
  const stepEls = nav.querySelectorAll<HTMLElement>('[data-toc-step]');
  const optionEls = nav.querySelectorAll<HTMLElement>('[data-toc-option]');
  const chooseEls = nav.querySelectorAll<HTMLElement>('[data-toc-choose]');
  if (stepEls.length !== steps.length || optionEls.length !== options.length || chooseEls.length !== chooses.length) return;

  stepEls.forEach((el, i) => {
    const { step, other } = steps[i]!;
    el.toggleAttribute('data-off-route', !step.onRoute);
    const tag = el.querySelector<HTMLElement>('[data-toc-other]');
    if (tag) tag.hidden = !other;
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
  if (current) link?.setAttribute('aria-current', 'page');
  else link?.removeAttribute('aria-current');
}

/**
 * 抽屉（design v2.1 §4.5、§5）：所有宽度都是抽屉。Esc 由 `<dialog>` 原生支持，点遮罩或“关闭”关闭；
 * 关闭后把焦点还给打开它的按钮（不只靠 `<dialog>` 原生的恢复：Safari 点按钮时按钮不拿焦点，原生会落到 body）。滑入、滑出的过渡全在 toc.css（`allow-discrete`），脚本照常 `close()`。
 *
 * 页眉的 `[data-toc-open]` 没有 JS 时是指向首页目录的链接（FR-16）；这里换成同样外观的 `<button>`（保留除 href
 * 以外的属性，组件样式照样选得中），读屏听到的是“按钮，打开对话框”，而不是一个会跳走的链接。
 */
function initDrawer(doc: Document, nav: HTMLElement): void {
  const dialog = doc.querySelector<HTMLDialogElement>('dialog[data-toc-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  // 抽屉本身没有内边距（留白在内层），点到 dialog 自身就是点在 ::backdrop 上。
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-toc-close]')?.addEventListener('click', () => dialog.close());
  let opener: HTMLElement | null = null;
  dialog.addEventListener('close', () => {
    opener?.focus();
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
