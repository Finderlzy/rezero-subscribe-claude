import { expect, test } from '@playwright/test';

// AC-12（FR-21，电脑代理部分）：占位步骤照常有页面，正文上方是“这一步的内容待补”面板，下面只有原文已有的内容；
// 不是占位的步骤没有这个面板。安卓的占位随手机章节迁入（#11）后补上；构建输出的占位清单由 `npm run build` 人工核对。
test('Clash Verge 的 tun 步骤显示“内容待补”面板，v2rayN 的不显示', async ({ page }) => {
  await page.goto('./clash-verge-tun/');
  const notice = page.getByRole('note', { name: '这一步的内容待补' });
  await expect(notice).toBeVisible();
  // 本任务的占位步骤都没有 placeholderHint，所以面板里只有这一句；有提示的占位步骤迁入（#11）后补上提示的断言。
  await expect(notice).toHaveText('这一步的内容待补');
  // 原文已有的提示照常显示
  await expect(page.getByText('用 claude 时固定用这一个节点，不要换来换去。')).toBeVisible();

  await page.goto('./v2rayn-tun/');
  await expect(page.getByRole('note', { name: '这一步的内容待补' })).toHaveCount(0);
});

// 本任务的三个占位步骤都有面板；构建输出的占位清单也是这三个（`npm run build` 人工核对）。
for (const step of ['v2rayn-import', 'clash-verge-tun', 'clash-verge-dns']) {
  test(`占位步骤 ${step} 显示“内容待补”面板`, async ({ page }) => {
    await page.goto(`./${step}/`);
    await expect(page.getByRole('note', { name: '这一步的内容待补' })).toBeVisible();
  });
}
