import { describe, expect, it } from 'vitest';
import { eyebrowText, figurePrefix, progressText, stopTitle } from './nav-text';

describe('nav-text：导航文案，构建时和浏览器共用', () => {
  const chapter = { chapterId: 'node-and-ip', chapter: '准备节点和住宅 IP', chapterNo: 1 };

  const step = { kind: 'step', id: 'plan1-buy-server', title: '一、购买服务器' } as const;
  const choose = { kind: 'choose', id: 'choose-plan', title: '选择方案' } as const;
  const side = { kind: 'side', id: 'google-appeal', title: '被封了：申诉解封' } as const;

  it('眉题一行写完章、章名和第几步（v2.2 D4、D10）：阿拉伯数字、不补零；读屏文字保持“章名，第 n 步，共 m 步”', () => {
    const progress = { ...chapter, index: 2, total: 10 };
    expect(eyebrowText(progress, step)).toBe('第 1 章 · 准备节点和住宅 IP · 第 2 步，共 10 步');
    expect(progressText(progress, step)).toBe('准备节点和住宅 IP，第 2 步，共 10 步');
    // 章号和首页、目录一样从 0 起，只是不补零（v2.2 计划 W2 第 1 条：“第 1 章 · 准备节点和住宅 IP”）
    expect(eyebrowText({ chapterId: 'start', chapter: '开始', chapterNo: 0, index: 1, total: 4 }, step)).toBe('第 0 章 · 开始 · 第 1 步，共 4 步');
  });

  // v3 去掉了章节标题卡（FR-72），章首页的眉题和别的页一样写全章号和章名
  it('章首页的眉题也写全：“第 1 章 · 章名 · 第 1 步，共 m 步”，选择页“… · 选择”', () => {
    const progress = { ...chapter, index: 1, total: 10 };
    expect(eyebrowText(progress, step)).toBe('第 1 章 · 准备节点和住宅 IP · 第 1 步，共 10 步');
    expect(eyebrowText(progress, choose)).toBe('第 1 章 · 准备节点和住宅 IP · 选择');
    expect(progressText(progress, step)).toBe('准备节点和住宅 IP，第 1 步，共 10 步');
  });

  it('数不清第几步：眉题只有章和章名，读屏也只读章名（FR-10）', () => {
    expect(eyebrowText(chapter, step)).toBe('第 1 章 · 准备节点和住宅 IP');
    expect(progressText(chapter, step)).toBe('准备节点和住宅 IP');
    expect(figurePrefix(chapter, step)).toBe('');
  });

  it('选择页写“· 选择”，旁支页写“· 旁支”，都不计步数（design §4.2、§4.6）', () => {
    expect(eyebrowText(chapter, choose)).toBe('第 1 章 · 准备节点和住宅 IP · 选择');
    expect(eyebrowText(chapter, side)).toBe('第 1 章 · 准备节点和住宅 IP · 旁支');
    expect(progressText(chapter, side)).toBe('准备节点和住宅 IP · 旁支');
    expect(progressText(chapter, step)).toBe('准备节点和住宅 IP');
    // 即使进度里带了序号，选择页也不算一步
    expect(figurePrefix({ ...chapter, index: 1, total: 3 }, choose)).toBe('');
    expect(progressText({ ...chapter, index: 1, total: 3 }, choose)).toBe('准备节点和住宅 IP');
  });

  it('附录页：眉题只写“附录”，读屏也只读“附录”，不计步数，截图编号不带步骤号（v2.2 计划 W5 第 1、6 条）', () => {
    const appendix = { chapterId: 'appendix', chapter: '附录', chapterNo: 4, index: 1, total: 1 };
    const page = { kind: 'step', id: 'appendix', title: '附录' } as const;
    expect(eyebrowText(appendix, page)).toBe('附录');
    expect(progressText(appendix, page)).toBe('附录');
    expect(figurePrefix(appendix, page)).toBe('');
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

  it('眉题的章号不补零（design v3 §3.2：章节号一律写成文字）', () => {
    expect(eyebrowText({ chapterId: 'a', chapter: '甲', chapterNo: 0 }, step)).toBe('第 0 章 · 甲');
    expect(eyebrowText({ chapterId: 'b', chapter: '乙', chapterNo: 3 }, step)).toBe('第 3 章 · 乙');
  });

});
