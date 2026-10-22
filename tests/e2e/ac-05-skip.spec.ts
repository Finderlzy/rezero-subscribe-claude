import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { builtPages } from './built-pages';
import { expectScriptRan, stepNav } from './route-helpers';
import { openToc } from './toc-helpers';

// AC-05（FR-15）：V10 的新稿里没有可跳过的步骤。旧稿把“四、打开面板”做成一页可跳过的步骤，
// 新稿并进了方案一的 h2“打开面板（可选）”：读者按需往下读，不再有页面级的“跳过”按钮（V11 计划：
// 它只是一个小节，不是一页）。所以这条 AC 改成断言“跳过”不存在，以及“打开面板（可选）”确实是小节。
//
// V10 删除的用例及原因：“已选方案一 → 三、把服务器变成节点 → 四、打开面板 → 跳过 → 导入代理软件”和它的
// 无 JS 版本——plan1-make-node / plan1-panel 两页已按新稿合并进 plan1，没有 step-nav 的跳过链接可点。

test('方案一里没有“跳过”按钮：“打开面板（可选）”是正文的小节，也出现在目录的小节列表里', async ({ page }) => {
  await page.goto('./plan1/');
  await expectScriptRan(page);

  // 页面级“跳过”按钮不存在（design §4.1、FR-15）
  await expect(page.getByRole('main').getByRole('link', { name: /跳过/ })).toHaveCount(0);
  await expect(page.locator('[data-route-skip]')).toHaveCount(0);

  // “打开面板（可选）”是正文里的 h2 小节，不是单独一页
  const prose = page.locator('.prose').filter({ visible: true });
  await expect(prose.getByRole('heading', { level: 2, name: '打开面板（可选）' })).toBeVisible();

  // 目录的小节列表里也把它当小节（V11 计划）；目录里没有“可跳过”标记
  const toc = await openToc(page);
  await expect(toc.locator('.toc-sections a', { hasText: '打开面板（可选）' })).toHaveAttribute('href', '#打开面板可选');
  await expect(toc.getByText('可跳过')).toHaveCount(0);

  // 常规翻页照旧：方案一的下一步是客户端配置（不再有中间的可跳过页）
  await expect(stepNav(page).getByRole('link', { name: /下一步.*客户端配置与环境验证：电脑端/ })).toHaveAttribute(
    'href',
    /\/client-desktop\/$/,
  );
});

// 构建产物里没有跳过链接和挂载点：读者在任何一页都点不到“跳过”（FR-15 的界面在 V10 不存在）
test('全站构建产物里没有跳过链接', async ({}, testInfo) => {
  const dist = String(testInfo.project.metadata.dist ?? 'dist');
  for (const path of builtPages(dist)) {
    const file = join(dist, path.endsWith('.html') ? path : `${path}index.html`);
    const html = readFileSync(file, 'utf8');
    expect(html.includes('data-route-skip'), `/${path} 含有跳过链接的挂载点`).toBe(false);
    expect(html.includes('data-route-nav="skip"'), `/${path} 含有跳过链接`).toBe(false);
  }
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('“打开面板（可选）”仍是正文里的小节，也没有跳过链接', async ({ page }) => {
    await page.goto('./plan1/');
    await expect(page.locator('.prose').filter({ visible: true }).getByRole('heading', { level: 2, name: '打开面板（可选）' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: /跳过/ })).toHaveCount(0);
    await expect(page.locator('[data-route-skip]')).toHaveCount(0);
  });
});
