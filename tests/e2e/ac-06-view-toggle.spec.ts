import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-06（FR-30、FR-31，ADR-0004）原本验收“操作｜原理”视图切换。用户 2026-10-22 决定去掉视图切换、页面固定原理视图
// （顶栏原位置换成昼夜切换，见 ac-26-docs-style.spec.ts），切换、记住视图、操作视图下的提示等用例随功能移除；
// 这里改成核对固定原理视图：只有原理版正文，导航和计数按原理视图算，本机存过的视图偏好不再生效。

test('页面固定原理视图：只有原理版正文，没有视图切换，下一步按原理视图走', async ({ page }) => {
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  await expect(page.getByRole('group', { name: '视图' })).toHaveCount(0);
  await expect(page.locator('[data-body]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-view', 'principle');
  // “测 IP 质量”的下一步在原理视图经过原理独有的“小结”（FR-11）
  await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/recap\/$/);
});

test('本机存过操作视图也不再生效：照样是原理视图的导航和计数', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: {}, view: 'operation' }));
  });
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/recap\/$/);
  await page.goto('./preface/');
  await expectScriptRan(page);
  expect(await stepTotal(page)).toBe('共 4 步');
});

test('原理独有步骤照常显示正文，没有“只有原理版”的提示（FR-30 的提示随操作视图移除）', async ({ page }) => {
  await page.goto('./overview/');
  await expectScriptRan(page);
  await expect(page.locator('.prose')).toBeVisible();
  await expect(page.getByText('这一页只有原理版。', { exact: true })).toHaveCount(0);
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('也是原理版正文，构建时写好的下一步按原理视图（design §5）', async ({ page }) => {
    await page.goto('./check-ip/');
    await expect(page.locator('.prose')).toBeVisible();
    await expect(page.locator('[data-body]')).toHaveCount(0);
    await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/recap\/$/);
  });
});

// FR-10、design §4.1：编号是本章进度，按原理视图计数。“整体思路”是原理独有步骤，原理视图下“开始”这一章是 4 步。
test('步骤编号和“共 m 步”按原理视图计数', async ({ page }) => {
  await page.goto('./preface/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('1');
  expect(await stepTotal(page)).toBe('共 4 步');
  await expect(page.locator('[data-route-progress]')).toHaveText('开始，第 1 步，共 4 步');

  await page.goto('./clean-up/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('4');
});

// design v3 §4.1：h1 上方一行灰色眉题，所有页面都写章、章名和步数（FR-72 去掉了章首页省略章的写法）
test('眉题在 h1 上方：14px --text-muted，普通页和章首页都写章、章名和步数', async ({ page }) => {
  for (const { path, text } of [
    { path: './disclaimer/', text: /^第 0 章 · 开始 · 第 2 步，共 \d+ 步$/ },
    { path: './preface/', text: /^第 0 章 · 开始 · 第 1 步，共 \d+ 步$/ },
    { path: './clean-up/', text: /^第 0 章 · 开始 · 第 \d+ 步，共 \d+ 步$/ },
  ]) {
    await page.goto(path);
    await expectScriptRan(page);
    const style = await page.evaluate(() => {
      const eyebrow = document.querySelector('[data-route-eyebrow]')!;
      const probe = document.createElement('div');
      probe.style.color = 'var(--text-muted)';
      document.body.append(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      const s = getComputedStyle(eyebrow);
      return {
        aboveTitle: !!(eyebrow.compareDocumentPosition(document.querySelector('h1')!) & Node.DOCUMENT_POSITION_FOLLOWING),
        color: s.color,
        muted,
        fontSize: s.fontSize,
      };
    });
    await expect(page.locator('[data-route-eyebrow]')).toHaveText(text);
    expect(style.aboveTitle, path).toBe(true);
    expect(style.color, path).toBe(style.muted);
    expect(style.fontSize, path).toBe('14px');
    // 步骤页上没有补零的“0X”编号（v2.2 D10）：没有页边编号，也没有固定字形
    await expect(page.locator('[data-route-mark]')).toHaveCount(0);
    await expect(page.locator('.step .numeral, .step [role="img"]')).toHaveCount(0);
  }
});

// 构建时按“原理视图 + 未选”（默认方案二）写眉题；选了方案一的读者打开汇合点时，重算完才显示，不会看到第 2 步跳成第 5 步
test('选过分叉点后打开页面：眉题先占位，重算完再显示', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: { 'node-plan': 'plan-1' } }));
  });
  await page.goto('./import-proxy/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-route-eyebrow]', { state: 'attached' });
  const before = await page.locator('main').evaluate((main) => ({
    ready: main.hasAttribute('data-route-ready'),
    visibility: getComputedStyle(main.querySelector('[data-route-eyebrow]')!).visibility,
  }));
  if (!before.ready) expect(before.visibility).toBe('hidden');
  await expectScriptRan(page);
  await expect(page.locator('[data-route-eyebrow]')).toBeVisible();
  // 方案一有四页：选择方案之后是方案一的四页，导入代理软件是本章第 5 步
  expect(await stepNo(page)).toBe('5');
});
