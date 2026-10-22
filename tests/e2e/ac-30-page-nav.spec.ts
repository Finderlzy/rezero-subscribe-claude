import { expect, test, type Page } from '@playwright/test';
import { chooseOption, expectScriptRan, stepNav } from './route-helpers';

// AC-30（FR-72、FR-15、FR-19）和 design §4.1、§4.6：正文末尾细线下是文字链接翻页，
// 左边“← 上一步”+ 标题、右边“下一步 →”+ 标题，可点区域 ≥44px；“跳过”是“下一步”下面的一行小字；
// v3 取消了 v2.2 的黑色主按钮和手机吸底底栏（design V11）。
async function openPanelStep(page: Page): Promise<void> {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案一');
  await page.goto('./plan1-panel/');
  await expectScriptRan(page);
}

test('AC-30：已选方案一，“四、打开面板”末尾是文字链接翻页，没有黑色主按钮，“跳过”在下一行', async ({ page }) => {
  await openPanelStep(page);

  const nav = stepNav(page);
  const prev = nav.getByRole('link', { name: /上一步.*三、把服务器变成节点/ });
  const next = nav.getByRole('link', { name: /下一步.*导入代理软件/ });
  await expect(prev).toHaveAttribute('href', /\/plan1-make-node\/$/);
  await expect(next).toHaveAttribute('href', /\/import-proxy\/$/);

  // 两块都是两行：13px 灰色方向文字 + 16px 600 主色标题；箭头是装饰
  await expect(prev.locator('.step-nav-dir')).toContainText('上一步');
  await expect(prev.locator('.step-nav-dir')).toContainText('←');
  await expect(next.locator('.step-nav-dir')).toContainText('下一步');
  await expect(next.locator('.step-nav-dir')).toContainText('→');
  await expect(prev.locator('.step-nav-title')).toHaveText('三、把服务器变成节点');
  await expect(next.locator('.step-nav-title')).toHaveText('导入代理软件');

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
  // 方向行是 13px --text-muted（design §4.1）
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

  // “跳过”在“下一步”下面一行，右对齐，可点区域 44px；点击结果同 AC-05
  const skip = page.locator('[data-route-skip] a');
  await expect(skip).toBeVisible();
  await expect(skip).toHaveText('跳过 →');
  await expect(skip).toHaveAttribute('href', /\/import-proxy\/$/);
  const nextBox = (await next.boundingBox())!;
  const skipBox = (await skip.boundingBox())!;
  // design §4.1：“跳过”在“下一步”下面 4px，右对齐（上一步折行也不会把它推远）
  expect(Math.abs(skipBox.y - (nextBox.y + nextBox.height) - 4)).toBeLessThanOrEqual(1);
  expect(Math.abs(skipBox.x + skipBox.width - (nextBox.x + nextBox.width))).toBeLessThanOrEqual(1);

  await skip.click();
  await expect(page).toHaveURL(/\/import-proxy\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('导入代理软件');
});

test('360：两个翻页链接和“跳过”的可点区域都 ≥44px，翻页在正文流里、不吸底', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) !== 360, '只在 360 宽下量');
  await openPanelStep(page);

  const nav = stepNav(page);
  const targets = [
    nav.getByRole('link', { name: /上一步.*三、把服务器变成节点/ }),
    nav.getByRole('link', { name: /下一步.*导入代理软件/ }),
    page.locator('[data-route-skip] a'),
  ];
  for (const target of targets) {
    const box = (await target.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  // v3 去掉了吸底底栏：翻页和跳过按普通文档流排在正文末尾，不是 fixed
  expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe('static');
  const fixed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-route-nav]')].some((el) => {
      const nav = el.closest('nav');
      return getComputedStyle(el).position === 'fixed' || (nav !== null && getComputedStyle(nav).position === 'fixed');
    }),
  );
  expect(fixed).toBe(false);
});

test('只有上一步时靠左；旁支页的“回到”和“下一步”各靠一侧（design §4.1）', async ({ page }) => {
  // 没选、也没有默认选项的选择页（选择手机系统）只有“上一步”：它靠左
  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  const chooseNav = stepNav(page);
  const onlyPrev = chooseNav.locator('[data-route-nav="prev"]');
  await expect(onlyPrev).toBeVisible();
  await expect(chooseNav.locator('[data-route-nav="next"]')).toBeHidden();
  const chooseBox = (await chooseNav.boundingBox())!;
  expect(Math.abs((await onlyPrev.boundingBox())!.x - chooseBox.x)).toBeLessThanOrEqual(1);

  // 旁支页：左边“回到”、右边“下一步”，各贴自己那一侧
  await page.goto('./google-appeal/');
  await expectScriptRan(page);
  const nav = stepNav(page);
  const back = nav.getByRole('link', { name: /回到.*先用两天/ });
  const next = nav.getByRole('link', { name: /下一步.*修改 Google 账号地区/ });
  const navBox = (await nav.boundingBox())!;
  const [backBox, nextBox] = [(await back.boundingBox())!, (await next.boundingBox())!];
  expect(Math.abs(backBox.x - navBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(nextBox.x + nextBox.width - (navBox.x + navBox.width))).toBeLessThanOrEqual(1);
});
