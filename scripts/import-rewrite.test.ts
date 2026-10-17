import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importRewrite, readTitle, splitFrontmatter } from './import-rewrite.mjs';

let root: string;
const write = (path: string, text: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const run = () => importRewrite({ repoRoot: root, rewriteDir: join(root, 'docs/rewrite') });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rezero-import-'));
  write('docs/rewrite/原理版/前言.md', '# 前言\r\n\r\n原理正文\r\n![[图 1.png|262]]\r\n');
  write('docs/rewrite/操作版/前言.md', '# 前言\n\n操作正文\n![[图 2.png]]\n');
  write('docs/rewrite/原理版/整体思路.md', '# 整体思路\n\n只有原理版\n');
  write('docs/rewrite/原理版/常见问题.md', '# 常见问题\n\n## 甲\n');
  write('docs/rewrite/原理版/如何订阅claude.md', '---\nslug: x\n---\n# 目录\n');
  write('docs/rewrite/操作版/如何订阅claude（纯操作版）.md', '# 目录\n');
  write('docs/rewrite/附件/图 1.png', 'one');
  write('docs/rewrite/附件/图 2.png', 'two');
  write('src/content/principle/preface.md', '---\nskippable: true\n---\n# 前言\n\n旧正文\n');
  write('src/content/principle/overview.md', '---\nprincipleOnly: true\n---\n# 整体思路\n');
  write('src/content/reference/faq.md', '# 常见问题\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('readTitle / splitFrontmatter', () => {
  it('取 frontmatter 之后第一个非空行的 # 标题', () => {
    expect(readTitle('---\na: 1\n---\n\n# 前言\n正文')).toBe('前言');
    expect(readTitle('## 不是一级标题')).toBeUndefined();
    expect(readTitle('')).toBeUndefined();
  });

  it('统一换行后拆出 frontmatter', () => {
    expect(splitFrontmatter('---\r\na: 1\r\n---\r\n# 甲\r\n')).toEqual({ frontmatter: '---\na: 1\n---\n', body: '# 甲\n' });
    expect(splitFrontmatter('# 甲\n')).toEqual({ frontmatter: '', body: '# 甲\n' });
  });
});

describe('importRewrite', () => {
  it('按标题匹配，保留 frontmatter、只替换正文，换行统一成 \\n', () => {
    run();
    expect(read('src/content/principle/preface.md')).toBe('---\nskippable: true\n---\n# 前言\n\n原理正文\n![[图 1.png|262]]\n');
    expect(read('src/content/principle/overview.md')).toBe('---\nprincipleOnly: true\n---\n# 整体思路\n\n只有原理版\n');
    expect(read('src/content/reference/faq.md')).toBe('# 常见问题\n\n## 甲\n');
  });

  it('操作版跟随原理版的标识，缺的直接新建，没有 frontmatter', () => {
    run();
    expect(read('src/content/operation/preface.md')).toBe('# 前言\n\n操作正文\n![[图 2.png]]\n');
    expect(existsSync(join(root, 'src/content/operation/overview.md'))).toBe(false);
  });

  it('只复制被引用、站内还没有的截图；附件里也没有的报告出来', () => {
    write('src/assets/screenshots/图 2.png', 'already');
    write('docs/rewrite/原理版/前言.md', '# 前言\n\n![[图 1.png|262]]\n![[缺失.png]]\n');
    const report = run();
    expect(read('src/assets/screenshots/图 1.png')).toBe('one');
    expect(read('src/assets/screenshots/图 2.png')).toBe('already');
    expect(report.copied).toEqual(['src/assets/screenshots/图 1.png']);
    expect(report.missingImages).toEqual(['缺失.png']);
  });

  it('说明图（.svg）复制到 src/assets/diagrams/，附件里的是原稿，内容变了就更新；附件里没有的报告出来', () => {
    write('docs/rewrite/原理版/整体思路.md', '# 整体思路\n\n![[说明图-整体思路.svg]]\n\n![[说明图-缺失.svg]]\n');
    write('docs/rewrite/附件/说明图-整体思路.svg', '<svg>v1</svg>');
    const first = run();
    expect(first.copied.filter((p) => p.endsWith('.svg'))).toEqual(['src/assets/diagrams/说明图-整体思路.svg']);
    expect(first.missingImages).toEqual(['说明图-缺失.svg']);
    expect(read('src/assets/diagrams/说明图-整体思路.svg')).toBe('<svg>v1</svg>');
    expect(existsSync(join(root, 'src/assets/screenshots/说明图-整体思路.svg'))).toBe(false);

    write('docs/rewrite/附件/说明图-整体思路.svg', '<svg>v2</svg>');
    expect(run().copied).toEqual(['src/assets/diagrams/说明图-整体思路.svg']);
    expect(read('src/assets/diagrams/说明图-整体思路.svg')).toBe('<svg>v2</svg>');
    expect(run().copied).toEqual([]);
  });

  it('新页面、多出的页面只报告，不建文件也不删文件；目录页不导入', () => {
    write('docs/rewrite/原理版/新页面.md', '# 新页面\n');
    write('docs/rewrite/操作版/新页面.md', '# 新页面\n');
    write('src/content/principle/gone.md', '# 已删除\n');
    write('src/content/operation/stray.md', '# 孤儿\n');
    const report = run();
    expect(report.newPages).toEqual(['docs/rewrite/原理版/新页面.md', 'docs/rewrite/操作版/新页面.md']);
    expect(report.orphans).toEqual([
      'src/content/principle/gone.md（重写稿里没有“原理版/已删除.md”）',
      'src/content/operation/stray.md（没有对应的原理版页面）',
    ]);
    expect(read('src/content/principle/gone.md')).toBe('# 已删除\n');
    expect(existsSync(join(root, 'src/content/principle/新页面.md'))).toBe(false);
  });

  it('站内文件缺标题时无法匹配，报告出来', () => {
    write('src/content/principle/broken.md', '没有标题\n');
    expect(run().untitled).toEqual(['src/content/principle/broken.md']);
  });

  it('连跑两次，第二次什么都不写', () => {
    const first = run();
    expect(first.written.length).toBe(4);
    const second = run();
    expect(second.written).toEqual([]);
    expect(second.copied).toEqual([]);
    expect(second.unchanged).toBe(4);
  });
});
