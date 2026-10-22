import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan } from './route-helpers';

// AC-10（选择页部分，FR-12、Never）：两个选择页在选之前和选之后，都没有任何“默认”字样。
// 用户 2026-10-22 决定去掉视图切换、固定原理视图，不再逐个视图核对。
// 目录和首页没有已读标记、“继续上次”“清除进度”见 ac-10-no-progress。
//
// V10：选择页换成 overview（节点方案）和 client-desktop（手机系统）。新稿正文里“默认”是正常用词
// （client-desktop.md 讲到默认的节点和“其余保持默认”），所以“没有默认”只核对正文以外的界面文案
// （页面外壳、目录、上下步导航）和选项卡片——选择控件仍然不许把某个选项写成“默认”。
for (const [choose, option] of [
  ['overview', '方案一'],
  ['client-desktop', '安卓'],
] as const) {
  test(`${choose}：选前选后都没有“默认”`, async ({ page }) => {
    const noDefault = async () => {
      const outsideProse = await page.evaluate(() => {
        const body = document.body.cloneNode(true) as HTMLElement;
        for (const prose of body.querySelectorAll('.prose')) prose.remove();
        return body.textContent ?? '';
      });
      expect(outsideProse).not.toContain('默认');
      for (const block of await page.locator('.option-block').all()) await expect(block).not.toContainText('默认');
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
