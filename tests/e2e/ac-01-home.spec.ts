import { expect, test } from '@playwright/test';

// AC-01（FR-18）：没有进度时，首页显示前言和“直接开始”，不放致谢和后记；“直接开始”进入“开始之前”。
test.describe('AC-01 首页', () => {
  test('无进度时看到前言和“直接开始”，看不到致谢、后记', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByRole('heading', { level: 2, name: '前言' })).toBeVisible();
    await expect(page.getByText('说实话，我有点犹豫要不要现在发这篇。', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: '直接开始' })).toBeVisible();
    await expect(page.getByRole('link', { name: /继续上次/ })).toHaveCount(0);

    const text = await page.locator('body').innerText();
    expect(text).not.toContain('致谢');
    expect(text).not.toContain('后记');
  });

  test('点“直接开始”进入“开始之前”', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('link', { name: '直接开始' }).click();

    await expect(page).toHaveURL(/\/before-you-start\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('开始之前');
    await expect(page.getByText('开始 · 第 1 步，共 3 步')).toBeVisible();
  });
});

// 导航在构建时写进 HTML（FR-11、design §5）：禁用 JS 也能顺着“下一步”往下走。走完整条默认路线见 ac-02。
test.describe('禁用 JS 时的导航', () => {
  test.use({ javaScriptEnabled: false });

  test('从“开始之前”点“下一步”到“整体思路”，上一步指回前一步，再往下是“清理本机的 Claude Code 配置”', async ({ page }) => {
    await page.goto('./before-you-start/');
    const nav = page.getByRole('navigation', { name: '上一步和下一步' });
    await expect(nav.getByRole('link', { name: /上一步/ })).toHaveCount(0);

    await nav.getByRole('link', { name: /下一步.*整体思路/ }).click();
    await expect(page).toHaveURL(/\/overview\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('整体思路');
    await expect(page.getByText('开始 · 第 2 步，共 3 步')).toBeVisible();
    await expect(nav.getByRole('link', { name: /上一步.*开始之前/ })).toHaveAttribute('href', /\/before-you-start\/$/);
    await expect(nav.getByRole('link', { name: /下一步.*清理本机的 Claude Code 配置/ })).toHaveAttribute('href', /\/clean-claude-code\/$/);
  });
});
