import { describe, expect, it } from 'vitest';
import { chapterNoText, eyebrowSuffix, eyebrowTotal, isChapterStart, progressText, stepMark, stepMarkHtml, stopTitle } from './nav-text';

describe('nav-text：导航文案，构建时和浏览器共用', () => {
  const chapter = { chapterId: 'register-and-subscribe', chapter: '注册和订阅', chapterNo: 2 };

  const step = { kind: 'step', id: 'plan1-buy-server', title: '二、购买服务器' } as const;
  const choose = { kind: 'choose', id: 'choose-phone', title: '选择手机系统' } as const;
  const side = { kind: 'side', id: 'google-appeal', title: '被封了：申诉解封' } as const;

  it('第 n 步，共 m 步：编号补足两位，下一行“共 m 步”；眉题读“章节，第 n 步，共 m 步”，平板和手机多写步数（FR-10、design §4.1）', () => {
    const progress = { ...chapter, index: 2, total: 5 };
    expect(stepMark(progress, step)).toEqual({ kind: 'numeral', text: '02', index: 2, total: '共 5 步' });
    expect(progressText(progress, step)).toBe('注册和订阅，第 2 步，共 5 步');
    expect(eyebrowTotal(progress, step)).toBe(' · 共 5 步');
    expect(stepMark({ ...chapter, index: 12, total: 12 }, step)).toMatchObject({ text: '12' });
  });

  it('数不清第几步：编号是短横，不写步数，眉题只有章节（FR-10）', () => {
    expect(stepMark(chapter, step)).toEqual({ kind: 'numeral', text: '–' });
    expect(progressText(chapter, step)).toBe('注册和订阅');
    expect(eyebrowTotal(chapter, step)).toBe('');
  });

  it('选择页：不计步数，标记写“选择”，眉题只写章节（design §4.2）', () => {
    expect(stepMark(chapter, choose)).toEqual({ kind: 'label', text: '选择' });
    expect(progressText(chapter, choose)).toBe('注册和订阅');
    expect(eyebrowTotal(chapter, choose)).toBe('');
    // 即使进度里带了序号，选择页也不算一步
    expect(stepMark({ ...chapter, index: 1, total: 3 }, choose)).toEqual({ kind: 'label', text: '选择' });
  });

  it('旁支页：标记写“旁支”，眉题“章节 · 旁支”（design §4.6）', () => {
    expect(stepMark(chapter, side)).toEqual({ kind: 'label', text: '旁支' });
    expect(progressText(chapter, side)).toBe('注册和订阅 · 旁支');
    expect(eyebrowTotal(chapter, side)).toBe('');
    expect(eyebrowSuffix(side)).toBe(' · 旁支');
    expect(eyebrowSuffix(step)).toBe('');
  });

  it('首页没有标记', () => {
    expect(stepMark(chapter, { kind: 'home' })).toBeNull();
    expect(stepMarkHtml(null)).toBe('');
  });

  it('标记的 HTML：编号用固定字形并带编号原文，“共 m 步”另起一行；选择页、旁支页是文字', () => {
    const numbered = stepMarkHtml({ kind: 'numeral', text: '02', index: 2, total: '共 5 步' });
    expect(numbered).toMatch(/^<span class="step-no" data-step-no="02"><svg class="numeral"[^>]*aria-label="第 2 步"/);
    expect(numbered).toContain('href="#numeral-0"');
    expect(numbered).toMatch(/<\/span><span class="step-total">共 5 步<\/span>$/);
    const dash = stepMarkHtml({ kind: 'numeral', text: '–' });
    expect(dash).toContain('data-step-no="–"');
    expect(dash).toContain('href="#numeral-dash"');
    expect(dash).not.toContain('step-total');
    expect(stepMarkHtml({ kind: 'label', text: '选择' })).toBe('<span class="step-label">选择</span>');
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
