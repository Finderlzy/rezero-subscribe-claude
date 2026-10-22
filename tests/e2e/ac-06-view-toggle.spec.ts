import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-06（FR-30、FR-31，ADR-0004）原本验收“操作｜原理”视图切换。用户 2026-10-22 决定去掉视图切换、页面固定原理视图
// （顶栏原位置换成昼夜切换，见 ac-26-docs-style.spec.ts），切换、记住视图、操作视图下的提示等用例随功能移除；
// 这里改成核对固定原理视图：只有原理版正文，导航和计数按原理视图算，本机存过的视图偏好不再生效。
// V10（作者新稿）只有一版正文，原来的 check-ip、recap、clean-up、disclaimer、import-proxy 等页面已经并入新稿的
// 11 页（route.yaml），下面的用例改用新页面；原理视图下按本章计数的规则不变。

test('页面固定单版正文：只有一份正文，没有视图切换，下一步按构建时的路线走', async ({ page }) => {
  await page.goto('./overview/');
  await expectScriptRan(page);
  await expect(page.getByRole('group', { name: '视图' })).toHaveCount(0);
  await expect(page.locator('[data-body]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-view', 'principle');
  // 选择页没选时按路线图的默认选项（方案二）写出下一步
  await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/plan2-residential-server\/$/);
});

test('本机存过操作视图也不再生效：照样是单版正文的导航和计数', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: {}, view: 'operation' }));
  });
  await page.goto('./overview/');
  await expectScriptRan(page);
  await expect(page.locator('html')).toHaveAttribute('data-view', 'principle');
  await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/plan2-residential-server\/$/);
  await page.goto('./preface/');
  await expectScriptRan(page);
  expect(await stepTotal(page)).toBe('共 1 步');
});

test('正文照常显示，没有“只有原理版”的提示（FR-30 的提示随操作视图移除）', async ({ page }) => {
  await page.goto('./client-desktop/');
  await expectScriptRan(page);
  await expect(page.locator('.prose')).toBeVisible();
  await expect(page.getByText('这一页只有原理版。', { exact: true })).toHaveCount(0);
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('也是单版正文，构建时写好的下一步按默认方案二（design §5）', async ({ page }) => {
    await page.goto('./overview/');
    await expect(page.locator('.prose')).toBeVisible();
    await expect(page.locator('[data-body]')).toHaveCount(0);
    await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/plan2-residential-server\/$/);
  });
});

// FR-10、design §4.1：编号是本章进度，按当前路线计数。“开始”只有前言一页；
// “客户端配置与订阅”的两个分支各 2 步，iOS 分支的最后一步是第 2 步，共 2 步。
test('步骤编号和“共 m 步”按本章计数', async ({ page }) => {
  await page.goto('./preface/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('1');
  expect(await stepTotal(page)).toBe('共 1 步');
  await expect(page.locator('[data-route-progress]')).toHaveText('开始，第 1 步，共 1 步');

  await page.goto('./iphone-subscription/');
  await expectScriptRan(page);
  expect(await stepNo(page)).toBe('2');
  expect(await stepTotal(page)).toBe('共 2 步');
});

// design v3 §4.1：h1 上方一行灰色眉题，普通页、选择页和章首页都写章、章名和步数（FR-72 去掉了章首页省略章的写法）
test('眉题在 h1 上方：14px --text-muted，普通页和选择页都写章、章名和步数', async ({ page }) => {
  for (const { path, text } of [
    { path: './preface/', text: /^第 0 章 · 开始 · 第 1 步，共 1 步$/ },
    { path: './overview/', text: /^第 1 章 · 准备节点和住宅 IP · 选择$/ },
    { path: './plan1/', text: /^第 1 章 · 准备节点和住宅 IP · 第 1 步，共 1 步$/ },
    { path: './client-desktop/', text: /^第 2 章 · 客户端配置与订阅 · 选择$/ },
    { path: './iphone-subscription/', text: /^第 2 章 · 客户端配置与订阅 · 第 2 步，共 2 步$/ },
    { path: './maintenance/', text: /^第 3 章 · 日常维护 · 第 1 步，共 1 步$/ },
    { path: './afterword/', text: /^第 4 章 · 结尾 · 第 1 步，共 1 步$/ },
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
    // 说明图和截图也是 role="img"，它们是正文内容；这里只看标题和眉题附近有没有装饰性编号
  await expect(page.locator('.step .eyebrow [role="img"], .step .step-title [role="img"], .step .numeral')).toHaveCount(0);
  }
});

// 构建时按“未选”（默认方案二）写眉题和导航；选了方案一的读者打开汇合点时，重算完才显示，
// 不会看到按默认方案二算出的“上一步”
test('选过分叉点后打开页面：眉题先占位，重算完再显示', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: { 'node-plan': 'plan-1' } }));
  });
  await page.goto('./client-desktop/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-route-eyebrow]', { state: 'attached' });
  const before = await page.locator('main').evaluate((main) => ({
    ready: main.hasAttribute('data-route-ready'),
    visibility: getComputedStyle(main.querySelector('[data-route-eyebrow]')!).visibility,
  }));
  if (!before.ready) expect(before.visibility).toBe('hidden');
  await expectScriptRan(page);
  await expect(page.locator('[data-route-eyebrow]')).toBeVisible();
  await expect(page.locator('[data-route-eyebrow]')).toHaveText('第 2 章 · 客户端配置与订阅 · 选择');
  // 汇合点的上一步是所选分支的最后一步，不是构建时按默认方案二写的
  await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/plan1\/$/);
});
