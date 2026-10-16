import { expect, test, type Page } from '@playwright/test';
import { expectScriptRan, stepNav, stepNo, stepTotal } from './route-helpers';

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

// design §4.3、D8：按下的一段用 --text 底、--bg 字（v2.0 是紫底），没按下的一段 --bg 底、--text 字；一屏只留主按钮一块紫。
test('视图切换按下的一段是墨色底，切换后跟着换', async ({ page }) => {
  await page.goto('./leak-protection/');
  await expectScriptRan(page);
  const colors = (name: string) =>
    toggle(page)
      .getByRole('button', { name })
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, color: style.color };
      });
  const ink = { background: await token(page, '--text'), color: await token(page, '--bg') };

  expect(await colors('操作')).toEqual(ink);
  expect((await colors('原理')).color).toBe(await token(page, '--text'));

  await toggle(page).getByRole('button', { name: '原理' }).click();
  expect(await colors('原理')).toEqual(ink);
  expect((await colors('操作')).color).toBe(await token(page, '--text'));
});

// FR-10、design §4.1、§4.3：编号是本章进度，按当前视图计数，切换后重算。“整体思路”是原理独有步骤，
// 操作视图下“开始”这一章是 3 步，原理视图是 4 步。
test('切换视图后步骤编号和“共 m 步”重算', async ({ page }) => {
  await page.goto('./preface/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('01');
  expect(await stepTotal(page)).toBe('共 3 步');
  await expect(page.locator('[data-route-progress]')).toHaveText('开始，第 1 步，共 3 步');
  await toggle(page).getByRole('button', { name: '原理' }).click();
  await expect.poll(() => stepTotal(page)).toBe('共 4 步');
  expect(await stepNo(page)).toBe('01');
  await expect(page.locator('[data-route-progress]')).toHaveText('开始，第 1 步，共 4 步');

  await page.goto('./clean-up/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('04');
  await toggle(page).getByRole('button', { name: '操作' }).click();
  await expect.poll(() => stepNo(page)).toBe('03');
  expect(await stepTotal(page)).toBe('共 3 步');
});

// design §3.3、§4.1：桌面的编号挂在正文栏左侧 96px 的页边栏里、隔 32px，右对齐，底边和 h1 对齐（≤2px）；
// 眉题不写步数。平板和手机编号在 h1 前，眉题多写“ · 共 m 步”。“底边”指 h1 最后一行文字的基线（数字坐在基线上），
// 不是 h1 盒子的下沿（行高 1.3 会多出半个行距）。
async function expectMarkPosition(page: Page) {
  for (const path of ['./preface/', './disclaimer/', './clean-up/']) {
    await page.goto(path);
    await expectScriptRan(page);
    await expect(page.locator('[data-route-mark] .step-no svg')).toBeVisible();
    const box = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      // h1 最后一行的基线：在末尾放一个零高的行内块，它的底边就在基线上
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0';
      h1.append(probe);
      const baseline = probe.getBoundingClientRect().bottom;
      probe.remove();
      const no = document.querySelector('[data-route-mark] .step-no svg')!.getBoundingClientRect();
      const title = h1.getBoundingClientRect();
      const total = document.querySelector<HTMLElement>('[data-route-total]')!;
      return { baseline, no: { bottom: no.bottom, right: no.right, top: no.top }, title: { left: title.left, top: title.top }, eyebrowTotal: total.offsetParent === null ? '' : total.textContent };
    });
    if ((page.viewportSize()?.width ?? 0) >= 1100) {
      expect(Math.abs(box.no.bottom - box.baseline), path).toBeLessThanOrEqual(2);
      expect(box.title.left - box.no.right, path).toBeCloseTo(32, 0);
      expect(box.eyebrowTotal, path).toBe('');
    } else {
      expect(box.no.right, path).toBeLessThan(box.title.left);
      expect(box.no.top, path).toBeGreaterThanOrEqual(box.title.top - 2);
      expect(box.eyebrowTotal, path).toMatch(/^ · 共 \d+ 步$/);
    }
  }
}

test('编号的位置：桌面在页边栏、和 h1 底边对齐，手机在 h1 前、眉题写步数', async ({ page }) => {
  await expectMarkPosition(page);
});

// 平板档（720–1099px）同手机：没有页边栏（design §3.3，架构 §11.4 W-8）
test.describe('768 宽（平板）', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  test('编号在 h1 前、眉题写步数', async ({ page }) => {
    await expectMarkPosition(page);
  });
});

// 构建时按操作视图写编号；原理视图的读者打开页面时，重算前不显示编号，不会看到 03 跳成 04（design §4.3）
test('原理视图打开页面：编号直接是原理视图的计数', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: {}, view: 'principle' }));
  });
  await page.goto('./clean-up/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-route-mark]', { state: 'attached' });
  const before = await page.locator('main').evaluate((main) => ({
    ready: main.hasAttribute('data-route-ready'),
    visibility: getComputedStyle(main.querySelector('[data-route-mark]')!).visibility,
  }));
  if (!before.ready) expect(before.visibility).toBe('hidden');
  await expectScriptRan(page);
  await expect(page.locator('[data-route-mark]')).toBeVisible();
  expect(await stepNo(page)).toBe('04');
});
