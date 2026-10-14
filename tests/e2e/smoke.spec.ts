import { expect, test } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';

test.describe('首页冒烟', () => {
  test('显示站名大标题和英文副标题，title 含站名', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(SITE_NAME);
    await expect(page.getByText('Re:Zero − Starting Life with Claude', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.title)).toContain(SITE_NAME);
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
