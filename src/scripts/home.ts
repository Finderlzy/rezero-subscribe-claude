import { createReaderStore, getLocalStorage, type ReaderStore } from '../lib/reader-state/reader-store';
import { pathOf } from '../lib/route/route-map';
import { withBase } from '../lib/with-base';

/**
 * 首页的页面脚本（design §4.4，FR-18、FR-50）：本机有阅读进度时，显示主按钮“继续上次：<步骤名>”，
 * “直接开始”降为次按钮。
 *
 * 这是渐进增强：没有 JS、没有进度、本机存储不可用，或记下的步骤已不在路线图里时，
 * 页面保持构建时的样子，只有“直接开始”（AC-18）。
 */

export interface Resume {
  id: string;
  title: string;
}

/** 本机记下的上一次阅读的步骤；没有，或它已不在 `titles`（路线图现有步骤）里时返回 null。 */
export function resumeOf(store: ReaderStore, titles: Record<string, string>): Resume | null {
  const id = store.read().lastStep;
  return id !== undefined && Object.hasOwn(titles, id) ? { id, title: titles[id]! } : null;
}

/**
 * 页面里的挂载点（由 index.astro 写出）：`#home-steps`：“步骤标识 → 标题”（JSON）；
 * `[data-home-resume]`：“继续上次”链接，构建时隐藏；`[data-home-start]`：“直接开始”链接。
 * 第一次计算完成后给 `<main>` 加上 `data-home-ready`，e2e 据此确认脚本已跑完。
 */
export function initHome(doc: Document): void {
  const data = doc.getElementById('home-steps')?.textContent;
  const resumeLink = doc.querySelector<HTMLAnchorElement>('[data-home-resume]');
  const startLink = doc.querySelector<HTMLAnchorElement>('[data-home-start]');
  if (!data || !resumeLink || !startLink) return;

  const titles = JSON.parse(data) as Record<string, string>;
  const store = createReaderStore(getLocalStorage(), { isKnownStep: (id) => Object.hasOwn(titles, id) });

  const refresh = () => {
    const resume = resumeOf(store, titles);
    resumeLink.hidden = resume === null;
    startLink.classList.toggle('button-secondary', resume !== null);
    if (resume) {
      resumeLink.href = withBase(pathOf({ kind: 'step', ...resume }));
      resumeLink.textContent = `继续上次：${resume.title}`;
    }
  };

  refresh();
  doc.getElementById('main')?.setAttribute('data-home-ready', '');
  // 从往返缓存恢复的首页不会重新运行脚本，而进度可能已在别的页面变了。
  doc.defaultView?.addEventListener('pageshow', (event) => {
    if (event.persisted) refresh();
  });
}
