import { expect, test } from '@playwright/test';

// AC-03（FR-12、FR-13）：在方案选择页选方案三 → 进入方案三第一步；继续下一步到电脑代理软件选择页（F1 的汇合点）；
// 点“上一步” → 回到方案三的最后一步。汇合点构建时按默认路线写的是方案一的“运行脚本”，由页面脚本按本机选择改写。
test('选方案三，走到汇合点再点“上一步”，回到方案三的最后一步', async ({ page }) => {
  await page.goto('./choose/node-plan/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案三/ }).click();

  await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('购买住宅节点');

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await nav.getByRole('link', { name: /下一步.*你用哪个电脑代理软件/ }).click();
  await expect(page).toHaveURL(/\/choose\/desktop-proxy\/$/);

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
  await page.goto('./choose/desktop-proxy/');
  const prev = page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /上一步/ });
  await expect(prev).toHaveAttribute('href', /\/run-script\/$/);
  // 方案二下“运行脚本”是本章第 3 步，共 3 步（构建时按方案一写的是 4/4）
  await prev.click();
  await expect(page.getByText('一、准备住宅 IP · 第 3 步，共 3 步', { exact: true })).toBeVisible();
});

// F2 跨两章（需求 §5.2）：选 Clash Verge 后，第二章和第三章的 DNS 都走 Clash Verge，WebRTC 是汇合点。
test('选 Clash Verge，走到 WebRTC 再点“上一步”，回到 Clash Verge 的 DNS', async ({ page }) => {
  await page.goto('./choose/desktop-proxy/');
  await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /Clash Verge/ }).click();
  await expect(page).toHaveURL(/\/clash-verge-import\/$/);

  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  for (const path of ['clash-verge-tun', 'clash-verge-dns', 'webrtc']) {
    await nav.getByRole('link', { name: /下一步/ }).click();
    await expect(page).toHaveURL(new RegExp(`/${path}/$`));
  }
  await expect(page.getByText('三、防泄漏 · 第 2 步，共 3 步', { exact: true })).toBeVisible();

  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveAttribute('href', /\/clash-verge-dns\/$/);
});
