import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLinkIndex } from './link-index';
import { markdownPipeline } from './markdown';
import { FIGURE_STEP_SLOT, fillFigureSteps } from './rehype-figures';
import { createFixture, type Fixture } from './test-fixture';

/** 截图图版（design §4.7、D4）：独占一行的嵌入包成带序号的 <figure>，两版正文各自从 1 编号 */

let fx: Fixture;

beforeEach(() => {
  fx = createFixture();
  for (const name of ['a.png', 'b.jpg', 'c.png']) fx.shot(name);
});
afterEach(() => fx.cleanup());

type Processor = Awaited<ReturnType<typeof createMarkdownProcessor>>;

const processor = (): Promise<Processor> =>
  createMarkdownProcessor({ ...markdownPipeline({ base: '/', linkIndex: () => createLinkIndex(fx.contentRoot) }), syntaxHighlight: false });

/** 用生产同款管线渲染一个内容文件，路径相对内容根目录；传 `shared` 时和生产一样用同一个处理器连续渲染 */
async function render(path: string, source: string, shared?: Processor): Promise<string> {
  const file = fx.write(path, source);
  const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
  return (await (shared ?? (await processor())).render(content, { fileURL: pathToFileURL(file) })).code;
}

/** 输出里每个图版的序号和图片文件名，按出现顺序 */
function plates(html: string): { no: string; file: string }[] {
  const out: { no: string; file: string }[] = [];
  for (const m of html.matchAll(/<figure class="plate" data-figure="(\d+)">(.*?)<\/figure>/gs)) {
    out.push({ no: m[1]!, file: /screenshots\/([^&]+)&#x22;/.exec(m[2]!)?.[1] ?? '' });
  }
  return out;
}

describe('rehype-figures：截图图版', () => {
  it('每张截图包成 figure，编号在前、截图在后；一段里连着的几张拆成各自的图版，不留空段落', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n正文\n\n![[a.png|262]]\n![[b.jpg|262]]\n\n后文\n');
    expect(plates(html)).toEqual([
      { no: '1', file: 'a.png' },
      { no: '2', file: 'b.jpg' },
    ]);
    expect(html).toContain(`<figure class="plate" data-figure="1"><figcaption class="plate-no">图 ${FIGURE_STEP_SLOT}1</figcaption><img`);
    expect(html).not.toMatch(/<p>\s*<figure|<p>\s*<\/p>/);
    expect(html).toMatch(/^<p>正文<\/p>/);
    expect(html).toMatch(/<p>后文<\/p>$/);
  });

  it('原文宽度保留（|262、|600），没写宽度的照常', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n![[a.png|262]]\n\n![[b.jpg|600]]\n\n![[c.png]]\n');
    expect(plates(html).map((p) => p.file)).toEqual(['a.png', 'b.jpg', 'c.png']);
    expect(html).toContain('&#x22;width&#x22;:262');
    expect(html).toContain('&#x22;width&#x22;:600');
  });

  it('两版正文分别从 1 编号（生产里同一个处理器渲染全部文件，编号不能跨文件累加）', async () => {
    const shared = await processor();
    const principle = await render('principle/subscribe.md', '# 订阅\n\n![[a.png]]\n\n原理\n\n![[b.jpg]]\n\n![[c.png]]\n', shared);
    const operation = await render('operation/subscribe.md', '# 订阅\n\n![[c.png]]\n', shared);
    expect(plates(principle).map((p) => p.no)).toEqual(['1', '2', '3']);
    expect(plates(operation)).toEqual([{ no: '1', file: 'c.png' }]);
  });

  it('紧跟在列表项文字下一行的截图：文字留在段落里，图版跟在后面、仍在这一项里', async () => {
    const html = await render('principle/clean-up.md', '# 清理\n\n1. **退出**：点 **Log out**。\n![[a.png]]\n\n2. 第二项\n');
    expect(html).toMatch(/<li>\s*<p><strong>退出<\/strong>：点 <strong>Log out<\/strong>。\s*<\/p>\s*<figure class="plate" data-figure="1">.*?<\/figure>\s*<\/li>/s);
  });

  it('紧凑列表（项内没有段落）里独占一行的截图也是图版', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n- 打开设置\n  ![[a.png]]\n- 下一项\n');
    expect(html).toMatch(/<li>打开设置\s*<figure class="plate" data-figure="1">.*?<\/figure><\/li>/s);
  });

  it('按文档顺序编号：列表里的截图排在它后面段落里的截图之前', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n1. 第一项\n\n   ![[a.png]]\n\n2. 第二项\n\n![[b.jpg]]\n');
    expect(plates(html)).toEqual([
      { no: '1', file: 'a.png' },
      { no: '2', file: 'b.jpg' },
    ]);
  });

  it('标题里放不下 figure：截图留在原处，不编号', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n## ![[a.png]]\n');
    expect(html).toMatch(/^<h2[^>]*><img[^>]*><\/h2>$/);
  });

  it('和文字同一行的行内图片不算截图图版，不编号，留在原段落里', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n点这里 ![[a.png|20]] 的按钮\n\n![[b.jpg]]\n');
    expect(html).toMatch(/^<p>点这里 <img[^>]*> 的按钮<\/p>/);
    expect(plates(html)).toEqual([{ no: '1', file: 'b.jpg' }]);
  });

  it('说明图（design §4.7）也是图版，加 diagram 类，和截图一起按文档顺序编号', async () => {
    fx.diagram('说明图-路线.svg', '<svg viewBox="0 0 300 80"><title>路线</title><path d="M0 0H1" stroke="currentColor"/></svg>');
    const html = await render('principle/recap.md', '# 小结\n\n![[a.png]]\n\n正文\n\n![[说明图-路线.svg]]\n\n后文\n');
    expect(html).toMatch(
      new RegExp(`<figure class="plate diagram" data-figure="2"><figcaption class="plate-no">图 ${FIGURE_STEP_SLOT}2</figcaption><svg [^>]*data-diagram[^>]*>.*?</svg></figure>`, 's'),
    );
    expect(html).not.toMatch(/<p>\s*<figure|<p>\s*<\/p>/);
  });

  it('普通 Markdown 图片（不是 ![[…]] 嵌入）不处理', async () => {
    const html = await render('principle/subscribe.md', '# 订阅\n\n![x](https://example.com/x.png)\n');
    expect(html).toBe('<p><img src="https://example.com/x.png" alt="x"></p>');
  });
});

