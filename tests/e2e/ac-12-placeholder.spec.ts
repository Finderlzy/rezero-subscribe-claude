import { expect, test } from '@playwright/test';

// AC-12（FR-21）：占位步骤照常有页面，正文上方是“这一步的内容待补”面板，下面只有原文已有的内容；
// 不是占位的步骤没有这个面板。构建输出的占位清单由 `npm run build` 人工核对。
test('Clash Verge 的 tun 步骤显示“内容待补”面板，v2rayN 的不显示', async ({ page }) => {
  await page.goto('./clash-verge-tun/');
  const notice = page.getByRole('note', { name: '这一步的内容待补' });
  await expect(notice).toBeVisible();
  // 没有 placeholderHint 的占位步骤，面板里只有这一句；有提示的见下面“IP 不合格”的用例。
  await expect(notice).toHaveText('这一步的内容待补');
  // 原文已有的提示照常显示
  await expect(page.getByText('用 claude 时固定用这一个节点，不要换来换去。')).toBeVisible();

  await page.goto('./v2rayn-tun/');
  await expect(page.getByRole('note', { name: '这一步的内容待补' })).toHaveCount(0);
});

test('在手机选择页选安卓，进入的第一步显示“内容待补”，正文没有操作步骤', async ({ page }) => {
  await page.goto('./choose/phone/');
  await expect(page.locator('[data-route-ready]')).toHaveCount(1);
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /安卓/ }).click();

  await expect(page).toHaveURL(/\/android-v2rayng\/$/);
  await expect(page.getByRole('note', { name: '这一步的内容待补' })).toHaveText('这一步的内容待补');
  // 原文没有安卓的做法，正文是空的：不出现编造的列表或段落
  await expect(page.locator('.prose > .placeholder-notice')).toHaveCount(1);
  await expect(page.locator('.prose > :not(.placeholder-notice)')).toHaveCount(0);
});

test('“IP 不合格”的面板里放原文已有的提示', async ({ page }) => {
  await page.goto('./replace-ip-or-refund/');
  const notice = page.getByRole('note', { name: '这一步的内容待补' });
  await expect(notice).toContainText('这一步的内容待补');
  await expect(notice).toContainText('方案二：确认是住宅/ISP 类型再用；不是的话，商家支持退款。');
});

test('“安装 Google Play”的面板里放原文已有的提示', async ({ page }) => {
  await page.goto('./android-google-play/');
  await expect(page.getByRole('note', { name: '这一步的内容待补' })).toContainText(
    'Google Play 要从手机自带的应用商店或其他可信来源下载，来路不明的安装包可能被改过。',
  );
});

// 全部占位步骤都有面板；构建输出的占位清单也是这些（`npm run build` 人工核对）。
for (const step of [
  'v2rayn-import',
  'clash-verge-tun',
  'clash-verge-dns',
  'clean-claude-code',
  'replace-ip-or-refund',
  'iphone-app-store-austria',
  'iphone-v2box',
  'android-v2rayng',
  'android-timezone',
  'android-google-play',
  'android-gmail',
  'use-google-few-days',
  'google-appeal',
]) {
  test(`占位步骤 ${step} 显示“内容待补”面板`, async ({ page }) => {
    await page.goto(`./${step}/`);
    await expect(page.getByRole('note', { name: '这一步的内容待补' })).toBeVisible();
  });
}
