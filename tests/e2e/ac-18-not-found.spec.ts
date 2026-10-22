import { expect, test } from '@playwright/test';

// AC-18（找不到页部分，design v3 §4.6）：打开不存在的 URL → v3 顶栏和正文栏，显示“找不到这一页”、回到首页和目录入口
// （目录直接写在页面上，不靠 JS）。大号 404 是固定字形（转曲的 SVG，读屏名称是“404”，页面不加载字体），
// 固定字形只在找不到页内联（design v3 §3.2、§9）。禁用本机存储的部分见 ac-18-storage-disabled。
test('打开不存在的页面：v3 顶栏和正文栏、“找不到这一页”和目录，“回到首页”回到首页', async ({ page }) => {
  const response = await page.goto('./no-such-page/');

  expect(response?.status()).toBe(404);
  // 顶栏在，没有侧边栏；正文栏和步骤页一样宽（--content-width）并在页面里居中
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('aside.toc-sidebar')).toHaveCount(0);
  await expect(page.locator('[data-toc-dialog]')).toHaveCount(0);
  const column = await page.locator('main.page').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      center: rect.left + rect.width / 2,
      pageCenter: document.documentElement.clientWidth / 2,
      padTop: parseFloat(getComputedStyle(el).paddingTop),
    };
  });
  expect(column.width).toBeLessThanOrEqual(740 + 2 * 40 + 1);
  expect(column.center).toBeCloseTo(column.pageCenter, 0);
  expect(column.padTop).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到这一页');

  const numeral = page.getByRole('main').getByRole('img', { name: '404', exact: true });
  await expect(numeral).toBeVisible();
  expect(await numeral.evaluate((el) => el.tagName.toLowerCase())).toBe('svg');
  // 三个 <use> 都指向页面里内联的字形，图形真的画出来了
  const refs = await numeral.locator('use').evaluateAll((uses) => uses.map((u) => u.getAttribute('href')));
  expect(refs).toEqual(['#numeral-4', '#numeral-0', '#numeral-4']);
  for (const id of new Set(refs)) await expect(page.locator(`symbol${id}`)).toHaveCount(1);
  // 外层高 1em = 数字高度 = --fs-display：桌面 96px、平板 80px、手机 64px（0 和 4 等高由 scripts/build-logo.test.ts 核对）
  const box = await numeral.boundingBox();
  const width = page.viewportSize()!.width;
  expect(box?.height).toBe(width >= 960 ? 96 : width >= 720 ? 80 : 64);

  const toc = page.getByRole('navigation', { name: '全站目录' });
  await expect(toc.getByRole('link', { name: '前言' })).toHaveAttribute('href', /\/preface\/$/);
  // V10 的参考页只有 IP 质量实测合集
  await expect(toc.getByRole('link', { name: 'IP 质量实测合集' })).toHaveAttribute('href', /\/ip-tests\/$/);

  // “回到首页”是主按钮，“打开目录”是次按钮（design §4.7）
  await expect(page.getByRole('link', { name: '回到首页' })).toHaveClass(/\bbutton\b/);
  await expect(page.getByRole('link', { name: '打开目录' })).toHaveClass(/button-secondary/);
  await expect(page.getByRole('link', { name: '打开目录' })).toHaveAttribute('href', '#not-found-toc');
  await page.getByRole('link', { name: '回到首页' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude（Re:Zero − Starting Life with Claude）');
});

test('固定字形只在找不到页内联，其他页不带 NumeralSprite', async ({ page }) => {
  await page.goto('./maintenance/');
  await expect(page.locator('symbol[id^="numeral-"]')).toHaveCount(0);
  await page.goto('./no-such-page/');
  await expect(page.locator('symbol[id^="numeral-"]')).toHaveCount(10);
});
