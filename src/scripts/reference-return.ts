import { referenceReturn, type ReferenceReturn } from '../lib/reference-return';
import { withBase } from '../lib/with-base';

/**
 * 参考页（常见问题、IP 质量实测合集、各篇实测）的页面脚本（design §4.6，FR-20）。
 *
 * 从步骤链接进来（`?from=<page-id>`）时，填好标题上方和正文末尾的“← 返回刚才的步骤：<标题>”并显示出来
 * （构建时没有地址，隐藏着），同时隐藏直接打开时用的“打开目录”。
 * 实测页的页脚还有“回到：IP 质量实测合集”；其他参考页的页脚只剩“打开目录”，它隐藏后整行一起隐藏，不留空白。
 * 没有 JS 或参数无效时什么都不改：页面保持构建时的样子，只有“打开目录”。
 * 脚本跑完给 `<main>` 加 `data-reference-ready`，e2e 据此确认“没有返回链接”不是因为脚本还没跑。
 */
export function initReferenceReturn(doc: Document): void {
  const data = doc.getElementById('reference-pages')?.textContent;
  if (!data) return;
  const target = referenceReturn(doc.defaultView?.location.search ?? '', JSON.parse(data) as Record<string, string>);
  if (target) showReturn(doc, target);
  doc.getElementById('main')?.setAttribute('data-reference-ready', '');
}

function showReturn(doc: Document, target: ReferenceReturn): void {

  for (const block of doc.querySelectorAll<HTMLElement>('[data-reference-return]')) {
    const link = block.querySelector('a');
    if (!link) continue;
    // 同 pathOf（route-map）的 `/<id>/`；不为一个地址把整个路线模块打进参考页的脚本
    link.href = withBase(`/${target.id}/`);
    link.textContent = `← 返回刚才的步骤：${target.title}`;
    block.hidden = false;
  }
  for (const toc of doc.querySelectorAll<HTMLElement>('[data-reference-toc]')) {
    toc.hidden = true;
    const actions = toc.parentElement;
    if (actions && [...actions.children].every((child) => (child as HTMLElement).hidden)) actions.hidden = true;
  }
}
