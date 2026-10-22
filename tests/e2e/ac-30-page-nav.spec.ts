import { expect, test, type Page } from '@playwright/test';
import { chooseOption, expectScriptRan, stepNav } from './route-helpers';

// AC-30（FR-72、FR-15、FR-19）和 design §4.1、§4.6：正文末尾细线下是文字链接翻页，
// 左边“← 上一步”+ 标题、右边“下一步 →”+ 标题，可点区域 ≥44px；
// v3 取消了 v2.2 的黑色主按钮和手机吸底底栏（design V11）。
// v3 新稿没有可跳过的页面（“打开面板”并进方案一的 h2），所以不再有“跳过”小字链接。

/** 从整体思路的卡片进入方案一，停在方案一页 */
async function openPlanOne(page: Page): Promise<void> {
  await page.goto('./overview/');
  await expectScriptRan(page);
  await chooseOption(page, '方案一');
  await expect(page).toHaveURL(/\/plan1\/$/);
  await expectScriptRan(page);
}

test('AC-30：方案一末尾是文字链接翻页，没有黑色主按钮，也没有“跳过”', async ({ page }) => {
  await openPlanOne(page);

  const nav = stepNav(page);
  const prev = nav.getByRole('link', { name: /上一步.*整体思路与方案选型/ });
  const next = nav.getByRole('link', { name: /下一步.*客户端配置与环境验证：电脑端/ });
  await expect(prev).toHaveAttribute('href', /\/overview\/$/);
  await expect(next).toHaveAttribute('href', /\/client-desktop\/$/);

  // 两块都是两行：13px 灰色方向文字 + 16px 600 主色标题；箭头是装饰
  await expect(prev.locator('.step-nav-dir')).toContainText('上一步');
  await expect(prev.locator('.step-nav-dir')).toContainText('←');
  await expect(next.locator('.step-nav-dir')).toContainText('下一步');
  await expect(next.locator('.step-nav-dir')).toContainText('→');
  await expect(prev.locator('.step-nav-title')).toHaveText('整体思路与方案选型');
  await expect(next.locator('.step-nav-title')).toHaveText('客户端配置与环境验证：电脑端');

  // 不是主按钮：没有 .button，链接底色透明，标题是 --accent 的 600 文字
  await expect(page.locator('.step-nav .button')).toHaveCount(0);
  expect(await next.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  const accent = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(next.locator('.step-nav-title')).toHaveCSS('color', accent);
  await expect(next.locator('.step-nav-title')).toHaveCSS('font-weight', '600');
  const muted = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--text-muted)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(next.locator('.step-nav-dir')).toHaveCSS('color', muted);
  await expect(next.locator('.step-nav-dir')).toHaveCSS('font-size', '13px');
  // 悬停只变色、不加下划线（用户 2026-10-24）
  await next.hover();
  await expect(next.locator('.step-nav-title')).toHaveCSS('text-decoration-line', 'none');
  await expect(next.locator('.step-nav-dir')).toHaveCSS('color', accent);

  // v3 没有可跳过页面：跳过链接不显示（FR-15 在当前内容下没有适用页）
  await expect(page.locator('[data-route-skip] a')).toBeHidden();

  await next.click();
  await expect(page).toHaveURL(/\/client-desktop\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('客户端配置与环境验证：电脑端');
});

test('360：两个翻页链接的可点区域都 ≥44px，翻页在正文流里、不吸底', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) !== 360, '只在 360 宽下量');
  await openPlanOne(page);

  const nav = stepNav(page);
  const targets = [
    nav.getByRole('link', { name: /上一步.*整体思路与方案选型/ }),
    nav.getByRole('link', { name: /下一步.*客户端配置与环境验证：电脑端/ }),
  ];
  for (const target of targets) {
    const box = (await target.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  // v3 去掉了吸底底栏：翻页按普通文档流排在正文末尾，不是 fixed
  expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe('static');
  const fixed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-route-nav]')].some((el) => {
      const nav = el.closest('nav');
      return getComputedStyle(el).position === 'fixed' || (nav !== null && getComputedStyle(nav).position === 'fixed');
    }),
  );
  expect(fixed).toBe(false);
});

test('没选手机系统时电脑端只有“上一步”，靠左（选择页的导航规则）', async ({ page }) => {
  await page.goto('./client-desktop/');
  await expectScriptRan(page);
  const chooseNav = stepNav(page);
  const onlyPrev = chooseNav.locator('[data-route-nav="prev"]');
  await expect(onlyPrev).toBeVisible();
  await expect(chooseNav.locator('[data-route-nav="next"]')).toBeHidden();
  const chooseBox = (await chooseNav.boundingBox())!;
  expect(Math.abs((await onlyPrev.boundingBox())!.x - chooseBox.x)).toBeLessThanOrEqual(1);
});
