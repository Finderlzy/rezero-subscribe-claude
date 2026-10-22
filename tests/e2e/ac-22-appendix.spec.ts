import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav } from './route-helpers';
import { openToc } from './toc-helpers';

// AC-22（FR-11、FR-20）原本验收附录章：后记的“下一步”是附录，附录链到两个参考页。
// v3 不再收录附录（实施计划 §3.1）：后记是路线的最后一页，下一步回首页；
// 参考页只在“日常维护”章末尾列出，不进入上一步/下一步序列。

test('后记是最后一页：下一步是“回到首页”，上一步是日常维护', async ({ page }) => {
  await page.goto('./afterword/');
  await expectScriptRan(page);
  const home = stepNav(page).getByRole('link', { name: /下一步.*回到首页/ });
  await expect(home).toHaveAttribute('href', /^\/$/);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*日常维护/ })).toHaveAttribute('href', /\/maintenance\/$/);
  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: '从第 00 章开始' })).toBeVisible();
});

test('参考页列在“日常维护”章末尾，不在上一步/下一步序列里', async ({ page }) => {
  await page.goto('./maintenance/');
  await expectScriptRan(page);
  const toc = await openToc(page);
  const chapter = toc.locator('.toc-chapter').filter({ hasText: '日常维护' });
  const references = chapter.locator('ol.toc-reference a');
  await expect(references).toHaveText(['IP 质量实测合集']);
  await expect(references.first()).toHaveAttribute('href', /\/ip-tests\/$/);
  // 参考页本身没有上一步/下一步
  await page.goto('./ip-tests/');
  await expect(stepNav(page)).toHaveCount(0);
  await expect(page.locator('main[data-reference-ready]')).toHaveCount(1);
});
