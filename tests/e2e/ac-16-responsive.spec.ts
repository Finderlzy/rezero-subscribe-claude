import { expect, test, type Page } from '@playwright/test';
import { builtPages } from './built-pages';

// AC-16（NFR-01）：在 360px 宽和 1280px 宽下逐章浏览 → 没有页面级横向滚动，导航按钮都能点到。
// 两种宽度由 playwright.config.ts 的两个 project 提供；页面清单取自构建产物（built-pages.ts），每个步骤都在内。
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

// 平板档（design §3.2、§3.3，三档断点 <720 / 720–1099 / ≥1100）：playwright.config.ts 只有 360 和 1280 两个项目，
// 这里单独设 768 宽（架构 §11.4 W-8）。正文 18px、h1 30px，逐页没有页面级横向滚动。
test.describe('768 宽（平板）', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('步骤页和参考页：正文 18px、h1 30px、左右边距 32px', async ({ page }) => {
    for (const path of ['leak-protection/', 'faq/']) {
      await page.goto(`./${path}`);
      const size = (selector: string) =>
        page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontSize);
      expect(await size('.prose p'), path).toBe('18px');
      expect(await size('h1'), path).toBe('30px');
      // 平板左右边距 32px（design §3.3）
      const gutter = await page.locator('main').evaluate((el) => getComputedStyle(el).paddingLeft);
      expect(gutter, path).toBe('32px');
    }
  });

  test('逐页没有页面级横向滚动', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(`./${path}`, { waitUntil: 'load' });
      await expectNoPageScroll(page, `/${path}`);
    }
  });
});
