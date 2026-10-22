import { expect, test } from '@playwright/test';

// AC-12（FR-21）：重写稿里的 TODO 段落显示成醒目的“作者待补”提示，原文不改。
// V10（作者新稿）只剩 ip-tests/qsu-residential 有 1 处 TODO；旧稿的 android-subscribe 等页面已经删除，
// 不再检查那些旧 TODO 文案。构建输出里的内容提示由 `npm run build` 人工核对（README 的验收记录）。
// 用户 2026-10-22 决定去掉视图切换、固定原理视图；V10 起正文本身只有一版，这里核对只显示这一版。
test('ip-tests/qsu-residential：待补的 TODO 显示为“作者待补”提示', async ({ page }) => {
  await page.goto('./ip-tests/qsu-residential/');
  const todo = page.locator('.prose aside.author-todo');
  await expect(todo).toHaveCount(1);
  await expect(todo).toBeVisible();
  await expect(todo).toContainText('作者待补');
  await expect(todo).toContainText('TODO：有实测结果后补上。');
});

test('新稿的页面都只输出一份正文，没有视图提示、没有多余的“作者待补”', async ({ page }) => {
  for (const path of ['./overview/', './client-desktop/']) {
    await page.goto(path);
    await expect(page.locator('.prose'), path).toHaveCount(1);
    await expect(page.locator('.prose'), path).toBeVisible();
    await expect(page.locator('[data-body]'), path).toHaveCount(0);
    await expect(page.getByText('这一页只有原理版。'), path).toHaveCount(0);
    await expect(page.locator('.prose aside.author-todo'), path).toHaveCount(0);
  }
});
