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

  it('带小节时链接、meta refresh 和内联脚本都指向锚点，正文写出小节标题', async () => {
    const html = await render(moved({ to: 'plan1', toTitle: '方案一', section: '三、把服务器变成节点', anchor: '三把服务器变成节点' }));

    expect(html).toContain('href="/plan1/#三把服务器变成节点"');
    expect(html).toContain('content="5; url=/plan1/#三把服务器变成节点"');
    expect(html).toContain('location.replace("/plan1/#三把服务器变成节点");');
    expect(html).toContain('打开《方案一 › 三、把服务器变成节点》→');
    expect(html).toContain('正在跳转到《方案一》的“三、把服务器变成节点”');
  });
});
