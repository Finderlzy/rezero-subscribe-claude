import { expect, test } from '@playwright/test';

// AC-19（FR-17、S5，静态部分）：没有本机进度时直接打开共享步骤“连上服务器”，它属于方案一和方案二，
// 默认方案一在其中，所以导航按方案一：上一步是“白嫖住宅 IP”。“选过方案二的浏览器”那一半由 #8 补上。
test('直接打开“连上服务器”：上一步是方案一的“白嫖住宅 IP”', async ({ page }) => {
  // Playwright 给每个用例一个新的浏览器上下文，相当于无痕窗口
  await page.goto('./ssh-connect/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('连上服务器');
  await expect(page.getByText('一、准备住宅 IP · 第 3 步，共 4 步', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步.*白嫖住宅 IP/ })).toHaveAttribute('href', /\/plan1-free-residential-ip\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*运行脚本/ })).toHaveAttribute('href', /\/run-script\/$/);
});
