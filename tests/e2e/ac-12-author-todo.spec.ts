import { expect, test } from '@playwright/test';

// AC-12（FR-21）：重写稿里的 TODO 段落显示成醒目的“作者待补”提示，原文不改。
// 唯一带 TODO 的 ip-tests/qsu-residential 已在 2026-11-04 下架，现在站上没有待补处；
// TODO 渲染成“作者待补”由 src/lib/content/remark-obsidian.page.test.ts 的单元测试覆盖，样式由 AC-26 核对。
// 构建输出里的内容提示由 `npm run build` 人工核对（README 的验收记录）。
// 用户 2026-10-22 决定去掉视图切换、固定原理视图；V10 起正文本身只有一版，这里核对只显示这一版。
test('新稿的页面都只输出一份正文，没有视图提示、没有多余的“作者待补”', async ({ page }) => {
  for (const path of ['./overview/', './client-desktop/', './ip-tests/']) {
    await page.goto(path);
    await expect(page.locator('.prose'), path).toHaveCount(1);
    await expect(page.locator('.prose'), path).toBeVisible();
    await expect(page.locator('[data-body]'), path).toHaveCount(0);
    await expect(page.getByText('这一页只有原理版。'), path).toHaveCount(0);
    await expect(page.locator('.prose aside.author-todo'), path).toHaveCount(0);
  }
});
