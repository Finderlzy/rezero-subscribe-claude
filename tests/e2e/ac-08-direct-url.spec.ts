import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-08（FR-17）：在新的浏览器上下文（相当于无痕窗口，没有本机选择）直接打开只属于 iPhone 的页面，
// 按它所属的选项计算导航，并把这个选项记进本机。
// V10（实施计划 §3.1）：手机分支的第一步是 iphone-prepare（客户端配置与环境验证：iOS 端），
// 它的上一步是分叉点 client-desktop，下一步是 iphone-subscription（账号注册与订阅全流程：iOS 端）。
test('直接打开“客户端配置与环境验证：iOS 端”：上一步“客户端配置与环境验证：电脑端”，下一步“账号注册与订阅全流程：iOS 端”', async ({ page }) => {
  await page.goto('./iphone-prepare/');
  await expectScriptRan(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('客户端配置与环境验证：iOS 端');
  // 进度按 iPhone 这条路线、本章从第 1 步数起（FR-10）：眉题写第 1 步、“共 2 步”，
  // 读屏读“客户端配置与订阅，第 1 步，共 2 步”（design §4.1）
  await expect(page.locator('[data-route-eyebrow]')).toHaveText('第 2 章 · 客户端配置与订阅 · 第 1 步，共 2 步');
  expect(await stepNo(page)).toBe('1');
  expect(await stepTotal(page)).toBe('共 2 步');
  await expect(page.locator('[data-route-progress]')).toHaveText('客户端配置与订阅，第 1 步，共 2 步');
  await expect(stepNav(page).getByRole('link', { name: /上一步.*客户端配置与环境验证：电脑端/ })).toHaveAttribute(
    'href',
    /\/client-desktop\/$/,
  );
  await expect(stepNav(page).getByRole('link', { name: /下一步.*账号注册与订阅全流程：iOS 端/ })).toHaveAttribute(
    'href',
    /\/iphone-subscription\/$/,
  );
});

test('打开过 iPhone 的准备页之后，汇合点“日常维护”的上一步按 iPhone 计算（记住了这个选项）', async ({ page }) => {
  await page.goto('./iphone-prepare/');
  await expectScriptRan(page);

  // 分叉点 client-desktop 的下一步是这个选项的第一步（FR-12、FR-13）
  await page.goto('./client-desktop/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*客户端配置与环境验证：iOS 端/ })).toHaveAttribute(
    'href',
    /\/iphone-prepare\/$/,
  );

  // 手机分支的汇合点是下一章的第一页“日常维护”（V10）：上一步是 iPhone 分支的最后一步
  await page.goto('./maintenance/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*账号注册与订阅全流程：iOS 端/ })).toHaveAttribute(
    'href',
    /\/iphone-subscription\/$/,
  );
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('构建时就按所属选项写好导航', async ({ page }) => {
    await page.goto('./iphone-prepare/');
    await expect(stepNav(page).getByRole('link', { name: /上一步.*客户端配置与环境验证：电脑端/ })).toHaveAttribute(
      'href',
      /\/client-desktop\/$/,
    );
    await expect(stepNav(page).getByRole('link', { name: /下一步.*账号注册与订阅全流程：iOS 端/ })).toHaveAttribute(
      'href',
      /\/iphone-subscription\/$/,
    );
    // 眉题构建时就写好并显示（不等页面脚本）
    await expect(page.locator('[data-route-eyebrow]')).toHaveText('第 2 章 · 客户端配置与订阅 · 第 1 步，共 2 步');
    expect(await stepNo(page)).toBe('1');
  });
});
