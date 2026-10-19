import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { FIGURE_STEP_SLOT } from '../lib/content/rehype-figures';
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

  it('截图编号的步骤号：构建时按操作视图写进两版正文；数不清第几步时留空，只用序号（design §4.7）', async () => {
    const figure = `<figure class="plate" data-figure="1"><figcaption class="plate-no">图 ${FIGURE_STEP_SLOT}1</figcaption></figure>`;
    const counted = { ...view, progress: { ...view.progress, index: 3, total: 4 } };
    const html = await render({ view: counted }, { principle: figure, operation: figure });
    expect(html.match(/图 <span data-figure-step>03-<\/span>1/g)).toHaveLength(2);
    const uncounted = await render({}, { principle: figure, operation: figure });
    expect(uncounted.match(/图 <span data-figure-step=""><\/span>1/g)).toHaveLength(2);
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

  it('目录（v2.2 D8）：≥1100px 一份常驻侧边栏 + <1100px 的抽屉，两份标记一样；“目录”按钮是链到首页目录的链接，参考页在附录一章里（design §4.5、§5，FR-16）', async () => {
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
    // 侧边栏里章标题写“第 0 章”（和首页、目录的 00 一样从 0 起，不补零），不再是补零的章节号字形
    expect(html).toMatch(/<span class="toc-chapter-no"[^>]*>第 0 章<\/span>/);
    expect(html).not.toMatch(/<span class="toc-chapter-no"[^>]*>\s*<svg class="numeral"[^>]*aria-label="第 0 章"/);
    expect(html).toMatch(/href="[^"]*\/faq\/"[^>]*>\s*<span class="toc-label"[^>]*>常见问题/);
    expect(html).toMatch(/href="[^"]*\/ip-tests\/"[^>]*>\s*<span class="toc-label"[^>]*>IP 质量实测合集/);
  });

  it('页眉：链到首页的 logo 标记，带视图切换和“目录”按钮；底边只有一条细线，没有视图色带（design §4.0）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).not.toMatch(/<header class="site-header"[^>]*data-views/);
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*aria-label="Re:从零开始订阅 claude 首页"/);
    expect(html.indexOf('site-header')).toBeLessThan(html.indexOf('id="main"'));
  });

  it('页头色带：眉题和 h1 在 --accent-soft 色带里；眉题一行写章和步数，看得见的部分不进无障碍树，读屏文字单独放给页面脚本改写（design §4.1，v2.2 D4、D10）', async () => {
    const progress = { ...view.progress, index: 2, total: 5 };
    const html = await render({ view: { ...view, progress } }, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/<header class="band"[^>]*>[\s\S]*?<div class="band-inner"/);
    expect(html).toMatch(/<span aria-hidden="true"[^>]*data-route-eyebrow[^>]*>第 2 章 · 注册和订阅 · 第 2 步，共 5 步<\/span>/);
    expect(html).toMatch(/class="visually-hidden"[^>]*data-route-progress[^>]*>注册和订阅，第 2 步，共 5 步</);
    expect(html.indexOf('data-route-eyebrow')).toBeLessThan(html.indexOf('<h1'));
    // 正文区（色带和正文）里没有任何补零的编号字形（D10）：<symbol> 字形和 <use> 都留给首页索引和 404
    const main = /<main[\s\S]*<\/main>/.exec(html)?.[0] ?? '';
    expect(main).not.toContain('numeral');
    expect(main).not.toContain('data-route-mark');
    expect(html).not.toContain('data-route-total');
    // 页眉里也没有编号；整页唯一一份 <symbol> 是 BaseLayout 的 NumeralSprite
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

  it('小形象在页头色带里，对读屏隐藏（design §4.1，v2.2 D6）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    const band = /<header class="band"[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1];
    expect(band).toBeDefined();
    expect(band).toMatch(/<svg class="mascot" aria-hidden="true"/);
    expect(band!.match(/class="mascot"/g)).toHaveLength(1);
  });

  it('每页都有页脚的非官方声明（v2.2 D6）', async () => {
    const html = await render({}, { principle: '<p>原理正文</p>' });
    expect(html).toMatch(/<footer class="site-footer"[^>]*>\s*<p[^>]*>\s*<small[^>]*>本站是个人教程，与 Anthropic 无关。<\/small>\s*<\/p>/);
    expect(html.indexOf('site-footer')).toBeGreaterThan(html.indexOf('id="main"'));
  });

  it('章首页：色带里先写副标题、章名和一句话，再接眉题；眉题省掉章的部分（design §4.1，v2.2 D4）', async () => {
    // 副标题字形 00–04 由 scripts/build-logo.mjs 生成；测试里只核对其余部分，避免依赖生成物是否已提交
    const chapters: RouteData['chapters'] = [
      {
        id: 'start',
        title: '开始',
        intro: '所以手机也是 claude 会看到的一台设备。',
        items: [
          { kind: 'step', id: 'android-subscribe' },
          { kind: 'step', id: 'after-subscribe' },
        ],
      },
    ];
    const progress = { chapterId: 'start', chapter: '开始', chapterNo: 0, index: 1, total: 2 };
    const first = await render({ view: { ...view, progress }, routeData: { ...routeData, chapters } }, { principle: '<p>原理正文</p>' });
    const head = /<div class="chapter-head"[^>]*>([\s\S]*?)<\/div>\s*<p class="eyebrow"/.exec(first)?.[1];
    expect(head).toBeDefined();
    expect(head).toMatch(/<svg class="chapter-subtitle" aria-hidden="true"/);
    expect(head).toMatch(/class="chapter-title"[^>]*>开始<p|class="chapter-title"[^>]*>开始</);
    expect(head).toMatch(/class="chapter-intro"[^>]*>所以手机也是 claude 会看到的一台设备。</);
    expect(first).toMatch(/<header class="band" data-band="chapter"[^>]*>/);
    expect(first).toMatch(/data-route-eyebrow[^>]*>第 1 步，共 2 步</);
    // 不再有大号章节号
    expect(first).not.toContain('chapter-card-no');
    // 副标题和章名在眉题之前
    expect(/<div class="chapter-head"[\s\S]*class="eyebrow"/.test(first)).toBe(true);

    const later = { ...view, current: { kind: 'step', id: 'after-subscribe', title: '订阅之后' } as const, progress: { ...progress, index: 2 } };
    const html = await render({ view: later, routeData: { ...routeData, chapters } }, { principle: '<p>原理正文</p>' });
    expect(html).not.toMatch(/<div class="chapter-head"/);
    expect(html).not.toMatch(/data-band="chapter"/);
  });

  it('章节没写 intro 时色带里不输出一句话', async () => {
    const chapters: RouteData['chapters'] = [{ id: 'start', title: '开始', items: [{ kind: 'step', id: 'android-subscribe' }] }];
    const progress = { chapterId: 'start', chapter: '开始', chapterNo: 0, index: 1, total: 1 };
    const html = await render({ view: { ...view, progress }, routeData: { ...routeData, chapters } }, { principle: '<p>原理正文</p>' });
    expect(html).toContain('class="chapter-head"');
    expect(html).not.toContain('chapter-intro');
  });
});
