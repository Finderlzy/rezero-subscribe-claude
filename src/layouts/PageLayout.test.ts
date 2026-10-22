import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { FIGURE_STEP_SLOT } from '../lib/content/rehype-figures';
import type { RouteData, RouteView } from '../lib/route/types';
import PageLayout from './PageLayout.astro';

// 步骤页的骨架（design v3 §4.1）。页面固定原理视图（用户 2026-10-22 决定去掉视图切换），只输出原理版正文。
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
  // 用户 2026-10-22 决定去掉视图切换、固定原理视图：v2 的“两版正文各包一个 data-body”“操作版还在写的提示条”随功能移除
  it('只输出原理版正文，不带 data-body，也没有视图提示条', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>', operation: '<p>操作正文</p>' });
    expect(html).toMatch(/<div class="prose"[^>]*><p>原理正文<\/p>/);
    expect(html).not.toContain('操作正文');
    expect(html).not.toContain('data-body');
    expect(html).not.toContain('view-notice');
  });

  it('截图编号的步骤号：构建时按原理视图的步数写进正文；数不清第几步时留空，只用序号（design §4.7）', async () => {
    const figure = `<figure class="plate" data-figure="1"><figcaption class="plate-no">图 ${FIGURE_STEP_SLOT}1</figcaption></figure>`;
    const counted = { ...view, progress: { ...view.progress, index: 3, total: 4 } };
    const html = await render({ view: counted }, { principle: figure });
    expect(html.match(/图 <span data-figure-step>03-<\/span>1/g)).toHaveLength(1);
    const uncounted = await render({}, { principle: figure });
    expect(uncounted.match(/图 <span data-figure-step=""><\/span>1/g)).toHaveLength(1);
  });

  it('内嵌 RouteData 供页面脚本重算导航，JSON 里的 < 被转义', async () => {
    const data: RouteData = { ...routeData, pages: { x: { title: '</script><b>', principleOnly: false, skippable: false } } };
    const html = await render({ routeData: data }, { principle: '<p>原理正文</p>' });
    const json = /<script type="application\/json" id="route-data">(.*?)<\/script>/.exec(html)?.[1];
    expect(json).toBeDefined();
    expect(json).not.toContain('<');
    expect(JSON.parse(json!)).toEqual(data);
  });

  // 原来放视图切换的位置换成昼夜切换（用户 2026-10-22 决定）；搜索挂载点留给 V08
  it('顶栏右侧：搜索挂载点（空、hidden）、昼夜切换（没有 JS 时 hidden）、联系方式，没有视图切换', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    const header = /<header class="site-header"[\s\S]*?<\/header>/.exec(html)?.[0] ?? '';
    expect(header).not.toContain('data-view-option');
    expect(header).toMatch(/<div class="site-search-slot" data-search-slot hidden[^>]*><\/div>/);
    expect(header).toMatch(/<button type="button" class="theme-toggle" data-theme-toggle aria-pressed="false" aria-label="深色模式"[^>]*hidden/);
    const order = ['data-search-slot', 'data-theme-toggle', 'aria-label="作者的联系方式"'].map((m) => header.indexOf(m));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('目录（design v3 §4.5）：≥720px 一份常驻侧边栏 + <720px 的抽屉，两份标记一样；“目录”按钮是链到首页目录的链接，参考页在附录一章里（design §4.5、§5，FR-16）', async () => {
    const tocReferences = [
      { id: 'faq', title: '常见问题' },
      { id: 'ip-tests', title: 'IP 质量实测合集' },
    ];
    const outline = [
      { id: 'start', title: '开始', items: [] },
      { id: 'appendix', title: '附录', items: [] },
    ];
    const html = await render({ tocReferences, view: { ...view, outline } }, { principle: '<p>原理正文</p>' });
    // 侧边栏是静态 HTML，在抽屉之前；抽屉里一份
    expect(html).toMatch(/<aside class="toc-sidebar"[^>]*data-toc-sidebar[\s\S]*<nav[^>]*data-toc[\s\S]*<\/aside>\s*<dialog[^>]*data-toc-dialog/);
    expect(html.match(/<nav[^>]*data-toc[\s>]/g)).toHaveLength(2);
    expect(html).toMatch(/<nav[^>]*class="toc toc-sidebar"/);
    // 没有 JS 时就是指向首页完整目录的链接，不隐藏
    expect(html).toMatch(/<a[^>]*href="\/#home-chapters"[^>]*data-toc-open/);
    expect(html).not.toMatch(/data-toc-open[^>]*hidden/);
    // 侧边栏和抽屉里每章一个 <details>，<summary> 只写章名（design v3 §4.5，FR-16）
    expect(html).toMatch(/<details class="toc-chapter-details"[^>]*>\s*<summary class="toc-chapter-head"[^>]*>\s*<span class="toc-chapter-title"[^>]*>开始<\/span>/);
    expect(html).not.toMatch(/<span class="toc-chapter-no"[^>]*>第 0 章<\/span>/);
    expect(html).not.toMatch(/<span class="toc-chapter-no"[^>]*>\s*<svg class="numeral"[^>]*aria-label="第 0 章"/);
    expect(html).toMatch(/href="[^"]*\/faq\/"[^>]*>\s*<span class="toc-label"[^>]*>常见问题/);
    expect(html).toMatch(/href="[^"]*\/ip-tests\/"[^>]*>\s*<span class="toc-label"[^>]*>IP 质量实测合集/);
  });

  it('sections 传到侧边栏当前项下面，当前章展开（V02，FR-16）', async () => {
    const outline = [
      {
        id: 'register-and-subscribe',
        title: '注册和订阅',
        items: [
          { kind: 'step' as const, id: 'android-subscribe', title: '安卓：订阅', skippable: false, principleOnly: false, onRoute: true, current: true },
        ],
      },
    ];
    const html = await render(
      { view: { ...view, outline }, sections: [{ slug: '一-购买服务器', text: '一、购买服务器' }] },
      { principle: '<p>原理正文</p>' },
    );
    expect(html).toMatch(/<details class="toc-chapter-details" open>/);
    expect(html).toMatch(/<li class="toc-step" data-toc-step="android-subscribe"[\s\S]*?<ol class="toc-sections">[\s\S]*?href="#一-购买服务器"/);
  });

  it('顶栏：链到首页的 logo 标记和站名，小形象紧跟在链接后面、不在链接里；顶栏在正文之前（design §4.0）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*aria-label="Re:从零开始订阅 claude 首页"/);
    expect(html).toMatch(/<\/a>\s*(<!--[\s\S]*?-->\s*)?<svg class="mascot" aria-hidden="true"/);
    expect(html.indexOf('site-header')).toBeLessThan(html.indexOf('id="main"'));
  });

  // FR-72 去掉了页头色带：眉题和 h1 直接在正文栏里
  it('眉题在 h1 上方、没有色带；眉题一行写章和步数，看得见的部分不进无障碍树，读屏文字单独放给页面脚本改写（design v3 §4.1）', async () => {
    const progress = { ...view.progress, index: 2, total: 5 };
    const html = await render({ view: { ...view, progress } }, { principle: '<p>原理正文</p>' });
    expect(html).not.toContain('class="band');
    expect(html).toMatch(/<div class="step-body"[^>]*>\s*<p class="eyebrow"[^>]*>\s*<span aria-hidden="true"[^>]*data-route-eyebrow[^>]*>第 2 章 · 注册和订阅 · 第 2 步，共 5 步<\/span>/);
    expect(html).toMatch(/class="visually-hidden"[^>]*data-route-progress[^>]*>注册和订阅，第 2 步，共 5 步</);
    expect(html.indexOf('data-route-eyebrow')).toBeLessThan(html.indexOf('<h1'));
    // 正文区里没有任何补零的编号字形（D10）：<symbol> 字形和 <use> 都只留给找不到页的 404
    const main = /<main[\s\S]*<\/main>/.exec(html)?.[0] ?? '';
    expect(main).not.toContain('numeral');
    expect(main).not.toContain('data-route-mark');
    expect(html).not.toContain('data-route-total');
    expect(/<header class="site-header"[\s\S]*?<\/header>/.exec(html)?.[0]).not.toContain('numeral');
  });

  it('数不清第几步时眉题只有章和章名（FR-10）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/data-route-eyebrow[^>]*>第 2 章 · 注册和订阅<\/span>/);
    expect(html).toMatch(/data-route-progress[^>]*>注册和订阅</);
  });

  it('选择页写“选择”，旁支页写“旁支”，都不计步数（design §4.2、§4.6）', async () => {
    const choose = { ...view, current: { kind: 'choose', id: 'choose-phone', title: '选择手机系统' } as const };
    expect(await render({ view: choose }, { principle: '<p>原理正文</p>' })).toMatch(/data-route-eyebrow[^>]*>第 2 章 · 注册和订阅 · 选择</);

    const side = { ...view, current: { kind: 'side', id: 'google-appeal', title: '被封了：申诉解封' } as const };
    const html = await render({ view: side }, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/data-route-eyebrow[^>]*>第 2 章 · 注册和订阅 · 旁支</);
    expect(html).toMatch(/data-route-progress[^>]*>注册和订阅 · 旁支</);
  });

  it('小形象只在顶栏里，整页一个，对读屏隐藏（design v3 §4.0、V16）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    const header = /<header class="site-header"[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1];
    expect(header).toMatch(/<svg class="mascot" aria-hidden="true"/);
    expect(html.match(/class="mascot"/g)).toHaveLength(1);
  });

  it('每页都有页脚的非官方声明（v2.2 D6）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/<footer class="site-footer"[^>]*>\s*<p[^>]*>\s*<small[^>]*>本站是个人教程，与 Anthropic 无关。<\/small>\s*<\/p>/);
    expect(html.indexOf('site-footer')).toBeGreaterThan(html.indexOf('id="main"'));
  });

  // FR-72 去掉了章首页的副标题、章名和一句话：章首页和普通页的版式一样，眉题写全
  it('章首页没有特殊处理：没有副标题、章名块和一句话，眉题照常写章和步数（design v3 §4.1）', async () => {
    const chapters: RouteData['chapters'] = [
      {
        id: 'start',
        title: '开始',
        items: [
          { kind: 'step', id: 'android-subscribe' },
          { kind: 'step', id: 'after-subscribe' },
        ],
      },
    ];
    const progress = { chapterId: 'start', chapter: '开始', chapterNo: 0, index: 1, total: 2 };
    const first = await render({ view: { ...view, progress }, routeData: { ...routeData, chapters } }, { principle: '<p>原理正文</p>' });
    for (const gone of ['chapter-head', 'chapter-subtitle', 'chapter-title', 'chapter-intro', 'data-band', 'data-chapter-start']) {
      expect(first).not.toContain(gone);
    }
    expect(first).toMatch(/data-route-eyebrow[^>]*>第 0 章 · 开始 · 第 1 步，共 2 步</);
  });
});
