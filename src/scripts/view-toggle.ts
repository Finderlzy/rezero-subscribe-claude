import { createReaderStore, getLocalStorage, type View } from '../lib/reader-state/reader-store';

/**
 * 步骤页和选择页的视图切换脚本（design §4.3，FR-30、FR-31，ADR-0003）。
 *
 * `[!why]` 块的显示和隐藏只由 `<html data-view>` 加 CSS 决定（prose.css）；本脚本只负责：
 * 点切换控件时改 `data-view`、同步 `aria-pressed`、把视图写进 M4；在每个原理块前面插一行
 * “为什么：<标题> · 在原理视图中查看”，点它切到原理视图并滚到这个原理块。
 * 切换不刷新页面，被点的控件在屏幕上的位置保持不变。
 */
export function initViewToggle(doc: Document): void {
  const root = doc.documentElement;
  // 只写 view 一个字段，不需要路线图：失效的步骤和选项标识由 route-enhance 那边的 store 在读写时过滤。
  const store = createReaderStore(getLocalStorage());
  const options = [...doc.querySelectorAll<HTMLButtonElement>('[data-view-option]')];

  const asView = (value: string | undefined): View => (value === 'principle' ? 'principle' : 'operation');
  const current = (): View => asView(root.dataset.view);
  const sync = () => {
    for (const option of options) option.setAttribute('aria-pressed', String(option.dataset.viewOption === current()));
  };

  /** 切换视图，并让 `anchor` 留在切换前的屏幕位置（它上方的原理块展开或收起时不跳动）。 */
  const switchTo = (view: View, anchor: Element) => {
    const before = anchor.getBoundingClientRect().top;
    root.dataset.view = view;
    sync();
    store.write({ view });
    doc.defaultView?.scrollBy(0, anchor.getBoundingClientRect().top - before);
  };

  for (const option of options) {
    option.addEventListener('click', () => switchTo(asView(option.dataset.viewOption), option));
  }

  for (const callout of doc.querySelectorAll<HTMLElement>(".prose .callout[data-callout='why']")) {
    const title = callout.querySelector('.callout-title')?.textContent?.trim() ?? '';
    const hint = doc.createElement('p');
    hint.className = 'why-hint';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'why-hint-button';
    button.textContent = `为什么：${title} · 在原理视图中查看`;
    button.addEventListener('click', () => {
      switchTo('principle', button);
      callout.tabIndex = -1;
      callout.scrollIntoView({ block: 'start' });
      callout.focus({ preventScroll: true });
    });
    hint.append(button);
    callout.before(hint);
  }

  sync();
  // 从往返缓存恢复时脚本不重跑，而视图可能已在别的页面改过（FR-31）。
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    root.dataset.view = store.read().view;
    sync();
  });
}
