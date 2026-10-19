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
  const at = (file: string) => relative(process.cwd(), file);

  it('内容全部正确时没有问题', async () => {
    fx.write('principle/import-proxy.md', md('skippable: false', '# 导入代理软件\n\n见 [[常见问题#装过了]]，下一步 [[测 IP 质量]]'));
    fx.write('operation/import-proxy.md', '# 导入代理软件\n\n![[shot.png|262]]\n');
    fx.write('principle/check-ip.md', '# 测 IP 质量\n');
    fx.write('operation/check-ip.md', '# 测 IP 质量\n');
    fx.write('reference/faq.md', '# 常见问题\n\n## 装过了\n\n回到 [[导入代理软件]]\n');
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

describe('validateContent：三个集合', () => {
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

  it('常见问题一问一页：每条 reference/faq/<id>.md 都要在常见问题里有双链（FR-20）', async () => {
    fx.write('reference/faq.md', '# 常见问题\n\n- [[装过了，想重装？]]\n');
    fx.write('reference/faq/reinstall.md', '# 装过了，想重装？\n');
    fx.write('reference/faq/split-routing.md', '# 分流规则具体怎么写？\n');
    const problems = await validate();
    expect(problems).toEqual([
      expect.objectContaining({
        file: expect.stringContaining('reference/faq/split-routing.md'),
        line: 1,
        message: expect.stringContaining('常见问题（reference/faq.md）里没有链到“分流规则具体怎么写？”'),
      }),
    ]);
  });

  it('常见问题双向核对：目录里列的标题要有条目文件，同一条不能列两次（FR-20）', async () => {
    const faq = fx.write('reference/faq.md', '# 常见问题\n\n- [[装过了，想重装？]]\n- [[新问题？]]\n- [[装过了，想重装？]]\n');
    fx.write('reference/faq/reinstall.md', '# 装过了，想重装？\n');
    const problems = (await validate()).filter((p) => p.file === at(faq));
    expect(problems.map((p) => [p.line, p.message])).toEqual(
      expect.arrayContaining([
        [4, expect.stringContaining('常见问题里列了“新问题？”，但 reference/faq/ 里没有标题是它的条目文件')],
        [5, expect.stringContaining('“装过了，想重装？”在常见问题里列了两次（第 3 行已经列过）')],
      ]),
    );
  });

  it('常见问题条目：标识和已有页面相同、一个标题两个标识、条目缺标题都报错', async () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('reference/faq.md', '# 常见问题\n\n- [[装过了，想重装？]]\n- [[前言是什么？]]\n');
    const clash = fx.write('reference/faq/preface.md', '# 前言是什么？\n');
    fx.write('reference/faq/reinstall.md', '# 装过了，想重装？\n');
    const twin = fx.write('reference/faq/reinstall-again.md', '# 装过了，想重装？\n');
    const untitled = fx.write('reference/faq/no-title.md', '没有标题\n');
    const problems = await validate();
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: at(clash), message: expect.stringContaining('常见问题条目的标识“preface”和已有页面的标识相同') }),
        expect.objectContaining({ file: at(twin), message: expect.stringContaining('标题“装过了，想重装？”与 reference/faq/reinstall.md 重复') }),
        expect.objectContaining({ file: at(untitled), message: expect.stringContaining('缺少第一行标题') }),
      ]),
    );
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
