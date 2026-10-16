import { expect, test } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';

// AC-01（FR-18）：在新浏览器打开首页 → 看到 logo、站名、四章目录和“开始”，没有“继续上次”；点“开始” → 进入“前言”。
test('新浏览器打开首页：logo 和站名（英文副标题是 logo 的中间一行）、“开始”、四章目录，没有“继续上次”', async ({ page }) => {
  await page.goto('./');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveAccessibleName(SITE_NAME);
  await expect(heading.locator('svg')).toHaveCount(1);
  // design §4.4：英文副标题画在中文 logo 的中间一行里，页面上不再单独写一行文字
  await expect(heading.locator('svg')).toBeVisible();
  await expect(page.getByRole('link', { name: '开始', exact: true })).toBeVisible();
  await expect(page.getByText('继续上次')).toHaveCount(0);

  const toc = page.getByRole('navigation', { name: '全站目录' });
  // 章节号是固定字形（Numeral），读屏读“第 n 章”
  const chapterNos = toc.locator('.toc-chapter-no [role="img"]');
  await expect(chapterNos).toHaveCount(4);
  expect(await chapterNos.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))).toEqual([
    '第 0 章',
    '第 1 章',
    '第 2 章',
    '第 3 章',
  ]);
  await expect(toc.locator('.toc-chapter-title')).toHaveText(['开始', '准备节点和住宅 IP', '注册和订阅', '结尾']);
  // 结构同原理版目录页：分叉点下列各选项的页面，原理独有步骤标“原理”；首页没有视图，不弱化，也不标“其他路线”
  await expect(toc.locator('.toc-option-title')).toContainText(['方案一', '或：方案二', '或：方案三', 'iPhone', '或：安卓']);
  await expect(toc.getByRole('link', { name: /一、白嫖 ISP/ })).toBeVisible();
  await expect(toc.getByRole('link', { name: /小结：从服务器到代理软件/ })).toContainText('原理');
  await expect(toc.locator('[data-off-route]')).toHaveCount(0);
  await expect(toc.getByText('其他路线').filter({ visible: true })).toHaveCount(0);
  // 参考页在末尾单列
  const reference = toc.locator('.toc-reference');
  await expect(reference).toContainText('卡住了再看');
  await expect(reference.getByRole('link')).toHaveText(['常见问题', 'IP 质量实测合集']);
});

test('点“开始”进入前言', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: '开始', exact: true }).click();

  await expect(page).toHaveURL(/\/preface\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('前言');
});

test('首页目录的链接都能打开，参考页链接到参考页', async ({ page }) => {
  await page.goto('./');
  const toc = page.getByRole('navigation', { name: '全站目录' });
  await toc.getByRole('link', { name: 'IP 质量实测合集' }).click();
  await expect(page).toHaveURL(/\/ip-tests\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
});
