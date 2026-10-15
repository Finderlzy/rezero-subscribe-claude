import { join, sep } from 'node:path';
import GithubSlugger from 'github-slugger';
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { resolveLinkIndex, type LinkIndex } from './link-index';

/**
 * 操作版正文的标题 id 加 `op-` 前缀（架构 §3 M1、ADR-0004）：同一页的 HTML 里有两版正文，
 * 不加前缀会出现重复 id。Astro 的 rehypeHeadingIds 排在用户插件之后、只给没有 id 的标题补 id，
 * 所以这里按它同样的规则（github-slugger，重复的加 -1、-2）先写好带前缀的 id。
 */
export const OPERATION_ID_PREFIX = 'op-';

export interface RehypeOperationIdsOptions {
  linkIndex: LinkIndex | (() => LinkIndex);
}

export default function rehypeOperationIds({ linkIndex }: RehypeOperationIdsOptions) {
  return function transformer(tree: Root, file: { path?: string }): void {
    if (!file.path) return;
    const dir = join(resolveLinkIndex(linkIndex).contentRoot, 'operation') + sep;
    if (!file.path.startsWith(dir)) return;
    const slugger = new GithubSlugger();
    const visit = (node: Root | RootContent | ElementContent) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        node.properties.id = OPERATION_ID_PREFIX + slugger.slug(textOf(node));
        return;
      }
      if ('children' in node) node.children.forEach(visit);
    };
    visit(tree);
  };
}

function textOf(node: Element | ElementContent): string {
  if (node.type === 'text') return node.value;
  return 'children' in node ? node.children.map(textOf).join('') : '';
}
