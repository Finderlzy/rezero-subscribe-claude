import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 目录（design v3 §4.5）：≥720px 是左侧常驻的侧边栏（`aside[data-toc-sidebar]` 里的 `nav`，顶栏没有“目录”按钮）；
 * <720px 只有抽屉，点顶栏的“目录”按钮打开。
 */

/** 当前视口宽度下是不是常驻侧边栏（和 CSS 的断点一致） */
export const hasSidebar = (page: Page) => (page.viewportSize()?.width ?? 0) >= 720;

/** 页面里的目录（侧边栏或抽屉），不用先打开 */
export const sidebar = (page: Page) => page.locator('aside[data-toc-sidebar] nav[aria-label^="步骤目录"]');

/** 顶栏的“目录”按钮 */
export const tocButton = (page: Page) => page.getByRole('button', { name: '目录', exact: true });

/**
 * 拿到当前能用的目录：≥720px 是侧边栏（等目录脚本重画完）；<720px 点“目录”打开抽屉，
 * 先等目录脚本跑完（`data-toc-ready`，“目录”这时已从链接换成按钮）。
 */
export async function openToc(page: Page): Promise<Locator> {
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  if (hasSidebar(page)) {
    await expect(sidebar(page)).toBeVisible();
    await expect(tocButton(page)).toBeHidden();
    return sidebar(page);
  }
  await tocButton(page).click();
  await expect(page.getByRole('dialog', { name: '目录' })).toBeVisible();
  const toc = page.getByRole('dialog', { name: '目录' }).getByRole('navigation', { name: '步骤目录' });
  await expect(toc).toBeVisible();
  return toc;
}

/** 目录里的“切换”按钮：两份目录各有一个同名的，只拿这一个目录里的 */
export const switchButton = (toc: Locator, name: string) => toc.getByRole('button', { name });
