import { expect, test, type Page } from '@playwright/test';
import { builtPages } from './built-pages';

// AC-16（NFR-01）：在 360px、768px 和 1280px 宽下逐章浏览 → 没有页面级横向滚动，导航按钮都能点到。
// 三种宽度（360、768、1280）由 playwright.config.ts 的三个 project 提供；页面清单取自构建产物（built-pages.ts），每个步骤都在内。
// 宽表格和代码块允许在各自区域内横向滚动，不算页面级。

const PAGES = builtPages();

/** 每页都要能点到的导航控件（只取当前可见的）：页眉的首页链接、目录按钮和视图切换，底部导航，页面上的按钮。 */
const NAV_CONTROLS = [
  '.site-header a',
  '.site-header button',
  'nav[aria-label="上一步和下一步"] a',
  '[data-route-skip] a',
  '.page-actions a',
].join(', ');

async function expectNoPageScroll(page: Page, label: string) {
  // 和 clientWidth（不含竖向滚动条）比：有常驻滚动条的浏览器里，几像素的溢出也能量出来
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${label}：页面宽 ${scrollWidth}px，可视宽 ${clientWidth}px`).toBeLessThanOrEqual(clientWidth);
}

async function expectControlsClickable(page: Page) {
  const controls = page.locator(NAV_CONTROLS).filter({ visible: true });
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    // trial：只做可点性检查（可见、稳定、没被吸顶/吸底的栏挡住），不真的点
    await controls.nth(i).click({ trial: true });
  }
}

for (const path of PAGES) {
  test(`/${path} 没有页面级横向滚动，导航按钮都能点到`, async ({ page }) => {
    await page.goto(`./${path}`, { waitUntil: 'load' });
    await expectNoPageScroll(page, '操作视图');
    await expectControlsClickable(page);

    // 两版正文都在页面里（ADR-0004）：切到原理版再量一次。切换控件由 #26 接上，这里直接改 data-view
    if ((await page.locator('[data-body="principle"]').count()) > 0) {
      await page.evaluate(() => (document.documentElement.dataset.view = 'principle'));
      await expect(page.locator('[data-body="principle"]')).toBeVisible();
      await expectNoPageScroll(page, '原理视图');
      await expectControlsClickable(page);
    }
  });
}

// 三档断点（design §3.2、§3.3：<720 / 720–1099 / ≥1100）的字号和边距，三个宽度各由一个 project 提供
const TIERS = [
  { min: 1100, body: '18px', h1: '32px', gutter: '32px' },
  { min: 720, body: '18px', h1: '30px', gutter: '32px' },
  { min: 0, body: '17px', h1: '26px', gutter: '16px' },
];

test('步骤页和参考页：正文、h1 字号和左右边距按当前档位', async ({ page }) => {
  const width = page.viewportSize()!.width;
  const tier = TIERS.find((t) => width >= t.min)!;
  for (const path of ['leak-protection/', 'faq/']) {
    await page.goto(`./${path}`);
    const size = (selector: string) =>
      page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(await size('.prose p'), path).toBe(tier.body);
    expect(await size('h1'), path).toBe(tier.h1);
    const gutter = await page.locator('main').evaluate((el) => getComputedStyle(el).paddingLeft);
    expect(gutter, path).toBe(tier.gutter);
  }
});

// 宽表格（design §4.7）：表头不折行，窄屏上整张表在自己的容器里横向滚动，第一列粘性固定
test('实测合集的表格：表头不折行、第一列粘性固定', async ({ page }) => {
  await page.goto('./ip-tests/');
  const table = page.locator('.prose table').first();
  const header = await table.locator('th').evaluateAll((cells) =>
    cells.map((th) => ({
      text: th.textContent!.trim(),
      height: th.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(th).lineHeight),
    })),
  );
  for (const th of header) expect(th.height, th.text).toBeLessThan(th.lineHeight * 2);

  // 放不下时表格自己横向滚动；滚动后第一列的单元格仍贴着表格容器的左缘
  const scrolled = await table.evaluate((el) => {
    if (el.scrollWidth <= el.clientWidth) return null;
    el.scrollLeft = 80;
    const left = el.getBoundingClientRect().left + el.clientLeft;
    return [...el.querySelectorAll('tr > :first-child')].map((cell) => cell.getBoundingClientRect().left - left);
  });
  if ((page.viewportSize()?.width ?? 0) < 720) expect(scrolled, '360 宽时表格应该在容器里横向滚动').not.toBeNull();
  if (scrolled) for (const offset of scrolled) expect(offset).toBeCloseTo(0, 0);
});
