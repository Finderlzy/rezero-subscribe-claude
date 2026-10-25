import { expect, test } from '@playwright/test';
import { builtPages } from './built-pages';
import { movedPagePaths } from './route-file';

/**
 * SEO（2026-10-25）：每个能被搜索引擎收录的页面都有摘要、规范网址、分享卡片和结构化数据；
 * 找不到页和跳转页保持 noindex、不写分享卡片。构建级用例（坏 seo.yaml 让构建失败）在
 * tests/build/ac-14-build-fail.test.ts，单元测试在 src/lib/seo/。
 *
 * 这里读的是构建产物：`npm run test:e2e` 先构建，给了 SITE_URL 才有 canonical 和 og:url（playwright.config.ts）。
 */

test.use({ storageState: { cookies: [], origins: [] } });

const MOVED = new Set(movedPagePaths());

test('收录的页面都有 description、canonical、og:image 和结构化数据', async ({ request }) => {
  const pages = builtPages().filter((path) => path !== '404.html' && !MOVED.has(path));
  expect(pages.length).toBeGreaterThan(15);
  for (const path of pages) {
    const response = await request.get(`./${path}`);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head, path).toContain('<meta name="description"');
    expect(head, path).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+">/);
    expect(head, path).toContain('property="og:image"');
    expect(head, path).toContain('/og-image.png');
    expect(head, path).toContain('name="twitter:card"');
    expect(head, path).toContain('application/ld+json');
    expect(head, path).not.toContain('name="robots"');
  }
});

test('首页是 WebSite，正文页是 Article 加面包屑', async ({ page }) => {
  await page.goto('./');
  const home = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(home.map((text) => JSON.parse(text))).toContainEqual(expect.objectContaining({ '@type': 'WebSite' }));

  await page.goto('./plan1/');
  const article = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = article.map((text) => JSON.parse(text));
  expect(parsed).toContainEqual(expect.objectContaining({ '@type': 'Article', url: expect.stringMatching(/\/plan1\/$/) }));
  const crumbs = parsed.find((data) => data['@type'] === 'BreadcrumbList');
  expect(crumbs.itemListElement.map((item: { name: string }) => item.name)).toEqual([
    'Re:从零开始订阅 claude',
    '准备节点和住宅 IP',
    '方案一：搭建专属住宅代理节点',
  ]);
  // 最后一层就是这一页自己的地址，不是别的页
  expect(crumbs.itemListElement.at(-1).item).toMatch(/\/plan1\/$/);
});

test('参考页的面包屑从日常维护经实测合集落到这一篇', async ({ page }) => {
  await page.goto('./ip-tests/lisahost/');
  const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) => JSON.parse(text));
  const crumbs = data.find((item) => item['@type'] === 'BreadcrumbList');
  expect(crumbs.itemListElement.map((item: { name: string }) => item.name)).toEqual([
    'Re:从零开始订阅 claude',
    '日常维护',
    'IP 质量实测合集',
    '实测：丽萨住宅服务器',
  ]);
});

test('找不到页和跳转页不上报，也不写分享卡片', async ({ request }) => {
  const notFound = await request.get('./404.html');
  const notFoundHead = (await notFound.text()).slice(0, 5000);
  expect(notFoundHead).toContain('name="robots" content="noindex"');
  expect(notFoundHead).not.toContain('property="og:title"');

  for (const path of ['disclaimer/', 'plan1-free-isp/', 'faq/']) {
    const response = await request.get(`./${path}`);
    const head = (await response.text()).slice(0, 5000);
    expect(head, path).toContain('name="robots" content="noindex"');
    expect(head, path).not.toContain('property="og:title"');
    expect(head, path).not.toContain('application/ld+json');
  }
});

test('分享图和 sitemap 都在线上产物里', async ({ request }) => {
  const image = await request.get('./og-image.png');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');
  const sitemap = await request.get('./sitemap-0.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]!).pathname);
  expect(locs.length).toBeGreaterThan(15);
  // 跳转页和 404 不进 sitemap
  for (const path of [...MOVED, '/404/']) expect(locs, path).not.toContain(path.startsWith('/') ? path : `/${path}`);
  expect(locs).toContain('/');
  expect(locs).toContain('/plan1/');
  // 每一条都写了 lastmod（谷歌据此安排重抓）
  expect(xml.match(/<lastmod>/g)?.length).toBe(locs.length);
  const robots = await (await request.get('./robots.txt')).text();
  expect(robots).toContain('Sitemap: ');
});
