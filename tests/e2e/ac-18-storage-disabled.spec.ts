import { expect, test, type Page } from '@playwright/test';
import { clickBodyLink, collectErrors, expectScriptRan, nextUntil, pageId, stepNav } from './route-helpers';

// AC-18（禁用本机存储部分）：浏览器禁用本机存储时，在选择页选好后走完 AC-02 的一条路线，导航正常、不报错。
// 取消默认路线后，选择如果只存在内存里，换页就会忘掉：“订阅”的下一步会回到“选择手机系统”，形成绕圈（评审 V11）。
// M4 退到 window.name 保存选择和视图，同一标签页换页后仍记得。找不到页的部分见 ac-18-not-found.spec.ts。
// 选择页的选项块由 #29 实现；在那之前用正文里的链接进入分支，由页面脚本记下所属选项（FR-17），#29 完成后改成点选项块。

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

const toggle = (page: Page) => page.getByRole('group', { name: '视图' });

for (const [name, disable] of DISABLERS) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(disable);
    });

    test('选方案三、iPhone 后沿“下一步”走到后记，不在“订阅”绕圈', async ({ page }) => {
      const errors = collectErrors(page);
      const seen: string[] = ['preface'];
      await page.goto('./preface/');
      await expectScriptRan(page);

      await nextUntil(page, 'choose-plan', seen);
      await clickBodyLink(page, '方案三：直接买住宅节点');
      seen.push(pageId(page));
      await nextUntil(page, 'import-proxy', seen);
      // 换页后仍记得方案三：汇合点的上一步是方案三，不是选择页
      await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/plan3-residential-node\/$/);

      await nextUntil(page, 'choose-phone', seen);
      await clickBodyLink(page, 'iPhone：把 App Store 改到奥地利');
      seen.push(pageId(page));
      await nextUntil(page, 'afterword', seen);
      await expect(stepNav(page).getByRole('link', { name: /下一步.*回到首页/ })).toBeVisible();

      expect(seen).toEqual([
        'preface', 'disclaimer', 'clean-up', 'choose-plan',
        'plan3-residential-node', 'import-proxy', 'check-ip', 'leak-protection', 'timezone', 'choose-phone',
        'iphone-app-store-austria', 'iphone-proxy', 'iphone-gmail',
        'register-gmail', 'chrome-sign-in', 'use-two-days', 'google-region', 'register-claude', 'subscribe',
        'iphone-apple-id', 'iphone-app-store-login', 'iphone-gift-card', 'iphone-subscribe', 'iphone-purchase-failed',
        'after-subscribe', 'thanks', 'afterword',
      ]);
      expect(errors).toEqual([]);
    });

    test('切换视图照常生效，换页后仍是原理视图、不报错', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('./leak-protection/');
      await expectScriptRan(page);

      await expect(toggle(page).getByRole('button', { name: '操作' })).toHaveAttribute('aria-pressed', 'true');
      await toggle(page).getByRole('button', { name: '原理' }).click();
      await expect(page.locator('[data-body="principle"]')).toBeVisible();

      await stepNav(page).getByRole('link', { name: /下一步/ }).click();
      await expect(page).toHaveURL(/\/timezone\/$/);
      await expectScriptRan(page);
      await expect(toggle(page).getByRole('button', { name: '原理' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-body="principle"]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
