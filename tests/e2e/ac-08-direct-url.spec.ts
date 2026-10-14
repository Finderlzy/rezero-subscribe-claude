import { expect, test } from '@playwright/test';

// AC-08（FR-17，静态部分）：在新的浏览器上下文（相当于无痕窗口，没有本机进度）直接打开方案三步骤的 URL，
// 页面直接显示，构建时写好的上一步/下一步都在方案三路线内。按本机选择改写导航由 #8 补上。
test('直接打开“购买住宅节点”：上一步是选择页，下一步是“检查 IP 质量”', async ({ page }) => {
  // Playwright 给每个用例一个新的浏览器上下文，相当于无痕窗口
  await page.goto('./plan3-buy-node/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('购买住宅节点');
  await expect(page.getByText('一、准备住宅 IP · 第 1 步，共 1 步', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/choose\/node-plan\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*检查 IP 质量/ })).toHaveAttribute('href', /\/check-ip-quality\/$/);
});
