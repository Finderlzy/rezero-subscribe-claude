import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Link, Paragraph, Parent, Root, RootContent } from 'mdast';
import { parse as parseYaml } from 'yaml';
import { buildRouteMap } from '../route/route-map';
import type { PageId, PageMeta, ViewMode } from '../route/types';
import type { IndexedPage, LinkIndex } from './link-index';

/**
 * 选择页的选项块（架构 §3 M1“选择页的选项块”，FR-12）：frontmatter 的 `options.<id>.heading`
 * 是正文里独占一段的加粗文字；从这一段到它后面的第一个列表（含），遇到“独占一段的加粗文字 / 分隔线 / 标题 /
 * 正文结尾”时提前结束，包成 `<section class="option-block" data-option="<id>">`。块内第一个站内链接是这个选项的第一步，
 * 标上 `data-option-start`，页面用它撑满整块做点击区域，并且必须与路线图里该选项的第一步一致。
 */

declare module 'mdast' {
  interface LinkData {
    /** remark-obsidian 把双链转成站内页面链接时记下目标页的标识 */
    targetPage?: string;
  }
}

/** 选项 → 各视图下的第一步 */
type OptionStarts = ReadonlyMap<string, Record<ViewMode, PageId | null>>;

/**
 * 用 M2 的 `view(选择页, {分叉点: 选项}, 视图).next` 算出选择页每个选项的第一步，与“选择页的下一步”同一个定义
 * （M1 只在这里用 M2 的纯函数，见架构 §3 M1）。只有选择页才调用，所以 route.yaml 按需读取。
 * 页面元数据只填影响 `next` 的字段（标识、标题、principleOnly、选项标识），跳过和文案与第一步无关。
 * route.yaml 读不到或路线图本身有错时返回 null：错误由 loadSite 报出，这里不重复，也不再核对第一步。
 */
function optionStarts(index: LinkIndex, choosePage: PageId): OptionStarts | null {
  const file = join(index.contentRoot, 'route.yaml');
  const pages: PageMeta[] = index.pages
    .filter((p) => p.kind === 'principle' && p.title !== undefined)
    .map((p) => ({
      id: p.id,
      title: p.title!,
      principleOnly: p.principleOnly,
      skippable: false,
      ...(p.options && { options: [...p.options.keys()].map((id) => ({ id, title: id })) }),
    }));
  try {
    const map = buildRouteMap(parseYaml(readFileSync(file, 'utf8')), pages);
    const entry = Object.entries(map.data.forks).find(([, f]) => f.page === choosePage);
    if (!entry) return null;
    const [fork, { options }] = entry;
    const first = (option: string, mode: ViewMode) => {
      const next = map.view(choosePage, { [fork]: option }, mode).next;
      return next && next.kind !== 'home' ? next.id : null;
    };
    return new Map(options.map(({ id }) => [id, { operation: first(id, 'operation'), principle: first(id, 'principle') }]));
  } catch {
    return null;
  }
}

interface Reporter {
  report(message: string, at: { line: number; column: number } | undefined): void;
}

const VIEW_LABEL: Record<ViewMode, string> = { operation: '操作视图', principle: '原理视图' };

/** 正文里独占一段的加粗文字 */
function isBoldParagraph(node: RootContent): node is Paragraph {
  return node.type === 'paragraph' && node.children.length === 1 && node.children[0]!.type === 'strong';
}

const BLOCK_TYPE = 'optionBlock';

/** 选项块在这里结束；从后往前包，已经包好的后一块也算边界 */
function isBoundary(node: RootContent): boolean {
  return isBoldParagraph(node) || node.type === 'thematicBreak' || node.type === 'heading' || (node.type as string) === BLOCK_TYPE;
}

function text(node: RootContent | Parent): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  return 'children' in node ? (node.children as RootContent[]).map(text).join('') : '';
}

function firstPageLink(node: Parent): Link | undefined {
  for (const child of node.children as RootContent[]) {
    if (child.type === 'link' && child.data?.targetPage !== undefined) return child;
    if ('children' in child) {
      const found = firstPageLink(child);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * 把选择页正文里的选项小节包成选项块并核对（双链已经转换成链接之后调用）。
 * `page` 是当前文件（原理版或操作版），选项取同名原理版的 frontmatter；不是选择页时什么都不做。
 */
export function wrapOptionBlocks(tree: Root, page: IndexedPage, index: LinkIndex, ctx: Reporter): void {
  if (page.kind === 'reference') return;
  const principle = page.kind === 'principle' ? page : index.pages.find((p) => p.kind === 'principle' && p.id === page.id);
  const options = principle?.options;
  if (!options || options.size === 0) return;
  // 原理版在操作视图下也会顶替还没写的操作版（FR-21），这时两种视图都按它核对
  const hasOperation = index.pages.some((p) => p.kind === 'operation' && p.id === page.id);
  const modes: ViewMode[] = page.kind === 'operation' ? ['operation'] : hasOperation ? ['principle'] : ['principle', 'operation'];
  const starts = optionStarts(index, page.id);
  const titleOf = (id: PageId) => index.pages.find((p) => p.kind !== 'operation' && p.id === id)?.title ?? id;

  const found: { option: string; heading: string; start: number }[] = [];
  for (const [option, heading] of options) {
    const start = tree.children.findIndex((node) => isBoldParagraph(node) && text(node).trim() === heading);
    if (start === -1) {
      ctx.report(`选项 ${option} 的块标题“${heading}”在正文里找不到：要是独占一段的加粗文字（**…**），与 frontmatter 里 options.${option}.heading 的原文相同`, undefined);
      continue;
    }
    found.push({ option, heading, start });
  }
  // 从后往前包，前面的下标不受影响
  for (const { option, heading, start } of found.sort((a, b) => b.start - a.start)) {
    let end = start + 1;
    // 选项小节是“加粗标题 → 说明 → 步骤链接列表”：列表之后的普通段落是几个选项共用的话（如“两条路走完，都接着…”），
    // 不能算进最后一块，否则点它会把选择记成这一项
    while (end < tree.children.length && !isBoundary(tree.children[end]!)) {
      end++;
      if (tree.children[end - 1]!.type === 'list') break;
    }
    const title = tree.children[start] as Paragraph;
    title.data = { ...title.data, hProperties: { className: ['option-title'] } };
    const block = {
      type: BLOCK_TYPE,
      data: { hName: 'section', hProperties: { className: ['option-block'], dataOption: option } },
      children: tree.children.slice(start, end),
    } as unknown as RootContent;
    tree.children.splice(start, end - start, block);

    const at = title.position?.start;
    const link = firstPageLink(block as Parent);
    if (!link) {
      ctx.report(`选项块“${heading}”里没有站内链接：块内第一个链接要指向这个选项的第一步`, at);
      continue;
    }
    const target = link.data!.targetPage!;
    // hProperties 由 mdast-util-to-hast 读取，原样成为 <a> 的属性
    const data = link.data as { hProperties?: Record<string, unknown> };
    data.hProperties = { ...data.hProperties, dataOptionStart: '' };
    const expected = starts?.get(option);
    if (!expected) continue;
    for (const mode of modes) {
      const want = expected[mode];
      // want 为 null 只在选项没有步骤时出现，路线图校验已经不允许，所以不另报
      if (want !== null && want !== target) {
        ctx.report(
          `选项块“${heading}”的第一个链接指向“${titleOf(target)}”，但路线图里选项 ${option} 在${VIEW_LABEL[mode]}下的第一步是“${titleOf(want)}”`,
          link.position?.start ?? at,
        );
      }
    }
  }
}
