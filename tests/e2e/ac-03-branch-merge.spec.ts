import { expect, test } from '@playwright/test';

// AC-03（FR-12、FR-13）：在方案选择页选方案三 → 进入方案三第一步；继续下一步到汇合点；点“上一步” →
// 回到方案三的最后一步。汇合点构建时按默认路线写的是方案一的“运行脚本”，由页面脚本按本机选择改写。
// 第二到四章迁入前，F1 的汇合点暂时是“检查 IP 质量”；迁入后改成电脑代理软件选择页（#10）。
test('选方案三，走到汇合点再点“上一步”，回到方案三的最后一步', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案三/ }).click();

  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('购买住宅节点');

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await nav.getByRole('link', { name: /下一步.*检查 IP 质量/ }).click();
  await expect(page).toHaveURL(/\/check-ip-quality\/$/);

  const prev = nav.getByRole('link', { name: /上一步/ });
  await expect(prev).toHaveAttribute('href', /\/plan3-buy-node\/$/);
  await expect(prev).toContainText('购买住宅节点');
  await prev.click();
  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
});

// FR-12、FR-14：选过的选项标“当前选择”；回到选择页改选，之后的导航按新路线计算。
test('选择页标出当前选择，改选后汇合点的“上一步”跟着变', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  const options = page.getByRole('list', { name: '选项' }).getByRole('link');
  const currentBadges = page.getByText('当前选择', { exact: true }).filter({ visible: true });
  // 没选过时，只有默认标记
  await expect(currentBadges).toHaveCount(0);

  await options.nth(2).click();
  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
  await page.goto('./choose/node-plan/');
  await expect(options.nth(2).getByText('当前选择', { exact: true })).toBeVisible();
  await expect(options.nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(options.nth(0)).not.toHaveAttribute('aria-current', /.*/);
  await expect(currentBadges).toHaveCount(1);
  // 下一步指向本机所选方案的第一步
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步/ })).toHaveAttribute(
    'href',
    /\/plan3-buy-node\/$/,
  );

  await options.nth(1).click();
  await expect(page).toHaveURL(/\/plan2-buy-residential-vps\/$/);
  await page.goto('./check-ip-quality/');
  const prev = page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /上一步/ });
  await expect(prev).toHaveAttribute('href', /\/run-script\/$/);
  // 方案二下“运行脚本”是本章第 3 步，共 3 步（构建时按方案一写的是 4/4）
  await prev.click();
  await expect(page.getByText('一、准备住宅 IP · 第 3 步，共 3 步', { exact: true })).toBeVisible();
});
