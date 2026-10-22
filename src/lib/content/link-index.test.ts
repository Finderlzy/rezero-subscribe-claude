import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkPages, createLinkIndex } from './link-index';
import { createFixture, md, type Fixture } from './test-fixture';

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

describe('createLinkIndex', () => {
  it('截图目录默认是内容根目录旁边的 assets/screenshots，文件名可含空格和中文', () => {
    fx.shot('Pasted image 20261012190537.png');
    fx.shot('微信图片_20261012.jpg');
    fx.shot('.DS_Store');

    const index = createLinkIndex(fx.contentRoot);

    expect(index.screenshotsDir).toBe(fx.screenshotsDir);
    expect([...index.screenshots].sort()).toEqual(['Pasted image 20261012190537.png', '微信图片_20261012.jpg']);
  });

  it('只认 .md 文件、忽略隐藏文件；目录不存在时为空', () => {
    fx.write('principle/a.md', '# 甲\n');
    fx.write('principle/notes.txt', 'x');
    fx.write('principle/.gitkeep', '');
    fx.write('drafts/old.md', md('title: 旧', ''));

    const index = createLinkIndex(fx.contentRoot);

    expect(index.pages.map((p) => `${p.kind}/${p.id}`)).toEqual(['principle/a']);
    expect(index.contentRoot).toBe(fx.contentRoot);
  });

  it('说明图目录默认是 assets/diagrams（design §4.7）', () => {
    fx.diagram('说明图-整体思路.svg', '<svg/>');
    const index = createLinkIndex(fx.contentRoot);
    expect(index.diagramsDir).toBe(fx.diagramsDir);
    expect([...index.diagrams]).toEqual(['说明图-整体思路.svg']);
  });

  it('可以另指截图目录', () => {
    const index = createLinkIndex(fx.contentRoot, fx.contentRoot);
    expect(index.screenshotsDir).toBe(fx.contentRoot);
  });
});

describe('createLinkIndex：页面', () => {
  it('按第一行的 # 标题建“标题 → 页面”，参考页的标识带子目录', () => {
    fx.write('principle/preface.md', '# 前言\n\n正文\n');
    fx.write('principle/check-ip.md', md('skippable: true', '\n# 验收清单\n\n## 怎么看结果\n'));
    fx.write('reference/ip-tests.md', '# IP 质量实测合集\n');
    fx.write('reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n');

    const index = createLinkIndex(fx.contentRoot);

    expect([...index.titles.keys()].sort()).toEqual(['IP 质量实测合集', '前言', '实测：Decodo ISP', '验收清单'].sort());
    expect(index.titles.get('实测：Decodo ISP')).toMatchObject({ kind: 'reference', id: 'ip-tests/decodo' });
    expect(index.titles.get('验收清单')).toMatchObject({ kind: 'principle', id: 'check-ip', title: '验收清单' });
    // v3 只有一版正文：页面集合里没有操作版
    expect(index.pages.map((p) => p.kind)).toEqual(['principle', 'principle', 'reference', 'reference']);
  });

  it('小标题按 github-slugger 生成 slug（与页面上的 id 一致），跳过第一行标题和代码块里的 #', () => {
    fx.write(
      'reference/ip-tests.md',
      [
        '# 实测合集',
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

    const page = createLinkIndex(fx.contentRoot).titles.get('实测合集');

    expect(page?.headings).toEqual([
      { slug: '装过了想重装', text: '装过了，想重装？', depth: 2 },
      { slug: '1-人独享怎么确认真的只有我在用', text: '“1 人独享”怎么确认真的只有我在用？', depth: 2 },
      { slug: '分流规则具体怎么写', text: '分流规则具体怎么写？', depth: 3 },
      { slug: '装过了想重装-1', text: '装过了，想重装？', depth: 2 },
    ]);
  });

  it('小标题文字去掉行内记号：**加粗**、`代码` 和链接只留可见文字', () => {
    fx.write('reference/ip-tests.md', '# 实测合集\n\n## **加粗**与`代码`\n\n## [链接](https://example.com)标题\n');

    const page = createLinkIndex(fx.contentRoot).titles.get('实测合集');

    expect(page?.headings).toEqual([
      { slug: '加粗与代码', text: '加粗与代码', depth: 2 },
      { slug: '链接标题', text: '链接标题', depth: 2 },
    ]);
  });

  it('读 blog-links.yaml：地址或 null', () => {
    fx.write('blog-links.yaml', '"04技术/甲": https://example.com/a/\n"04技术/乙": null\n');

    const index = createLinkIndex(fx.contentRoot);

    expect([...index.blogLinks]).toEqual([
      ['04技术/甲', 'https://example.com/a/'],
      ['04技术/乙', null],
    ]);
  });

  it('没有内容目录和 blog-links.yaml 时为空', () => {
    const index = createLinkIndex(fx.contentRoot);
    expect(index.pages).toEqual([]);
    expect(index.blogLinks.size).toBe(0);
  });
});

describe('checkPages', () => {
  const messages = () => checkPages(createLinkIndex(fx.contentRoot)).map((p) => `${p.file.replace(/^.*\/content\//, '')}:${p.line ?? ''} ${p.message}`);

  it('内容正确时没有问题', () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('principle/overview.md', md('principleOnly: true', '# 整体思路\n'));
    fx.write('principle/subscribe.md', '# 订阅\n');
    fx.write('reference/ip-tests.md', '# IP 质量实测合集\n');
    fx.write('blog-links.yaml', '"04技术/甲": null\n');
    expect(messages()).toEqual([]);
  });

  it('缺第一行标题', () => {
    fx.write('principle/preface.md', '前言\n\n# 前言\n');
    fx.write('reference/ip-tests.md', '## IP 质量实测合集\n');
    expect(messages()).toEqual([
      'principle/preface.md:1 缺少第一行标题：正文第一行要写“# 页面标题”（与重写稿文件名相同）',
      'reference/ip-tests.md:1 缺少第一行标题：正文第一行要写“# 页面标题”（与重写稿文件名相同）',
    ]);
  });

  it('标题重复（步骤页和参考页之间也算）', () => {
    fx.write('principle/a.md', '# 订阅\n');
    fx.write('principle/b.md', '# 订阅\n');
    fx.write('reference/ip-tests.md', '# 订阅\n');
    expect(messages()).toEqual([
      'principle/b.md:1 标题“订阅”与 principle/a.md 重复：双链按标题解析，全站标题不能重复',
      'reference/ip-tests.md:1 标题“订阅”与 principle/a.md 重复：双链按标题解析，全站标题不能重复',
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
