import { expect, test } from '@playwright/test';
import { chooseOption, collectErrors, expectScriptRan, nextUntil, pageId, stepNav } from './route-helpers';

// AC-18（禁用本机存储部分）：浏览器禁用本机存储时，在选择页选好后走完 AC-02 的一条路线，导航正常、不报错。
// 取消默认路线后，选择如果只存在内存里，换页就会忘掉：“客户端配置与订阅”的下一步会回到“选择手机系统”，形成绕圈（评审 V11）。
// M4 退到 window.name 保存选择和视图，同一标签页换页后仍记得。找不到页的部分见 ac-18-not-found.spec.ts。
// 在选择页点选项块进入分支：点击时先写下选择（选项块，FR-12），换页后要靠 window.name 记住。
// V10（作者新稿）的 11 页只有两个分叉点：节点方案（方案一/方案二）和手机系统（iPhone/安卓），
// 下面按方案一 + iPhone 走一遍，核对两个汇合点的上一步都不会掉回选择页。

/** 两种“禁用”：访问 localStorage 本身就抛异常（Safari 禁用网站数据等），或读写时抛异常。 */
const DISABLERS: [string, () => void][] = [
  [
    '访问 localStorage 就抛异常',
    () => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    },
  ],
  [
    '读写 localStorage 时抛异常',
    () => {
      for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
        Storage.prototype[method] = () => {
          throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        };
      }
    },
  ],
];

for (const [name, disable] of DISABLERS) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(disable);
    });

    test('选方案一、iPhone 后沿“下一步”经日常维护走到后记，不在分支绕圈', async ({ page }) => {
      const errors = collectErrors(page);
      const seen: string[] = ['preface'];
      await page.goto('./preface/');
      await expectScriptRan(page);

      await nextUntil(page, 'overview', seen);
      await chooseOption(page, '方案一');
      seen.push(pageId(page));
      await nextUntil(page, 'client-desktop', seen);
      // 换页后仍记得方案一：节点章汇合点的上一步是方案一，不是选择页
      await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/plan1\/$/);

      await chooseOption(page, 'iPhone / iPad');
      seen.push(pageId(page));
      await nextUntil(page, 'maintenance', seen);
      // 手机章汇合点（日常维护）的上一步是所选 iOS 分支的最后一步
      await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/iphone-subscription\/$/);

      await nextUntil(page, 'afterword', seen);
      await expect(stepNav(page).getByRole('link', { name: /下一步.*回到首页/ })).toBeVisible();

      expect(seen).toEqual([
        'preface', 'overview', 'plan1', 'client-desktop',
        'iphone-prepare', 'iphone-subscription', 'maintenance', 'afterword',
      ]);
      expect(errors).toEqual([]);
    });

    // 原来是“切换视图照常生效”；用户 2026-10-22 决定去掉视图切换、固定原理视图，改成核对换页后仍是原理视图、不报错
    test('换页后仍是原理视图、不报错', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('./iphone-prepare/');
      await expectScriptRan(page);
      await expect(page.locator('html')).toHaveAttribute('data-view', 'principle');

      await stepNav(page).getByRole('link', { name: /下一步/ }).click();
      await expect(page).toHaveURL(/\/iphone-subscription\/$/);
      await expectScriptRan(page);
      await expect(page.locator('html')).toHaveAttribute('data-view', 'principle');
      await expect(page.locator('.prose')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
