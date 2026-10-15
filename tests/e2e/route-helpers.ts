import { expect, type Page } from '@playwright/test';

/** 页面脚本跑完后会给 `<main>` 加上 data-route-ready；只看链接无法区分“脚本改写过”和“构建时写好的”。 */
export const expectScriptRan = (page: Page) => expect(page.locator('main[data-route-ready]')).toHaveCount(1);

export const stepNav = (page: Page) => page.getByRole('navigation', { name: '上一步和下一步' });

/** 当前页的标识：`/<id>/` 里的 id */
export const pageId = (page: Page) => new URL(page.url()).pathname.split('/').at(-2)!;

/** 点当前可见正文里的站内链接，等新页面的脚本跑完 */
export async function clickBodyLink(page: Page, name: string): Promise<void> {
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await expectScriptRan(page);
}

/** 沿“下一步”走到 `until`（含），把经过的页面标识追加到 `seen`；每一页都等脚本跑完再点 */
export async function nextUntil(page: Page, until: string, seen: string[]): Promise<void> {
  for (let n = 0; pageId(page) !== until; n++) {
    expect(n, `沿“下一步”走不到 ${until}，停在 ${page.url()}`).toBeLessThan(40);
    await stepNav(page).getByRole('link', { name: /下一步/ }).click();
    await expectScriptRan(page);
    seen.push(pageId(page));
  }
}

/** 收集页面错误和 console.error */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}
