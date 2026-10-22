import { referenceReturn, type ReferenceReturn } from '../lib/reference-return';
import { withBase } from '../lib/with-base';

/**
 * 参考页（常见问题、IP 质量实测合集、各篇实测）的页面脚本（design §4.6，FR-20）。
 *
 * 从步骤链接进来（`?from=<page-id>`）时，填好标题上方和正文末尾的“← 返回刚才的步骤：<标题>”并显示出来
 * （构建时没有地址，隐藏着）。直接打开时这两处不显示；目录由常驻侧边栏或顶栏的“目录”提供
 * （v2.2 W4c 删掉了“打开目录”实心按钮）。
 * 没有 JS 或参数无效时什么都不改。
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
  // 页脚里只剩“回到：…”时整行显示；没有“回到…”的页面（常见问题首页、实测合集首页）整行不显示，不留空白
  const actions = doc.querySelector<HTMLElement>('.page-actions');
  if (actions && [...actions.children].every((child) => (child as HTMLElement).hidden)) actions.hidden = true;
}
