import { expect, test } from '@playwright/test';

// AC-02（FR-10、FR-11）：从“开始之前”沿默认路线一直点“下一步”，依次经过方案一的四步、
// v2rayN、防泄漏、电脑改时区、检查 IP 质量、iPhone 的手机代理和 Google 账号、养号、注册 claude、
// iPhone 的订阅和订阅之后，最后到完成页。
// 导航在构建时写进 HTML（design §5），所以禁用 JS 走一遍。
test.use({ javaScriptEnabled: false });

/** 默认路线：[URL 路径, h1, 顶部的章节和步数] */
const DEFAULT_ROUTE: [string, string, string][] = [
  ['/before-you-start/', '开始之前', '开始 · 第 1 步，共 3 步'],
  ['/overview/', '整体思路', '开始 · 第 2 步，共 3 步'],
  ['/clean-claude-code/', '清理本机的 Claude Code 配置', '开始 · 第 3 步，共 3 步'],
  ['/choose/node-plan/', '你想用哪种方式准备住宅 IP？', '一、准备住宅 IP'],
  ['/plan1-buy-vps/', '买服务器', '一、准备住宅 IP · 第 1 步，共 4 步'],
  ['/plan1-free-residential-ip/', '白嫖住宅 IP', '一、准备住宅 IP · 第 2 步，共 4 步'],
  ['/ssh-connect/', '连上服务器', '一、准备住宅 IP · 第 3 步，共 4 步'],
  ['/run-script/', '运行脚本', '一、准备住宅 IP · 第 4 步，共 4 步'],
  ['/choose/desktop-proxy/', '你用哪个电脑代理软件？', '二、电脑代理'],
  ['/v2rayn-import/', '下载 v2rayN 并导入节点', '二、电脑代理 · 第 1 步，共 2 步'],
  ['/v2rayn-tun/', '开 tun 模式并固定节点', '二、电脑代理 · 第 2 步，共 2 步'],
  ['/v2rayn-dns/', '防 DNS 泄漏', '三、防泄漏 · 第 1 步，共 3 步'],
  ['/webrtc/', '防 WebRTC 泄漏', '三、防泄漏 · 第 2 步，共 3 步'],
  ['/ipv6/', '防 IPv6 泄漏', '三、防泄漏 · 第 3 步，共 3 步'],
  ['/desktop-timezone/', '电脑改时区', '四、电脑改时区 · 第 1 步，共 1 步'],
  ['/check-ip-quality/', '检查 IP 质量', '五、检查 IP 质量 · 第 1 步，共 2 步'],
  ['/replace-ip-or-refund/', 'IP 不合格：换 IP 或退款', '五、检查 IP 质量 · 第 2 步，共 2 步'],
  ['/choose/phone/', '你用什么手机？', '六、手机代理'],
  ['/iphone-app-store-austria/', '把 App Store 改到奥地利', '六、手机代理 · 第 1 步，共 3 步'],
  ['/iphone-v2box/', '下载 v2Box 并导入节点', '六、手机代理 · 第 2 步，共 3 步'],
  ['/iphone-timezone/', '手机改时区', '六、手机代理 · 第 3 步，共 3 步'],
  ['/iphone-gmail/', '下载 Gmail', '七、准备 Google 账号 · 第 1 步，共 2 步'],
  ['/create-google-account/', '创建 Gmail 邮箱和 Google 账号', '七、准备 Google 账号 · 第 2 步，共 2 步'],
  ['/google-appeal/', '被封了：申诉解封', '八、养号 · 第 1 步，共 3 步'],
  ['/use-google-few-days/', '先用 Google 账号几天，期间固定同一个节点', '八、养号 · 第 2 步，共 3 步'],
  ['/google-region/', '修改 Google 账号关联地区', '八、养号 · 第 3 步，共 3 步'],
  ['/register-claude/', '用 Google 账号注册 claude，先正常用几天', '九、注册 claude · 第 1 步，共 1 步'],
  ['/iphone-apple-id/', '注册美区 Apple ID', '十、订阅 · 第 1 步，共 7 步'],
  ['/iphone-app-store-login/', '在 App Store 登录美区 Apple ID 并设置账单地址', '十、订阅 · 第 2 步，共 7 步'],
  ['/iphone-download-claude/', '下载 Claude 并允许 App 内购买', '十、订阅 · 第 3 步，共 7 步'],
  ['/iphone-buy-gift-card/', '买礼品卡', '十、订阅 · 第 4 步，共 7 步'],
  ['/iphone-redeem-gift-card/', '把礼品卡充值到 App Store', '十、订阅 · 第 5 步，共 7 步'],
  ['/iphone-subscribe/', '在 app 内订阅', '十、订阅 · 第 6 步，共 7 步'],
  ['/purchase-failed/', '购买无法完成：问 AI', '十、订阅 · 第 7 步，共 7 步'],
  ['/after-subscribe/', '订阅之后的注意事项', '十一、订阅之后 · 第 1 步，共 2 步'],
  ['/about-kyc/', '关于 KYC', '十一、订阅之后 · 第 2 步，共 2 步'],
];

