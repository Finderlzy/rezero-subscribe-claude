import { expect, type Page } from '@playwright/test';

/** 页面脚本跑完后会给 `<main>` 加上 data-route-ready；只看链接无法区分“脚本改写过”和“构建时写好的”。 */
export const expectScriptRan = (page: Page) => expect(page.locator('main[data-route-ready]')).toHaveCount(1);

export const stepNav = (page: Page) => page.getByRole('navigation', { name: '上一步和下一步' });

/** 当前页的标识：`/<id>/` 里的 id */
export const pageId = (page: Page) => new URL(page.url()).pathname.split('/').at(-2)!;

/** 当前可见正文里标题含 `title` 的选项块（选择页，FR-12） */
export const optionBlock = (page: Page, title: string) =>
  page
    .locator('.prose')
    .filter({ visible: true })
    .locator('.option-block', { has: page.locator('.option-title', { hasText: title }) });

/**
 * 在选择页点选项块的空白处（左上角的内边距），进入这个选项的第一步，等新页面的脚本跑完。
 * 空白处由块内第一个链接的伪元素撑满（design §4.2），点中的就是那个链接。
 */
export async function chooseOption(page: Page, title: string): Promise<void> {
  const from = page.url();
  await optionBlock(page, title).click({ position: { x: 6, y: 6 } });
  await expect(page).not.toHaveURL(from);
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
