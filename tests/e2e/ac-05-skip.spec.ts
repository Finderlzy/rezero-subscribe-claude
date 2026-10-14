import { expect, test } from '@playwright/test';

// AC-05（FR-15，文案部分）：可跳过步骤在“下一步”上方有跳过按钮，文案默认“已有，跳过”，可按步骤自定；
// 点击后跳过本章内连续的可跳过步骤，到其后的第一项。连续跳过（安卓在“安装 Google Play”跳到第八章）随 #12 补上。

/** [步骤, 跳过按钮文案, 跳过后到达的路径, 到达页的 h1] */
const CASES: [string, string, string, string][] = [
  ['clean-claude-code', '没用过，跳过', '/choose/node-plan/', '你想用哪种方式准备住宅 IP？'],
  ['replace-ip-or-refund', 'IP 合格，跳过', '/choose/phone/', '你用什么手机？'],
  ['create-google-account', '已有，跳过', '/done/', '这条路线走完了'],
];

for (const [step, label, target, heading] of CASES) {
  test(`“${step}”的跳过按钮写“${label}”，点击后到 ${target}`, async ({ page }) => {
    await page.goto(`./${step}/`);
    // 等页面脚本按本机选择改写完导航，再点
    await expect(page.locator('[data-route-ready]')).toHaveCount(1);

    const skip = page.getByRole('link', { name: label, exact: true });
    await expect(skip).toBeVisible();
    await skip.click();

    await expect(page).toHaveURL(new RegExp(`${target.replace(/\//g, '\\/')}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  });
}

test('不可跳过的步骤没有跳过按钮', async ({ page }) => {
  await page.goto('./check-ip-quality/');
  await expect(page.locator('[data-route-ready]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /跳过/ })).toHaveCount(0);
  await expect(page.locator('[data-route-nav="skip"]')).toHaveCount(0);
});

// 跳过链接在构建时写好，不运行 JS 也能用（design §5 渐进增强）。
test.describe('禁用 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('“清理本机的 Claude Code 配置”的跳过按钮仍指向第一章选择页', async ({ page }) => {
    await page.goto('./clean-claude-code/');
    await expect(page.getByRole('link', { name: '没用过，跳过', exact: true })).toHaveAttribute('href', /\/choose\/node-plan\/$/);
  });
});
