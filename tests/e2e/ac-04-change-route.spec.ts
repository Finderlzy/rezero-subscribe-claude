import { expect, test } from '@playwright/test';
import { openToc } from './toc-helpers';

// AC-04（FR-14、FR-16）：目录只展开当前页所在的章；分叉点的全部选项同时列出（用户 2026-10-24），
// 选中的（或当前页所在的）选项展开，没选中的收起；点选项名可以展开，再从里面的页面链接进入那个方案。
// 走完一个方案的最后一步，下一步直接到下一章，不会经过另一个方案。

// 节点方案：方案一和方案二都在目录里；在方案一的页面上方案一展开、方案二收起，方案一的小节和高亮正常
test('目录同时列出方案一和方案二，只展开当前方案；展开方案二并进入后高亮跟着变', async ({ page }) => {
  await page.goto('./plan1/');
  const toc = await openToc(page);

  const plan1 = toc.locator('[data-toc-option="plan-1"]');
  const plan2 = toc.locator('[data-toc-option="plan-2"]');
  await expect(plan1).toHaveCount(1);
  await expect(plan2).toHaveCount(1);
  await expect(plan1.locator('summary.toc-route-label')).toHaveText('方案一');
  await expect(plan2.locator('summary.toc-route-label')).toContainText('方案二');
  await expect(plan1).toHaveAttribute('open', '');
  await expect(plan2).not.toHaveAttribute('open', /.*/);
  // 收起时看不到方案二的页面，但选项名还在
  await expect(plan2.locator('[data-toc-step="plan2-residential-server"]')).toBeHidden();

  // 当前项、小节列表都只在方案一下面
  const current = toc.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText('搭建专属住宅代理节点');
  await expect(plan1.locator('.toc-sections a')).toHaveText([
    '购买海外 VPS',
    '购买静态住宅 ISP 代理',
    'SSH 连接服务器',
    '运行一键脚本',
    '打开面板（可选）',
  ]);

  // 点方案二的选项名只展开，不跳转；再点它里面的第一页才进入方案二
  await plan2.locator('summary.toc-route-label').click();
  await expect(plan2).toHaveAttribute('open', '');
  await expect(page).toHaveURL(/\/plan1\/$/);
  await plan2.getByRole('link', { name: '配置住宅 IP 服务器' }).click();
  await expect(page).toHaveURL(/\/plan2-residential-server\/$/);

  const nextToc = await openToc(page);
  const nextPlan1 = nextToc.locator('[data-toc-option="plan-1"]');
  const nextPlan2 = nextToc.locator('[data-toc-option="plan-2"]');
  await expect(nextPlan1).not.toHaveAttribute('open', /.*/);
  await expect(nextPlan2).toHaveAttribute('open', '');
  await expect(nextToc.locator('a[aria-current="page"]')).toHaveText('配置住宅 IP 服务器');
  await expect(nextPlan2.locator('.toc-sections a')).toHaveText([
    '购买住宅服务器',
    '先测服务器 IP',
    'SSH 连接服务器',
    '运行一键脚本',
    '打开面板（可选）',
  ]);

  // 走完方案二：下一步是下一章的第一页，不经过方案一
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步.*客户端配置与环境验证：电脑端/ })).toHaveAttribute(
    'href',
    /\/client-desktop\/$/,
  );
});

// 手机系统：iPhone 和安卓都在目录里，iPhone 展开、安卓收起；展开安卓进入后互换
test('目录同时列出 iPhone 和安卓，只展开当前选项；进入安卓后只展开安卓', async ({ page }) => {
  await page.goto('./iphone-prepare/');
  const toc = await openToc(page);

  const iphone = toc.locator('[data-toc-option="iphone"]');
  const android = toc.locator('[data-toc-option="android"]');
  await expect(iphone.locator('summary.toc-route-label')).toHaveText('iPhone / iPad');
  await expect(android.locator('summary.toc-route-label')).toContainText('安卓');
  await expect(iphone).toHaveAttribute('open', '');
  await expect(android).not.toHaveAttribute('open', /.*/);
  await expect(toc.locator('a[aria-current="page"]')).toHaveText('客户端配置与环境验证：iOS 端');

  await android.locator('summary.toc-route-label').click();
  await expect(android).toHaveAttribute('open', '');
  await expect(page).toHaveURL(/\/iphone-prepare\/$/);
  await android.getByRole('link', { name: '客户端配置与环境验证：安卓端' }).click();
  await expect(page).toHaveURL(/\/android-prepare\/$/);

  const nextToc = await openToc(page);
  await expect(nextToc.locator('[data-toc-option="iphone"]')).not.toHaveAttribute('open', /.*/);
  await expect(nextToc.locator('[data-toc-option="android"]')).toHaveAttribute('open', '');
  await expect(nextToc.locator('a[aria-current="page"]')).toHaveText('客户端配置与环境验证：安卓端');

  // 手机上刚才打开的是抽屉，先关掉再点正文里的翻页
  if ((page.viewportSize()?.width ?? 0) < 720) await page.keyboard.press('Escape');

  // 安卓分支的下一页仍是本章的订阅页；走完它以后下一步直接到下一章“日常维护”
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /下一步.*账号注册与订阅全流程：安卓端/ })).toHaveAttribute(
    'href',
    /\/android-subscription\/$/,
  );
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expect(page).toHaveURL(/\/android-subscription\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*日常维护/ })).toHaveAttribute('href', /\/maintenance\/$/);
});
