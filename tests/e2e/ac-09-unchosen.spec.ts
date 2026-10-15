import { expect, test } from '@playwright/test';

// AC-09（FR-12、FR-13）：没有默认路线。在无痕窗口（新的浏览器上下文）打开汇合点和“订阅”，
// 没选的分叉点处指向它的选择页；选择页没选时没有“下一步”，也没有“默认”字样。这里测构建时写好的导航。
const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: '上一步和下一步' });

test('导入代理软件：上一步是“选择方案”，进度只有章节', async ({ page }) => {
  await page.goto('./import-proxy/');
  await expect(nav(page).getByRole('link', { name: /上一步.*选择方案/ })).toHaveAttribute('href', /\/choose-plan\/$/);
  await expect(page.locator('[data-route-progress]')).toHaveText('准备节点和住宅 IP');
});

test('注册 Gmail：上一步是“选择手机系统”', async ({ page }) => {
  await page.goto('./register-gmail/');
  await expect(nav(page).getByRole('link', { name: /上一步.*选择手机系统/ })).toHaveAttribute('href', /\/choose-phone\/$/);
});

test('订阅：下一步是“选择手机系统”', async ({ page }) => {
  await page.goto('./subscribe/');
  await expect(nav(page).getByRole('link', { name: /下一步.*选择手机系统/ })).toHaveAttribute('href', /\/choose-phone\/$/);
});

test('选择页没选时没有“下一步”，没有“默认”字样', async ({ page }) => {
  for (const choose of ['choose-plan', 'choose-phone']) {
    await page.goto(`./${choose}/`);
    await expect(nav(page).getByRole('link', { name: /上一步/ })).toBeVisible();
    await expect(nav(page).getByRole('link', { name: /下一步/ })).toHaveCount(0);
    await expect(page.getByRole('main').getByText('默认')).toHaveCount(0);
  }
});
