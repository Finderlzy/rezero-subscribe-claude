import { expect, test } from '@playwright/test';

// AC-08（FR-17）：在新的浏览器上下文（相当于无痕窗口，没有本机选择）直接打开只属于 iPhone 的页面，
// 按它所属的选项计算导航。这里测构建时写好的导航（静态部分）；把选项写进本机由 #26 补上。
test('直接打开“iPhone：下载 Gmail”：上一步“iPhone：导入代理软件”，下一步“注册 Gmail”', async ({ page }) => {
  await page.goto('./iphone-gmail/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('iPhone：下载 Gmail');
  await expect(page.getByText('注册和订阅 · 第 3 步，共 15 步', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步.*iPhone：导入代理软件/ })).toHaveAttribute('href', /\/iphone-proxy\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*注册 Gmail/ })).toHaveAttribute('href', /\/register-gmail\/$/);
});
