import { expect, test, type Page } from '@playwright/test';

// AC-18（禁用本机存储部分）：浏览器禁用本机存储时，页面脚本换用内存保存状态，导航按默认路线
// （加上当前页所属的选项）计算，视图切换照常生效，页面不报错。找不到页的部分见 ac-18-not-found.spec.ts。

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

/** 默认路线：沿“下一步”依次到达的 URL 路径（和 ac-02 相同）。 */
const DEFAULT_ROUTE = [
  '/before-you-start/',
  '/overview/',
  '/clean-claude-code/',
  '/choose/node-plan/',
  '/plan1-buy-vps/',
  '/plan1-free-residential-ip/',
  '/ssh-connect/',
  '/run-script/',
  '/choose/desktop-proxy/',
  '/v2rayn-import/',
  '/v2rayn-tun/',
  '/v2rayn-dns/',
  '/webrtc/',
  '/ipv6/',
  '/desktop-timezone/',
  '/check-ip-quality/',
  '/replace-ip-or-refund/',
  '/choose/phone/',
  '/iphone-app-store-austria/',
  '/iphone-v2box/',
  '/iphone-timezone/',
  '/iphone-gmail/',
  '/create-google-account/',
  '/google-appeal/',
  '/use-google-few-days/',
  '/google-region/',
  '/register-claude/',
  '/iphone-apple-id/',
  '/iphone-app-store-login/',
  '/iphone-download-claude/',
  '/iphone-buy-gift-card/',
  '/iphone-redeem-gift-card/',
  '/iphone-subscribe/',
  '/purchase-failed/',
  '/after-subscribe/',
  '/about-kyc/',
  '/done/',
];

/** 页面脚本跑完后会给 `<main>` 加上 data-route-ready；只看链接无法区分“脚本跑了”和“脚本没跑”。 */
const expectScriptRan = (page: Page) => expect(page.locator('main[data-route-ready]')).toHaveCount(1);

const escape = (path: string) => new RegExp(`${path.replace(/\//g, '\\/')}$`);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

for (const [name, disable] of DISABLERS) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(disable);
    });

    test('沿默认路线一直点“下一步”走到完成页，导航正常、不报错', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('./before-you-start/');
      const nav = page.getByRole('navigation', { name: '上一步和下一步' });

      for (const [index, path] of DEFAULT_ROUTE.entries()) {
        await expect(page).toHaveURL(escape(path));
        await page.waitForLoadState();
        if (path !== '/done/') await expectScriptRan(page);
        const following = DEFAULT_ROUTE[index + 1];
        if (!following) break;
        const next = nav.getByRole('link', { name: /下一步/ });
        await expect(next).toHaveAttribute('href', escape(following));
        await next.click();
      }

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('这条路线走完了');
      expect(errors).toEqual([]);
    });

    test('在选择页选方案三，进入方案三第一步，导航在方案三路线内', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('./choose/node-plan/');
      await expectScriptRan(page);
      await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案三/ }).click();

      await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
      await page.waitForLoadState();
      await expectScriptRan(page);
      const nav = page.getByRole('navigation', { name: '上一步和下一步' });
      await expect(nav.getByRole('link', { name: /下一步.*你用哪个电脑代理软件/ })).toHaveAttribute('href', /\/choose\/desktop-proxy\/$/);
      expect(errors).toEqual([]);
    });

    // FR-30：存储不可用时视图从操作视图开始，切换在本页内照常生效（只是不保存）。
    test('切换操作/原理视图照常生效、不报错', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto('./run-script/');
      await expectScriptRan(page);
      const why = page.locator('.prose .callout[data-callout="why"]');
      const toggle = page.getByRole('group', { name: '视图' });

      await expect(toggle.getByRole('button', { name: '操作' })).toHaveAttribute('aria-pressed', 'true');
      await expect(why).toBeHidden();
      await toggle.getByRole('button', { name: '原理' }).click();
      await expect(why).toBeVisible();
      await toggle.getByRole('button', { name: '操作' }).click();
      await expect(why).toBeHidden();
      expect(errors).toEqual([]);
    });
  });
}
