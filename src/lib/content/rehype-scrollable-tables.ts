import type { ElementContent, Root, RootContent } from 'hast';

/**
 * 表格可以用键盘滚动（NFR-01、design §5）：表格在自己的容器里横向滚动（prose.css），窄屏上放不下时，
 * 只用键盘的读者要能把焦点放到表格上再用方向键滚动（axe 的 scrollable-region-focusable）。
 * 和 Shiki 给 <pre> 加 tabindex="0" 是同一个做法；构建时不知道表格在哪个宽度会溢出，所以每张表都加。
 */
export default function rehypeScrollableTables() {
  return function transformer(tree: Root): void {
    const visit = (node: Root | RootContent | ElementContent) => {
      if (node.type === 'element' && node.tagName === 'table') node.properties.tabIndex = 0;
      if ('children' in node) node.children.forEach(visit);
    };
    visit(tree);
  };
}
