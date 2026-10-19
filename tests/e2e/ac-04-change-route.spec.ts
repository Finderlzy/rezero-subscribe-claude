import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan, stepNav } from './route-helpers';
import { hasSidebar, openToc, sidebar } from './toc-helpers';

// AC-04（FR-14、FR-16）：已选方案三时，在目录把节点方案改为方案一 → 在“导入代理软件”点“上一步”，回到“五、打开面板”。
test('在目录里把方案三改成方案一，汇合点的“上一步”走方案一', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案三');
  await expect(page).toHaveURL(/\/plan3-residential-node\/$/);

  const toc = await openToc(page);
  await expect(toc.getByRole('button', { name: '切换到方案三' })).toBeHidden();
  await toc.getByRole('button', { name: '切换到方案一' }).click();
  // 当前页还是方案三的步骤：仍是当前项，但已落在“其他路线”上；按下的按钮隐藏，方案三的按钮出现
  const current = toc.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAccessibleName(/方案三：直接买住宅节点.*其他路线/);
  await expect(toc.getByRole('button', { name: '切换到方案一' })).toBeHidden();
  await expect(toc.getByRole('button', { name: '切换到方案三' })).toBeVisible();
  await expect(toc.getByRole('link', { name: /一、白嫖 ISP/ })).not.toHaveAccessibleName(/其他路线/);
  // 本页的上一步/下一步立即按新路线重算：下一步仍是汇合点（FR-14）
  await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveAttribute('href', /\/import-proxy\/$/);

  await toc.getByRole('link', { name: /^导入代理软件/ }).click();
  await expect(page).toHaveURL(/\/import-proxy\/$/);
  await expectScriptRan(page);
  await stepNav(page).getByRole('link', { name: /上一步/ }).click();
  await expect(page).toHaveURL(/\/plan1-panel\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('五、打开面板');
});

// FR-16：按章列出全部页面；“或”分组；当前路线正常、其他路线弱化并写“其他路线”；当前页高亮；
// 原理独有步骤标“原理”，操作视图下弱化、原理视图下正常；参考页在末尾单列。
test('目录区分当前路线、其他路线、当前页和原理独有步骤，参考页在附录页下面', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案二');
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  const toc = await openToc(page);

  await expect(toc.locator('.toc-chapter-title')).toHaveText(['开始', '准备节点和住宅 IP', '注册和订阅', '结尾', '附录']);
  const current = toc.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAccessibleName(/^测 IP 质量/);

  const plan1 = toc.getByRole('link', { name: /一、白嫖 ISP/ });
  await expect(plan1).toHaveAccessibleName(/其他路线/);
  await expect(toc.locator('[data-toc-step="plan1-free-isp"]')).toHaveAttribute('data-off-route', '');
  await expect(toc.getByRole('link', { name: /方案二：住宅 IP 服务器/ })).not.toHaveAccessibleName(/其他路线/);
  // 还没选手机系统：两个选项都在路线上，都不标“其他路线”
  await expect(toc.locator('[data-toc-option="android"] [data-toc-step]').first()).not.toHaveAttribute('data-off-route');
  await expect(toc.getByRole('button', { name: '切换到iPhone' }).first()).toBeVisible();

  // 原理独有步骤：标“原理”，操作视图下弱化（不写“其他路线”），切到原理视图后正常
  const recap = toc.locator('[data-toc-step="recap"]');
  await expect(recap).toContainText('原理');
  await expect(recap).not.toContainText('其他路线');
  await expect(recap).toHaveAttribute('data-off-route', '');
  await expect(toc.getByRole('link', { name: /五、打开面板/ })).toContainText('可跳过');
  await expect(toc.locator('.toc-reference').getByRole('link')).toHaveText(['常见问题', 'IP 质量实测合集']);
  await expect(toc.locator('[data-toc-step="appendix"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '目录' })).toBeHidden();
  await page.getByRole('group', { name: '视图' }).getByRole('button', { name: '原理' }).click();
  await openToc(page);
  await expect(recap).not.toHaveAttribute('data-off-route');

  // 点其他路线的步骤就进入那条路线
  await plan1.click();
  await expect(page).toHaveURL(/\/plan1-free-isp\/$/);
  await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/choose-plan\/$/);
});

// 目录（design §4.5，v2.2 D8）：≥1100px 是左侧常驻的侧边栏，页眉没有“目录”按钮；
// <1100px 点页眉的“目录”打开抽屉，手机全屏，更宽时贴左边宽 400px。Esc、点遮罩、点“关闭”都能关，关闭后焦点回到按钮。
test('≥1100px 常驻侧边栏，没有“目录”按钮；以下宽度“目录”打开抽屉，Esc、点遮罩、点“关闭”都能关，焦点回到按钮', async ({ page }) => {
  await page.goto('./overview/');
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  const toc = sidebar(page);
  const dialog = page.getByRole('dialog', { name: '目录' });
  const button = page.getByRole('button', { name: '目录', exact: true });
  if (hasSidebar(page)) {
    await expect(toc).toBeVisible();
    await expect(button).toBeHidden();
    return;
  }
  await expect(toc).toBeHidden();
  await expect(button).toHaveAttribute('aria-haspopup', 'dialog');

  await openToc(page);
  const viewport = page.viewportSize()!;
  // 等滑入结束再量位置（过渡 200ms）
  await expect.poll(async () => (await dialog.boundingBox())?.x).toBe(0);
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBe(viewport.width < 720 ? viewport.width : 400);
  expect(box.height).toBe(viewport.height);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();

  await openToc(page);
  await page.getByRole('button', { name: '关闭目录' }).click();
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();

  // 手机上抽屉全屏，没有露出来的遮罩可点
  if (viewport.width >= 720) {
    await openToc(page);
    await page.mouse.click(viewport.width - 20, viewport.height / 2);
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  }
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('“目录”是链接，点击到达首页的完整目录；≥1100px 的侧边栏是静态 HTML，照样能点', async ({ page }) => {
    await page.goto('./overview/');
    await expect(page.getByRole('button', { name: '目录', exact: true })).toHaveCount(0);
    if (hasSidebar(page)) {
      await expect(sidebar(page)).toBeVisible();
      await sidebar(page).getByRole('link', { name: '前言' }).click();
      await expect(page).toHaveURL(/\/preface\/$/);
      return;
    }
    await page.getByRole('link', { name: '目录', exact: true }).click();
    await expect(page).toHaveURL(/\/#home-chapters$/);
    await expect(page.getByRole('navigation', { name: '全站目录' }).getByRole('link', { name: '前言' })).toBeVisible();
  });
});
