import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import type { Image, Node, Parent, Root } from 'mdast';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLinkIndex } from './link-index';
import { markdownPipeline } from './markdown';
import { ContentError, type ContentProblem } from './remark-obsidian';
import { createFixture, md, type Fixture } from './test-fixture';

let fx: Fixture;

beforeEach(() => {
  fx = createFixture();
  fx.write('principle/import-proxy.md', '# 导入代理软件\n\n## 检查 IP\n');
  fx.shot('Pasted image 20261012190537.png');
  fx.shot('微信图片_20261012.jpg');
  fx.shot('plain.png');
});
afterEach(() => fx.cleanup());

interface Rendered {
  html: string;
  problems: ContentProblem[];
  images: Image[];
  localImagePaths: string[];
}

/** 用生产同款管线渲染一个内容文件（正文行号与源文件一致），收集问题和插件生成的图片节点 */
async function renderFile(path: string, body: string, base = '/'): Promise<Rendered> {
  const file = fx.write(path, md('skippable: false', body));
  const problems: ContentProblem[] = [];
  const images: Image[] = [];
  const pipeline = markdownPipeline({
    base,
    linkIndex: () => createLinkIndex(fx.contentRoot),
    onProblems: (found) => problems.push(...found),
  });
  const collect = () => (tree: Root) => {
    const visit = (node: Node) => {
      if (node.type === 'image') images.push(node as Image);
      if ('children' in node) (node as Parent).children.forEach(visit);
    };
    visit(tree);
  };
  const processor = await createMarkdownProcessor({
    ...pipeline,
    remarkPlugins: [...(pipeline.remarkPlugins ?? []), collect],
    syntaxHighlight: false,
  });
  const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
  const out = await processor.render(content, { fileURL: pathToFileURL(file) });
  return { html: out.code, problems, images, localImagePaths: out.metadata.localImagePaths };
}

/** 插件写进 image.data 的 hProperties（mdast 的类型里没有这个字段，由 mdast-util-to-hast 读取） */
const hProps = (img: Image) => (img.data as Record<string, unknown> | undefined)?.hProperties;

const renderStep = (body: string, base?: string) => renderFile('principle/current-step.md', body, base);

/** frontmatter 固定 3 行（--- / skippable / ---），正文第 1 行在源文件第 4 行 */
const BODY_LINE = 4;

