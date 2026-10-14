import { expect, test } from '@playwright/test';

// AC-02（FR-10、FR-11，前五章部分）：从“开始之前”沿默认路线一直点“下一步”，依次经过方案一的四步、
// v2rayN、防泄漏、电脑改时区和“检查 IP 质量”，最后到完成页。手机章节迁入后，这条路线由对应任务接着补长。
// 导航在构建时写进 HTML（design §5），所以禁用 JS 走一遍。
test.use({ javaScriptEnabled: false });

/** 默认路线：[URL 路径, h1, 顶部的章节和步数] */
const DEFAULT_ROUTE: [string, string, string][] = [
  ['/before-you-start/', '开始之前', '开始 · 第 1 步，共 2 步'],
  ['/overview/', '整体思路', '开始 · 第 2 步，共 2 步'],
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
  ['/check-ip-quality/', '检查 IP 质量', '五、检查 IP 质量 · 第 1 步，共 1 步'],
];

test('从“开始之前”一直点“下一步”，经过方案一、v2rayN 和“检查 IP 质量”到完成页', async ({ page }) => {
  await page.goto('./before-you-start/');
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });

  for (const [index, [path, title, progress]] of DEFAULT_ROUTE.entries()) {
    await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByText(progress, { exact: true })).toBeVisible();

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
