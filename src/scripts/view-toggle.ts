import type { ReaderStore, View } from '../lib/reader-state/reader-store';
import { VIEW_CHANGED_EVENT } from './reader-store';

/**
 * 步骤页、选择页、旁支页的视图切换脚本（design §4.3，FR-30、FR-31，ADR-0004）。
 *
 * 显示哪一版正文只由 `<html data-view>` 加 CSS 决定（prose.css）；本脚本只负责：点切换控件时改 `data-view`、
 * 同步 `aria-pressed`、把视图写进 M4、滚回页面顶部（焦点留在按钮上），再在 document 上派发
 * `reader-view-changed`，让 route-enhance 按新视图重算导航。切换不刷新页面，URL 不变。
 */
export function initViewToggle(doc: Document, store: ReaderStore): void {
  const root = doc.documentElement;
  const options = [...doc.querySelectorAll<HTMLButtonElement>('[data-view-option]')];

  const asView = (value: string | undefined): View => (value === 'principle' ? 'principle' : 'operation');
  const current = (): View => asView(root.dataset.view);
  const sync = () => {
    for (const option of options) option.setAttribute('aria-pressed', String(option.dataset.viewOption === current()));
  };
  const apply = (view: View) => {
    root.dataset.view = view;
    sync();
    doc.dispatchEvent(new Event(VIEW_CHANGED_EVENT));
  };

  for (const option of options) {
    option.addEventListener('click', () => {
      const view = asView(option.dataset.viewOption);
      if (view === current()) return;
      store.write({ view });
      apply(view);
      doc.defaultView?.scrollTo(0, 0);
    });
  }

  sync();
  // 从往返缓存恢复时脚本不重跑，而视图可能已在别的页面改过（FR-31）。
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const view = store.read().view;
    if (view !== current()) apply(view);
  });
}