describe('嵌入', () => {
  it('![[文件名|宽度]]：图片节点指向截图目录的相对路径，写上宽度、2x 密度和看大图标记', async () => {
    const r = await renderStep('![[plain.png|262]]');
    expect(r.problems).toEqual([]);
    expect(r.images).toHaveLength(1);
    const [img] = r.images;
    expect(img.url).toBe('../../assets/screenshots/plain.png');
    expect(img.alt).toBe('plain');
    expect(hProps(img)).toEqual({ 'data-zoom': '', width: 262, densities: [1, 2] });
    // Astro 的 remarkCollectImages 在插件之后运行，会把它交给图片服务
    expect(r.localImagePaths).toEqual(['../../assets/screenshots/plain.png']);
  });

  it('![[文件名]]：不写宽度时保持原图宽度，只加看大图标记', async () => {
    const r = await renderStep('![[plain.png]]');
    expect(hProps(r.images[0])).toEqual({ 'data-zoom': '' });
  });

  it('文件名含空格和中文：url 用 encodeURI，Astro 解码后正好是原文件名；替代文字去掉扩展名', async () => {
    const r = await renderStep('![[Pasted image 20261012190537.png|262]]\n\n![[微信图片_20261012.jpg]]');
    expect(r.problems).toEqual([]);
    expect(r.images.map((i) => i.url)).toEqual([
      encodeURI('../../assets/screenshots/Pasted image 20261012190537.png'),
      encodeURI('../../assets/screenshots/微信图片_20261012.jpg'),
    ]);
    expect(r.images.map((i) => i.alt)).toEqual(['Pasted image 20261012190537', '微信图片_20261012']);
    expect(r.localImagePaths).toEqual([
      '../../assets/screenshots/Pasted image 20261012190537.png',
      '../../assets/screenshots/微信图片_20261012.jpg',
    ]);
  });

  it('行内嵌入也转换（同段前后有文字）', async () => {
    const r = await renderStep('点这里 ![[plain.png|20]] 的按钮');
    expect(r.problems).toEqual([]);
    expect(r.images).toHaveLength(1);
    expect(r.html).toMatch(/^<p>点这里 <img[^>]*> 的按钮<\/p>$/);
  });

  it('未知图片：报出文件和行号', async () => {
    const r = await renderStep('文字\n\n![[missing.png|262]]');
    expect(r.problems).toEqual([
      expect.objectContaining({ line: BODY_LINE + 2, column: 1, message: expect.stringContaining('找不到图片“missing.png”') }),
    ]);
  });

  it('带 09附件/ 前缀视为错误，并提示去掉前缀', async () => {
    const r = await renderStep('![[09附件/plain.png|262]]');
    expect(r.problems[0].message).toContain('去掉“09附件/”前缀');
  });

  it('文件名含 #、?、% 时报错（会让图片路径出错）', async () => {
    fx.shot('a#b.png');
    const r = await renderStep('![[a#b.png]]');
    expect(r.problems[0].message).toContain('不能含 #、?、%');
  });

  describe('说明图（.svg，design §4.7）', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 90"><title>三个账号</title><g class="accent"><path d="M0 0H10" stroke="currentColor"/></g></svg>';

    it('原样内联：图按 1:1 显示，标题当替代文字，不当截图交给图片服务、不能看大图', async () => {
      fx.diagram('说明图-整体思路.svg', svg);
      const r = await renderStep('![[说明图-整体思路.svg]]');
      expect(r.problems).toEqual([]);
      expect(r.images).toEqual([]);
      expect(r.localImagePaths).toEqual([]);
      expect(r.html).toContain(
        '<svg viewBox="0 0 320 90" width="320" height="90" role="img" aria-label="三个账号" class="diagram-svg" data-diagram=""><title>三个账号</title><g class="accent"><path d="M0 0H10" stroke="currentColor"></path></g></svg>',
      );
      expect(r.html).not.toContain('data-zoom');
    });

    it('找不到说明图：报出文件和行号，提示放进 src/assets/diagrams/', async () => {
      const r = await renderStep('文字\n\n![[说明图-没有.svg]]');
      expect(r.problems).toEqual([
        expect.objectContaining({ line: BODY_LINE + 2, message: expect.stringContaining('找不到说明图“说明图-没有.svg”（应放在 src/assets/diagrams/）') }),
      ]);
    });

    it('不写宽度：说明图按 viewBox 显示', async () => {
      fx.diagram('说明图-整体思路.svg', svg);
      const r = await renderStep('![[说明图-整体思路.svg|600]]');
      expect(r.problems[0].message).toContain('说明图不写宽度');
    });

    it('SVG 不合格时逐条报出', async () => {
      fx.diagram('说明图-坏.svg', '<svg viewBox="0 0 400 90"><path d="M0 0H1" stroke="red" onclick="x()"/></svg>');
      const r = await renderStep('![[说明图-坏.svg]]');
      expect(r.problems.map((p) => p.message)).toEqual([
        expect.stringContaining('不超过 328'),
        expect.stringContaining('stroke="red"'),
        expect.stringContaining('onclick'),
        expect.stringContaining('<title>'),
      ]);
      expect(r.problems.every((p) => p.message.includes('说明图-坏.svg'))).toBe(true);
    });
  });

  it('表格里用 \\| 分隔的双链和嵌入也能转换', async () => {
    const r = await renderStep('| 步骤 | 截图 |\n| --- | --- |\n| [[导入代理软件\\|连服务器]] | ![[plain.png\\|100]] |');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<td><a href="/import-proxy/">连服务器</a></td>');
    // 表格在窄屏上横向滚动，要能用键盘把焦点放上去（rehype-scrollable-tables）
    expect(r.html).toContain('<table tabindex="0">');
    expect(r.images).toHaveLength(1);
    expect(hProps(r.images[0])).toMatchObject({ width: 100 });
  });

  it('代码块也能用键盘聚焦（长命令在块内横向滚动，NFR-02；不再靠 Shiki 加 tabindex）', async () => {
    const r = await renderStep('```\nbash <(curl -Ls https://example.com/install.sh)\n```');
    expect(r.html).toContain('<pre tabindex="0">');
  });

  it('其他路径、非法宽度报错', async () => {
    const r = await renderStep('![[img/plain.png]]\n\n![[plain.png|262x100]]\n\n![[plain.png|0]]');
    expect(r.problems.map((p) => p.message)).toEqual([
      expect.stringContaining('只接受裸文件名'),
      expect.stringContaining('正整数像素'),
      expect.stringContaining('正整数像素'),
    ]);
  });
});

