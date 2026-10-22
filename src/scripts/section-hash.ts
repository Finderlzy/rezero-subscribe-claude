import { hashFragment } from '../lib/section-anchor';

/**
 * 小节锚点的落点（V07，架构 §13.4）：页面加载和 `hashchange` 时把带 `#小节` 的地址滚到正文里。
 *
 * v3 的页面固定原理视图、只有一版正文（用户 2026-10-22 决定），所以这里不再切视图：
 * 正文容器 `.prose` 里找得到这个 id 就滚过去；`#main` 这类不是小节的地址不处理，交给浏览器原生跳转。
 * 没有 JS 时浏览器原生锚点照常工作；这个脚本在其它页面脚本改完 DOM 之后补一次滚动，
 * 避免返回块、代码块包装等布局变化把原生锚点带偏。
 */
export function applySectionHash(doc: Document, hash: string): boolean {
  const id = hashFragment(hash);
  if (id === undefined) return false;
  const body = doc.querySelector<HTMLElement>('.prose');
  if (!body) return false;
  const target = queryById(body, id);
  if (!target) return false;
  target.scrollIntoView();
  return true;
}

/** 在页面初始化时挂上加载和 `hashchange` 的处理；没有 window（比如测试）时什么都不做 */
export function initSectionHash(doc: Document, win: Window | null = doc.defaultView): void {
  if (!win) return;
  const apply = () => {
    applySectionHash(doc, win.location.hash);
  };
  apply();
  win.addEventListener('hashchange', apply);
}

function queryById(root: HTMLElement, id: string): HTMLElement | null {
  try {
    return root.querySelector<HTMLElement>(`#${escapeId(id)}`);
  } catch {
    // 选择器写不出来（极旧的浏览器、怪字符）时退回 getElementById，再确认它在正文容器里
    const target = root.ownerDocument?.getElementById(id) ?? null;
    return target !== null && root.contains(target) ? target : null;
  }
}

/** CSS.escape 不可用时的最小转义：只给非字母数字、非连字符的字符加反斜杠 */
function escapeId(id: string): string {
  const escape = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS?.escape;
  return escape ? escape(id) : id.replace(/([^\w-])/g, '\\$1');
}
