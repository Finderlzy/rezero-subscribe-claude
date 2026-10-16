import { expect, test } from '@playwright/test';

// AC-18（找不到页部分）：打开不存在的 URL，显示“找不到这一页”、回到首页和目录入口（目录直接写在页面上，不靠 JS）。
// 大号 404 是固定字形（design §4.6、§3.2 D7）：转曲的 SVG，读屏名称是“404”，页面不加载字体。
// 禁用本机存储的部分随导航改写脚本（#26）补上。
test('打开不存在的页面显示“找不到这一页”和目录，“回到首页”回到首页', async ({ page }) => {
  const response = await page.goto('./no-such-page/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到这一页');

  const numeral = page.getByRole('main').getByRole('img', { name: '404', exact: true });
  await expect(numeral).toBeVisible();
  expect(await numeral.evaluate((el) => el.tagName.toLowerCase())).toBe('svg');
  // 三个 <use> 都指向页面里内联的字形，图形真的画出来了
  const refs = await numeral.locator('use').evaluateAll((uses) => uses.map((u) => u.getAttribute('href')));
  expect(refs).toEqual(['#numeral-4', '#numeral-0', '#numeral-4']);
  for (const id of new Set(refs)) await expect(page.locator(`symbol${id}`)).toHaveCount(1);
  // 外层高 1em = 数字高度 = --fs-display：桌面 96px、手机 64px（0 和 4 等高由 scripts/build-logo.test.ts 核对）
  const box = await numeral.boundingBox();
  expect(box?.height).toBe(page.viewportSize()!.width >= 1100 ? 96 : 64);

  const toc = page.getByRole('navigation', { name: '全站目录' });
  await expect(toc.getByRole('link', { name: '前言' })).toHaveAttribute('href', /\/preface\/$/);
  await expect(toc.getByRole('link', { name: '选择方案' })).toHaveAttribute('href', /\/choose-plan\/$/);

  await expect(page.getByRole('link', { name: '打开目录' })).toHaveAttribute('href', '#not-found-toc');
  await page.getByRole('link', { name: '回到首页' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude');
});
