import { expect, test } from '@playwright/test';
import { openToc } from './toc-helpers';

// AC-04（FR-14、FR-16）：目录只画当前路线；另一条路线收成一行文字链接，点它换路线。
// 分叉点不再在目录里放“切换”按钮，也不列另一条路线的页面（作者 2026-10-23）。
// V10：两个分叉点分别在 overview（节点方案，默认方案二）和 client-desktop（手机系统，没有默认）上，
// 各选项的页面按新路线：plan1 / plan2-residential-server、iphone-* / android-*。

// 节点方案：在方案一的页面上，目录只列出方案一；点“换到方案二 →”进入方案二，当前页、小节和高亮跟着变
test('目录只画当前路线，换到方案二后当前页、小节和高亮跟着变', async ({ page }) => {
  await page.goto('./plan1/');
  const toc = await openToc(page);

  await expect(toc.locator('[data-toc-option="plan-1"] .toc-route-label')).toHaveText('方案一');
  // 只画当前路线：另一个选项的页面不在目录里，也没有“其他路线”字样
  await expect(toc.locator('[data-toc-option="plan-2"]')).toHaveCount(0);
  await expect(toc).not.toContainText('其他路线');
  await expect(toc.locator('a[aria-current="page"]')).toHaveText('搭建专属住宅代理节点');
  await expect(toc.locator('.toc-sections a')).toHaveText([
    '购买海外 VPS',
    '购买静态住宅 ISP 代理',
    'SSH 连接服务器',
    '运行一键脚本',
    '打开面板（可选）',
  ]);
  // 旧的分叉组控件不再出现
  await expect(toc.locator('[data-toc-switch]')).toHaveCount(0);
  await expect(toc.locator('[data-toc-other]')).toHaveCount(0);

  await toc.getByRole('link', { name: '换到方案二 →' }).click();
  await expect(page).toHaveURL(/\/plan2-residential-server\/$/);

  const nextToc = await openToc(page);
  await expect(nextToc.locator('[data-toc-option="plan-2"] .toc-route-label')).toHaveText('方案二');
  await expect(nextToc.locator('[data-toc-option="plan-1"]')).toHaveCount(0);
  await expect(nextToc.getByRole('link', { name: '换到方案一 →' })).toBeVisible();
  await expect(nextToc.locator('a[aria-current="page"]')).toHaveText('配置住宅 IP 服务器');
  await expect(nextToc.locator('.toc-sections a')).toHaveText([
    '购买住宅服务器',
    '先测服务器 IP',
    'SSH 连接服务器',
    '运行一键脚本',
    '打开面板（可选）',
  ]);
});

// 手机系统：在 iPhone 的页面上目录只列 iPhone，点“换到安卓 →”进入安卓分支的第一页
test('手机系统的分叉也只画当前路线：iPhone 的页面上点“换到安卓 →”到安卓的第一页', async ({ page }) => {
  await page.goto('./iphone-prepare/');
  const toc = await openToc(page);

  await expect(toc.locator('[data-toc-option="iphone"] .toc-route-label')).toHaveText('iPhone / iPad');
  await expect(toc.locator('[data-toc-option="android"]')).toHaveCount(0);
  await expect(toc.locator('a[aria-current="page"]')).toHaveText('客户端配置与环境验证：iOS 端');

  await toc.getByRole('link', { name: '换到安卓 →' }).click();
  await expect(page).toHaveURL(/\/android-prepare\/$/);

  const nextToc = await openToc(page);
  await expect(nextToc.locator('[data-toc-option="android"] .toc-route-label')).toHaveText('安卓');
  await expect(nextToc.locator('[data-toc-option="iphone"]')).toHaveCount(0);
  await expect(nextToc.getByRole('link', { name: '换到iPhone / iPad →' })).toBeVisible();
  await expect(nextToc.locator('a[aria-current="page"]')).toHaveText('客户端配置与环境验证：安卓端');
  await expect(nextToc.locator('.toc-sections a')).toHaveText(['安装 v2rayNG', '准备 Google Play', '改时区', '下载 Gmail']);
});
