import { expect, test, type Page } from '@playwright/test';

// AC-18（禁用本机存储部分）：浏览器禁用本机存储时，页面脚本换用内存保存状态，导航按默认路线
// （加上当前页所属的选项）计算，页面不报错。找不到页的部分见 ac-18-not-found.spec.ts。

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
  '/choose/node-plan/',
  '/plan1-buy-vps/',
  '/plan1-free-residential-ip/',
  '/ssh-connect/',
  '/run-script/',
  '/check-ip-quality/',
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
      await expect(nav.getByRole('link', { name: /下一步.*检查 IP 质量/ })).toHaveAttribute('href', /\/check-ip-quality\/$/);
      expect(errors).toEqual([]);
    });
  });
}
