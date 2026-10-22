import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import type { OutlineChapter, OutlineStep } from '../lib/route/types';
import TocNav from './TocNav.astro';

// 目录的侧边栏/抽屉（design v3 §4.5，AC-27）：章是可开合的 <details>，只展开当前页所在的章；
// 当前页下面列出它正文的 h2；参考页高亮上级并展开“日常维护”章（实施计划 §3.1）。
// 首页/找不到页用不折叠的变体；两种变体都不写“第 n 章”（作者 2026-10-22，V10）。
const step = (id: string, title: string, current = false): OutlineStep => ({
  kind: 'step',
  id,
  title,
  skippable: false,
  principleOnly: false,
  onRoute: true,
  current,
});
const outline = (current = 'plan1'): OutlineChapter[] => [
  { id: 'start', title: '开始', items: [step('preface', '前言', current === 'preface')] },
  { id: 'node-and-ip', title: '准备节点和住宅 IP', items: [step('plan1', '方案一：搭建专属住宅代理节点', current === 'plan1')] },
  { id: 'maintenance', title: '日常维护', items: [step('maintenance', '日常维护、风控应对与常见故障', current === 'maintenance')] },
];
const references = [{ id: 'ip-tests', title: 'IP 质量实测合集' }];
const referencesChapter = 'maintenance';
const sections = [
  { slug: '一-购买服务器', text: '一、购买服务器' },
  { slug: '二-购买-isp-代理', text: '二、购买 ISP 代理' },
];

async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(TocNav, { props: { outline: outline(), references, referencesChapter, collapsible: true, ...props } });
}

describe('TocNav 侧边栏', () => {
  it('每章一个 <details>，只展开当前页所在的章；摘要只写章名，不写“第 n 章”', async () => {
    const html = await render({});
    expect(html.match(/<details class="toc-chapter-details"/g)).toHaveLength(3);
    expect(html.match(/<details class="toc-chapter-details" open/g)).toHaveLength(1);
    expect(html).toMatch(/<details class="toc-chapter-details" open>\s*<summary class="toc-chapter-head"[^>]*>\s*<span class="toc-chapter-title"[^>]*>准备节点和住宅 IP<\/span>/);
    expect(html).not.toMatch(/toc-chapter-no/);
  });

  it('当前页下面列出它正文的 h2，链接用正文锚点；其他页不留小节列表', async () => {
    const html = await render({ sections });
    expect(html.match(/class="toc-sections"/g)).toHaveLength(1);
    expect(html).toMatch(/<a href="#一-购买服务器"><span class="toc-label">一、购买服务器<\/span><\/a>/);
    // 小节列表挂在前言（不是当前页）之后不应出现：结构上是“导入代理软件”的 li 里的 <ol>
    const current = /<li class="toc-step" data-toc-step="plan1"[\s\S]*?<\/li>/.exec(html)?.[0] ?? '';
    expect(current).toContain('class="toc-sections"');
    const preface = /<li class="toc-step" data-toc-step="preface"[\s\S]*?<\/li>/.exec(html)?.[0] ?? '';
    expect(preface).not.toContain('class="toc-sections"');
  });

  it('没有 h2 的页面不输出小节列表', async () => {
    const html = await render({});
    expect(html).not.toContain('class="toc-sections"');
  });

  it('参考页：展开“日常维护”章、高亮当前参考页，并在它下面列出小节', async () => {
    const html = await render({ outline: outline(''), currentReference: 'ip-tests', sections });
    const maintenance = /<details class="toc-chapter-details" open>[\s\S]*?日常维护[\s\S]*?<\/details>/.exec(html)?.[0] ?? '';
    expect(maintenance).toMatch(/<a href="[^"]*\/ip-tests\/" aria-current="page">/);
    // 小节必须挂在“IP 质量实测合集”这一项自己的 <li> 里
    expect(maintenance).toMatch(/<li class="toc-step">\s*<a href="[^"]*\/ip-tests\/" aria-current="page">[\s\S]*?<\/a>\s*<ol class="toc-sections">/);
    // 没有 h2 的子页不传 sections：高亮上级，但没有小节列表
    const child = await render({ outline: outline(''), currentReference: 'ip-tests' });
    expect(child).toContain('aria-current="page"');
    expect(child).not.toContain('class="toc-sections"');
  });

  it('共享步骤在两个选项下各一份，小节只挂在当前的那一份', async () => {
    const sharedOutline: OutlineChapter[] = [
      {
        id: 'node',
        title: '准备节点和住宅 IP',
        items: [
          {
            kind: 'branch',
            fork: 'node-plan',
            options: [
              { id: 'plan-1', title: '方案一', selected: true, steps: [step('shared', '共享步骤', true)] },
              { id: 'plan-2', title: '方案二', selected: false, steps: [step('shared', '共享步骤')] },
            ],
          },
        ],
      },
    ];
    const html = await render({ outline: sharedOutline, sections });
    expect(html.match(/class="toc-sections"/g)).toHaveLength(1);
    // 用户 2026-10-24：两个选项都显示，选中的展开、没选中的收起
    expect(html.match(/<details class="toc-option-details"/g)).toHaveLength(2);
    expect(html).toMatch(/<details class="toc-option-details" data-toc-option="plan-1" open>/);
    expect(html).toMatch(/<details class="toc-option-details" data-toc-option="plan-2">/);
    expect(html).not.toContain('toc-route-switch');
  });

  it('找不到页的目录不折叠，章名同样不写“第 n 章”', async () => {
    const html = await render({ collapsible: false });
    expect(html).not.toContain('<details');
    expect(html).not.toMatch(/toc-chapter-no|第 \d+ 章/);
  });

});
