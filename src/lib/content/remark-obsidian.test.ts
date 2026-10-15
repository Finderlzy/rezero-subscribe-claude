import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
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
  fx.write('steps/ssh-connect.md', md('title: 连上服务器', '\n## 检查 IP\n'));
  fx.write('steps/run-script.md', md('title: 运行脚本', ''));
  fx.write('faq/panel-debug.md', md('title: 打开面板排查', ''));
  fx.write('choices/node-plan.md', md('question: 选哪种节点方案？\noptions:\n  plan-1: { title: 方案一 }\n  plan-2: { title: 方案二 }', ''));
  fx.write('pages/done.md', md('title: 完成', ''));
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
  const file = fx.write(path, md('title: 测试', body));
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

const renderStep = (body: string, base?: string) => renderFile('steps/current-step.md', body, base);

/** frontmatter 固定 3 行（--- / title / ---），正文第 1 行在源文件第 4 行 */
const BODY_LINE = 4;

describe('双链：步骤', () => {
  it('[[id]] 链到步骤，文字缺省时取目标标题', async () => {
    const r = await renderStep('[[ssh-connect]]');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<a href="/ssh-connect/">连上服务器</a>');
  });

  it('[[id|文字]] 用给定文字', async () => {
    const r = await renderStep('[[run-script|跑一下脚本]]');
    expect(r.html).toContain('<a href="/run-script/">跑一下脚本</a>');
  });

  it('[[id#小标题|文字]] 链到小标题锚点（与 Astro 标题 id 同一种 slug）', async () => {
    const r = await renderStep('[[ssh-connect#检查 IP|看这里]]');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain(`<a href="/ssh-connect/#${encodeURI('检查-ip')}">看这里</a>`);
  });

  it('[[id#小标题]] 不写文字时取目标标题', async () => {
    const r = await renderStep('[[ssh-connect#检查 IP]]');
    expect(r.html).toMatch(/<a href="\/ssh-connect\/#[^"]+">连上服务器<\/a>/);
  });

  it('生成的 href 经过 base（子路径部署）', async () => {
    const r = await renderStep('[[ssh-connect]] [[faq/panel-debug]] [[choose/node-plan]] [[done]]', '/sub/');
    expect(r.html).toContain('href="/sub/ssh-connect/"');
    expect(r.html).toContain('href="/sub/faq/panel-debug/?from=current-step"');
    expect(r.html).toContain('href="/sub/choose/node-plan/"');
    expect(r.html).toContain('href="/sub/done/"');
  });

  it('未知步骤：报出文件、行号和写法', async () => {
    const r = await renderStep('第一行\n\n见 [[not-exist]]。');
    expect(r.problems).toEqual([
      {
        file: relative(process.cwd(), `${fx.contentRoot}/steps/current-step.md`),
        line: BODY_LINE + 2,
        column: 3,
        message: expect.stringContaining('找不到步骤“not-exist”'),
      },
    ]);
    expect(r.problems[0].message).toContain('[[not-exist]]');
  });
});

