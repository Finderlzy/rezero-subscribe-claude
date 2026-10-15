import { faqReturn } from '../lib/faq-return';
import { pathOf } from '../lib/route/route-map';
import { withBase } from '../lib/with-base';

/**
 * 常见问题条目页的页面脚本（design §4.6，FR-20）。
 *
 * 从步骤链接进来（`?from=<step-id>`，由 M1 的 `[[faq/…]]` 链接自动带上）时，填好标题上方和正文末尾的
 * “← 返回刚才的步骤：<步骤名>”并显示出来（构建时没有 href，隐藏着）。
 * 没有 JS 或参数无效时什么都不改：页面保持构建时的样子，只有列表入口。
 */
export function initFaqReturn(doc: Document): void {
  const data = doc.getElementById('faq-steps')?.textContent;
  if (!data) return;
  const target = faqReturn(doc.defaultView?.location.search ?? '', JSON.parse(data) as Record<string, string>);
  if (!target) return;

  for (const block of doc.querySelectorAll<HTMLElement>('[data-faq-return]')) {
    const link = block.querySelector('a');
    if (!link) continue;
    link.href = withBase(pathOf({ kind: 'step', ...target }));
    link.textContent = `← 返回刚才的步骤：${target.title}`;
    block.hidden = false;
  }
}