describe('fillFigureSteps：编号前半的步骤号', () => {
  const html = `<figure class="plate" data-figure="1"><figcaption class="plate-no">图 ${FIGURE_STEP_SLOT}1</figcaption></figure>`;

  it('写进每个图版的编号里', () => {
    expect(fillFigureSteps(html + html, '02-')).toBe(html.replace(FIGURE_STEP_SLOT, '<span data-figure-step>02-</span>').repeat(2));
  });

  it('前缀为空时（选择页、旁支页、数不清步数）原样返回，只有序号', () => {
    expect(fillFigureSteps(html, '')).toBe(html);
  });
});

describe('rehype-figures：正文视频（2026-10-23）', () => {
  /** 视频目录要显式传给链接索引：和截图、说明图一样，先确认文件存在 */
  const renderWithVideo = async (source: string): Promise<string> => {
    const file = fx.write('principle/rules.md', source);
    const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
    const index = createLinkIndex(fx.contentRoot, fx.screenshotsDir, fx.diagramsDir, fx.videosDir);
    const p = await createMarkdownProcessor({ ...markdownPipeline({ base: '/', linkIndex: index }), syntaxHighlight: false });
    return (await p.render(content, { fileURL: pathToFileURL(file) })).code;
  };

  it('独占一行的视频包成 figure.video，不编号；后面的截图仍从 1 编号', async () => {
    fx.video('v2rayn-rules.mp4');
    const html = await renderWithVideo('# 规则\n\n![[v2rayn-rules.mp4]]\n\n![[a.png]]\n');

    expect(html).toContain('<figure class="video"><video ');
    expect(html).not.toContain('data-figure="1"><video');
    expect(plates(html)).toEqual([{ no: '1', file: 'a.png' }]);
  });

  it('和文字同一行时不包成 figure，留在段落里', async () => {
    fx.video('v2rayn-rules.mp4');
    const html = await renderWithVideo('# 规则\n\n看 ![[v2rayn-rules.mp4]] 演示\n');

    expect(html).not.toContain('<figure class="video">');
    expect(html).toMatch(/^<p>看 <video[^>]*><\/video> 演示<\/p>$/);
  });
});
