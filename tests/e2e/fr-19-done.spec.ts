import { expect, test } from '@playwright/test';
import { openToc } from './toc-helpers';

// FR-19（design §4.6）：完成页提供“重新开始”“回到目录”“清除进度”。清除进度见 ac-10-clear-progress.spec.ts。
test.describe('FR-19 完成页的操作', () => {
  test('“回到目录”打开目录抽屉，能从目录回到某一步', async ({ page }) => {
    await page.goto('./done/');
    const toc = await openToc(page, '回到目录');
    await toc.getByRole('link', { name: /整体思路/ }).click();
    await expect(page).toHaveURL(/\/overview\/$/);
  });

  test('“重新开始”进入“开始之前”', async ({ page }) => {
    await page.goto('./done/');
    await page.getByRole('link', { name: '重新开始' }).click();
    await expect(page).toHaveURL(/\/before-you-start\/$/);
  });
});

test.describe('禁用 JS 时的完成页', () => {
  test.use({ javaScriptEnabled: false });

  test('只有“重新开始”，不显示要靠脚本的按钮', async ({ page }) => {
    await page.goto('./done/');
    await expect(page.getByRole('link', { name: '重新开始' })).toBeVisible();
    await expect(page.getByRole('button', { name: '回到目录' })).toBeHidden();
    await expect(page.getByRole('button', { name: '清除进度' })).toBeHidden();
  });
});
