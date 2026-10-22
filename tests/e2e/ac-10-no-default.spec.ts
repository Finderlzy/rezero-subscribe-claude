import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan } from './route-helpers';

// AC-10（选择页部分，FR-12、Never）：两个选择页在选之前和选之后，都没有任何“默认”字样。
// 用户 2026-10-22 决定去掉视图切换、固定原理视图，不再逐个视图核对。
// 目录和首页没有已读标记、“继续上次”“清除进度”见 ac-10-no-progress。

for (const [choose, option] of [
  ['choose-plan', '方案三'],
  ['choose-phone', '安卓'],
] as const) {
  test(`${choose}：选前选后都没有“默认”`, async ({ page }) => {
    const noDefault = async () => {
      await expect(page.locator('body')).not.toContainText('默认');
    };
    await page.goto(`./${choose}/`);
    await expectScriptRan(page);
    await expect(page.locator('.option-block').filter({ visible: true })).not.toHaveCount(0);
    await noDefault();

    await chooseOption(page, option);
    await page.goto(`./${choose}/`);
    await expectScriptRan(page);
    await expect(page.locator('.option-block[aria-current="true"]').filter({ visible: true })).toHaveCount(1);
    await noDefault();
  });
}
