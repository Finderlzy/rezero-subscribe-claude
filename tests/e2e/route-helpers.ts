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

/** 沿“下一步”走到 `until`（含），把经过的页面标识追加到 `seen`；每一页都等脚本跑完再点，跑完后调用 `onPage` */
export async function nextUntil(page: Page, until: string, seen: string[], onPage?: () => Promise<void>): Promise<void> {
  for (let n = 0; pageId(page) !== until; n++) {
    expect(n, `沿“下一步”走不到 ${until}，停在 ${page.url()}`).toBeLessThan(40);
    await stepNav(page).getByRole('link', { name: /下一步/ }).click();
    await expectScriptRan(page);
    seen.push(pageId(page));
    await onPage?.();
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

/**
 * 页头色带里看得见的眉题原文（design §4.1，v2.2 D4、D10），例如
 * “第 1 章 · 准备节点和住宅 IP · 第 2 步，共 9 步”；选择页“… · 选择”，章首页只有“第 1 步，共 10 步”。
 */
export const eyebrow = (page: Page) => page.locator('[data-route-eyebrow]').textContent();

/** 眉题里写出的第几步；数不清、选择页、旁支页为 null */
export const stepNo = (page: Page) => eyebrow(page).then((text) => /第 (\d+) 步，共 \d+ 步/.exec(text ?? '')?.[1] ?? null);

/** 眉题里写出的“共 m 步”整句；没有时为 null */
export const stepTotal = (page: Page) => eyebrow(page).then((text) => /共 \d+ 步/.exec(text ?? '')?.[0] ?? null);

/** 眉题末尾的方向词：选择页“选择”、旁支页“旁支”；普通页为 null */
export const stepLabel = (page: Page) => eyebrow(page).then((text) => /(?:^|· )(选择|旁支)$/.exec(text ?? '')?.[1] ?? null);
