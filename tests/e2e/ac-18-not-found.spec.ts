import { expect, test } from '@playwright/test';

// AC-18（找不到页部分）：打开不存在的步骤 URL，显示“找不到这一步”和回首页的入口。
// “打开目录”见 fr-20-faq-toc.spec.ts；禁用本机存储的部分见 ac-18-storage-disabled.spec.ts。
test('打开不存在的步骤显示“找不到这一步”', async ({ page }) => {
  const response = await page.goto('./no-such-step/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到这一步');

  await page.getByRole('link', { name: '回首页' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Re:从零开始订阅 claude');
});
