import { expect, test } from '@playwright/test';

// AC-08（FR-17、FR-50）：在新的浏览器上下文（相当于无痕窗口，没有本机进度）直接打开方案三步骤的 URL，
// 页面直接显示，上一步/下一步都在方案三路线内；打开后把这一步和方案三记进本机。
test('直接打开“购买住宅节点”：上一步是选择页，下一步是“检查 IP 质量”', async ({ page }) => {
  // Playwright 给每个用例一个新的浏览器上下文，相当于无痕窗口
  await page.goto('./plan3-buy-node/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('购买住宅节点');
  await expect(page.getByText('一、准备住宅 IP · 第 1 步，共 1 步', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/choose\/node-plan\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*检查 IP 质量/ })).toHaveAttribute('href', /\/check-ip-quality\/$/);
});

const READER_STATE_KEY = 'rezero-subscribe-claude:v1';

test('打开方案三的步骤后，本机记下这一步和方案三', async ({ page }) => {
  await page.goto('./plan3-buy-node/');

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), READER_STATE_KEY);
  expect(stored).toMatchObject({ lastStep: 'plan3-buy-node', visited: ['plan3-buy-node'], choices: { 'node-plan': 'plan-3' } });
});

// S5：URL 所属的选项优先于本机保存的选择。
test('本机选过方案二时打开方案三的步骤，导航仍在方案三路线内', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案二/ }).click();
  await expect(page).toHaveURL(/\/plan2-buy-residential-vps\/$/);

  await page.goto('./plan3-buy-node/');
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/choose\/node-plan\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*检查 IP 质量/ })).toHaveAttribute('href', /\/check-ip-quality\/$/);
  await expect(page.getByText('一、准备住宅 IP · 第 1 步，共 1 步', { exact: true })).toBeVisible();

  // 脚本已运行（goto 等到 load）：本机的选择改成了这一页所属的方案三
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), READER_STATE_KEY);
  expect(stored).toMatchObject({ lastStep: 'plan3-buy-node', choices: { 'node-plan': 'plan-3' } });
});
