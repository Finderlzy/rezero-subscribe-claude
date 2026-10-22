import { search as searchEntries, type SearchEntry, type SearchHit } from '../lib/search';
import { withBase } from '../lib/with-base';

/**
 * 顶栏站内搜索的页面脚本（FR-24、AC-28、design §4.8）。
 *
 * 索引由 M6（`src/lib/search/`）在构建时生成、静态端点 `search-index.json` 输出；
 * 这里在读者第一次聚焦搜索框时下载一次，之后只在内存里调用 `search()`，输入的文字不离开浏览器。
 * 标记由 `SiteSearch.astro` 写出，`SiteHeader.astro` 把它放在顶栏右侧；没有 JS 时整个控件是 `hidden`。
 *
 * 下拉按 ARIA APG 的 combobox（list autocomplete）模式：输入框是 `role="combobox"`、
 * `aria-activedescendant` 指向当前项；每条结果本身是 `role="option"` 的链接，`tabindex="-1"`（Tab 离开搜索）。
 * 平板和桌面是胶囊输入框；<720px 只有放大镜按钮，点开后输入框盖住整条顶栏，关闭后焦点回到按钮。
 */

/** 索引的下载状态：第一次聚焦才下载（AC-28 的“只有一次请求、不带搜索文字”）。 */
export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** 下拉里一段文字：命中的一段加粗（design §4.8：匹配到的文字加粗，不改色）。 */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** 一条结果在 DOM 里要写的内容。`href` 已经由 M6 拼上部署根路径和锚点。 */
export interface SearchOptionView {
  href: string;
  title: HighlightSegment[];
  /** 命中的是小标题时的第二行“› 小标题” */
  heading?: HighlightSegment[];
}

/** 下拉当前该显示哪一块；DOM 里只负责画，判断都在 `searchPanel()` 里方便单测。 */
export type SearchPanel =
  | { kind: 'hidden' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'list'; options: SearchOptionView[] };

/** 和 M6 相同的规范化：全角半角、大小写和空白都不影响匹配。 */
function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/**
 * 把一段文字按查询切成“命中 / 没命中”的几段，DOM 里把命中的一段放进 `<strong>`。
 * 命中的位置按和 M6 一样的规范化找（全角、大小写、空白都不影响），
 * 再映射回原始文字的下标，所以“ＩＰ”搜“ip”也能整段加粗；找不到命中时整段原样返回。
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const plain: HighlightSegment[] = [{ text, match: false }];
  const needle = normalize(query);
  if (needle === '') return plain;

  // 规范化后的每个字符来自原始文字的第几个字符；空白字符不参与匹配，也不占位置
  const chars = [...text];
  let normalized = '';
  const origin: number[] = [];
  chars.forEach((char, index) => {
    for (const piece of char.normalize('NFKC').toLowerCase()) {
      if (/\s/.test(piece)) continue;
      normalized += piece;
      origin.push(index);
    }
  });

  const at = normalized.indexOf(needle);
  if (at === -1) return plain;
  const start = origin[at]!;
  const end = origin[at + needle.length - 1]! + 1;
  return [
    { text: chars.slice(0, start).join(''), match: false },
    { text: chars.slice(start, end).join(''), match: true },
    { text: chars.slice(end).join(''), match: false },
  ].filter((segment) => segment.text !== '');
}

/**
 * 上下键移动时的新下标：还没选中时下键选第一条、上键选最后一条；到两头停住，不绕着转。
 * `count` 是当前结果数，没有结果时返回 -1（没选中）。
 */
export function moveActive(current: number, delta: number, count: number): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return delta > 0 ? 0 : count - 1;
  return Math.min(count - 1, Math.max(0, current + delta));
}

/**
 * 根据输入、索引状态和匹配结果决定下拉显示什么：
 * 输入为空或索引还没到时隐藏；下载失败显示“搜索暂时不可用”；没有命中显示“没有找到”；否则列出结果。
 */
export function searchPanel(query: string, status: SearchStatus, hits: readonly SearchHit[]): SearchPanel {
  if (query.trim() === '') return { kind: 'hidden' };
  if (status === 'error') return { kind: 'error' };
  if (status !== 'ready') return { kind: 'hidden' };
  if (hits.length === 0) return { kind: 'empty' };
  return {
    kind: 'list',
    options: hits.map(({ entry, href }) =>
      'heading' in entry
        ? { href, title: highlightSegments(entry.pageTitle, query), heading: highlightSegments(entry.heading, query) }
        : { href, title: highlightSegments(entry.pageTitle, query) },
    ),
  };
}

