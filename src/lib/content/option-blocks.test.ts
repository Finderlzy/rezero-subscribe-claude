import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLinkIndex } from './link-index';
import { markdownPipeline } from './markdown';
import type { ContentProblem } from './remark-obsidian';
import { createFixture, md, type Fixture } from './test-fixture';

/** 选择页的选项块（架构 §3 M1，FR-12）：包块、标出第一步、与路线图核对 */

let fx: Fixture;

const ROUTE = `chapters:
  - id: c
    title: 章
    items:
      - start
      - { choose: f, page: choose }
      - branch: f
        options:
          a: [a-intro, a-step]
          b: [b-step]
      - merge
`;
const OPTIONS = 'options:\n  a: { title: 甲, heading: 甲方案 }\n  b: { title: 乙, heading: 乙方案 }';

beforeEach(() => {
  fx = createFixture();
  fx.write('route.yaml', ROUTE);
  fx.write('principle/start.md', '# 开始\n');
  fx.write('principle/a-intro.md', md('principleOnly: true', '# 甲：先讲道理\n'));
  fx.write('principle/a-step.md', '# 甲：动手\n');
  fx.write('principle/b-step.md', '# 乙：动手\n');
  fx.write('principle/merge.md', '# 汇合\n');
});
afterEach(() => fx.cleanup());

async function render(path: string, source: string): Promise<{ html: string; problems: ContentProblem[] }> {
  const file = fx.write(path, source);
  const problems: ContentProblem[] = [];
  const processor = await createMarkdownProcessor({
    ...markdownPipeline({ base: '/', linkIndex: () => createLinkIndex(fx.contentRoot), onProblems: (found) => problems.push(...found) }),
    syntaxHighlight: false,
  });
  const content = parseFrontmatter(readFileSync(file, 'utf8'), { frontmatter: 'empty-with-spaces' }).content;
  const out = await processor.render(content, { fileURL: pathToFileURL(file) });
  return { html: out.code, problems };
}

const messages = (problems: ContentProblem[]) => problems.map((p) => p.message);

const PRINCIPLE_BODY = [
  '# 选一个',
  '',
  '开头的话，不进任何块：[[汇合]]',
  '',
  '**甲方案**',
  '',
  '说明',
  '',
  '1. [[甲：先讲道理]]',
  '2. [[甲：动手]]',
  '',
  '**乙方案**',
  '',
  '- 先看 [[汇合|别处]] 不对，第一个站内链接要是第一步',
  '',
  '**结尾的加粗段落结束上一块**',
].join('\n');

