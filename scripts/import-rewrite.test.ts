import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { convertRelativeLinks, importRewrite, readTitle, splitFrontmatter } from './import-rewrite.mjs';

let root: string;
const write = (path: string, text: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const run = () => importRewrite({ repoRoot: root, rewriteDir: join(root, 'docs/v3-rewrite') });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rezero-import-'));
  // 新稿一章一页，文件名带编号；站内按正文第一行的 # 标题对应
  write('docs/v3-rewrite/00-前言.md', '# 前言\r\n---\r\n\r\n原理正文\r\n![[图 1.png|262]]\r\n');
  write('docs/v3-rewrite/01-整体思路与方案选型.md', '# 整体思路与方案选型\n\n只有这一版\n');
  write('docs/v3-rewrite/reference/实测：Decodo ISP.md', '# 实测：Decodo ISP\n\n参考页正文\n![[图 2.png]]\n');
  write('docs/v3-rewrite/附件/图 1.png', 'one');
  write('docs/v3-rewrite/附件/图 2.png', 'two');
  write('src/content/principle/preface.md', '---\nskippable: true\n---\n# 前言\n\n旧正文\n');
  write(
    'src/content/principle/overview.md',
    '---\noptions:\n  plan-1: { title: 方案一 }\n  plan-2: { title: 方案二 }\n---\n# 整体思路与方案选型\n',
  );
  write('src/content/reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n');
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

describe('convertRelativeLinks', () => {
  const titles = new Map([
    ['02-方案一', '方案一：搭建专属住宅代理节点'],
    ['03-方案二', '方案二：配置住宅IP服务器'],
  ]);

  it('相对 Markdown 链接换成双链：文字与标题相同时省略 |，不同时保留文字', () => {
    const body = '看 [方案一](02-方案一.md)，还有 [更省事的做法](03-方案二.md)。\n';
    expect(convertRelativeLinks(body, titles)).toBe(
      '看 [[方案一：搭建专属住宅代理节点|方案一]]，还有 [[方案二：配置住宅IP服务器|更省事的做法]]。\n',
    );
    const same = '[方案一：搭建专属住宅代理节点](02-方案一.md)\n';
    expect(convertRelativeLinks(same, titles)).toBe('[[方案一：搭建专属住宅代理节点]]\n');
  });

  it('保留 #小节；表格行里的 | 写成 \\|（否则会切开单元格）', () => {
    expect(convertRelativeLinks('[去这里](02-方案一.md#第二步：购买)', titles)).toBe(
      '[[方案一：搭建专属住宅代理节点#第二步：购买|去这里]]',
    );
    expect(convertRelativeLinks('| 章节 | [方案一](02-方案一.md) |', titles)).toBe(
      '| 章节 | [[方案一：搭建专属住宅代理节点\\|方案一]] |',
    );
  });

  it('围栏代码块和行内代码里的链接不动；找不到目标的原样保留并报告', () => {
    const body = '```text\n[方案一](02-方案一.md)\n```\n\n行内 `[方案一](02-方案一.md)`\n\n[没有](99-不存在.md)\n';
    const bad: string[] = [];
    const out = convertRelativeLinks(body, titles, (link: { file: string; ok: boolean }) => {
      if (!link.ok) bad.push(link.file);
    });
    expect(out).toBe(body);
    expect(bad).toEqual(['99-不存在.md']);
  });
});

describe('importRewrite', () => {
  it('按标题匹配（文件名带编号），保留 frontmatter、只替换正文，换行统一成 \\n', () => {
    run();
    expect(read('src/content/principle/preface.md')).toBe(
      '---\nskippable: true\n---\n# 前言\n---\n\n原理正文\n![[图 1.png|262]]\n',
    );
    expect(read('src/content/principle/overview.md')).toBe(
      '---\noptions:\n  plan-1: { title: 方案一 }\n  plan-2: { title: 方案二 }\n---\n# 整体思路与方案选型\n\n只有这一版\n',
    );
  });

  it('参考页从 reference/ 子目录按标题导入', () => {
    run();
    expect(read('src/content/reference/ip-tests/decodo.md')).toBe('# 实测：Decodo ISP\n\n参考页正文\n![[图 2.png]]\n');
  });

  it('只复制被引用、站内还没有的截图；附件里也没有的报告出来', () => {
    write('src/assets/screenshots/图 2.png', 'already');
    write('docs/v3-rewrite/00-前言.md', '# 前言\n\n![[图 1.png|262]]\n![[缺失.png]]\n');
    const report = run();
    expect(read('src/assets/screenshots/图 1.png')).toBe('one');
    expect(read('src/assets/screenshots/图 2.png')).toBe('already');
    expect(report.copied).toEqual(['src/assets/screenshots/图 1.png']);
    expect(report.missingImages).toEqual(['缺失.png']);
  });

  it('说明图（.svg）复制到 src/assets/diagrams/，附件里的是原稿，内容变了就更新；附件里没有的报告出来', () => {
    write(
      'docs/v3-rewrite/01-整体思路与方案选型.md',
      '# 整体思路与方案选型\n\n![[说明图-整体思路.svg]]\n\n![[说明图-缺失.svg]]\n',
    );
    write('docs/v3-rewrite/附件/说明图-整体思路.svg', '<svg>v1</svg>');
    const first = run();
    expect(first.copied.filter((p: string) => p.endsWith('.svg'))).toEqual(['src/assets/diagrams/说明图-整体思路.svg']);
    expect(first.missingImages).toEqual(['说明图-缺失.svg']);
    expect(read('src/assets/diagrams/说明图-整体思路.svg')).toBe('<svg>v1</svg>');
    expect(existsSync(join(root, 'src/assets/screenshots/说明图-整体思路.svg'))).toBe(false);

    write('docs/v3-rewrite/附件/说明图-整体思路.svg', '<svg>v2</svg>');
    expect(run().copied).toEqual(['src/assets/diagrams/说明图-整体思路.svg']);
    expect(read('src/assets/diagrams/说明图-整体思路.svg')).toBe('<svg>v2</svg>');
    expect(run().copied).toEqual([]);
  });

  it('新页面、多出的页面只报告，不建文件也不删文件', () => {
    write('docs/v3-rewrite/02-方案一.md', '# 方案一：搭建专属住宅代理节点\n');
    write('src/content/principle/gone.md', '# 已删除\n');
    const report = run();
    expect(report.newPages).toEqual(['docs/v3-rewrite/02-方案一.md']);
    expect(report.orphans).toEqual(['src/content/principle/gone.md（重写稿里没有标题是“已删除”的页面）']);
    expect(read('src/content/principle/gone.md')).toBe('# 已删除\n');
    expect(existsSync(join(root, 'src/content/principle/方案一.md'))).toBe(false);
  });

  it('站内文件缺标题时无法匹配，报告出来', () => {
    write('src/content/principle/broken.md', '没有标题\n');
    expect(run().untitled).toEqual(['src/content/principle/broken.md']);
  });

  it('连跑两次，第二次什么都不写', () => {
    const first = run();
    expect(first.written.length).toBe(3);
    const second = run();
    expect(second.written).toEqual([]);
    expect(second.copied).toEqual([]);
    expect(second.unchanged).toBe(3);
  });
});
