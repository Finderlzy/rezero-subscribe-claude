import GithubSlugger from 'github-slugger';
import type { AnchorHeading } from '../section-anchor';

/**
 * Markdown 正文的小标题扫描（架构 §13.4）：不跑完整的 Markdown 解析——重写稿的小标题都是纯文字，
 * 这里只认 ATX 标题、跳过代码块，再去掉常见的行内记号，`slug` 与渲染后的标题 id 一致。
 *
 * 两处共用：`createLinkIndex` 扫磁盘上的页面文件（双链校验和 M6 的小节都靠它），
 * 构建时 `site.ts` 直接扫内容集合里的正文，给跳转表的 `section` 找锚点。后者不能读文件：
 * Astro 构建把页面代码打包到 `<outDir>/.prerender/` 再执行，`import.meta.url` 不指向源码目录。
 */

/** ATX 标题，1–6 个 `#`，可带收尾的 `#` */
const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
/** 正文第一行的 `# 页面标题`：不是小节 */
const TITLE = /^# +(.+?)[ \t]*$/;

/** 从一段正文（不含 frontmatter）里扫出小标题，第一行的 `# 页面标题` 不算 */
export function scanHeadings(content: string): AnchorHeading[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const first = lines.findIndex((line) => line.trim() !== '');
  // 只有第一行确实是 `# 标题` 时才跳过；页面开头直接写 `##` 时它算小节
  const titleLine = first !== -1 && TITLE.test(lines[first]!) ? first : -1;
  const slugger = new GithubSlugger();
  const headings: AnchorHeading[] = [];
  let fence: string | undefined;
  lines.forEach((line, i) => {
    const f = FENCE.exec(line);
    if (fence !== undefined) {
      if (f && f[1]![0] === fence[0] && f[1]!.length >= fence.length && line.trim() === f[1]) fence = undefined;
      return;
    }
    if (f) {
      fence = f[1];
      return;
    }
    if (i === titleLine) return;
    const h = ATX_HEADING.exec(line);
    if (h) {
      const text = plainHeading(h[2]!);
      headings.push({ slug: slugger.slug(text), text, depth: h[1]!.length });
    }
  });
  return headings;
}

/** 小标题去掉行内记号后的文字：`**加粗**`、`` `代码` ``、`[[目标|文字]]`、`[文字](地址)` */
export function plainHeading(text: string): string {
  return text
    .replace(/!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .trim();
}
