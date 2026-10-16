import { expect, test, type Page } from '@playwright/test';
import { expectScriptRan, stepNav } from './route-helpers';

// AC-11（FR-20）：在“方案三：直接买住宅节点”点“分流规则具体怎么写？” → 打开常见问题的对应条目；
// 点“返回刚才的步骤” → 回到方案三；参考页没有上一步/下一步。直接打开参考页时显示“打开目录”；实测页另有“回到：IP 质量实测合集”。
const returnLinks = (page: Page) => page.getByRole('link', { name: /返回刚才的步骤/ });
const tocLink = (page: Page) => page.getByRole('link', { name: '打开目录' });
const expectReady = (page: Page) => expect(page.locator('main[data-reference-ready]')).toHaveCount(1);

test('从方案三进入常见问题的对应条目，“返回刚才的步骤”回到方案三', async ({ page }) => {
  await page.goto('./plan3-residential-node/');
  await expectScriptRan(page);
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '分流规则具体怎么写？' }).click();

  await expect(page).toHaveURL(/\/faq\/\?from=plan3-residential-node#/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('常见问题');
  await expect(page.getByRole('heading', { level: 2, name: '分流规则具体怎么写？' })).toBeInViewport();
  // 标题上方和正文末尾各一个，都写出步骤标题；没有上一步/下一步，也不显示“打开目录”
  await expect(returnLinks(page)).toHaveCount(2);
  for (const link of await returnLinks(page).all()) {
    await expect(link).toHaveText('← 返回刚才的步骤：方案三：直接买住宅节点');
    await expect(link).toHaveAttribute('href', /\/plan3-residential-node\/$/);
  }
  await expect(stepNav(page)).toHaveCount(0);
  await expect(tocLink(page)).toBeHidden();

  await returnLinks(page).first().click();
  await expect(page).toHaveURL(/\/plan3-residential-node\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('方案三：直接买住宅节点');
});

test('从方案三进入实测页：有“返回刚才的步骤”和“回到：IP 质量实测合集”', async ({ page }) => {
  await page.goto('./plan3-residential-node/');
  await expectScriptRan(page);
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '它的实测' }).click();

  await expect(page).toHaveURL(/\/ip-tests\/ipequal\/\?from=plan3-residential-node$/);
  await expect(returnLinks(page)).toHaveCount(2);
  for (const link of await returnLinks(page).all()) {
    await expect(link).toHaveText('← 返回刚才的步骤：方案三：直接买住宅节点');
    await expect(link).toHaveAttribute('href', /\/plan3-residential-node\/$/);
  }
  await expect(stepNav(page)).toHaveCount(0);
  await expect(tocLink(page)).toBeHidden();
  await page.getByRole('link', { name: '回到：IP 质量实测合集' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
});

test('带 ?from= 打开 IP 质量实测合集：有“返回刚才的步骤”，页脚隐藏的“打开目录”不留空行', async ({ page }) => {
  await page.goto('./ip-tests/?from=check-ip');
  await expectReady(page);
  await expect(returnLinks(page)).toHaveCount(2);
  await expect(returnLinks(page).first()).toHaveAttribute('href', /\/check-ip\/$/);
  await expect(page.locator('.page-actions')).toBeHidden();
});

for (const path of ['./faq/', './ip-tests/', './ip-tests/ipequal/', './faq/?from=no-such-page', './faq/?from=faq']) {
  test(`直接打开 ${path}：没有“返回刚才的步骤”，有“打开目录”`, async ({ page }) => {
    await page.goto(path);
    await expectReady(page);
    await expect(tocLink(page)).toBeVisible();
    await expect(returnLinks(page)).toHaveCount(0);
    await expect(stepNav(page)).toHaveCount(0);
  });
}

test('“打开目录”进入首页的目录', async ({ page }) => {
  await page.goto('./faq/');
  await tocLink(page).click();
  await expect(page).toHaveURL(/\/#home-chapters$/);
  await expect(page.getByRole('navigation', { name: '全站目录' }).getByRole('link', { name: '前言' })).toBeVisible();
});

test.describe('关掉 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('带 ?from= 打开常见问题：保持构建时的样子，只有“打开目录”', async ({ page }) => {
    await page.goto('./faq/?from=plan3-residential-node');
    await expect(tocLink(page)).toBeVisible();
    await expect(returnLinks(page)).toHaveCount(0);
  });
});
