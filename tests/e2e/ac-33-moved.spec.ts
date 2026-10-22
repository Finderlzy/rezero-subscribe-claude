import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { movedPages } from './route-file';

/**
 * AC-33（FR-25、ADR-0006）：每个被合并掉或删掉的旧网址仍然是一个页面，打开后跳到目标页并停在对应小节；
 * 禁用 JS 时先看到“这一页已经并入《…》”和链接（meta refresh 5 秒后才走）。
 * 跳转页不进目录、搜索和 sitemap：搜索索引在 dev 产物里就能查；sitemap 只在给了 SITE_URL 时生成，
 * 产物断言在 tests/build/ac-33-moved-dist.test.ts。
 *
 * 现在 `moved:` 只有 plan1-free-isp 一条（没有小节）；带小节落到合并页的用例等 V11 合出合并页后补。
 * 锚点规则（section → 原理版 h2 的 slug）由 src/lib/site.test.ts、src/components/MovedPage.test.ts
 * 和 tests/build/ac-33-moved-dist.test.ts 的 `moved-with-section` 夹具覆盖。
 */
const entries = movedPages();
const hashOf = (url: URL) => decodeURIComponent(url.hash);

test('route.yaml 的 moved: 非空（空了会让下面的用例悄悄消失）', () => {
  expect(entries.length).toBeGreaterThan(0);
});

test.describe('打开旧网址', () => {
  for (const { from, to, section } of entries) {
    test(`${from} → ${to}${section === undefined ? '' : `（${section}）`}`, async ({ page }) => {
      // 每个 Playwright 测试都有独立的浏览器上下文，等于无痕窗口：没有本机选择、没有阅读记录
      await page.goto(`./${from}/`);

      await expect(page).toHaveURL((url) => url.pathname.endsWith(`/${to}/`) && (section === undefined ? url.hash === '' : hashOf(url) !== ''));
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('这一页已经并入');
      await expect(page.locator('main[data-route-ready]')).toHaveCount(1);

      if (section === undefined) {
        expect(await page.evaluate(() => window.scrollY), '没有 section 时跳到页顶').toBeLessThan(80);
      } else {
        const heading = page.getByRole('heading', { level: 2, name: section });
        await expect(heading).toBeVisible();
        await expect.poll(async () => (await heading.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(160);
      }
    });
  }
});

test.describe('禁用 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('先看到“这一页已经并入”和链接，点链接到目标页', async ({ page }) => {
    expect(entries.length).toBeGreaterThan(0);
    for (const { from, to, section } of entries) {
      await page.goto(`./${from}/`);

      // h1 只认格式：不在测试里再查一遍目标页的标题（多一次请求会和 5 秒的 meta refresh 抢时间）
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^这一页已经并入《.+》$/);
      // 没有 JS 时不靠脚本：meta refresh 是延迟的，读者先看得到说明和链接（AC-33）
      await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(1);
      const link = page.locator('main.page a').first();
      const href = await link.getAttribute('href');
      expect(href?.startsWith(`/${to}/`)).toBe(true);
      if (section !== undefined) expect(href).toContain('#');

      await link.click();
      await expect(page).toHaveURL((url) => url.pathname.endsWith(`/${to}/`));
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('这一页已经并入');
    }
  });
});

test('跳转页不进目录和搜索索引', async ({ page }) => {
  expect(entries.length).toBeGreaterThan(0);
  const dist = test.info().project.metadata.dist as string;
  for (const { from, to } of entries) {
    await page.goto(`./${to}/`);
    expect(await page.locator(`a[href*="/${from}/"]`).count(), '目录和正文里没有旧网址').toBe(0);

    const index = readFileSync(join(dist, 'search-index.json'), 'utf8');
    expect(index).not.toContain(from);
  }
});
