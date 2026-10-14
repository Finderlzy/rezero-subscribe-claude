import { expect, test, type Page } from '@playwright/test';

// AC-06（FR-30、FR-31）：在任一步骤切到原理视图 → 显示该步骤的“为什么”内容；点“下一步” → 新步骤仍是原理视图；
// 切回操作视图后，“为什么”内容消失。原理块是 rehype-callouts 输出的 .callout[data-callout="why"]（ADR-0003）。
const why = (page: Page) => page.locator('.prose .callout[data-callout="why"]');
const toggle = (page: Page) => page.getByRole('group', { name: '视图' });
const nav = (page: Page) => page.getByRole('navigation', { name: '上一步和下一步' });

test('切到原理视图看到“为什么”，下一步仍是原理视图，切回操作视图后消失', async ({ page }) => {
  await page.goto('./plan1-buy-vps/');
  const operation = toggle(page).getByRole('button', { name: '操作' });
  const principle = toggle(page).getByRole('button', { name: '原理' });

  // 默认是操作视图：原理块收起，原位留一行提示
  await expect(operation).toHaveAttribute('aria-pressed', 'true');
  await expect(why(page)).toBeHidden();
  await expect(page.getByRole('button', { name: '为什么：VPS 和住宅 IP 各管什么 · 在原理视图中查看' })).toBeVisible();

  await principle.click();
  await expect(principle).toHaveAttribute('aria-pressed', 'true');
  await expect(operation).toHaveAttribute('aria-pressed', 'false');
  await expect(why(page)).toBeVisible();
  await expect(why(page)).toContainText('VPS 和住宅 IP 各管什么');
  await expect(page.getByRole('button', { name: /在原理视图中查看/ })).toBeHidden();

  // 下一步“白嫖住宅 IP”没有原理块：仍是原理视图，并说明这一步没有额外原理
  await nav(page).getByRole('link', { name: /下一步/ }).click();
  await expect(page).toHaveURL(/\/plan1-free-residential-ip\/$/);
  await expect(toggle(page).getByRole('button', { name: '原理' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('这一步没有额外原理', { exact: true })).toBeVisible();

  // 之后打开的有原理块的步骤直接展开；有原理块就不显示“没有额外原理”（锁住 StepLayout 按 data-callout="why" 判断）
  await page.goto('./run-script/');
  await expect(why(page)).toBeVisible();
  await expect(page.getByText('这一步没有额外原理', { exact: true })).toHaveCount(0);

  await toggle(page).getByRole('button', { name: '操作' }).click();
  await expect(why(page)).toBeHidden();
  await expect(page.getByRole('button', { name: '为什么：脚本帮你做了什么 · 在原理视图中查看' })).toBeVisible();

  // 切回的操作视图也记住了
  await page.reload();
  await expect(toggle(page).getByRole('button', { name: '操作' })).toHaveAttribute('aria-pressed', 'true');
  await expect(why(page)).toBeHidden();
});

test('操作视图里点原理提示行 → 切到原理视图并滚到这个原理块', async ({ page }) => {
  await page.goto('./run-script/');
  await page.getByRole('button', { name: '为什么：脚本帮你做了什么 · 在原理视图中查看' }).click();

  await expect(toggle(page).getByRole('button', { name: '原理' })).toHaveAttribute('aria-pressed', 'true');
  await expect(why(page)).toBeInViewport();
  await expect(why(page)).toBeFocused();
});

test('没有原理块的步骤，操作视图下不显示“这一步没有额外原理”', async ({ page }) => {
  await page.goto('./ssh-connect/');
  await expect(page.getByText('这一步没有额外原理', { exact: true })).toBeHidden();
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('固定为操作视图：原理块收起，不显示切换控件（design §5）', async ({ page }) => {
    await page.goto('./run-script/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('运行脚本');
    await expect(why(page)).toBeHidden();
    await expect(toggle(page)).toBeHidden();
  });
});
