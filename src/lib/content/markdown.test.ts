import { relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLinkIndex } from './link-index';
import { validateContent } from './markdown';
import { createFixture, md, type Fixture } from './test-fixture';

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

const report = () => validateContent({ base: '/', linkIndex: () => createLinkIndex(fx.contentRoot) });
const validate = async () => (await report()).problems;

describe('validateContent（构建开始时的全量检查）', () => {
  it('内容全部正确时没有问题', async () => {
    fx.write('steps/ssh-connect.md', md('title: 连上服务器', '\n见 [[faq/panel-debug]]，下一步 [[run-script]]'));
    fx.write('steps/run-script.md', md('title: 运行脚本', '\n![[shot.png|262]]'));
    fx.write('faq/panel-debug.md', md('title: 打开面板排查', '\n回到 [[run-script]]'));
    fx.write('pages/done.md', md('title: 完成', ''));
    fx.shot('shot.png');

    expect(await validate()).toEqual([]);
  });

  it('检查 steps、choices、faq、pages 四个目录，行号与源文件一致（frontmatter 也算行）', async () => {
    const step = fx.write('steps/a.md', md('title: 甲\nskippable: true', '\n第一段\n\n[[not-exist]]'));
    const choice = fx.write('choices/node-plan.md', md('question: 选？\noptions:\n  a: { title: A }\n  b: { title: B }', '\n[[faq/nope]]'));
    const faq = fx.write('faq/x.md', md('title: 乙', '\n![[missing.png]]'));
    const page = fx.write('pages/home.md', md('title: 首页', '\n[[choose/phone]]'));

    const problems = await validate();

    const at = (file: string) => relative(process.cwd(), file);
    expect(problems.map((p) => [p.file, p.line])).toEqual([
      [at(step), 8],
      [at(choice), 8],
      [at(faq), 5],
      [at(page), 5],
    ]);
  });

  it('文件名不是 kebab-case 时报错（标识同时是 URL）', async () => {
    fx.write('steps/Bad_Name.md', md('title: 甲', ''));
    const problems = await validate();
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('不是英文 kebab-case');
  });

  it('其他目录和非 .md 文件不检查', async () => {
    fx.write('route.yaml', '[[not-exist]]');
    fx.write('steps/notes.txt', '[[not-exist]]');
    fx.write('drafts/x.md', '[[not-exist]]');
    expect(await validate()).toEqual([]);
  });
});

describe('validateContent：v2 内容', () => {
  const at = (file: string) => relative(process.cwd(), file);

  it('检查 principle、operation、reference（含子目录），并带上页面之间的标题校验', async () => {
    fx.write('principle/preface.md', md('skippable: true', '# 前言\n\n[[没有这页]]'));
    const op = fx.write('operation/preface.md', '# 序言\n');
    const ref = fx.write('reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n\n第一段\n\n![[missing.png]]\n');

    const problems = await validate();

    expect(problems.map((p) => [p.file, p.line, p.message])).toEqual([
      [at(op), 1, expect.stringMatching(/^操作版标题“序言”与原理版“前言”不同/)],
      [at(fx.contentRoot + '/principle/preface.md'), 6, expect.stringMatching(/^找不到标题为“没有这页”的页面/)],
      [at(ref), 5, expect.stringMatching(/^找不到图片“missing\.png”/)],
    ]);
  });

  it('参考页标识逐段检查 kebab-case', async () => {
    fx.write('reference/ip-tests/Bad_Name.md', '# 实测：甲\n');
    const problems = await validate();
    expect(problems.map((p) => p.message)).toEqual([expect.stringContaining('文件名“ip-tests/Bad_Name”不是英文 kebab-case')]);
  });

  it('内容提示：操作版缺失（原理独有步骤和参考页除外）、作者待补、博客链接待填；不算问题', async () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('operation/preface.md', '# 前言\n');
    fx.write('principle/overview.md', md('principleOnly: true', '# 整体思路\n'));
    fx.write('principle/android-subscribe.md', '# 安卓：订阅\n\nTODO：等我走通了再补。\n\n[[04技术/甲|甲]]\n');
    fx.write('reference/faq.md', '# 常见问题\n');
    fx.write('blog-links.yaml', '"04技术/甲": null\n');

    const { problems, hints } = await report();

    expect(problems).toEqual([]);
    expect(hints.map((h) => [h.kind, h.page.id])).toEqual([
      ['missing-operation', 'android-subscribe'],
      ['author-todo', 'android-subscribe'],
      ['blog-link', 'android-subscribe'],
    ]);
  });
});
