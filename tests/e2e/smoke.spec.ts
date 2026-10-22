import { expect, test } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';

test.describe('首页冒烟', () => {
  test('大标题是 logo（内联 SVG，名称是站名，英文副标题是 logo 的中间一行），title 含站名', async ({ page }) => {
    await page.goto('./');

    const heading = page.getByRole('heading', { level: 1 });
    // v3：中文 logo 的无障碍名称同时给出中文站名和英文副标题（design §4.4、V12）
    await expect(heading).toHaveAccessibleName(new RegExp(`^${SITE_NAME}.*Re:Zero − Starting Life with Claude`));
    await expect(heading.locator('svg')).toHaveCount(1);
    // design §4.4：英文副标题画在中文 logo 的中间一行里，页面上不再单独写一行文字
    await expect(heading.locator('svg')).toBeVisible();
    expect(await page.evaluate(() => document.title)).toContain(SITE_NAME);
  });

  test('“从第 00 章开始”进入前言；首页有五章简介，没有“继续上次”', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#home-chapters').getByRole('heading', { level: 2 })).toHaveText([
      '开始',
      '准备节点和住宅 IP',
      '注册和订阅',
      '结尾',
      '附录',
    ]);
    await expect(page.getByText('继续上次')).toHaveCount(0);

    await page.getByRole('link', { name: '从第 00 章开始' }).click();
    await expect(page).toHaveURL(/\/preface\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('前言');
  });

  test('页面底色跟随系统主题', async ({ page }) => {
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    expect(await bodyBg()).toBe('rgb(255, 255, 255)'); // #FFFFFF（v2.2 W1）

    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await bodyBg()).toBe('rgb(18, 18, 20)'); // #121214（v2.2 W1）
  });
});
