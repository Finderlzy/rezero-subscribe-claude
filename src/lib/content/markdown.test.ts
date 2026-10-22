import { relative, sep } from 'node:path';
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
  // 报错里的路径统一用 `/`（markdown.ts 的 display()）：Windows 下 relative() 给反斜杠，先换成 `/` 再比
  const at = (file: string) => relative(process.cwd(), file).split(sep).join('/');

  it('内容全部正确时没有问题', async () => {
    fx.write('principle/import-proxy.md', md('skippable: false', '# 导入代理软件\n\n见 [[IP 质量实测合集#装过了]]，下一步 [[验收清单]]'));
    fx.write('principle/check-ip.md', '# 验收清单\n\n![[shot.png|262]]\n');
    fx.write('reference/ip-tests.md', '# IP 质量实测合集\n\n## 装过了\n\n回到 [[导入代理软件]]\n');
    fx.shot('shot.png');

    expect(await validate()).toEqual([]);
  });

  it('行号与源文件一致（frontmatter 也算行）', async () => {
    const page = fx.write('principle/a.md', md('skippable: true\nskipLabel: 跳', '# 甲\n\n第一段\n\n[[not-exist]]'));
    const problems = await validate();
    expect(problems.map((p) => [p.file, p.line])).toEqual([[at(page), 9]]);
  });

  it('文件名不是 kebab-case 时报错（标识同时是 URL）', async () => {
    fx.write('principle/Bad_Name.md', '# 甲\n');
    const problems = await validate();
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('不是英文 kebab-case');
  });

  it('其他目录和非 .md 文件不检查', async () => {
    fx.write('route.yaml', '[[not-exist]]');
    fx.write('principle/notes.txt', '[[not-exist]]');
    fx.write('drafts/x.md', '[[not-exist]]');
    expect(await validate()).toEqual([]);
  });
});

describe('validateContent：两个集合', () => {
  // 报错里的路径统一用 `/`（markdown.ts 的 display()）：Windows 下 relative() 给反斜杠，先换成 `/` 再比
  const at = (file: string) => relative(process.cwd(), file).split(sep).join('/');

  it('检查 principle、reference（含子目录）', async () => {
    fx.write('principle/preface.md', md('skippable: true', '# 前言\n\n[[没有这页]]'));
    const ref = fx.write('reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n\n第一段\n\n![[missing.png]]\n');

    const problems = await validate();

    expect(problems.map((p) => [p.file, p.line, p.message])).toEqual([
      [at(fx.contentRoot + '/principle/preface.md'), 6, expect.stringMatching(/^找不到标题为“没有这页”的页面/)],
      [at(ref), 5, expect.stringMatching(/^找不到图片“missing\.png”/)],
    ]);
  });

  it('参考页标识逐段检查 kebab-case', async () => {
    fx.write('reference/ip-tests/Bad_Name.md', '# 实测：甲\n');
    const problems = await validate();
    expect(problems.map((p) => p.message)).toEqual([expect.stringContaining('文件名“ip-tests/Bad_Name”不是英文 kebab-case')]);
  });

  it('内容提示：作者待补、博客链接待填；不算问题', async () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('principle/android-subscribe.md', '# 账号注册与订阅全流程：安卓端\n\nTODO：等我走通了再补。\n\n[[04技术/甲|甲]]\n');
    fx.write('reference/ip-tests.md', '# IP 质量实测合集\n');
    fx.write('blog-links.yaml', '"04技术/甲": null\n');

    const { problems, hints } = await report();

    expect(problems).toEqual([]);
    expect(hints.map((h) => [h.kind, h.page.id])).toEqual([
      ['author-todo', 'android-subscribe'],
      ['blog-link', 'android-subscribe'],
    ]);
  });
});
