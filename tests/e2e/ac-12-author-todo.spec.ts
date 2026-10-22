import { expect, test } from '@playwright/test';

// AC-12（FR-21）：重写稿里的 TODO 段落显示成醒目的“作者待补”提示，原文不改。
// 构建输出里的内容提示由 `npm run build` 人工核对（README 的验收记录）。
// 用户 2026-10-22 决定去掉视图切换、固定原理视图：操作视图下“只有原理版”的提示和“两版正文切换”的用例随功能移除，改成核对只显示原理版。
test('安卓：订阅：待补的 TODO 显示为“作者待补”提示', async ({ page }) => {
  await page.goto('./android-subscribe/');
  const todo = page.locator('.prose aside.author-todo');
  await expect(todo).toHaveCount(1);
  await expect(todo).toBeVisible();
  await expect(todo).toContainText('作者待补');
  await expect(todo).toContainText('安卓的订阅方法，等我走通了再补');
});

test('原理独有的整体思路和两版都有的页面：都只输出一份原理版正文，没有视图提示', async ({ page }) => {
  for (const path of ['./overview/', './leak-protection/']) {
    await page.goto(path);
    await expect(page.locator('.prose'), path).toHaveCount(1);
    await expect(page.locator('.prose'), path).toBeVisible();
    await expect(page.locator('[data-body]'), path).toHaveCount(0);
    await expect(page.getByText('这一页只有原理版。'), path).toHaveCount(0);
  }
});
