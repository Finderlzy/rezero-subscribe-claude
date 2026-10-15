import { expect, test } from '@playwright/test';

// AC-05（FR-15，文案部分）：可跳过步骤在“下一步”上方有跳过按钮，文案默认“已有，跳过”，可按步骤自定；
// 点击后跳过本章内连续的可跳过步骤，到其后的第一项。

/** [步骤, 跳过按钮文案, 跳过后到达的路径, 到达页的 h1] */
const CASES: [string, string, string, string][] = [
  ['clean-claude-code', '没用过，跳过', '/choose/node-plan/', '你想用哪种方式准备住宅 IP？'],
  ['replace-ip-or-refund', 'IP 合格，跳过', '/choose/phone/', '你用什么手机？'],
  ['create-google-account', '已有，跳过', '/google-appeal/', '被封了：申诉解封'],
  // iPhone（默认）：“下载 Gmail”和“创建 Gmail 邮箱和 Google 账号”连续可跳过，一次跳到第八章第一步
  ['iphone-gmail', '已有，跳过', '/google-appeal/', '被封了：申诉解封'],
  // “申诉解封”后面是不可跳过的步骤，跳过申诉不会连带跳过改地区
  ['google-appeal', '没被封，跳过', '/use-google-few-days/', '先用 Google 账号几天，期间固定同一个节点'],
  ['google-region', '已经不是中国大陆或香港，跳过', '/register-claude/', '用 Google 账号注册 claude，先正常用几天'],
  ['iphone-apple-id', '已有美区 Apple ID，跳过', '/iphone-app-store-login/', '在 App Store 登录美区 Apple ID 并设置账单地址'],
  // 第十章最后一步：跳过后进第十一章
  ['purchase-failed', '订阅成功，跳过', '/after-subscribe/', '订阅之后的注意事项'],
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

// AC-05：已选安卓时，在“安装 Google Play”点“已有，跳过”，跨过本章内连续的可跳过步骤（含分支末尾和汇合点），到第八章第一步。
test('已选安卓时，在“安装 Google Play”点跳过，到第八章第一步', async ({ page }) => {
  await page.goto('./choose/phone/');
  await expect(page.locator('[data-route-ready]')).toHaveCount(1);
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /安卓/ }).click();
  await expect(page).toHaveURL(/\/android-v2rayng\/$/);

  await page.goto('./android-google-play/');
  await expect(page.locator('[data-route-ready]')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('安装 Google Play');
  await page.getByRole('link', { name: '已有，跳过', exact: true }).click();

  await expect(page).toHaveURL(/\/google-appeal\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('被封了：申诉解封');
  await expect(page.getByText('八、养号 · 第 1 步，共 3 步', { exact: true })).toBeVisible();
  // 本机选择确实记成了安卓：汇合点的“上一步”是安卓的“下载 Gmail”，不是 iPhone 的
  await page.goto('./create-google-account/');
  await expect(page.locator('[data-route-ready]')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /上一步/ })).toHaveAttribute(
    'href',
    /\/android-gmail\/$/,
  );
});

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