describe('选项块', () => {
  it('从加粗段落包到下一个加粗段落，块标题加 class，第一个站内链接标 data-option-start', async () => {
    fx.write('operation/choose.md', '# 选一个\n\n**甲方案**\n\n[[甲：动手]]\n\n**乙方案**\n\n[[乙：动手]]\n');
    const { html, problems } = await render('principle/choose.md', md(OPTIONS, PRINCIPLE_BODY.replace('[[汇合|别处]] 不对，第一个站内链接要是第一步', '[[乙：动手]]，再看 [[汇合]]')));
    expect(messages(problems)).toEqual([]);
    expect(html).toMatch(/^<p>开头的话/);
    expect(html).toContain('<section class="option-block" data-option="a"><p class="option-title"><strong>甲方案</strong></p>');
    expect(html).toContain('<a href="/a-intro/" data-option-start="">甲：先讲道理</a>');
    expect(html).toContain('<a href="/a-step/">甲：动手</a>');
    expect(html).toContain('<a href="/b-step/" data-option-start="">乙：动手</a>，再看 <a href="/merge/">汇合</a>');
    // 块和块并列，不互相嵌套；块里最后是箭头
    expect(html).toMatch(/<a href="\/a-step\/">甲：动手<\/a><\/li>\s*<\/ol><span class="option-go" aria-hidden="true">→<\/span><\/section><\/div>\s*<div class="option-row"><span class="option-no" aria-hidden="true">2<\/span>\s*<section class="option-block" data-option="b">/);
    // 下一个独占一段的加粗文字不进上一块
    expect(html).toMatch(/<\/section><\/div>\s*<p><strong>结尾的加粗段落结束上一块<\/strong><\/p>$/);
  });

  it('每个选项前面是编号圆圈（按 frontmatter 的顺序从 1 编号，对读屏隐藏），块里最后是箭头', async () => {
    fx.write('operation/choose.md', '# 选一个\n\n**甲方案**\n\n[[甲：动手]]\n\n**乙方案**\n\n[[乙：动手]]\n');
    const { html } = await render('principle/choose.md', md(OPTIONS, '# 选一个\n\n**甲方案**\n\n[[甲：动手]]\n\n**乙方案**\n\n[[乙：动手]]\n'));
    expect(html).toMatch(/<div class="option-row"><span class="option-no" aria-hidden="true">1<\/span>\s*<section class="option-block" data-option="a">/);
    expect(html).toMatch(/<div class="option-row"><span class="option-no" aria-hidden="true">2<\/span>\s*<section class="option-block" data-option="b">/);
    // 箭头在每个块里，不在块外
    expect(html.match(/<span class="option-go" aria-hidden="true">→<\/span><\/section>/g)).toHaveLength(2);
    // 圆圈和箭头都不是链接、不读给读屏
    expect(html).not.toMatch(/<a[^>]*>\s*<span class="option-no"/);
  });

  it('路线图写了 default 的选项：块标 data-recommended，标题后加“推荐”；其他块不标', async () => {
    fx.write('route.yaml', ROUTE.replace('{ choose: f, page: choose }', '{ choose: f, page: choose, default: b }'));
    fx.write('operation/choose.md', '# 选一个\n');
    const { html, problems } = await render('principle/choose.md', md(OPTIONS, '# 选一个\n\n**甲方案**\n\n[[甲：先讲道理]]\n\n**乙方案**\n\n[[乙：动手]]\n'));
    expect(messages(problems)).toEqual([]);
    expect(html).toContain('<section class="option-block" data-option="b" data-recommended=""><p class="option-title"><strong>乙方案</strong> <span class="option-tag">推荐</span></p>');
    expect(html).toContain('<section class="option-block" data-option="a"><p class="option-title"><strong>甲方案</strong></p>');
    expect(html.match(/推荐/g)).toHaveLength(1);
  });

  it('没有 default 的分叉点不标推荐', async () => {
    fx.write('operation/choose.md', '# 选一个\n');
    const { html } = await render('principle/choose.md', md(OPTIONS, '# 选一个\n\n**甲方案**\n\n[[甲：先讲道理]]\n\n**乙方案**\n\n[[乙：动手]]\n'));
    expect(html).not.toContain('推荐');
    expect(html).not.toContain('data-recommended');
  });

  it('分隔线和标题也结束一块；最后一块包到正文结尾', async () => {
    fx.write('operation/choose.md', '# 选一个\n');
    const body = '# 选一个\n\n**甲方案**\n\n[[甲：先讲道理]]\n\n---\n\n后话\n\n**乙方案**\n\n[[乙：动手]]\n\n## 小标题\n\n**甲方案2**\n';
    const r = await render('principle/choose.md', md(OPTIONS, body));
    expect(r.html).toMatch(/<a href="\/a-intro\/" data-option-start="">甲：先讲道理<\/a><\/p><span class="option-go" aria-hidden="true">→<\/span><\/section><\/div>\s*<hr>/);
    expect(r.html).toMatch(/<a href="\/b-step\/" data-option-start="">乙：动手<\/a><\/p><span class="option-go" aria-hidden="true">→<\/span><\/section><\/div>\s*<h2/);
  });

  it('块到它的第一个列表为止：列表后面的普通段落（两条路共用的话）不进最后一块', async () => {
    fx.write('operation/choose.md', '# 选一个\n');
    const body = '# 选一个\n\n**甲方案**\n\n说明\n\n1. [[甲：先讲道理]]\n\n**乙方案**\n\n- [[乙：动手]]\n\n两条路走完，都接着 [[汇合]]。\n';
    const r = await render('principle/choose.md', md(OPTIONS, body));
    expect(messages(r.problems)).toEqual([]);
    expect(r.html).toMatch(/<a href="\/b-step\/" data-option-start="">乙：动手<\/a><\/li>\s*<\/ul><span class="option-go" aria-hidden="true">→<\/span><\/section><\/div>\s*<p>两条路走完，都接着 <a href="\/merge\/">汇合<\/a>。<\/p>$/);
  });

  it('找不到块标题、块里没有站内链接时报错', async () => {
    fx.write('operation/choose.md', '# 选一个\n');
    const r = await render('principle/choose.md', md(OPTIONS, '# 选一个\n\n**甲方案（改过）**\n\n[[甲：先讲道理]]\n\n**乙方案**\n\n没有链接\n'));
    expect(messages(r.problems)).toEqual([
      expect.stringMatching(/^选项 a 的块标题“甲方案”在正文里找不到/),
      '选项块“乙方案”里没有站内链接：块内第一个链接要指向这个选项的第一步',
    ]);
  });

  it('第一个链接不是该选项在路线图里的第一步时报错，原理版按原理视图核对', async () => {
    fx.write('operation/choose.md', '# 选一个\n');
    const r = await render('principle/choose.md', md(OPTIONS, PRINCIPLE_BODY));
    expect(messages(r.problems)).toEqual([
      '选项块“乙方案”的第一个链接指向“汇合”，但路线图里选项 b 在原理视图下的第一步是“乙：动手”',
    ]);
  });

  it('操作版按操作视图核对：原理独有步骤被绕过，第一步是后面那一页', async () => {
    fx.write('principle/choose.md', md(OPTIONS, '# 选一个\n'));
    const ok = await render('operation/choose.md', '# 选一个\n\n**甲方案**\n\n[[甲：动手]]\n\n**乙方案**\n\n[[乙：动手]]\n');
    expect(messages(ok.problems)).toEqual([]);
    const bad = await render('operation/choose.md', '# 选一个\n\n**甲方案**\n\n[[甲：先讲道理]]\n\n**乙方案**\n\n[[乙：动手]]\n');
    expect(messages(bad.problems)).toEqual([
      '选项块“甲方案”的第一个链接指向“甲：先讲道理”，但路线图里选项 a 在操作视图下的第一步是“甲：动手”',
    ]);
  });

  it('没有操作版时，原理版两种视图都要核对', async () => {
    const r = await render('principle/choose.md', md(OPTIONS, '# 选一个\n\n**甲方案**\n\n[[甲：先讲道理]]\n\n**乙方案**\n\n[[乙：动手]]\n'));
    expect(messages(r.problems)).toEqual([
      '选项块“甲方案”的第一个链接指向“甲：先讲道理”，但路线图里选项 a 在操作视图下的第一步是“甲：动手”',
    ]);
  });

  it('路线图本身有错时照样包块，第一步不核对（路线图错误由 loadSite 报出）', async () => {
    fx.write('route.yaml', 'chapters: [');
    fx.write('operation/choose.md', '# 选一个\n');
    const r = await render('principle/choose.md', md(OPTIONS, PRINCIPLE_BODY));
    expect(messages(r.problems)).toEqual([]);
    expect(r.html).toContain('data-option="b"');
  });

  it('不是选择页的页面不包块', async () => {
    const r = await render('principle/start.md', '# 开始\n\n**甲方案**\n\n[[甲：动手]]\n');
    expect(r.html).not.toContain('option-block');
    expect(r.html).not.toContain('data-option-start');
  });
});
