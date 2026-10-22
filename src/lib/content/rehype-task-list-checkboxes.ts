import type { Element, Root, RootContent } from 'hast';

/**
 * GFM 任务列表（`- [ ] 打开 ipinfo.io…`）的方框（设计上只是“照着做”的视觉清单）：
 * mdast 生成的 `<input type="checkbox" disabled>` 没有可访问名称，axe 会报 critical 的 label。
 * 这些方框在页面上不能点、状态由正文写着，对读屏是装饰，所以这里加 `aria-hidden` 并移出 Tab 序列，
 * 让读屏只读条目文字（新稿的环境检查清单用了任务列表，V10）。
 */
export default function rehypeTaskListCheckboxes() {
  return (tree: Root) => {
    walk(tree);
  };
}

function walk(node: Root | Element): void {
  if (!('children' in node)) return;
  node.children = node.children.map((child) => {
    if (child.type === 'element' && child.tagName === 'input' && child.properties?.type === 'checkbox') {
      child.properties.ariaHidden = 'true';
      child.properties.tabIndex = -1;
    }
    if (child.type === 'element') walk(child);
    return child as RootContent;
  });
}