test('从“开始之前”一直点“下一步”，经过方案一、v2rayN、检查 IP 质量、iPhone 的各步骤到完成页', async ({ page }) => {
  await page.goto('./before-you-start/');
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });

  for (const [index, [path, title, progress]] of DEFAULT_ROUTE.entries()) {
    await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('main').getByText(progress, { exact: true })).toBeVisible();

    const previous = DEFAULT_ROUTE[index - 1];
    if (previous) {
      await expect(nav.getByRole('link', { name: /上一步/ })).toHaveAttribute('href', new RegExp(`${previous[0]}$`));
    } else {
      await expect(nav.getByRole('link', { name: /上一步/ })).toHaveCount(0);
    }

    const following = DEFAULT_ROUTE[index + 1];
    const nextName = following ? following[1] : '完成';
    await nav.getByRole('link', { name: new RegExp(`下一步.*${nextName.replace(/[？?]/g, '.')}`) }).click();
  }

  await expect(page).toHaveURL(/\/done\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('这条路线走完了');
  await expect(page.getByRole('link', { name: '重新开始' })).toHaveAttribute('href', /\/before-you-start\/$/);
  // FR-19：完成页放致谢、后记和联系方式；联系方式在作者提供前是占位（需求 Q-07）
  for (const heading of ['致谢', '后记', '联系方式']) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  await expect(page.getByText('也感谢所有我没能记住名字、但确实帮到我的人。')).toBeVisible();
  await expect(page.getByText('联系方式待补。')).toBeVisible();
});

// FR-12（静态部分）：选择页列出三个方案，标出默认选项，每个选项进入它自己的第一步；选择页不计步数。
test('节点方案选择页：三个选项各自进入第一步，方案一标“默认”', async ({ page }) => {
  await page.goto('./choose/node-plan/');

  const options = page.getByRole('list', { name: '选项' }).getByRole('link');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute('href', /\/plan1-buy-vps\/$/);
  await expect(options.nth(1)).toHaveAttribute('href', /\/plan2-buy-residential-vps\/$/);
  await expect(options.nth(2)).toHaveAttribute('href', /\/plan3-buy-node\/$/);
  await expect(options.nth(0)).toContainText('默认');
  await expect(options.nth(1)).not.toContainText('默认');
  await expect(options.nth(2)).not.toContainText('默认');
  // 原文对比表的每一格都在选项块里
  await expect(options.nth(2)).toContainText('电脑 → 住宅节点 → claude.ai');
  await expect(options.nth(2)).toContainText('不想碰服务器，导入就能用');
  await expect(page.getByText(/第 \d+ 步/)).toHaveCount(0);

  await options.nth(2).click();
  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('购买住宅节点');
});
