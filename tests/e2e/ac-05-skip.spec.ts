import { expect, test } from '@playwright/test';
import { clickBodyLink, expectScriptRan, stepNav } from './route-helpers';

// AC-05（FR-15）：已选方案一，在“四、购买 ISP 代理”点“下一步”到“五、安装面板”，点跳过 → 到“导入代理软件”。
// 选方案一：在选择页点正文里方案一的第一步，打开只属于方案一的页面时页面脚本记下这个选项（FR-17）。
test('已选方案一：四、购买 ISP 代理 → 下一步 → 五、安装面板 → 跳过 → 导入代理软件', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await clickBodyLink(page, '一、白嫖 ISP');

  await page.goto('./plan1-buy-isp/');
  await expectScriptRan(page);
  await stepNav(page).getByRole('link', { name: /下一步.*五、安装面板/ }).click();
  await expect(page).toHaveURL(/\/plan1-panel\/$/);
  await expectScriptRan(page);

  const skip = page.getByRole('main').getByRole('link', { name: '跳过', exact: true });
  await expect(skip).toHaveAttribute('href', /\/import-proxy\/$/);
  await skip.click();
  await expect(page).toHaveURL(/\/import-proxy\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('导入代理软件');

  // 汇合点的上一步按本机保存的方案一计算，是方案一的最后一步（FR-13），不是选择页
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*五、安装面板/ })).toHaveAttribute('href', /\/plan1-panel\/$/);
});

test('不可跳过的步骤没有跳过按钮', async ({ page }) => {
  await page.goto('./plan1-buy-isp/');
  await expectScriptRan(page);
  await expect(page.getByRole('main').getByRole('link', { name: /跳过/ })).toHaveCount(0);
});

// 跳过链接在构建时写好，不运行 JS 也能用（design §5 渐进增强）。
test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('“五、安装面板”的跳过按钮仍指向“导入代理软件”', async ({ page }) => {
    await page.goto('./plan1-panel/');
    await expect(page.getByRole('main').getByRole('link', { name: '跳过', exact: true })).toHaveAttribute('href', /\/import-proxy\/$/);
  });
});
