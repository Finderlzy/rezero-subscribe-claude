import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLinkIndex } from './link-index';
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
