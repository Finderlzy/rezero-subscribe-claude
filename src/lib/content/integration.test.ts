import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatPlaceholders, listPlaceholderSteps } from './integration';
import { createFixture, md, type Fixture } from './test-fixture';

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

describe('listPlaceholderSteps', () => {
  it('只列出 placeholder: true 的步骤，按标识排序', () => {
    fx.write('steps/v2rayn-import.md', md('title: 下载 v2rayN 并导入节点\nplaceholder: true', '内容待补'));
    fx.write('steps/overview.md', md('title: 整体思路', '正文'));
    fx.write('steps/clean-claude-code.md', md('title: 清理本机的 Claude Code 配置\nplaceholder: true\nskippable: true', ''));
    fx.write('steps/webrtc.md', md('title: WebRTC\nplaceholder: false', '正文'));

    expect(listPlaceholderSteps(fx.contentRoot)).toEqual([
      { id: 'clean-claude-code', title: '清理本机的 Claude Code 配置' },
      { id: 'v2rayn-import', title: '下载 v2rayN 并导入节点' },
    ]);
  });

  it('没有步骤目录或没有占位时为空', () => {
    expect(listPlaceholderSteps(fx.contentRoot)).toEqual([]);
    fx.write('steps/overview.md', md('title: 整体思路', '正文'));
    expect(listPlaceholderSteps(fx.contentRoot)).toEqual([]);
  });
});

describe('formatPlaceholders', () => {
  it('每行一个“占位步骤：<step-id> <标题>”', () => {
    expect(formatPlaceholders([{ id: 'clean-claude-code', title: '清理本机的 Claude Code 配置' }])).toEqual([
      '占位步骤：clean-claude-code 清理本机的 Claude Code 配置',
    ]);
  });
});
