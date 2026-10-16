import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import type { RouteData, RouteView } from '../lib/route/types';
import PageLayout from './PageLayout.astro';

// 两版正文的输出（ADR-0004，FR-21、FR-30）。“操作版还在写”现在没有真实页面会触发，所以在这里直接渲染布局。
const view: RouteView = {
  choices: {},
  current: { kind: 'step', id: 'android-subscribe', title: '安卓：订阅' },
  prev: { kind: 'step', id: 'subscribe', title: '订阅' },
  next: { kind: 'step', id: 'after-subscribe', title: '订阅之后' },
  skipTo: null,
  returnTo: null,
  progress: { chapterId: 'register-and-subscribe', chapter: '注册和订阅', chapterNo: 2 },
  outline: [],
};
const routeData: RouteData = { chapters: [], pages: {}, forks: {}, side: {} };

async function render(props: Record<string, unknown>, slots: Record<string, string>) {
  const container = await AstroContainer.create();
  return container.renderToString(PageLayout, { props: { title: '安卓：订阅', view, routeData, tocReferences: [], ...props }, slots });
}

describe('PageLayout', () => {
  it('两版都有：分别包在 data-body 里，没有提示条', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>', operation: '<p>操作正文</p>' });
    expect(html).toMatch(/data-body="principle"[^>]*><p>原理正文<\/p>/);
    expect(html).toMatch(/data-body="operation"[^>]*><p>操作正文<\/p>/);
    expect(html).not.toContain('view-notice');
  });

  it('操作版还在写：只输出原理版，不带 data-body，正文上方是提示条（FR-21）', async () => {
    const html = await render({ notice: '操作版还在写，下面是原理版。' }, { principle: '<p>原理正文</p>', operation: '<p>不该出现</p>' });
    expect(html).toMatch(/class="view-notice"[^>]*>操作版还在写，下面是原理版。</);
    expect(html).toContain('<p>原理正文</p>');
    expect(html).not.toContain('data-body');
    expect(html).not.toContain('不该出现');
    expect(html.indexOf('view-notice')).toBeLessThan(html.indexOf('原理正文'));
  });

  it('内嵌 RouteData 供页面脚本重算导航，JSON 里的 < 被转义', async () => {
    const data: RouteData = { ...routeData, pages: { x: { title: '</script><b>', principleOnly: false, skippable: false } } };
    const html = await render({ routeData: data }, { principle: '<p>原理正文</p>' });
    const json = /<script type="application\/json" id="route-data">(.*?)<\/script>/.exec(html)?.[1];
    expect(json).toBeDefined();
    expect(json).not.toContain('<');
    expect(JSON.parse(json!)).toEqual(data);
  });

  it('页眉有“操作｜原理”切换控件', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>', operation: '<p>操作正文</p>' });
    expect(html).toContain('data-view-option="operation"');
    expect(html).toContain('data-view-option="principle"');
  });

  it('目录：只有抽屉，没有常驻侧栏；“目录”是链到首页目录的链接，末尾单列参考页（design §4.5、§5，FR-16）', async () => {
    const tocReferences = [
      { id: 'faq', title: '常见问题' },
      { id: 'ip-tests', title: 'IP 质量实测合集' },
    ];
    const outline = [{ id: 'start', title: '开始', items: [] }];
    const html = await render({ tocReferences, view: { ...view, outline } }, { principle: '<p>原理正文</p>' });
    expect(html).not.toContain('data-toc-sidebar');
    expect(html).not.toContain('step-shell');
    // 目录在抽屉里，页面上只有一份
    expect(html).toMatch(/<dialog[^>]*data-toc-dialog[\s\S]*<nav[^>]*data-toc[\s\S]*<\/dialog>/);
    expect(html.match(/<nav[^>]*data-toc[\s>]/g)).toHaveLength(1);
    // 没有 JS 时就是指向首页完整目录的链接，不隐藏
    expect(html).toMatch(/<a[^>]*href="\/#home-chapters"[^>]*data-toc-open/);
    expect(html).not.toMatch(/data-toc-open[^>]*hidden/);
    // 章节号用固定字形，读屏读“第 n 章”
    expect(html).toMatch(/class="toc-chapter-no"[^>]*>\s*<svg class="numeral"[^>]*aria-label="第 0 章"/);
    expect(html).toContain('卡住了再看');
    expect(html).toMatch(/href="[^"]*\/faq\/"[^>]*>\s*<span class="toc-label"[^>]*>常见问题/);
    expect(html).toMatch(/href="[^"]*\/ip-tests\/"[^>]*>\s*<span class="toc-label"[^>]*>IP 质量实测合集/);
  });

  it('页眉：链到首页的 logo 标记，带视图切换和目录按钮，色带跟视图走（design §4.0）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/<header class="site-header[^"]*"[^>]*data-views/);
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*aria-label="Re:从零开始订阅 claude 首页"/);
    expect(html.indexOf('site-header')).toBeLessThan(html.indexOf('id="main"'));
  });

  it('眉题：章节号从 00 起，进度文字单独放给页面脚本改写（design §4.1）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/class="eyebrow-no"[^>]*>02</);
    expect(html).toMatch(/data-route-progress[^>]*>注册和订阅</);
  });

  it('章节过场只在每章第一页出现（design §4.1）', async () => {
    const chapters: RouteData['chapters'] = [
      {
        id: 'register-and-subscribe',
        title: '注册和订阅',
        items: [
          { kind: 'step', id: 'android-subscribe' },
          { kind: 'step', id: 'after-subscribe' },
        ],
      },
    ];
    const first = await render({ routeData: { ...routeData, chapters } }, { principle: '<p>原理正文</p>' });
    expect(first).toMatch(/class="chapter-intro"/);
    expect(first).toMatch(/class="chapter-intro-no"[^>]*>02</);

    const later = { ...view, current: { kind: 'step', id: 'after-subscribe', title: '订阅之后' } as const };
    const html = await render({ view: later, routeData: { ...routeData, chapters } }, { principle: '<p>原理正文</p>' });
    expect(html).not.toContain('chapter-intro');
  });
});
