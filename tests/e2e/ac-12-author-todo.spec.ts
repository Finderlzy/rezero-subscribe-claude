import { expect, test } from '@playwright/test';

// AC-12（FR-21）：重写稿里的 TODO 段落显示成醒目的“作者待补”提示，原文不改；
// 只有原理版的页面在操作视图下说明一句。构建输出里的内容提示由 `npm run build` 人工核对（README 的验收记录）。
test('安卓：订阅：待补的 TODO 显示为“作者待补”提示', async ({ page }) => {
  await page.goto('./android-subscribe/');
  const todo = page.locator('[data-body="operation"] aside.author-todo');
  await expect(todo).toHaveCount(1);
  await expect(todo).toBeVisible();
  await expect(todo).toContainText('作者待补');
  await expect(todo).toContainText('安卓的订阅方法，等我走通了再补');
});

test('原理独有的整体思路：操作视图下显示原理版正文，并提示“这一页只有原理版”', async ({ page }) => {
  await page.goto('./overview/');
  await expect(page.getByText('这一页只有原理版。', { exact: true })).toBeVisible();
  await expect(page.locator('.prose').filter({ visible: true })).toHaveCount(1);
  await expect(page.locator('[data-body]')).toHaveCount(0);
});

test('两版都有的页面只显示操作版，原理版在 HTML 里但隐藏（ADR-0004）', async ({ page }) => {
  await page.goto('./leak-protection/');
  await expect(page.locator('[data-body="operation"]')).toBeVisible();
  await expect(page.locator('[data-body="principle"]')).toBeHidden();
  await expect(page.getByText('这一页只有原理版。')).toHaveCount(0);

  await page.evaluate(() => (document.documentElement.dataset.view = 'principle'));
  await expect(page.locator('[data-body="principle"]')).toBeVisible();
  await expect(page.locator('[data-body="operation"]')).toBeHidden();
});
