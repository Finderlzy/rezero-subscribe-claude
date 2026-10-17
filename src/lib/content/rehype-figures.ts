import type { Element, ElementContent, Root, RootContent } from 'hast';

/**
 * 截图图版（design v2.1 §4.7、D4）：独占一行的截图嵌入（remark-obsidian 输出的 `img[data-zoom]`）包成
 * `<figure class="plate" data-figure="n">`，编号写在 `<figcaption class="plate-no">图 1</figcaption>`，放在截图前面：
 * 桌面上它绝对定位到页边栏、竖向位置就是截图顶边；平板和手机由 CSS 排到截图下方（prose.css）。
 * 说明图（remark-obsidian 内联的 `svg[data-diagram]`，design §4.7）同样包成图版，多一个 `diagram` 类，和截图一起编号。
 * 每篇正文单独处理，所以原理版、操作版各自从 1 编号。
 *
 * 编号前半的步骤号（“图 02-1”的 `02-`）取决于路线和视图，这里只留空的 FIGURE_STEP_SLOT：
 * PageLayout 构建时用 fillFigureSteps 按操作视图填上，route-enhance 按当前视图和选择改写；
 * 参考页、选择页、旁支页和数不清步数的页面留空，只用序号（架构 §11.4 W-4）。
 *
 * 截图原本是段落里的图片：段落只能装行内内容，所以把段落从截图处拆开，截图前后的文字仍是段落，空白段落丢掉。
 * 和文字在同一行的行内图片不是图版，不编号；截图在标题、加粗、链接等放不下 figure 的元素里时也不处理（重写稿没有这种写法）。
 */

/** 编号里步骤号的占位：rehype-stringify 输出的原样字符串，fillFigureSteps 按它替换 */
export const FIGURE_STEP_SLOT = '<span data-figure-step=""></span>';

/** 把步骤号前缀（如 `02-`）写进 HTML 里每个图版的编号；前缀为空时原样返回 */
export function fillFigureSteps(html: string, prefix: string): string {
  return prefix === '' ? html : html.replaceAll(FIGURE_STEP_SLOT, `<span data-figure-step>${prefix}</span>`);
}

/** 可以放进 figure 的容器（流内容）：只在这些元素和段落里找截图；标题、行内元素等里面放不下块级的 figure，不处理 */
const FLOW = new Set(['li', 'blockquote', 'div', 'section', 'aside', 'td', 'th', 'dd', 'details']);

/** 截图（`img[data-zoom]`）或说明图（`svg[data-diagram]`，remark-obsidian 内联的 SVG）都做成图版 */
function isScreenshot(node: ElementContent): node is Element {
  return node.type === 'element' && ((node.tagName === 'img' && 'data-zoom' in node.properties) || isDiagram(node));
}

function isDiagram(node: Element): boolean {
  return node.tagName === 'svg' && 'dataDiagram' in node.properties;
}

/** 截图是否独占一行：到前后的换行（或父元素的边界）之间只有空白 */
function ownLine(siblings: readonly ElementContent[], i: number): boolean {
  const clear = (node: ElementContent, edge: 'before' | 'after') => {
    if (node.type !== 'text') return { blank: false, stop: true };
    const parts = node.value.split('\n');
    const near = edge === 'before' ? parts[parts.length - 1]! : parts[0]!;
    return { blank: near.trim() === '', stop: parts.length > 1 };
  };
  for (const [step, edge] of [[-1, 'before'], [1, 'after']] as const) {
    for (let j = i + step; j >= 0 && j < siblings.length; j += step) {
      const { blank, stop } = clear(siblings[j]!, edge);
      if (!blank) return false;
      if (stop) break;
    }
  }
  return true;
}

function plate(img: Element, plates: WeakSet<Element>): Element {
  const className = isDiagram(img) ? ['plate', 'diagram'] : ['plate'];
  const figure: Element = { type: 'element', tagName: 'figure', properties: { className }, children: [img] };
  plates.add(figure);
  return figure;
}

/** 把一组子节点里独占一行的截图换成图版；`split` 时（段落里）截图前后的文字各自成段，返回替换后的节点 */
function wrap(children: ElementContent[], split: Element | null, plates: WeakSet<Element>): ElementContent[] {
  const out: ElementContent[] = [];
  let run: ElementContent[] = [];
  const flush = () => {
    if (split && run.some((node) => node.type !== 'text' || node.value.trim() !== '')) out.push({ ...split, children: run });
    else if (!split) out.push(...run);
    run = [];
  };
  children.forEach((node, i) => {
    if (isScreenshot(node) && ownLine(children, i)) {
      flush();
      out.push(plate(node, plates));
    } else run.push(node);
  });
  flush();
  return out;
}

/** 编号写在截图前面：`图 <步骤号占位>n`；占位的 span 序列化后就是 FIGURE_STEP_SLOT（单元测试核对两者一致） */
function number(figure: Element, n: number): void {
  figure.properties.dataFigure = String(n);
  figure.children.unshift({
    type: 'element',
    tagName: 'figcaption',
    properties: { className: ['plate-no'] },
    children: [
      { type: 'text', value: '图 ' },
      { type: 'element', tagName: 'span', properties: { dataFigureStep: '' }, children: [] },
      { type: 'text', value: String(n) },
    ],
  });
}

export default function rehypeFigures() {
  return function transformer(tree: Root): void {
    const plates = new WeakSet<Element>();
    // 第一遍拆段落、包图版：只在根和 FLOW 容器里动手，其余元素（如 ol、table）只往里找；段落拆完只剩行内图片，不再进去
    const restructure = (node: Root | Element) => {
      if (node.type === 'root' || FLOW.has(node.tagName)) {
        const children = (node.children as ElementContent[]).flatMap((child) =>
          child.type === 'element' && child.tagName === 'p' && child.children.some(isScreenshot) ? wrap(child.children, child, plates) : [child],
        );
        node.children = (node.type === 'root' ? children : wrap(children, null, plates)) as RootContent[] & ElementContent[];
      }
      for (const child of node.children) if (child.type === 'element' && child.tagName !== 'p') restructure(child);
    };
    restructure(tree);
    // 第二遍按文档顺序编号（第一遍先处理完一层再往下，顺序不对）
    let n = 0;
    const count = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        if (plates.has(child)) number(child, ++n);
        else count(child);
      }
    };
    count(tree);
  };
}
