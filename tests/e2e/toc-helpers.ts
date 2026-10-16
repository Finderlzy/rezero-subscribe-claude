import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 打开步骤页、选择页、旁支页的目录并返回它（design v2.1 §4.5）。所有宽度都是抽屉：点页眉的“目录”按钮打开。
 * 先等目录脚本跑完（`data-toc-ready`，“目录”这时已从链接换成按钮）。
 */
export async function openToc(page: Page): Promise<Locator> {
  const toc = page.getByRole('navigation', { name: '步骤目录' });
  await expect(page.locator('[data-toc-ready]')).toHaveCount(1);
  await page.getByRole('button', { name: '目录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '目录' })).toBeVisible();
  await expect(toc).toBeVisible();
  return toc;
}
