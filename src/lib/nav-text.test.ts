import { describe, expect, it } from 'vitest';
import { progressText, stopTitle } from './nav-text';

describe('nav-text：导航文案，构建时和浏览器共用', () => {
  it('进度写成“章节 · 第 n 步，共 m 步”（FR-10）', () => {
    expect(progressText({ chapterId: 'residential-ip', chapter: '一、准备住宅 IP', index: 2, total: 3 })).toBe(
      '一、准备住宅 IP · 第 2 步，共 3 步',
    );
  });

  it('导航目标写它的标题，完成页用完成页标题', () => {
    expect(stopTitle({ kind: 'step', id: 'ssh-connect', title: '连上服务器' }, '完成')).toBe('连上服务器');
    expect(stopTitle({ kind: 'choose', fork: 'node-plan', title: '选哪种？' }, '完成')).toBe('选哪种？');
    expect(stopTitle({ kind: 'done' }, '完成')).toBe('完成');
  });
});
