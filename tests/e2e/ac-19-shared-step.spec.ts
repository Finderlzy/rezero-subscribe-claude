import { expect, test } from '@playwright/test';

// AC-19（FR-17、S5）：共享步骤“连上服务器”属于方案一和方案二。没有本机进度时按默认的方案一，
// 上一步是“白嫖住宅 IP”；在选过方案二的浏览器里，上一步是“买住宅 IP 服务器并测 IP”。
test('直接打开“连上服务器”：上一步是方案一的“白嫖住宅 IP”', async ({ page }) => {
  // Playwright 给每个用例一个新的浏览器上下文，相当于无痕窗口
  await page.goto('./ssh-connect/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('连上服务器');
  await expect(page.getByText('一、准备住宅 IP · 第 3 步，共 4 步', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步.*白嫖住宅 IP/ })).toHaveAttribute('href', /\/plan1-free-residential-ip\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*运行脚本/ })).toHaveAttribute('href', /\/run-script\/$/);
});

test('选过方案二的浏览器打开“连上服务器”：上一步是“买住宅 IP 服务器并测 IP”', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案二/ }).click();
  await expect(page).toHaveURL(/\/plan2-buy-residential-vps\/$/);

  await page.goto('./ssh-connect/');
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步.*买住宅 IP 服务器并测 IP/ })).toHaveAttribute(
    'href',
    /\/plan2-buy-residential-vps\/$/,
  );
  await expect(nav.getByRole('link', { name: /下一步.*运行脚本/ })).toHaveAttribute('href', /\/run-script\/$/);
  // 进度按方案二计数
  await expect(page.getByText('一、准备住宅 IP · 第 2 步，共 3 步', { exact: true })).toBeVisible();
});
