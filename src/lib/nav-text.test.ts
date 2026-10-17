import { describe, expect, it } from 'vitest';
import { chapterNoText, chapterText, eyebrowSuffix, eyebrowText, figurePrefix, isChapterStart, progressText, stepNumber, stopTitle } from './nav-text';

describe('nav-text：导航文案，构建时和浏览器共用', () => {
  const chapter = { chapterId: 'node-and-ip', chapter: '准备节点和住宅 IP', chapterNo: 1 };

  const step = { kind: 'step', id: 'plan1-buy-server', title: '二、购买服务器' } as const;
  const choose = { kind: 'choose', id: 'choose-plan', title: '选择方案' } as const;
  const side = { kind: 'side', id: 'google-appeal', title: '被封了：申诉解封' } as const;

  it('眉题一行写完章、章名和第几步（v2.2 D4、D10）：阿拉伯数字、不补零；读屏文字保持“章名，第 n 步，共 m 步”', () => {
    const progress = { ...chapter, index: 2, total: 10 };
    expect(eyebrowText(progress, step)).toBe('第 2 章 · 准备节点和住宅 IP · 第 2 步，共 10 步');
    expect(progressText(progress, step)).toBe('准备节点和住宅 IP，第 2 步，共 10 步');
    expect(stepNumber(progress, step)).toEqual({ index: 2, total: 10 });
    // 第 0 章写成“第 1 章”，不再是“00”
    expect(eyebrowText({ chapterId: 'start', chapter: '开始', chapterNo: 0, index: 1, total: 4 }, step)).toBe('第 1 章 · 开始 · 第 1 步，共 4 步');
  });

  it('章首页省掉章的部分（色带里已经写了副标题和章名），只写“第 n 步，共 m 步”', () => {
    const progress = { ...chapter, index: 1, total: 10 };
    expect(eyebrowText(progress, step, true)).toBe('第 1 步，共 10 步');
    expect(eyebrowText(progress, choose, true)).toBe('选择');
    expect(progressText(progress, step)).toBe('准备节点和住宅 IP，第 1 步，共 10 步');
  });

  it('数不清第几步：眉题只有章和章名，读屏也只读章名（FR-10）', () => {
    expect(eyebrowText(chapter, step)).toBe('第 2 章 · 准备节点和住宅 IP');
    expect(progressText(chapter, step)).toBe('准备节点和住宅 IP');
    expect(stepNumber(chapter, step)).toBeNull();
  });

  it('选择页写“· 选择”，旁支页写“· 旁支”，都不计步数（design §4.2、§4.6）', () => {
    expect(eyebrowText(chapter, choose)).toBe('第 2 章 · 准备节点和住宅 IP · 选择');
    expect(eyebrowText(chapter, side)).toBe('第 2 章 · 准备节点和住宅 IP · 旁支');
    expect(progressText(chapter, side)).toBe('准备节点和住宅 IP · 旁支');
    expect(eyebrowSuffix(side)).toBe(' · 旁支');
    expect(eyebrowSuffix(step)).toBe('');
    // 即使进度里带了序号，选择页也不算一步
    expect(stepNumber({ ...chapter, index: 1, total: 3 }, choose)).toBeNull();
    expect(progressText({ ...chapter, index: 1, total: 3 }, choose)).toBe('准备节点和住宅 IP');
  });

  it('首页没有眉题', () => {
    expect(eyebrowText(chapter, { kind: 'home' })).toBe('');
    expect(progressText(chapter, { kind: 'home' })).toBe('准备节点和住宅 IP');
  });

  it('截图编号的前半：数得清时是“步骤号-”（补足两位），数不清、选择页、旁支页为空，只用序号（design §4.7，架构 §11.4 W-4）', () => {
    expect(figurePrefix({ ...chapter, index: 2, total: 5 }, step)).toBe('02-');
    expect(figurePrefix({ ...chapter, index: 12, total: 12 }, step)).toBe('12-');
    expect(figurePrefix(chapter, step)).toBe('');
    expect(figurePrefix({ ...chapter, index: 1, total: 3 }, choose)).toBe('');
    expect(figurePrefix(chapter, side)).toBe('');
  });

  it('导航目标写它的标题；首页在上一步写“首页”，在下一步写“回到首页”（FR-11、design §4.1）', () => {
    expect(stopTitle({ kind: 'step', id: 'import-proxy', title: '导入代理软件' }, 'next')).toBe('导入代理软件');
    expect(stopTitle({ kind: 'choose', id: 'choose-plan', title: '选择方案' }, 'prev')).toBe('选择方案');
    expect(stopTitle({ kind: 'home' }, 'prev')).toBe('首页');
    expect(stopTitle({ kind: 'home' }, 'next')).toBe('回到首页');
  });

  it('页头色带的章号不补零；目录和首页索引的章节号仍从 00 起、补足两位（design §2）', () => {
    expect(chapterText({ chapterId: 'a', chapter: '甲', chapterNo: 0 })).toBe('第 1 章');
    expect(chapterText({ chapterId: 'b', chapter: '乙', chapterNo: 3 })).toBe('第 4 章');
    expect(chapterNoText(0)).toBe('00');
    expect(chapterNoText(3)).toBe('03');
    expect(chapterNoText(12)).toBe('12');
  });

  it('章节第一页：普通页或选择页，不含旁支页和分支段（design §4.1）', () => {
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