describe('不转换与无法识别的写法', () => {
  it('行内代码和代码块里的 [[...]] 原样保留，也不报错', async () => {
    const r = await renderStep('用 `[[not-exist]]` 写双链\n\n```md\n[[not-exist]]\n![[missing.png]]\n```');
    expect(r.problems).toEqual([]);
    expect(r.images).toEqual([]);
    expect(r.html).toContain('<code>[[not-exist]]</code>');
    expect(r.html).toContain('[[not-exist]]\n![[missing.png]]');
  });

  it('双链里夹格式或换行时报“无法识别的写法”，而不是原样输出', async () => {
    const r = await renderStep('[[导入代理软件|**加粗**]]\n\n[[导入\n代理软件]]');
    expect(r.problems.length).toBeGreaterThanOrEqual(2);
    expect(r.problems.every((p) => p.message.includes('无法识别的写法'))).toBe(true);
  });

  it('普通 Markdown 链接文字里写双链报错', async () => {
    const r = await renderStep('[看 [[导入代理软件]]](https://example.com)');
    expect(r.problems[0].message).toContain('链接文字里不能再写双链');
  });

  it('一篇里的多个问题一次全部报出', async () => {
    const r = await renderStep('[[a-missing]] [[b-missing]]\n\n![[c.png]]');
    expect(r.problems).toHaveLength(3);
  });

  it('不传 onProblems 时抛出 ContentError，消息每行一个“文件:行:列 说明”', async () => {
    const file = fx.write('principle/bad.md', md('skippable: false', '\n[[not-exist]]'));
    const pipeline = markdownPipeline({ base: '/', linkIndex: createLinkIndex(fx.contentRoot) });
    const processor = await createMarkdownProcessor({ ...pipeline, syntaxHighlight: false });
    const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
    const error = await processor.render(content, { fileURL: pathToFileURL(file) }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ContentError);
    // 报错里的文件路径统一用 `/`（remark-obsidian.ts）：Windows 下 relative() 给反斜杠，先换掉再比
    expect((error as Error).message).toContain(`${relative(process.cwd(), file).split(sep).join('/')}:5:1 找不到标题为“not-exist”的页面`);
  });

  it('Astro 内容集合传入去掉 frontmatter 并 trim 过的正文时，行号仍换算回源文件', async () => {
    const file = fx.write('principle/trimmed.md', md('skippable: false', '\n\n第一段\n\n[[not-exist]]'));
    const problems: ContentProblem[] = [];
    const pipeline = markdownPipeline({
      base: '/',
      linkIndex: createLinkIndex(fx.contentRoot),
      onProblems: (p) => problems.push(...p),
    });
    const processor = await createMarkdownProcessor({ ...pipeline, syntaxHighlight: false });
    const body = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content.trim();
    await processor.render(body, { fileURL: pathToFileURL(file) });
    expect(problems[0]).toMatchObject({ line: 8, column: 1 });
  });
});

describe('Callout', () => {
  it('[!note]、[!caution] 两种视图都显示，默认标题是中文', async () => {
    const r = await renderStep('> [!note]\n> 提示内容\n\n> [!caution]\n> 风险');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('data-callout="note"');
    expect(r.html).toContain('<div class="callout-title-text">提示</div>');
    expect(r.html).toContain('data-callout="caution"');
    expect(r.html).toContain('<div class="callout-title-text">注意</div>');
  });

  it('白名单之外的类型报错', async () => {
    const r = await renderStep('> [!tip] 小技巧\n> 内容\n\n> [!NOTE]\n> 大写');
    expect(r.problems.map((p) => p.line)).toEqual([BODY_LINE, BODY_LINE + 3]);
    expect(r.problems[0].message).toContain('不支持的 Callout 类型“[!tip]”，只能用 [!note]、[!caution]');
  });

  it('可折叠写法报错（库会插入自带的折叠箭头 SVG，与“图标自画”冲突）', async () => {
    const r = await renderStep('> [!caution]- 折起来\n> 内容\n\n> [!note]+ 展开\n> 内容');
    expect(r.problems.map((p) => p.message)).toEqual([
      expect.stringContaining('不支持折叠写法“[!caution]-”'),
      expect.stringContaining('不支持折叠写法“[!note]+”'),
    ]);
  });

  it('普通引用不受影响', async () => {
    const r = await renderStep('> 普通引用，提到 [[导入代理软件]]');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<blockquote>');
  });

  it('标记不在引用开头时报错（rehype-callouts 仍会把它当成 Callout，吞掉前面的文字）', async () => {
    const r = await renderStep('> 普通引用 [!note] 不在开头');
    expect(r.problems[0].message).toContain('要写在引用第一行的开头');
  });
});

describe('加粗', () => {
  // #21：结尾的 ** 前是全角标点、后面紧跟汉字时，按 CommonMark 不算加粗，星号会原样显示在页面上。
  it('没解析成加粗、原样留在正文里的 ** 报错，并提示把标点移到 ** 外面', async () => {
    const r = await renderStep('**方案二：**问到住宅代理 IP 时直接回车跳过。');
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0].line).toBe(BODY_LINE);
    expect(r.problems[0].message).toContain('没有解析成加粗');
  });

  it('标点在 ** 外面、链接文字里的加粗、代码里的 ** 都不报错', async () => {
    const r = await renderStep('**方案二**：问到 [**住宅 IP**](https://example.com) 时跳过，`a**b` 原样。\n\n```\n**x**\n```');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<strong>方案二</strong>：');
  });
});

describe('管线', () => {
  it('关闭 SmartyPants：正文里的引号、-- 和 ... 原样保留', async () => {
    const r = await renderStep('运行 "install" --force ... 完成');
    expect(r.html).toContain('运行 "install" --force ... 完成');
  });
});
