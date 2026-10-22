import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan, stepLabel, stepNav, stepNo } from './route-helpers';

// AC-09（FR-12、FR-13）：节点方案默认方案二，手机系统没有默认。在无痕窗口（新的浏览器上下文）打开分叉点两侧的页面：
// 节点方案没选时按方案二走（分叉后的第一页 client-desktop 的上一步是方案二）；手机系统没选时，手机分支的汇合点
// “日常维护”的上一步是分叉点 client-desktop（V10：分叉段的汇合点是下一章的第一页），选择页没选时没有“下一步”。
// 选择页都没有“默认”字样。每个用例都等页面脚本跑完：脚本按空的本机选择重算，结果要和构建时写好的一致。
test('客户端配置与环境验证：电脑端：上一步是默认的方案二', async ({ page }) => {
  await page.goto('./client-desktop/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*方案二：配置住宅 IP 服务器/ })).toHaveAttribute(
    'href',
    /\/plan2-residential-server\/$/,
  );
});

test('日常维护：没选手机时上一步是分叉点“客户端配置与环境验证：电脑端”', async ({ page }) => {
  await page.goto('./maintenance/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*客户端配置与环境验证：电脑端/ })).toHaveAttribute(
    'href',
    /\/client-desktop\/$/,
  );
  // 普通页照常写章内进度（V10：日常维护一章只有一页）
  await expect(page.locator('[data-route-progress]')).toHaveText(/^日常维护，第 \d+ 步，共 \d+ 步$/);
  expect(await stepNo(page)).toMatch(/^\d+$/);
});

test('选择方案没选时下一步是方案二、不标“已选”；选择手机系统没选时没有“下一步”；选择页都没有“默认”字样', async ({ page }) => {
  // 新稿正文里“默认”是正常用词（默认的节点、保持默认），所以只看正文以外的界面文案：选项卡片和页面外壳都不能写“默认”
  const noDefault = async () => {
    const outsideProse = await page.evaluate(() => {
      const body = document.body.cloneNode(true) as HTMLElement;
      for (const prose of body.querySelectorAll('.prose')) prose.remove();
      return body.textContent ?? '';
    });
    expect(outsideProse).not.toContain('默认');
    for (const block of await page.locator('.option-block').all()) await expect(block).not.toContainText('默认');
  };

  for (const choose of ['overview', 'client-desktop']) {
    await page.goto(`./${choose}/`);
    await expectScriptRan(page);
    await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toBeVisible();
    if (choose === 'overview') {
      await expect(stepNav(page).getByRole('link', { name: /下一步.*方案二：配置住宅 IP 服务器/ })).toHaveAttribute(
        'href',
        /\/plan2-residential-server\/$/,
      );
    } else {
      await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveCount(0);
    }
    // 默认方案不算读者选过：没有选项块标“已选”
    await expect(page.locator('.option-block[aria-current="true"]')).toHaveCount(0);
    await noDefault();
    // 选择页不计步数：眉题结尾写“选择”（design §4.2）
    expect(await stepLabel(page)).toBe('选择');
    expect(await stepNo(page)).toBeNull();
  }
});

// 选择页的选项块（#29）和目录（#30）改选后派发 reader-choices-changed：导航要按新选择重算，不用刷新页面。
test('收到 reader-choices-changed 后按新选择重算导航', async ({ page }) => {
  await page.goto('./client-desktop/');
  await expectScriptRan(page);
  const prev = stepNav(page).getByRole('link', { name: /上一步/ });
  await expect(prev).toHaveAttribute('href', /\/plan2-residential-server\/$/);

  await page.evaluate(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: { 'node-plan': 'plan-1' } }));
    document.dispatchEvent(new Event('reader-choices-changed'));
  });
  await expect(prev).toHaveAttribute('href', /\/plan1\/$/);
  await expect(prev).toContainText('方案一：搭建专属住宅代理节点');
});

// FR-12：选过之后，选择页的“下一步”是所选选项的第一页；汇合点的上一步是所选分支的最后一步（FR-13）。
test('进入方案一后，选择页出现“下一步”，汇合点的上一步是方案一', async ({ page }) => {
  await page.goto('./overview/');
  await expectScriptRan(page);
  await chooseOption(page, '方案一');

  await page.goto('./overview/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*方案一：搭建专属住宅代理节点/ })).toHaveAttribute(
    'href',
    /\/plan1\/$/,
  );

  await page.goto('./client-desktop/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*方案一：搭建专属住宅代理节点/ })).toHaveAttribute(
    'href',
    /\/plan1\/$/,
  );
  // 选择页不计步数（V10：分叉段的汇合点是下一章的第一页，它本身是手机系统的选择页）
  expect(await stepLabel(page)).toBe('选择');
  expect(await stepNo(page)).toBeNull();
});
