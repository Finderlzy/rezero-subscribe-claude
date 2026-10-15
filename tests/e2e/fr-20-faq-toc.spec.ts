import { expect, test } from '@playwright/test';
import { openToc } from './toc-helpers';

// FR-20：直接打开常见问题时提供目录入口；找不到页（AC-18）同样有“打开目录”。
for (const path of ['./faq/open-panel/', './faq/', './no-such-step/']) {
  test(`直接打开 ${path} 能打开目录并进入步骤`, async ({ page }) => {
    await page.goto(path);
    const toc = await openToc(page);
    // 没有当前页，按默认路线
    await expect(toc.locator('a[aria-current]')).toHaveCount(0);
    await expect(toc.getByRole('link', { name: /购买住宅节点/ })).toHaveAccessibleName(/其他路线/);

    await toc.getByRole('link', { name: '开始之前' }).click();
    await expect(page).toHaveURL(/\/before-you-start\/$/);
  });
}
