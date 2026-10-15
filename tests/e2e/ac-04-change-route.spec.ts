import { expect, test } from '@playwright/test';
import { openToc } from './toc-helpers';

// AC-04（FR-14、FR-16）：已选方案三时，在目录里把节点方案改为方案二 → 在电脑代理软件选择页点“上一步”，
// 回到“运行脚本”；再点“上一步”两次，回到“买住宅 IP 服务器并测 IP”。
test('在目录里把方案三改成方案二，汇合点的“上一步”走方案二', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案三/ }).click();
  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);

  let toc = await openToc(page);
  await toc.getByRole('button', { name: '切换到方案二：住宅 IP 服务器' }).click();
  // 当前页还是方案三的步骤：仍是当前项，但已落在“其他路线”上
  const current = toc.locator('a[aria-current="step"]');
  await expect(current).toContainText('购买住宅节点');
  await expect(current).toHaveAccessibleName(/其他路线/);

  await toc.getByRole('link', { name: '你用哪个电脑代理软件？' }).click();
  await expect(page).toHaveURL(/\/choose\/desktop-proxy\/$/);

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await nav.getByRole('link', { name: /上一步/ }).click();
  await expect(page).toHaveURL(/\/run-script\/$/);
  await nav.getByRole('link', { name: /上一步/ }).click();
  await nav.getByRole('link', { name: /上一步/ }).click();
  await expect(page).toHaveURL(/\/plan2-buy-residential-vps\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('买住宅 IP 服务器并测 IP');

  // FR-14：已读步骤不受影响
  toc = await openToc(page);
  await expect(toc.getByRole('link', { name: /已读：\s*购买住宅节点/ })).toHaveCount(1);
});

// FR-16：全部步骤都列出；当前路线正常显示，其他路线弱化并带“其他路线”；当前步骤高亮；标出可跳过、内容待补。
test('目录按章节列出全部步骤，区分当前路线、当前项、可跳过和内容待补', async ({ page }) => {
  await page.goto('./ssh-connect/');
  const toc = await openToc(page);

  await expect(toc.getByText('十一、订阅之后', { exact: true })).toBeVisible();
  const current = toc.locator('a[aria-current="step"]');
  // 共享步骤在方案一、方案二下各列一次，只有当前路线（方案一）上的那份是当前项
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAccessibleName(/(^|\s)连上服务器$/);

  // 默认路线是方案一；方案三的步骤列出、可点，标“其他路线”
  const plan3 = toc.getByRole('link', { name: /购买住宅节点/ });
  await expect(plan3).toHaveAccessibleName(/其他路线/);
  await expect(toc.getByRole('link', { name: /白嫖住宅 IP/ }).first()).not.toHaveAccessibleName(/其他路线/);
  await expect(toc.getByRole('button', { name: /^切换到方案一/ })).toBeHidden();
  await expect(toc.getByRole('button', { name: /^切换到方案三/ })).toBeVisible();

  await expect(toc.getByRole('link', { name: /清理本机的 Claude Code 配置/ })).toContainText('可跳过');
  await expect(toc.getByRole('link', { name: /下载 v2rayN 并导入节点/ })).toContainText('内容待补');

  // 点其他路线的步骤就进入那条路线（S5）
  await plan3.click();
  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /上一步/ })).toHaveAttribute(
    'href',
    /\/choose\/node-plan\/$/,
  );
});

// 抽屉：Esc 关闭，焦点回到打开按钮。≥1100px 的步骤页是常驻侧栏，宽屏改在常见问题页上测抽屉。
test('抽屉打开目录，Esc 关闭', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-360';
  await page.goto(mobile ? './webrtc/' : './faq/');
  await openToc(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '目录' })).toBeHidden();
  await expect(page.getByRole('button', { name: mobile ? '目录' : '打开目录' })).toBeFocused();
});
