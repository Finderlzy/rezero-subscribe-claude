import { expect, test } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';

test.describe('首页冒烟', () => {
  test('大标题是 logo（内联 SVG，名称是站名），有英文副标题，title 含站名', async ({ page }) => {
    await page.goto('./');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveAccessibleName(SITE_NAME);
    await expect(heading.locator('svg')).toHaveCount(1);
    await expect(page.getByText('Re:Zero − Starting Life with Claude', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.title)).toContain(SITE_NAME);
  });

  test('“开始”进入前言；首页有按章的目录，没有“继续上次”', async ({ page }) => {
    await page.goto('./');
    const toc = page.getByRole('navigation', { name: '全站目录' });
    await expect(toc.locator('.toc-chapter-title')).toHaveText(['开始', '准备节点和住宅 IP', '注册和订阅', '结尾']);
    await expect(page.getByText('继续上次')).toHaveCount(0);

    await page.getByRole('link', { name: '开始', exact: true }).click();
    await expect(page).toHaveURL(/\/preface\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('前言');
  });

  test('页面底色跟随系统主题', async ({ page }) => {
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    expect(await bodyBg()).toBe('rgb(247, 245, 240)'); // #F7F5F0

    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await bodyBg()).toBe('rgb(23, 22, 20)'); // #171614
  });
});
