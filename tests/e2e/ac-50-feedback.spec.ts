import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parseDocument } from 'yaml';
import { FEEDBACK_PATH } from '../../src/lib/feedback/index';
import { hasSidebar, tocButton } from './toc-helpers';

// AC-50（FR-118–FR-123）：读者反馈页 /feedback/ 和两处入口。首页五章简介和最近更新之间有“读者反馈”，
// 只放 feedback.yaml 里标了 featured 的截图，“查看全部 →”进 /feedback/；独立页按书写顺序放全部截图，
// 截图有 alt、按原尺寸显示不放大；侧边栏和抽屉底部有“读者反馈”，在这一页是当前态；不进搜索，进 sitemap。

const entries = parseDocument(readFileSync('src/content/feedback.yaml', 'utf8')).toJS() as {
  image: string;
  alt: string;
  featured?: boolean;
}[];
const featured = entries.filter((entry) => entry.featured === true);

test('首页的读者反馈只放精选，在五章简介和最近更新之间', async ({ page }) => {
  await page.goto('./');
  const section = page.locator('[data-home-feedback]');
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('读者反馈');
  const images = await section.locator('[data-feedback-shot]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-feedback-image')));
  expect(images).toEqual(featured.map((entry) => entry.image));
  await expect(section.locator('[data-home-feedback-more]')).toHaveAttribute('href', FEEDBACK_PATH);

  // 位置：五章简介 → 读者反馈 → 最近更新
  const order = await page.locator('main > section').evaluateAll((nodes) => nodes.map((node) => node.id || node.className));
  expect(order.indexOf('home-chapters')).toBeLessThan(order.indexOf('home-feedback'));
  expect(order.indexOf('home-feedback')).toBeLessThan(order.indexOf('home-updates'));
});

test('独立页按 feedback.yaml 的顺序放全部截图，每张有 alt、不放大', async ({ page }) => {
  await page.goto('./feedback/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('读者反馈');
  const shots = page.locator('[data-feedback-wall] [data-feedback-shot]');
  const images = await shots.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-feedback-image')));
  expect(images).toEqual(entries.map((entry) => entry.image));

  const imgs = page.locator('[data-feedback-wall] img');
  const alts = await imgs.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('alt')));
  expect(alts).toEqual(entries.map((entry) => entry.alt));

  // 显示宽度不超过截图本身的宽度（不放大发糊）；懒加载的图先滚进视口再量
  for (const img of await imgs.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty('complete', true);
    const { shown, natural } = await img.evaluate((node: HTMLImageElement) => ({ shown: node.clientWidth, natural: node.naturalWidth }));
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThanOrEqual(natural);
  }
});

test('1280px 打开 /plan1/：侧边栏底部有“读者反馈”', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 720, '侧边栏只在 ≥720px 常驻');
  await page.goto('./plan1/');
  const entry = page.locator('aside[data-toc-sidebar] .toc-sidebar-foot [data-toc-feedback]');
  await expect(entry).toBeInViewport();
  await expect(entry).toHaveAccessibleName('读者反馈');
  await expect(entry).toHaveAttribute('href', FEEDBACK_PATH);
  await expect(entry).not.toHaveAttribute('aria-current', 'page');
});

test('719px 打开抽屉：底部有“读者反馈”', async ({ page }) => {
  await page.setViewportSize({ width: 719, height: 800 });
  await page.goto('./plan1/');
  const drawer = page.getByRole('dialog', { name: '目录' });
  await tocButton(page).click();
  await expect(drawer.locator('[data-toc-feedback]')).toBeInViewport();
});

test('读者反馈页自己是底部入口的当前态，没有上一步/下一步', async ({ page }) => {
  await page.goto('./feedback/');
  if (hasSidebar(page)) {
    await expect(page.locator('aside[data-toc-sidebar] [data-toc-feedback]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('aside[data-toc-sidebar] [data-toc-agent-skill]')).not.toHaveAttribute('aria-current', 'page');
  } else {
    await tocButton(page).click();
    await expect(page.getByRole('dialog', { name: '目录' }).locator('[data-toc-feedback]')).toHaveAttribute('aria-current', 'page');
  }
  await expect(page.locator('nav.step-nav')).toHaveCount(0);
});

test('不进站内搜索，进 sitemap', async ({ request }) => {
  const index = (await (await request.get('./search-index.json')).json()) as { path: string }[];
  expect(index.filter((entry) => entry.path === FEEDBACK_PATH)).toEqual([]);

  const sitemap = await request.get('./sitemap-0.xml');
  expect(sitemap.status()).toBe(200);
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]!).pathname);
  expect(locs).toContain(FEEDBACK_PATH);
});

test('360px 首页和读者反馈页都没有页面级横向滚动', async ({ page }) => {
  test.skip(page.viewportSize()!.width > 360, '只在最窄宽度核对横向滚动');
  for (const path of ['./', './feedback/']) {
    await page.goto(path);
    const box = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(box.scrollWidth, path).toBeLessThanOrEqual(box.clientWidth);
  }
});
