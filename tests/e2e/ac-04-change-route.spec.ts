import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan, stepNav } from './route-helpers';
import { openToc } from './toc-helpers';

// AC-04（FR-14、FR-16）：已选方案三时，在目录把节点方案改为方案一 → 在“导入代理软件”点“上一步”，回到“五、安装面板”。
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('五、安装面板');
});

// FR-16：按章列出全部页面；“或”分组；当前路线正常、其他路线弱化并写“其他路线”；当前页高亮；
// 原理独有步骤标“原理”，操作视图下弱化、原理视图下正常；参考页在末尾单列。
test('目录区分当前路线、其他路线、当前页和原理独有步骤，参考页在末尾', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案二');
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  const toc = await openToc(page);

  await expect(toc.locator('.toc-chapter-title')).toHaveText(['开始', '准备节点和住宅 IP', '注册和订阅', '结尾']);
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
  await expect(toc.getByRole('link', { name: /五、安装面板/ })).toContainText('可跳过');
  await expect(toc.locator('.toc-reference').getByRole('link')).toHaveText(['常见问题', 'IP 质量实测合集']);

  const dialog = page.getByRole('dialog', { name: '目录' });
  if (await dialog.isVisible()) await page.keyboard.press('Escape');
  await page.getByRole('group', { name: '视图' }).getByRole('button', { name: '原理' }).click();
  await openToc(page);
  await expect(recap).not.toHaveAttribute('data-off-route');

  // 点其他路线的步骤就进入那条路线
  await plan1.click();
  await expect(page).toHaveURL(/\/plan1-free-isp\/$/);
  await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/choose-plan\/$/);
});

// 抽屉：<1100px 时从页眉的“目录”按钮打开，Esc 关闭，焦点回到按钮；≥1100px 是常驻侧栏，没有按钮。
test('窄屏用抽屉打开目录，Esc 关闭；宽屏是常驻侧栏', async ({ page }, testInfo) => {
  await page.goto('./overview/');
  await expect(page.locator('[data-toc-ready]')).toHaveCount(1);
  const button = page.getByRole('button', { name: '目录', exact: true });
  if (testInfo.project.name !== 'mobile-360') {
    await expect(button).toBeHidden();
    await expect(page.getByRole('navigation', { name: '步骤目录' })).toBeVisible();
    return;
  }
  await expect(page.getByRole('navigation', { name: '步骤目录' })).toBeHidden();
  await openToc(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '目录' })).toBeHidden();
  await expect(button).toBeFocused();

  await openToc(page);
  await page.getByRole('button', { name: '关闭目录' }).click();
  await expect(page.getByRole('dialog', { name: '目录' })).toBeHidden();
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('宽屏侧栏照常可点；窄屏没有打不开的“目录”按钮', async ({ page }, testInfo) => {
    await page.goto('./overview/');
    await expect(page.getByRole('button', { name: '目录', exact: true })).toBeHidden();
    if (testInfo.project.name === 'mobile-360') return;
    const toc = page.getByRole('navigation', { name: '步骤目录' });
    await toc.getByRole('link', { name: /^测 IP 质量/ }).click();
    await expect(page).toHaveURL(/\/check-ip\/$/);
  });
});
