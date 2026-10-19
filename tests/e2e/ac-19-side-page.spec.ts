import { expect, test } from '@playwright/test';
import { clickBodyLink, expectScriptRan, nextUntil, pageId, stepLabel, stepNav, stepNo } from './route-helpers';

// AC-19（FR-19）：在“先用两天”点“被封了：申诉解封” → 页脚有“回到：先用两天”和“下一步：修改 Google 账号地区”；
// 沿“先用两天”的“下一步”走 → 不经过申诉页。不运行 JS 的版本在 ac-02-static-walk。
test('从“先用两天”进入旁支页，页脚是“回到：先用两天”和“下一步：修改 Google 账号地区”', async ({ page }) => {
  await page.goto('./use-two-days/');
  await expectScriptRan(page);
  await clickBodyLink(page, '被封了：申诉解封');

  const nav = stepNav(page);
  await expect(nav.getByRole('link', { name: /回到.*先用两天/ })).toHaveAttribute('href', /\/use-two-days\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*修改 Google 账号地区/ })).toHaveAttribute('href', /\/google-region\/$/);
  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveCount(0);
  // 旁支页不计步数：眉题写“第 n 章 · <章名> · 旁支”（design §4.6、v2.2 W2 第 1 条）
  expect(await stepLabel(page)).toBe('旁支');
  expect(await stepNo(page)).toBeNull();
  await expect(page.locator('[data-route-progress]')).toHaveText('注册和订阅 · 旁支');

  await nav.getByRole('link', { name: /回到.*先用两天/ }).click();
  await expectScriptRan(page);
  expect(pageId(page)).toBe('use-two-days');
});

for (const view of ['operation', 'principle'] as const) {
  test(`${view === 'operation' ? '操作' : '原理'}视图：沿“先用两天”的“下一步”走，不经过申诉页`, async ({ page }) => {
    await page.goto('./use-two-days/');
    await expectScriptRan(page);
    if (view === 'principle') await page.getByRole('group', { name: '视图' }).getByRole('button', { name: '原理' }).click();
    const seen: string[] = [];
    await nextUntil(page, 'google-region', seen);
    expect(seen).toEqual(['google-region']);
  });
}
