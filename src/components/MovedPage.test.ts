import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import type { MovedPage as MovedPageData } from '../lib/site';
import MovedPage from './MovedPage.astro';

// 跳转页（FR-25、ADR-0006、design §4.6）：有 JS 时立即 location.replace；没有 JS 时先看到说明和链接，
// meta refresh 5 秒后再自动前往。锚点固定原理版（架构 §13.12），由 site.ts 算好传进来。
const moved = (overrides: Partial<MovedPageData> = {}): MovedPageData => ({
  from: 'plan1-free-isp',
  to: 'choose-plan',
  toTitle: '选择方案',
  ...overrides,
});

async function render(data: MovedPageData) {
  const container = await AstroContainer.create();
  return container.renderToString(MovedPage, { props: { moved: data } });
}

describe('MovedPage 跳转页', () => {
  it('h1 写“这一页已经并入《…》”，链接和 meta refresh 都指向目标页，noindex 且不收录', async () => {
    const html = await render(moved());

    expect(html).toContain('这一页已经并入《选择方案》');
    expect(html).toContain('<a href="/choose-plan/">打开《选择方案》→</a>');
    expect(html).toContain('<meta name="robots" content="noindex">');
    // 没有 JS 时 5 秒后再走（AC-33 要求先看得到说明和链接），有 JS 时内联脚本立即 replace
    expect(html).toContain('<meta http-equiv="refresh" content="5; url=/choose-plan/">');
    expect(html).toContain('location.replace("/choose-plan/");');
    expect(html).not.toContain('toc-sidebar');
  });

  it('按分叉点的选择分流：正文、meta refresh 和链接用兜底去向，页面脚本按本机选择换目标', async () => {
    const html = await render(
      moved({
        to: 'choose-phone',
        toTitle: '选择手机系统',
        choice: {
          fork: 'phone',
          options: {
            iphone: { to: 'iphone-gmail', toTitle: 'iPhone：下载 Gmail', section: '第五步：下载 Gmail', anchor: '第五步下载-gmail' },
            android: { to: 'android-gmail', toTitle: '安卓：下载 Gmail' },
          },
        },
      }),
    );

    // 没有 JS、没选过或读不到本机选择时都看兜底去向
    expect(html).toContain('<a href="/choose-phone/">打开《选择手机系统》→</a>');
    expect(html).toContain('<meta http-equiv="refresh" content="5; url=/choose-phone/">');
    // 去向写成 JSON 交给 head 里的内联脚本（读 M4 的选择，src/lib/moved.ts）
    expect(html).toContain('type="application/json" id="moved-data"');
    expect(html).toContain('"fork":"phone"');
    expect(html).toContain('"/iphone-gmail/#第五步下载-gmail"');
    expect(html).toContain('"/android-gmail/"');
    expect(html).toContain('"fallback":"/choose-phone/"');
    expect(html).toContain("document.getElementById('moved-data')");
    // 有 choice 时不再写死一条 location.replace
    expect(html).not.toContain('location.replace("/choose-phone/");');
  });

  it('带小节时链接、meta refresh 和内联脚本都指向锚点，正文写出小节标题', async () => {
    const html = await render(moved({ to: 'plan1', toTitle: '方案一', section: '三、把服务器变成节点', anchor: '三把服务器变成节点' }));

    expect(html).toContain('href="/plan1/#三把服务器变成节点"');
    expect(html).toContain('content="5; url=/plan1/#三把服务器变成节点"');
    expect(html).toContain('location.replace("/plan1/#三把服务器变成节点");');
    expect(html).toContain('打开《方案一 › 三、把服务器变成节点》→');
    expect(html).toContain('正在跳转到《方案一》的“三、把服务器变成节点”');
  });
});
