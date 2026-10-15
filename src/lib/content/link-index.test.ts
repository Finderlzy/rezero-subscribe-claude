import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkPages, createLinkIndex } from './link-index';
import { createFixture, md, type Fixture } from './test-fixture';

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

describe('createLinkIndex', () => {
  it('扫描步骤、常见问题、选择页的标识和标题，以及完成页标题', () => {
    fx.write('steps/ssh-connect.md', md('title: 连上服务器', '正文'));
    fx.write('steps/run-script.md', md('title: "运行脚本"', '正文'));
    fx.write('faq/panel-debug.md', md('title: 打开面板排查', '正文'));
    fx.write('choices/node-plan.md', md('question: 选哪种节点方案？\noptions:\n  plan-1: { title: 方案一 }', ''));
    fx.write('pages/done.md', md('title: 完成', ''));

    const index = createLinkIndex(fx.contentRoot);

    expect([...index.steps]).toEqual([
      ['run-script', '运行脚本'],
      ['ssh-connect', '连上服务器'],
    ]);
    expect([...index.faq]).toEqual([['panel-debug', '打开面板排查']]);
    expect([...index.choices]).toEqual([['node-plan', '选哪种节点方案？']]);
    expect(index.doneTitle).toBe('完成');
    expect(index.contentRoot).toBe(fx.contentRoot);
  });

  it('截图目录默认是内容根目录旁边的 assets/screenshots，文件名可含空格和中文', () => {
    fx.shot('Pasted image 20261012190537.png');
    fx.shot('微信图片_20261012.jpg');
    fx.shot('.DS_Store');

    const index = createLinkIndex(fx.contentRoot);

    expect(index.screenshotsDir).toBe(fx.screenshotsDir);
    expect([...index.screenshots].sort()).toEqual(['Pasted image 20261012190537.png', '微信图片_20261012.jpg']);
  });

  it('只认 .md 文件、忽略隐藏文件；目录不存在时为空', () => {
    fx.write('steps/a.md', md('title: 甲', ''));
    fx.write('steps/notes.txt', 'x');
    fx.write('steps/.gitkeep', '');

    const index = createLinkIndex(fx.contentRoot);

    expect([...index.steps.keys()]).toEqual(['a']);
    expect(index.faq.size).toBe(0);
    expect(index.choices.size).toBe(0);
    expect(index.doneTitle).toBeUndefined();
  });

  it('标题缺失或 frontmatter 写坏时退回标识（缺失由 schema 报错，这里不重复报）', () => {
    fx.write('steps/no-title.md', md('skippable: true', ''));
    fx.write('steps/broken.md', md('title: [unclosed', ''));

    const index = createLinkIndex(fx.contentRoot);

    expect(index.steps.get('no-title')).toBe('no-title');
    expect(index.steps.get('broken')).toBe('broken');
  });

  it('可以另指截图目录', () => {
    const index = createLinkIndex(fx.contentRoot, fx.contentRoot);
    expect(index.screenshotsDir).toBe(fx.contentRoot);
  });
});

describe('createLinkIndex：v2 页面', () => {
  it('按第一行的 # 标题建“标题 → 页面”，参考页的标识带子目录', () => {
    fx.write('principle/preface.md', '# 前言\n\n正文\n');
    fx.write('principle/check-ip.md', md('skippable: true', '\n# 测 IP 质量\n\n## 怎么看结果\n'));
    fx.write('operation/preface.md', '# 前言\n\n操作\n');
    fx.write('reference/faq.md', '# 常见问题\n');
    fx.write('reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n');

    const index = createLinkIndex(fx.contentRoot);

    expect([...index.titles.keys()].sort()).toEqual(['前言', '实测：Decodo ISP', '常见问题', '测 IP 质量'].sort());
    expect(index.titles.get('实测：Decodo ISP')).toMatchObject({ kind: 'reference', id: 'ip-tests/decodo' });
    expect(index.titles.get('测 IP 质量')).toMatchObject({ kind: 'principle', id: 'check-ip', title: '测 IP 质量' });
    // 操作版不进“标题 → 页面”：双链总是指向页面本身（URL 相同）
    expect(index.pages.filter((p) => p.kind === 'operation').map((p) => p.id)).toEqual(['preface']);
  });

  it('小标题按 github-slugger 生成 slug（与页面上的 id 一致），跳过第一行标题和代码块里的 #', () => {
    fx.write(
      'reference/faq.md',
      [
        '# 常见问题',
        '',
        '## 装过了，想重装？',
        '',
        '```bash',
        '# 这是注释，不是标题',
        '```',
        '',
        '## “1 人独享”怎么确认真的只有我在用？',
        '### 分流规则具体怎么写？ ##',
        '## 装过了，想重装？',
        '#没有空格不算标题',
      ].join('\n'),
    );

    const page = createLinkIndex(fx.contentRoot).titles.get('常见问题');

    expect([...(page?.headings ?? [])]).toEqual(['装过了想重装', '1-人独享怎么确认真的只有我在用', '分流规则具体怎么写', '装过了想重装-1']);
  });

  it('读 blog-links.yaml：地址或 null', () => {
    fx.write('blog-links.yaml', '"04技术/甲": https://example.com/a/\n"04技术/乙": null\n');

    const index = createLinkIndex(fx.contentRoot);

    expect([...index.blogLinks]).toEqual([
      ['04技术/甲', 'https://example.com/a/'],
      ['04技术/乙', null],
    ]);
  });

  it('没有 v2 目录和 blog-links.yaml 时为空', () => {
    const index = createLinkIndex(fx.contentRoot);
    expect(index.pages).toEqual([]);
    expect(index.blogLinks.size).toBe(0);
  });
});

