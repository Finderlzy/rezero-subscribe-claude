import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan, stepLabel, stepNav, stepNo } from './route-helpers';

// AC-09（FR-12、FR-13）：节点方案默认方案二，手机系统没有默认。在无痕窗口（新的浏览器上下文）打开汇合点和“订阅”：
// 节点方案没选时按方案二走；手机系统没选时指向它的选择页，选择页没选时没有“下一步”。两个选择页都没有“默认”字样。
// 每个用例都等页面脚本跑完：脚本按空的本机选择重算，结果要和构建时写好的一致。
test('导入代理软件：上一步是默认的方案二，进度写出第几步', async ({ page }) => {
  await page.goto('./import-proxy/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*方案二：住宅 IP 服务器/ })).toHaveAttribute(
    'href',
    /\/plan2-residential-server\/$/,
  );
  await expect(page.locator('[data-route-progress]')).toHaveText(/^准备节点和住宅 IP，第 \d+ 步，共 \d+ 步$/);
  expect(await stepNo(page)).toMatch(/^\d+$/);
});

test('注册 Gmail：上一步是“选择手机系统”', async ({ page }) => {
  await page.goto('./register-gmail/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*选择手机系统/ })).toHaveAttribute('href', /\/choose-phone\/$/);
});

test('订阅：下一步是“选择手机系统”', async ({ page }) => {
  await page.goto('./subscribe/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*选择手机系统/ })).toHaveAttribute('href', /\/choose-phone\/$/);
});

test('选择方案没选时下一步是方案二、不标“已选”；选择手机系统没选时没有“下一步”；都没有“默认”字样', async ({ page }) => {
  for (const choose of ['choose-plan', 'choose-phone']) {
    await page.goto(`./${choose}/`);
    await expectScriptRan(page);
    await expect(stepNav(page).getByRole('link', { name: /上一步/ })).toBeVisible();
    if (choose === 'choose-plan') {
      await expect(stepNav(page).getByRole('link', { name: /下一步.*方案二：住宅 IP 服务器/ })).toHaveAttribute(
        'href',
        /\/plan2-residential-server\/$/,
      );
    } else {
      await expect(stepNav(page).getByRole('link', { name: /下一步/ })).toHaveCount(0);
    }
    // 默认方案不算读者选过：没有选项块标“已选”
    await expect(page.locator('.option-block[aria-current="true"]')).toHaveCount(0);
    await expect(page.getByRole('main').getByText('默认')).toHaveCount(0);
    // 选择页不计步数：眉题结尾写“选择”（design §4.2）
    expect(await stepLabel(page)).toBe('选择');
    expect(await stepNo(page)).toBeNull();
  }
});

// 选择页的选项块（#29）和目录（#30）改选后派发 reader-choices-changed：导航要按新选择重算，不用刷新页面。
test('收到 reader-choices-changed 后按新选择重算导航', async ({ page }) => {
  await page.goto('./import-proxy/');
  await expectScriptRan(page);
  const prev = stepNav(page).getByRole('link', { name: /上一步/ });
  await expect(prev).toHaveAttribute('href', /\/plan2-residential-server\/$/);

  await page.evaluate(() => {
    localStorage.setItem('rezero-subscribe-claude:v2', JSON.stringify({ choices: { 'node-plan': 'plan-3' }, view: 'operation' }));
    document.dispatchEvent(new Event('reader-choices-changed'));
  });
  await expect(prev).toHaveAttribute('href', /\/plan3-residential-node\/$/);
  await expect(prev).toContainText('方案三：直接买住宅节点');
});

// FR-12：选过之后，选择页的“下一步”是所选选项的第一页；汇合点的上一步是所选分支的最后一步（FR-13）。
test('进入方案三后，选择页出现“下一步”，汇合点的上一步是方案三', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案三');

  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*方案三：直接买住宅节点/ })).toHaveAttribute(
    'href',
    /\/plan3-residential-node\/$/,
  );

  await page.goto('./import-proxy/');
  await expectScriptRan(page);
  await expect(stepNav(page).getByRole('link', { name: /上一步.*方案三：直接买住宅节点/ })).toHaveAttribute(
    'href',
    /\/plan3-residential-node\/$/,
  );
  await expect(page.locator('[data-route-progress]')).toHaveText(/^准备节点和住宅 IP，第 \d+ 步，共 \d+ 步$/);
  // v2.2 D10：章和步写成文字，步数不补零
  expect(await stepNo(page)).toMatch(/^\d+$/);
});
