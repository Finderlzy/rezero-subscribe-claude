import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 打开步骤目录并返回它（design §4.1、§4.5）。≥1100px 的步骤页、选择页上目录是常驻侧栏，不用打开；
 * 更窄时，或在常见问题页、找不到页上，点“目录”/“打开目录”按钮打开抽屉；完成页上的按钮叫“回到目录”，由 `button` 传入。
 */
export async function openToc(page: Page, button: string | RegExp = /^(打开)?目录$/): Promise<Locator> {
  const toc = page.getByRole('navigation', { name: '步骤目录' });
  await expect(page.locator('[data-toc-ready]')).toHaveCount(1);
  if (!(await toc.isVisible())) {
    await page.getByRole('button', { name: button }).click();
    await expect(page.getByRole('dialog', { name: '目录' })).toBeVisible();
  }
  await expect(toc).toBeVisible();
  return toc;
}
