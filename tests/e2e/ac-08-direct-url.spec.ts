import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-08（FR-17）：在新的浏览器上下文（相当于无痕窗口，没有本机选择）直接打开只属于 iPhone 的页面，
// 按它所属的选项计算导航，并把这个选项记进本机。
test('直接打开“iPhone：下载 Gmail”：上一步“iPhone：导入代理软件”，下一步“注册 Gmail”', async ({ page }) => {
  await page.goto('./iphone-gmail/');
  await expectScriptRan(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('iPhone：下载 Gmail');
  // 进度按 iPhone 这条路线计数（FR-10）：眉题写第 3 步、“共 15 步”，读屏读“注册和订阅，第 3 步，共 15 步”（design §4.1）
  await expect(page.locator('[data-route-eyebrow]')).toHaveText('第 2 章 · 注册和订阅 · 第 3 步，共 15 步');
  expect(await stepNo(page)).toBe('3');
  expect(await stepTotal(page)).toBe('共 15 步');
  await expect(page.locator('[data-route-progress]')).toHaveText('注册和订阅，第 3 步，共 15 步');
  await expect(stepNav(page).getByRole('link', { name: /上一步.*iPhone：导入代理软件/ })).toHaveAttribute('href', /\/iphone-proxy\/$/);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*注册 Gmail/ })).toHaveAttribute('href', /\/register-gmail\/$/);
});

test('打开过“iPhone：下载 Gmail”之后，汇合点和“订阅”都按 iPhone 计算（记住了这个选项）', async ({ page }) => {
  await page.goto('./iphone-gmail/');
  await expectScriptRan(page);

  await page.goto('./register-gmail/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*iPhone：下载 Gmail/ })).toHaveAttribute('href', /\/iphone-gmail\/$/);

  // 操作视图绕过原理独有的“为什么用美区 Apple ID”
  await page.goto('./subscribe/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*iPhone：注册美区 Apple ID/ })).toHaveAttribute(
    'href',
    /\/iphone-apple-id\/$/,
  );
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('构建时就按所属选项写好导航', async ({ page }) => {
    await page.goto('./iphone-gmail/');
    await expect(stepNav(page).getByRole('link', { name: /上一步.*iPhone：导入代理软件/ })).toHaveAttribute('href', /\/iphone-proxy\/$/);
    await expect(stepNav(page).getByRole('link', { name: /下一步.*注册 Gmail/ })).toHaveAttribute('href', /\/register-gmail\/$/);
    // 眉题构建时就写好并显示（不等页面脚本）
    await expect(page.locator('[data-route-eyebrow]')).toHaveText('第 2 章 · 注册和订阅 · 第 3 步，共 15 步');
    expect(await stepNo(page)).toBe('3');
  });
});
