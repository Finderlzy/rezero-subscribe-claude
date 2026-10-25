import { expect, test } from '@playwright/test';
import { UPDATE_CATEGORIES, UPDATE_LOG_PATH } from '../../src/lib/update-log';
import { hasSidebar, openToc, sidebar, tocButton } from './toc-helpers';

// AC-34、AC-35（FR-80–FR-82、FR-86）：更新日志是独立页面 /update-log/，四个分类、默认「全部」，
// 点分类只显示那一类；没有 JS 时四个分类的条目都渲染在页面上。分类不写 URL、不写本机。
// 构建级用例（坏 update-log.yaml 让构建失败）在 tests/build/ac-14-build-fail.test.ts。

const LABELS = ['全部', '公告', '内容', '站点'];

test.use({ storageState: { cookies: [], origins: [] } });

test('AC-34：打开 /update-log/，四个分类、默认「全部」，没有上一步/下一步', async ({ page }) => {
  await page.goto('./update-log/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('更新日志');

  const tabs = page.locator('[data-update-tab]');
  await expect(tabs).toHaveText(LABELS.map((label) => new RegExp(`^\\s*${label}\\s*\\d+\\s*$`)));
  await expect(tabs.locator('xpath=.').first()).toBeVisible();
  // 默认「全部」，刷新后也一样，地址里没有分类参数
  await expect(page.locator('[data-update-tab="all"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-update-tab="notice"]')).toHaveAttribute('aria-selected', 'false');
  expect(new URL(page.url()).search).toBe('');

  // 正文里没有上一步/下一步（FR-80），也没有底部的“回到”指引（作者 2026-10-25 要求删掉）
  await expect(page.getByRole('navigation', { name: '上一步和下一步' })).toHaveCount(0);
  // 正文末尾没有“← 回到 …”的导航块（条目正文里出现“回到”两个字不算，所以按元素和可访问名称判断）
  await expect(page.locator('nav.update-log-nav')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^←? ?回到/ })).toHaveCount(0);
  await expect(page.locator('main .step-nav-title')).toHaveCount(0);
  // h1 就是“更新日志”，上面没有重复的眉题（作者 2026-10-25）
  await expect(page.locator('.eyebrow')).toHaveCount(0);
  await expect(page.locator('[data-update-panel="all"]')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-update-tab="all"]')).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).pathname).toMatch(/\/update-log\/$/);
});

test('AC-35：点分类只显示这一类；分类不写 URL、不写本机', async ({ page }) => {
  await page.goto('./update-log/');
  // 脚本跑起来之后才收成 tab；默认「全部」
  await expect(page.locator('html[data-update-log-ready]')).toBeAttached();
  await expect(page.locator('[data-update-panel]:visible')).toHaveCount(1);
  await expect(page.locator('[data-update-panel="all"]')).toBeVisible();

  const before = await page.evaluate(() => JSON.stringify(localStorage));
  for (const category of ['content', 'notice', 'site', 'all']) {
    await page.locator(`[data-update-tab="${category}"]`).click();
    await expect(page.locator(`[data-update-tab="${category}"]`)).toHaveAttribute('aria-selected', 'true');
    // 只有选中的面板可见，其余都收起来
    await expect(page.locator('[data-update-panel]:visible')).toHaveCount(1);
    await expect(page.locator(`[data-update-panel="${category}"]`)).toBeVisible();
    for (const other of UPDATE_CATEGORIES.filter((value) => value !== category)) {
      await expect(page.locator(`[data-update-panel="${other}"]`)).toBeHidden();
    }
  }
  // 分类切换不改地址、不写本机（FR-81）
  expect(new URL(page.url()).search).toBe('');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);

  // 键盘：左右键在分类间移动（WAI-ARIA tabs）
  await page.locator('[data-update-tab="all"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-update-tab="notice"]')).toBeFocused();
  await expect(page.locator('[data-update-panel="notice"]')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('[data-update-tab="site"]')).toBeFocused();
  await expect(page.locator('[data-update-panel="site"]')).toBeVisible();
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('四个分类的条目都渲染在页面上，都能读到（FR-82）', async ({ page }) => {
    await page.goto('./update-log/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('更新日志');
    for (const category of UPDATE_CATEGORIES) {
      await expect(page.locator(`[data-update-panel="${category}"]`), category).toBeVisible();
    }
    // 分类按钮在，但没有脚本时不会切换面板（不隐藏任何内容）
    await expect(page.locator('[data-update-tab]')).toHaveCount(4);
  });
});

// AC-38 的一部分（FR-88）：每个有目录的页面，侧边栏/抽屉底部都有常驻的“更新日志”入口。
// 入口在目录的滚动区之外（侧边栏 aside 的最后一个子节点、抽屉 dialog 的最后一个子节点），
// 所以直接按 aside/dialog 找，不在 openToc() 返回的 nav 里找。
const sidebarEntry = (page: import('@playwright/test').Page) => page.locator('aside[data-toc-sidebar] [data-toc-update-log]');
const drawerEntry = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: '目录' }).locator('[data-toc-update-log]');

for (const path of ['plan1/', 'ip-tests/', 'update-log/']) {
  test(`AC-38：/${path} 侧边栏底部有更新日志入口`, async ({ page }) => {
    await page.goto(`./${path}`);

    if (hasSidebar(page)) {
      const entry = sidebarEntry(page);
      await expect(entry).toBeVisible();
      await expect(entry).toHaveAccessibleName('更新日志');
      await expect(entry).toHaveAttribute('href', UPDATE_LOG_PATH);

      // 常驻：目录滚到底、滚到顶都看得见（它不跟着目录滚走）。
      // 先展开全部章，让滚动区真的能滚；内容短于视口时不滚（这时入口本来也一直可见）
      while ((await page.locator('aside[data-toc-sidebar] details:not([open]) > summary').count()) > 0) {
        await page.locator('aside[data-toc-sidebar] details:not([open]) > summary').first().click();
      }
      const scroll = page.locator('.toc-sidebar-scroll');
      if ((await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)) as boolean) {
        await scroll.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await expect(entry).toBeInViewport();
        await scroll.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      await expect(entry).toBeInViewport();

      // 更新日志页自己：这一项是当前态
      if (path === 'update-log/') await expect(entry).toHaveAttribute('aria-current', 'page');
      else await expect(entry).not.toHaveAttribute('aria-current', 'page');
      return;
    }

    // <720px：侧边栏不显示，入口在抽屉底部
    await expect(drawerEntry(page)).toBeHidden();
    await tocButton(page).click();
    await expect(drawerEntry(page)).toBeVisible();
    await expect(drawerEntry(page)).toHaveAttribute('href', UPDATE_LOG_PATH);
  });
}

test('AC-38：点底部的入口进更新日志', async ({ page }) => {
  await page.goto('./plan1/');
  if (hasSidebar(page)) {
    await sidebarEntry(page).click();
  } else {
    await tocButton(page).click();
    await drawerEntry(page).click();
  }
  await expect(page).toHaveURL(/\/update-log\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('更新日志');
});

test('AC-38：719px 的抽屉底部也有更新日志入口', async ({ page }) => {
  await page.setViewportSize({ width: 719, height: 800 });
  await page.goto('./plan1/');
  await expect(tocButton(page)).toBeVisible();
  await tocButton(page).click();
  const dialog = page.getByRole('dialog', { name: '目录' });
  const entry = dialog.locator('[data-toc-update-log]');
  await expect(entry).toBeVisible();
  await expect(entry).toBeInViewport();
});