describe('双链：常见问题、选择页、完成页', () => {
  it('[[faq/<id>|文字]] 在步骤里带上 ?from=<当前步骤>', async () => {
    const r = await renderStep('[[faq/panel-debug|打开面板排查]]');
    expect(r.html).toContain('<a href="/faq/panel-debug/?from=current-step">打开面板排查</a>');
  });

  it('[[faq/<id>]] 不写文字时取常见问题标题', async () => {
    const r = await renderStep('[[faq/panel-debug]]');
    expect(r.html).toContain('>打开面板排查</a>');
  });

  it('当前文件不是步骤时不加 ?from=', async () => {
    const fromFaq = await renderFile('faq/other.md', '[[faq/panel-debug|看看]]');
    const fromPage = await renderFile('pages/home.md', '[[faq/panel-debug|看看]]');
    expect(fromFaq.html).toContain('<a href="/faq/panel-debug/">看看</a>');
    expect(fromPage.html).toContain('<a href="/faq/panel-debug/">看看</a>');
  });

  it('未知常见问题：构建失败并报出行号', async () => {
    const r = await renderStep('[[faq/nope|看看]]');
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toMatchObject({ line: BODY_LINE, message: expect.stringContaining('找不到常见问题“nope”') });
  });

  it('[[choose/<fork>|文字]] 链到选择页；不写文字时取问题', async () => {
    const r = await renderStep('[[choose/node-plan|选方案]] [[choose/node-plan]]');
    expect(r.html).toContain('<a href="/choose/node-plan/">选方案</a>');
    expect(r.html).toContain('<a href="/choose/node-plan/">选哪种节点方案？</a>');
  });

  it('未知选择页报错', async () => {
    const r = await renderStep('[[choose/phone]]');
    expect(r.problems[0].message).toContain('找不到选择页“phone”');
  });

  it('[[done]] 链到完成页，文字取完成页标题；没有完成页文件时用“完成页”', async () => {
    const r = await renderStep('[[done]] [[done|收工]]');
    expect(r.html).toContain('<a href="/done/">完成</a>');
    expect(r.html).toContain('<a href="/done/">收工</a>');

    fx.cleanup();
    fx = createFixture();
    const r2 = await renderStep('[[done]]');
    expect(r2.html).toContain('<a href="/done/">完成页</a>');
  });

  it('无法识别的目标、空文字、空小标题都报错', async () => {
    const r = await renderStep('[[blog/如何订阅claude]]\n\n[[ssh-connect|]]\n\n[[ssh-connect#]]\n\n[[]]');
    expect(r.problems.map((p) => p.line)).toEqual([BODY_LINE, BODY_LINE + 2, BODY_LINE + 4, BODY_LINE + 6]);
    expect(r.problems[0].message).toContain('无法识别的链接目标');
    expect(r.problems[1].message).toContain('链接文字为空');
    expect(r.problems[2].message).toContain('缺少小标题');
  });
});

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

  it('表格里用 \\| 分隔的双链和嵌入也能转换', async () => {
    const r = await renderStep('| 步骤 | 截图 |\n| --- | --- |\n| [[ssh-connect\\|连服务器]] | ![[plain.png\\|100]] |');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<td><a href="/ssh-connect/">连服务器</a></td>');
    expect(r.images).toHaveLength(1);
    expect(hProps(r.images[0])).toMatchObject({ width: 100 });
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
    const r = await renderStep('[[ssh-connect|**加粗**]]\n\n[[ssh-\nconnect]]');
    expect(r.problems.length).toBeGreaterThanOrEqual(2);
    expect(r.problems.every((p) => p.message.includes('无法识别的写法'))).toBe(true);
  });

  it('普通 Markdown 链接文字里写双链报错', async () => {
    const r = await renderStep('[看 [[ssh-connect]]](https://example.com)');
    expect(r.problems[0].message).toContain('链接文字里不能再写双链');
  });

  it('一篇里的多个问题一次全部报出', async () => {
    const r = await renderStep('[[a-missing]] [[b-missing]]\n\n![[c.png]]');
    expect(r.problems).toHaveLength(3);
  });

  it('不传 onProblems 时抛出 ContentError，消息每行一个“文件:行:列 说明”', async () => {
    const file = fx.write('steps/bad.md', md('title: 坏', '\n[[not-exist]]'));
    const pipeline = markdownPipeline({ base: '/', linkIndex: createLinkIndex(fx.contentRoot) });
    const processor = await createMarkdownProcessor({ ...pipeline, syntaxHighlight: false });
    const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
    const error = await processor.render(content, { fileURL: pathToFileURL(file) }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ContentError);
    expect((error as Error).message).toContain(`${relative(process.cwd(), file)}:5:1 找不到步骤“not-exist”`);
  });

  it('Astro 内容集合传入去掉 frontmatter 并 trim 过的正文时，行号仍换算回源文件', async () => {
    const file = fx.write('steps/trimmed.md', md('title: 坏', '\n\n第一段\n\n[[not-exist]]'));
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
  it('[!why] 输出 data-callout="why"，标题原样保留；不带库自带图标', async () => {
    const r = await renderStep('> [!why] 为什么：要先装 Git\n> 因为……');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('data-callout="why"');
    expect(r.html).toContain('<div class="callout-title-text">为什么：要先装 Git</div>');
    expect(r.html).not.toContain('<svg');
  });

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
    expect(r.problems[0].message).toContain('不支持的 Callout 类型“[!tip]”');
  });

  it('可折叠写法报错（库会插入自带的折叠箭头 SVG，与“图标自画”冲突）', async () => {
    const r = await renderStep('> [!why]- 折起来\n> 内容\n\n> [!note]+ 展开\n> 内容');
    expect(r.problems.map((p) => p.message)).toEqual([
      expect.stringContaining('不支持折叠写法“[!why]-”'),
      expect.stringContaining('不支持折叠写法“[!note]+”'),
    ]);
  });

  it('普通引用不受影响', async () => {
    const r = await renderStep('> 普通引用，提到 [[ssh-connect]]');
    expect(r.problems).toEqual([]);
    expect(r.html).toContain('<blockquote>');
  });

  it('标记不在引用开头时报错（rehype-callouts 仍会把它当成 Callout，吞掉前面的文字）', async () => {
    const r = await renderStep('> 普通引用 [!why] 不在开头');
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