/** 结果项 id 的前缀：输入框的 `aria-activedescendant` 指向它。 */
const OPTION_ID_PREFIX = 'site-search-option-';

/**
 * 页面初始化：把 `SiteSearch.astro` 的标记接上。没有 JS 时不执行，控件保持 `hidden`（design §5）。
 * 找不到标记时什么都不做（比如以后某页不要搜索）。
 */
export function initSearch(doc: Document, win: Window | null = doc.defaultView): void {
  if (!win) return;
  const root = doc.querySelector<HTMLElement>('[data-site-search]');
  const input = root?.querySelector<HTMLInputElement>('[data-search-input]');
  const popup = root?.querySelector<HTMLElement>('[data-search-popup]');
  const list = root?.querySelector<HTMLElement>('[data-search-list]');
  const statusLine = root?.querySelector<HTMLElement>('[data-search-status]');
  const announceLine = root?.querySelector<HTMLElement>('[data-search-announce]');
  const openButton = root?.querySelector<HTMLButtonElement>('[data-search-open]');
  const closeButton = root?.querySelector<HTMLButtonElement>('[data-search-close]');
  if (!root || !input || !popup || !list || !statusLine || !announceLine || !openButton || !closeButton) return;

  let entries: SearchEntry[] | null = null;
  let status: SearchStatus = 'idle';
  let hits: SearchHit[] = [];
  let active = -1;
  let composing = false;

  const options = (): HTMLAnchorElement[] => [...list.querySelectorAll<HTMLAnchorElement>('[role="option"]')];

  const setActive = (index: number) => {
    const items = options();
    active = items.length === 0 ? -1 : index;
    items.forEach((item, i) => item.setAttribute('aria-selected', String(i === active)));
    const current = active >= 0 ? items[active] : undefined;
    if (current) {
      input.setAttribute('aria-activedescendant', current.id);
      current.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const closePanel = () => {
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const clearOverlay = () => {
    // 手机上收起时连输入一起清掉，下次点开放大镜是干净的
    delete root.dataset.open;
    input.value = '';
    closePanel();
  };

  const closeOverlay = (restoreFocus: boolean) => {
    if (!root.hasAttribute('data-open')) return;
    clearOverlay();
    if (restoreFocus) openButton.focus();
  };

  /** 读屏播报“没有找到 / 搜索暂时不可用”（design §4.8）：live region 始终在可访问树里，只换文字。 */
  const announce = (message: string) => {
    if (announceLine.textContent === message) {
      // 同一句再来一次：先清空、下一帧再写，读屏才有第二次变化
      announceLine.textContent = '';
      win?.requestAnimationFrame?.(() => {
        announceLine.textContent = message;
      });
      return;
    }
    announceLine.textContent = message;
  };

  const segmentNodes = (segments: HighlightSegment[]): HTMLElement[] =>
    segments.map((segment) => {
      const node = doc.createElement(segment.match ? 'strong' : 'span');
      node.textContent = segment.text;
      return node;
    });

  const optionItem = (option: SearchOptionView, index: number): HTMLLIElement => {
    const item = doc.createElement('li');
    item.setAttribute('role', 'none');
    // 结果本身是链接、也是 option（design §4.8 的“role=option 的链接”）。
    // 不用 option 里再套一个链接：读屏会把内层链接当成嵌套的控件，Tab 也会跑进下拉。
    const link = doc.createElement('a');
    link.id = `${OPTION_ID_PREFIX}${index}`;
    link.className = 'search-option';
    link.href = option.href;
    link.tabIndex = -1;
    link.setAttribute('role', 'option');
    link.setAttribute('aria-selected', 'false');
    const title = doc.createElement('span');
    title.className = 'search-option-title';
    title.append(...segmentNodes(option.title));
    link.append(title);
    if (option.heading) {
      const heading = doc.createElement('span');
      heading.className = 'search-option-heading';
      const arrow = doc.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '› ';
      heading.append(arrow, ...segmentNodes(option.heading));
      link.append(heading);
    }
    // 鼠标移到哪一条，键盘的“当前项”就跟到哪一条（点链接本身由浏览器导航）
    link.addEventListener('mouseenter', () => setActive(index));
    item.append(link);
    return item;
  };

  const render = () => {
    hits = status === 'ready' && entries ? searchEntries(entries, input.value) : [];
    const panel = searchPanel(input.value, status, hits);
    const shown = panel.kind !== 'hidden';
    popup.hidden = !shown;
    input.setAttribute('aria-expanded', String(shown));
    // 结果换了就重算：旧的 option 会被删掉，先清掉指向它们的 aria-activedescendant，
    // 否则读屏会指向已不存在的 id（ARIA 的 IDREF 不能悬空）
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren();
    list.hidden = panel.kind !== 'list';
    statusLine.hidden = true;
    if (panel.kind === 'list') {
      announce('');
      list.append(...panel.options.map(optionItem));
      setActive(active < panel.options.length ? active : -1);
    } else if (panel.kind === 'empty' || panel.kind === 'error') {
      const message = panel.kind === 'empty' ? '没有找到' : '搜索暂时不可用';
      statusLine.textContent = message;
      statusLine.hidden = false;
      announce(message);
    } else {
      // 输入为空 / 索引还没到：把上一次的播报文字也清掉，别让读屏留住旧结果
      announce('');
    }
  };

  const update = () => {
    active = -1;
    render();
  };

  // 第一次聚焦才下载索引：地址固定，请求里没有读者输入的文字（AC-28）
  const ensureIndex = () => {
    if (status !== 'idle') return;
    status = 'loading';
    fetch(withBase('/search-index.json'))
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<SearchEntry[]>;
      })
      .then((data) => {
        entries = data;
        status = 'ready';
        render();
      })
      .catch(() => {
        // 下载失败只在下拉里说“搜索暂时不可用”，不往控制台报错，其余页面功能照常
        status = 'error';
        render();
      });
  };

  const openOverlay = () => {
    root.dataset.open = '';
    ensureIndex();
    input.focus();
  };

  root.hidden = false;
  openButton.addEventListener('click', openOverlay);
  closeButton.addEventListener('click', () => closeOverlay(true));
  // 手机上 Shift+Tab 可以先到关闭按钮：在按钮上按 Esc 也收起覆盖层（design §4.8）
  closeButton.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeOverlay(true);
  });
  input.addEventListener('focus', ensureIndex);
  input.addEventListener('compositionstart', () => {
    composing = true;
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    update();
  });
  input.addEventListener('input', () => {
    // 输入法组字时（拼音还没选字）不搜索，组字结束再搜
    if (!composing) update();
  });

  input.addEventListener('keydown', (event) => {
    if (event.isComposing || composing) return;
    const count = options().length;
    if (event.key === 'ArrowDown' && !popup.hidden && count > 0) {
      event.preventDefault();
      setActive(moveActive(active, 1, count));
    } else if (event.key === 'ArrowUp' && !popup.hidden && count > 0) {
      event.preventDefault();
      setActive(moveActive(active, -1, count));
    } else if (event.key === 'Enter' && !popup.hidden && count > 0) {
      event.preventDefault();
      const target = active >= 0 ? active : 0;
      const hit = hits[target];
      if (hit) win.location.assign(hit.href);
    } else if (event.key === 'Escape') {
      // Esc 先清空输入，再关下拉；手机上再按一次才收起盖住顶栏的输入框（design §4.8）
      if (input.value !== '') {
        event.preventDefault();
        input.value = '';
        update();
      } else if (root.hasAttribute('data-open')) {
        event.preventDefault();
        closeOverlay(true);
      } else if (!popup.hidden) {
        event.preventDefault();
        closePanel();
      }
    }
  });

  // Tab 离开、点到别处都收起：手机上连覆盖顶栏的输入框一起收起，不把焦点抢回来
  const collapseOnLeave = () => {
    if (root.hasAttribute('data-open')) clearOverlay();
    else closePanel();
  };
  root.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null;
    if (next && root.contains(next)) return;
    collapseOnLeave();
  });
  doc.addEventListener('click', (event) => {
    const target = event.target as Node | null;
    if (target && root.contains(target)) return;
    collapseOnLeave();
  });
  // 手机打开着的时候转成平板/桌面：收起覆盖层，正常的输入框出现
  const desktop = win.matchMedia?.('(min-width: 720px)');
  const closeOnDesktop = (event: { matches: boolean }) => {
    if (event.matches) closeOverlay(false);
  };
  // 旧版 Safari（<14）的 MediaQueryList 只有 addListener
  if (desktop?.addEventListener) desktop.addEventListener('change', closeOnDesktop);
  else desktop?.addListener?.(closeOnDesktop);
}
