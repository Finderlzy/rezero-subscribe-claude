import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ChoiceCards from './ChoiceCards.astro';

// 选择页的选项卡片（FR-12、design §4.2、V10）：由 frontmatter 的 options 生成，挂在正文末尾；
// 每张卡片是 section.option-block[data-option]，整块可点（链接带 data-option-start），
// 路线图的 default 标“推荐”；本机选过的选项由 route-enhance 标 aria-current 和“已选”。
const OPTIONS = [
  { id: 'plan-1', title: '方案一' },
  { id: 'plan-2', title: '方案二' },
];
const STARTS = {
  'plan-1': { id: 'plan1', title: '方案一：搭建专属住宅代理节点' },
  'plan-2': { id: 'plan2-residential-server', title: '方案二：配置住宅 IP 服务器' },
};

async function render(props: Record<string, unknown> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(ChoiceCards, { props: { pageId: 'overview', options: OPTIONS, starts: STARTS, ...props } });
}

describe('ChoiceCards', () => {
  it('每个选项一张卡片，顺序同 frontmatter；链接指向这个选项的第一步', async () => {
    const html = await render();
    expect(html.match(/class="option-block"/g)).toHaveLength(2);
    expect(html.indexOf('方案一')).toBeLessThan(html.indexOf('方案二'));
    expect(html).toMatch(/<a href="\/plan1\/" data-option-start>方案一<\/a>/);
    expect(html).toMatch(/<a href="\/plan2-residential-server\/" data-option-start>方案二<\/a>/);
    expect(html).toContain('从《方案一：搭建专属住宅代理节点》开始');
    expect(html).toContain('从《方案二：配置住宅 IP 服务器》开始');
  });

  it('路线图的默认选项标“推荐”并带 data-recommended；其他选项不标', async () => {
    const html = await render({ recommended: 'plan-2' });
    const blocks = html.match(/<section class="option-block"[^>]*>/g) ?? [];
    expect(blocks[0]).not.toContain('data-recommended');
    expect(blocks[1]).toContain('data-recommended');
    expect(html).toContain('<span class="option-tag">推荐</span>');
    expect(html.match(/option-tag/g)).toHaveLength(1);
  });

  it('没有默认选项时不标“推荐”（手机系统）', async () => {
    const html = await render({
      pageId: 'client-desktop',
      options: [
        { id: 'iphone', title: 'iPhone / iPad' },
        { id: 'android', title: '安卓' },
      ],
      starts: { iphone: { id: 'iphone-prepare', title: '客户端配置与环境验证：iOS 端' }, android: { id: 'android-prepare', title: '客户端配置与环境验证：安卓端' } },
    });
    expect(html).not.toContain('推荐');
    expect(html).toContain('data-option-page="client-desktop"');
  });

  it('选项没有第一步时（路线图不会出现）不输出空链接', async () => {
    const html = await render({ starts: { 'plan-1': null, 'plan-2': STARTS['plan-2'] } });
    expect(html).toContain('方案二');
    expect(html).not.toContain('>方案一</a>');
  });
});
