import { describe, expect, it } from 'vitest';
import { progressText, stopTitle } from './nav-text';

describe('nav-text：导航文案，构建时和浏览器共用', () => {
  const chapter = { chapterId: 'register-and-subscribe', chapter: '注册和订阅', chapterNo: 2 };

  it('眉题写成“章节 · 第 n 步，共 m 步”；数不清时只写章节（FR-10）', () => {
    expect(progressText({ ...chapter, index: 2, total: 3 })).toBe('注册和订阅 · 第 2 步，共 3 步');
    expect(progressText(chapter)).toBe('注册和订阅');
  });

  it('旁支页写“章节 · 旁支”（design §4.6）', () => {
    expect(progressText(chapter, { kind: 'side', id: 'google-appeal', title: '被封了：申诉解封' })).toBe('注册和订阅 · 旁支');
    expect(progressText(chapter, { kind: 'step', id: 'use-two-days', title: '先用两天' })).toBe('注册和订阅');
  });

  it('导航目标写它的标题；首页在上一步写“首页”，在下一步写“回到首页”（FR-11、design §4.1）', () => {
    expect(stopTitle({ kind: 'step', id: 'import-proxy', title: '导入代理软件' }, 'next')).toBe('导入代理软件');
    expect(stopTitle({ kind: 'choose', id: 'choose-plan', title: '选择方案' }, 'prev')).toBe('选择方案');
    expect(stopTitle({ kind: 'home' }, 'prev')).toBe('首页');
    expect(stopTitle({ kind: 'home' }, 'next')).toBe('回到首页');
  });
});
