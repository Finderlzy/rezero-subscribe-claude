import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 打开步骤页、选择页、旁支页的目录并返回它（design §4.1、§4.5）。≥1100px 时目录是常驻侧栏，不用打开；
 * 更窄时点页眉的“目录”按钮打开抽屉。等目录脚本跑完（`data-toc-ready`）再返回。
 */
export async function openToc(page: Page): Promise<Locator> {
  const toc = page.getByRole('navigation', { name: '步骤目录' });
  await expect(page.locator('[data-toc-ready]')).toHaveCount(1);
  if (!(await toc.isVisible())) {
    await page.getByRole('button', { name: '目录', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '目录' })).toBeVisible();
  }
  await expect(toc).toBeVisible();
  return toc;
}
