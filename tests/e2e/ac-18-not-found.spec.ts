import { expect, test } from '@playwright/test';

// AC-18（找不到页部分）：打开不存在的 URL，显示“找不到这一页”、回到首页和目录入口（目录直接写在页面上，不靠 JS）。
// 禁用本机存储的部分随导航改写脚本（#26）补上。
test('打开不存在的页面显示“找不到这一页”和目录，“回到首页”回到首页', async ({ page }) => {
  const response = await page.goto('./no-such-page/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到这一页');

  const toc = page.getByRole('navigation', { name: '全站目录' });
  await expect(toc.getByRole('link', { name: '前言' })).toHaveAttribute('href', /\/preface\/$/);
  await expect(toc.getByRole('link', { name: '选择方案' })).toHaveAttribute('href', /\/choose-plan\/$/);

  await expect(page.getByRole('link', { name: '打开目录' })).toHaveAttribute('href', '#not-found-toc');
  await page.getByRole('link', { name: '回到首页' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude');
});
