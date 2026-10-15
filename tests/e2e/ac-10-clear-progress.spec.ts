import { expect, test } from '@playwright/test';
import { openToc } from './toc-helpers';

const KEY = 'rezero-subscribe-claude:v1';

// AC-10（FR-51）：在目录点“清除进度” → 首页不再显示“继续上次”；路线恢复为默认路线。
// 首页的“继续上次”由 #19 实现，这里同时断言本机状态已清空、目录回到默认路线。
test('在目录点“清除进度”，确认后清空本机进度，路线回到默认', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案三/ }).click();
  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
  await page.goto('./choose/desktop-proxy/');

  const toc = await openToc(page);
  await expect(toc.getByRole('link', { name: /已读：\s*购买住宅节点/ })).toHaveCount(1);

  // 取消时什么都不清
  page.once('dialog', (dialog) => dialog.dismiss());
  await toc.getByRole('button', { name: '清除进度' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).not.toBeNull();

  page.once('dialog', (dialog) => {
    expect(dialog.type()).toBe('confirm');
    void dialog.accept();
  });
  await toc.getByRole('button', { name: '清除进度' }).click();
  await expect(toc.getByRole('status')).toHaveText('已清除进度');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();

  // 目录和导航都回到默认路线（方案一）
  await expect(toc.getByRole('link', { name: /已读/ })).toHaveCount(0);
  await expect(toc.getByRole('link', { name: /购买住宅节点/ })).toHaveAccessibleName(/其他路线/);
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /上一步/ })).toHaveAttribute(
    'href',
    /\/run-script\/$/,
  );

  await page.goto('./');
  await expect(page.getByText(/继续上次/)).toHaveCount(0);
});
