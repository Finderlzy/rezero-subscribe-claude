import { expect, test, type Page } from '@playwright/test';
import { expectScriptRan, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-06（FR-30、FR-31，ADR-0004）：在“防泄漏”切到原理视图 → 整页换成原理版正文，URL 不变、回到顶部；
// 点“下一步” → “改时区”仍是原理视图；切回操作视图 → 显示操作版正文。
const toggle = (page: Page) => page.getByRole('group', { name: '视图' });
/** 把令牌解析成 rgb()，和 computed style 的写法一致 */
const token = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);
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

// design §4.3、§4.0（v2.2 W2 第 8 条）：分段控件改成 --surface-muted 轨道，选中的一段是 --surface 底、
// 1px --border、--text 字，没选中的是 --text-muted；切换后跟着换。
test('视图切换是分段控件：选中一段 --surface 底、--text 字，没选中的 --text-muted', async ({ page }) => {
  await page.goto('./leak-protection/');
  await expectScriptRan(page);
  const colors = (name: string) =>
    toggle(page)
      .getByRole('button', { name })
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, color: style.color, border: style.borderTopColor };
      });

  const selected = await colors('操作');
  expect(selected).toEqual({ background: await token(page, '--surface'), color: await token(page, '--text'), border: await token(page, '--border') });
  const idle = await colors('原理');
  expect(idle.background).toBe('rgba(0, 0, 0, 0)');
  expect(idle.color).toBe(await token(page, '--text-muted'));

  await toggle(page).getByRole('button', { name: '原理' }).click();
  expect(await colors('原理')).toEqual(selected);
  expect((await colors('操作')).color).toBe(await token(page, '--text-muted'));
});

// FR-10、design §4.1、§4.3：编号是本章进度，按当前视图计数，切换后重算。“整体思路”是原理独有步骤，
// 操作视图下“开始”这一章是 3 步，原理视图是 4 步。
test('切换视图后步骤编号和“共 m 步”重算', async ({ page }) => {
  await page.goto('./preface/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('1');
  expect(await stepTotal(page)).toBe('共 3 步');
  await expect(page.locator('[data-route-progress]')).toHaveText('开始，第 1 步，共 3 步');
  await toggle(page).getByRole('button', { name: '原理' }).click();
  await expect.poll(() => stepTotal(page)).toBe('共 4 步');
  expect(await stepNo(page)).toBe('1');
  await expect(page.locator('[data-route-progress]')).toHaveText('开始，第 1 步，共 4 步');

  await page.goto('./clean-up/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('4');
  await toggle(page).getByRole('button', { name: '操作' }).click();
  await expect.poll(() => stepNo(page)).toBe('3');
  expect(await stepTotal(page)).toBe('共 3 步');
});

// design §4.1（v2.2 D4、D10）：所有宽度都是页头色带里的一行眉题，不补零、不编号字形；章首页省掉章的部分。
test('眉题写在页头色带里：普通页写章、章名和步数，章首页只写步数', async ({ page }) => {
  for (const { path, text } of [
    { path: './disclaimer/', text: /^第 1 章 · 开始 · 第 2 步，共 \d+ 步$/ },
    // 章首页（v2.2 §3 W2 第 2 条）：色带上已经有副标题和章名，眉题省掉章的部分
    { path: './preface/', text: /^第 1 步，共 \d+ 步$/ },
    // clean-up 不是章首页（前言、整体思路在它前面）
    { path: './clean-up/', text: /^第 1 章 · 开始 · 第 \d+ 步，共 \d+ 步$/ },
  ]) {
    await page.goto(path);
    await expectScriptRan(page);
    const band = await page.evaluate(() => {
      const eyebrow = document.querySelector('[data-route-eyebrow]')!;
      const band = document.querySelector('.band')!;
      const style = getComputedStyle(eyebrow);
      return {
        inBand: band.contains(eyebrow),
        aboveTitle: !!(eyebrow.compareDocumentPosition(document.querySelector('h1')!) & Node.DOCUMENT_POSITION_FOLLOWING),
        background: getComputedStyle(band).backgroundColor,
        color: style.color,
        fontSize: style.fontSize,
      };
    });
    await expect(page.locator('[data-route-eyebrow]')).toHaveText(text);
    expect(band.inBand, path).toBe(true);
    expect(band.aboveTitle, path).toBe(true);
    expect(band.background, path).toBe(await token(page, '--accent-soft'));
    expect(band.color, path).toBe(await token(page, '--accent'));
    expect(band.fontSize, path).toBe('14px');
    // 步骤页上没有补零的“0X”编号（v2.2 D10）：没有页边编号，也没有固定字形
    await expect(page.locator('[data-route-mark]')).toHaveCount(0);
    await expect(page.locator('.step .numeral, .step [role="img"]')).toHaveCount(0);
  }
});

// 构建时按操作视图写眉题；原理视图的读者打开页面时，重算完才显示，不会看到 03 跳成 04（design §4.3）
test('原理视图打开页面：眉题直接是原理视图的计数', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: {}, view: 'principle' }));
  });
  await page.goto('./clean-up/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-route-eyebrow]', { state: 'attached' });
  const before = await page.locator('main').evaluate((main) => ({
    ready: main.hasAttribute('data-route-ready'),
    visibility: getComputedStyle(main.querySelector('[data-route-eyebrow]')!).visibility,
  }));
  if (!before.ready) expect(before.visibility).toBe('hidden');
  await expectScriptRan(page);
  await expect(page.locator('[data-route-eyebrow]')).toBeVisible();
  expect(await stepNo(page)).toBe('4');
});
