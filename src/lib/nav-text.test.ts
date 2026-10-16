import { describe, expect, it } from 'vitest';
import { chapterNoText, isChapterStart, progressText, stopTitle } from './nav-text';

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

  it('章节号从 00 开始，补足两位（design §2“从零开始”）', () => {
    expect(chapterNoText(0)).toBe('00');
    expect(chapterNoText(3)).toBe('03');
    expect(chapterNoText(12)).toBe('12');
  });

  it('章节过场只在每章第一页：普通页或选择页，不含旁支页和分支段（design §4.1）', () => {
    const chapters = [
      { id: 'start', title: '开始', items: [{ kind: 'step' as const, id: 'preface' }, { kind: 'step' as const, id: 'disclaimer' }] },
      {
        id: 'node',
        title: '准备节点',
        items: [{ kind: 'choose' as const, fork: 'plan', id: 'choose-plan' }, { kind: 'branch' as const, fork: 'plan', options: { a: ['a1'] } }],
      },
    ];
    const at = (chapterId: string) => ({ chapterId, chapter: '', chapterNo: 0 });
    expect(isChapterStart(chapters, at('start'), { kind: 'step', id: 'preface', title: '前言' })).toBe(true);
    expect(isChapterStart(chapters, at('start'), { kind: 'step', id: 'disclaimer', title: '免责声明' })).toBe(false);
    expect(isChapterStart(chapters, at('node'), { kind: 'choose', id: 'choose-plan', title: '选择方案' })).toBe(true);
    expect(isChapterStart(chapters, at('node'), { kind: 'step', id: 'a1', title: '甲' })).toBe(false);
    expect(isChapterStart(chapters, at('start'), { kind: 'side', id: 'preface', title: '旁支' })).toBe(false);
    expect(isChapterStart(chapters, at('missing'), { kind: 'step', id: 'preface', title: '前言' })).toBe(false);
    expect(isChapterStart(chapters, at('start'), { kind: 'home' })).toBe(false);
  });
});