describe('checkPages', () => {
  const messages = () => checkPages(createLinkIndex(fx.contentRoot)).map((p) => `${p.file.replace(/^.*\/content\//, '')}:${p.line ?? ''} ${p.message}`);

  it('内容正确时没有问题', () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('operation/preface.md', '# 前言\n');
    fx.write('principle/overview.md', md('principleOnly: true', '# 整体思路\n'));
    fx.write('principle/subscribe.md', '# 订阅\n'); // 没写操作版：只是内容提示，不是错误
    fx.write('reference/faq.md', '# 常见问题\n');
    fx.write('blog-links.yaml', '"04技术/甲": null\n');
    expect(messages()).toEqual([]);
  });

  it('缺第一行标题', () => {
    fx.write('principle/preface.md', '前言\n\n# 前言\n');
    fx.write('reference/faq.md', '## 常见问题\n');
    expect(messages()).toEqual([
      'principle/preface.md:1 缺少第一行标题：正文第一行要写“# 页面标题”（与重写稿文件名相同）',
      'reference/faq.md:1 缺少第一行标题：正文第一行要写“# 页面标题”（与重写稿文件名相同）',
    ]);
  });

  it('两版标题不同', () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('operation/preface.md', md('', '# 序言\n'));
    expect(messages()).toEqual(['operation/preface.md:4 操作版标题“序言”与原理版“前言”不同：两版同名页的标题必须相同（FR-03）']);
  });

  it('标题重复（原理版和参考页之间也算）', () => {
    fx.write('principle/a.md', '# 订阅\n');
    fx.write('principle/b.md', '# 订阅\n');
    fx.write('reference/faq.md', '# 订阅\n');
    expect(messages()).toEqual([
      'principle/b.md:1 标题“订阅”与 principle/a.md 重复：双链按标题解析，全站标题不能重复',
      'reference/faq.md:1 标题“订阅”与 principle/a.md 重复：双链按标题解析，全站标题不能重复',
    ]);
  });

  it('操作版没有同名原理版；原理独有步骤却有操作版', () => {
    fx.write('operation/orphan.md', '# 孤儿\n');
    fx.write('principle/overview.md', md('principleOnly: true', '# 整体思路\n'));
    fx.write('operation/overview.md', '# 整体思路\n');
    expect(messages()).toEqual([
      'operation/orphan.md: 没有同名的原理版 principle/orphan.md：页面元数据写在原理版里，先建原理版文件',
      'operation/overview.md: 原理版写了 principleOnly: true（原理独有步骤），就不能再有操作版',
    ]);
  });

  it('blog-links.yaml 写坏或形状不对', () => {
    fx.write('blog-links.yaml', '"04技术/甲": [1, 2]\n');
    expect(messages()).toEqual(['blog-links.yaml: “04技术/甲”的值要是博客地址（http/https）或 null']);
    fx.write('blog-links.yaml', '- a\n');
    expect(messages()).toEqual(['blog-links.yaml: 要写成“双链目标: 博客地址或 null”的映射']);
    fx.write('blog-links.yaml', '"04技术/甲": ftp://x\n');
    expect(messages()).toEqual(['blog-links.yaml: “04技术/甲”的值要是博客地址（http/https）或 null']);
  });
});
