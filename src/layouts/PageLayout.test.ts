import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import type { RouteView } from '../lib/route/types';
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

async function render(props: Record<string, unknown>, slots: Record<string, string>) {
  const container = await AstroContainer.create();
  return container.renderToString(PageLayout, { props: { title: '安卓：订阅', view, ...props }, slots });
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
});
