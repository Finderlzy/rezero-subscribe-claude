import { expect, test, type Page } from '@playwright/test';
import { expectScriptRan, stepNav } from './route-helpers';

// AC-06（FR-30、FR-31，ADR-0004）：在“防泄漏”切到原理视图 → 整页换成原理版正文，URL 不变、回到顶部；
// 点“下一步” → “改时区”仍是原理视图；切回操作视图 → 显示操作版正文。
const toggle = (page: Page) => page.getByRole('group', { name: '视图' });
const body = (page: Page, view: 'principle' | 'operation') => page.locator(`[data-body="${view}"]`);

test('切到原理视图换整页正文、回到顶部，下一步仍是原理视图，切回操作视图后显示操作版', async ({ page }) => {
  await page.goto('./leak-protection/');
  await expectScriptRan(page);
  const url = page.url();
  const operation = toggle(page).getByRole('button', { name: '操作' });
  const principle = toggle(page).getByRole('button', { name: '原理' });

  // 默认是操作视图
  await expect(operation).toHaveAttribute('aria-pressed', 'true');
  await expect(body(page, 'operation')).toBeVisible();
  await expect(body(page, 'principle')).toBeHidden();

  // 先滚到页面下方，再用 DOM 的 click 切换（Playwright 的点击会先把按钮滚进视口，就测不出“回到顶部”）
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await principle.evaluate((button: HTMLButtonElement) => {
    button.focus({ preventScroll: true });
    button.click();
  });

  await expect(principle).toHaveAttribute('aria-pressed', 'true');
  await expect(operation).toHaveAttribute('aria-pressed', 'false');
  await expect(body(page, 'principle')).toBeVisible();
  await expect(body(page, 'operation')).toBeHidden();
  expect(page.url()).toBe(url);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(principle).toBeFocused();

  await stepNav(page).getByRole('link', { name: /下一步.*改时区/ }).click();
  await expect(page).toHaveURL(/\/timezone\/$/);
  await expect(toggle(page).getByRole('button', { name: '原理' })).toHaveAttribute('aria-pressed', 'true');
  await expect(body(page, 'principle')).toBeVisible();
  await expect(body(page, 'operation')).toBeHidden();

  await toggle(page).getByRole('button', { name: '操作' }).click();
  await expect(body(page, 'operation')).toBeVisible();
  await expect(body(page, 'principle')).toBeHidden();

  // 切回的操作视图也记住了
  await page.reload();
  await expect(toggle(page).getByRole('button', { name: '操作' })).toHaveAttribute('aria-pressed', 'true');
  await expect(body(page, 'operation')).toBeVisible();
});

// FR-11：导航按当前视图计算，切换后立即重算。“测 IP 质量”的下一步在操作视图是“防泄漏”，原理视图经过“小结”。
test('在“测 IP 质量”切换视图，下一步跟着变', async ({ page }) => {
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  const next = stepNav(page).getByRole('link', { name: /下一步/ });
  await expect(next).toHaveAttribute('href', /\/leak-protection\/$/);

  await toggle(page).getByRole('button', { name: '原理' }).click();
  await expect(next).toHaveAttribute('href', /\/recap\/$/);
  await expect(next).toContainText('小结');

  await toggle(page).getByRole('button', { name: '操作' }).click();
  await expect(next).toHaveAttribute('href', /\/leak-protection\/$/);
});

test('原理独有步骤在操作视图下显示原理版并提示（FR-30）', async ({ page }) => {
  await page.goto('./overview/');
  await expectScriptRan(page);
  await expect(page.getByText('这一页只有原理版。', { exact: true })).toBeVisible();
  await toggle(page).getByRole('button', { name: '原理' }).click();
  await expect(page.getByText('这一页只有原理版。', { exact: true })).toBeHidden();
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('固定为操作视图，不显示切换控件（design §5）', async ({ page }) => {
    await page.goto('./leak-protection/');
    await expect(body(page, 'operation')).toBeVisible();
    await expect(body(page, 'principle')).toBeHidden();
    await expect(toggle(page)).toBeHidden();
  });
});

// FR-71“两种视图轻区分”（design §4.0）：页眉下的视图色带，操作视图用 --text、原理视图用 --accent；
// 没有视图的参考页、找不到页用 --border。
const band = (page: Page) => page.locator('.site-header').evaluate((el) => getComputedStyle(el).borderBottomColor);
const token = (page: Page, name: string) =>
  page.evaluate((n) => {
    // 把令牌解析成 rgb()，和 computed style 的写法一致
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

test('视图色带跟着视图换色，参考页和找不到页用分隔线色', async ({ page }) => {
  await page.goto('./leak-protection/');
  await expectScriptRan(page);
  expect(await band(page)).toBe(await token(page, '--text'));
  await toggle(page).getByRole('button', { name: '原理' }).click();
  expect(await band(page)).toBe(await token(page, '--accent'));

  for (const path of ['./faq/', './no-such-page/']) {
    await page.goto(path);
    expect(await band(page), path).toBe(await token(page, '--border'));
  }
});
