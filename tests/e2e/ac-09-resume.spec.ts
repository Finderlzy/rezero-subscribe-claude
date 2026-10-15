import { expect, test, type Page } from '@playwright/test';

// AC-09（FR-50、FR-18）：读到“防 DNS 泄漏”后关掉页面，在同一浏览器里重新打开首页 → 主按钮是
// “继续上次：防 DNS 泄漏”，“直接开始”降为次按钮；点击后回到这一步，路线选择不变。
// 没有进度和本机存储不可用时只有“直接开始”，见 ac-01 和下面最后一个用例。

const expectHomeReady = (page: Page) => expect(page.locator('main[data-home-ready]')).toHaveCount(1);
const expectStepReady = (page: Page) => expect(page.locator('main[data-route-ready]')).toHaveCount(1);

test.describe('AC-09 继续上次', () => {
  test('选方案三、读到“防 DNS 泄漏”，关页后重开首页能继续，路线选择不变', async ({ context, page }) => {
    await page.goto('./choose/node-plan/');
    await expectStepReady(page);
    await page.getByRole('list', { name: '选项' }).getByRole('link', { name: /方案三/ }).click();
    await expect(page).toHaveURL(/\/plan3-buy-node\/$/);
    await expectStepReady(page);

    await page.goto('./v2rayn-dns/');
    await expectStepReady(page);
    await page.close();

    const reopened = await context.newPage();
    await reopened.goto('./');
    await expectHomeReady(reopened);
    const actions = reopened.locator('.page-actions');
    const resume = actions.getByRole('link', { name: '继续上次：防 DNS 泄漏' });
    const start = actions.getByRole('link', { name: '直接开始' });
    await expect(resume).toBeVisible();
    await expect(start).toBeVisible();
    // 主按钮在前，“直接开始”换成次按钮样式。
    await expect(actions.getByRole('link').first()).toHaveText('继续上次：防 DNS 泄漏');
    await expect(resume).not.toHaveClass(/button-secondary/);
    await expect(start).toHaveClass(/button-secondary/);

    await resume.click();
    await expect(reopened).toHaveURL(/\/v2rayn-dns\/$/);
    await expect(reopened.getByRole('heading', { level: 1 })).toHaveText('防 DNS 泄漏');
    await expectStepReady(reopened);

    // 路线选择不变：节点方案仍是方案三，选择页上标着“当前选择”。
    await reopened.goto('./choose/node-plan/');
    await expectStepReady(reopened);
    await expect(reopened.getByRole('list', { name: '选项' }).locator('[aria-current="true"]')).toContainText('方案三');
  });

  test('记下的步骤已不在路线图里时，只有“直接开始”', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rezero-subscribe-claude:v1', JSON.stringify({ lastStep: 'gone-step', choices: {}, visited: [] }));
    });
    await page.goto('./');
    await expectHomeReady(page);
    await expect(page.getByRole('link', { name: /继续上次/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '直接开始' })).not.toHaveClass(/button-secondary/);
  });

  test('本机存储不可用时，读过步骤也只有“直接开始”、不报错', async ({ context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./v2rayn-dns/');
    await expectStepReady(page);
    await page.goto('./');
    await expectHomeReady(page);
    await expect(page.getByRole('link', { name: /继续上次/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '直接开始' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
