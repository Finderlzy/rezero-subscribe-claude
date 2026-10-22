import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectScriptRan, stepNav } from './route-helpers';

// AC-11（FR-20）：在“方案三：直接买住宅节点”点“分流规则具体怎么写？” → 打开常见问题的对应那一页（一问一页）；
// 点“返回刚才的步骤” → 回到方案三；参考页没有上一步/下一步。目录由常驻侧边栏或页眉的“目录”提供，
// 参考页上不再有“打开目录”按钮（v2.2 W4c）；各条问题另有“回到：常见问题”，实测页另有“回到：IP 质量实测合集”。
// v3（V04）：这两块和步骤页的翻页一样是两行文字链接（design §4.6），不是实心按钮。
const returnLinks = (page: Page) => page.getByRole('link', { name: /返回刚才的步骤/ });

/** “返回刚才的步骤”两行：上面一行灰色方向文字，下面是步骤标题；读屏读整句 */
const expectReturnLink = async (link: Locator, title: string) => {
  await expect(link).toHaveAttribute('aria-label', `返回刚才的步骤：${title}`);
  await expect(link.locator('.step-nav-dir')).toContainText('返回刚才的步骤');
  await expect(link.locator('[data-reference-return-title]')).toHaveText(title);
};

/** 参考页上没有“打开目录”按钮（v2.2 W4c），也没有上一步/下一步和实心按钮 */
const noBrowseButtons = async (page: Page) => {
  await expect(page.getByRole('link', { name: '打开目录' })).toHaveCount(0);
  await expect(stepNav(page)).toHaveCount(0);
  await expect(page.locator('main .button')).toHaveCount(0);
};
const expectReady = (page: Page) => expect(page.locator('main[data-reference-ready]')).toHaveCount(1);

test('从方案三进入常见问题的对应那一页，“返回刚才的步骤”回到方案三', async ({ page }) => {
  await page.goto('./plan3-residential-node/');
  await expectScriptRan(page);
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '分流规则具体怎么写？' }).click();

  await expect(page).toHaveURL(/\/faq\/split-routing\/\?from=plan3-residential-node$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('分流规则具体怎么写？');
  // 标题上方和正文末尾各一个，都写出步骤标题；没有上一步/下一步，也不显示“打开目录”
  await expect(returnLinks(page)).toHaveCount(2);
  for (const link of await returnLinks(page).all()) {
    await expect(link).toHaveAttribute('href', /\/plan3-residential-node\/$/);
    await expectReturnLink(link, '方案三：直接买住宅节点');
  }
  // design §4.6：标题上方那块在 h1 上方
  const topReturn = (await page.locator('.reference-return-top').boundingBox())!;
  const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
  expect(topReturn.y + topReturn.height).toBeLessThanOrEqual(heading.y + 1);
  await noBrowseButtons(page);
  // design §5：翻页、跳过和这两块的可点区域 ≥44px
  for (const link of await returnLinks(page).all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const back = page.getByRole('link', { name: /^回到 常见问题$/ });
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);

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
    await expect(link).toHaveAttribute('href', /\/plan3-residential-node\/$/);
    await expectReturnLink(link, '方案三：直接买住宅节点');
  }
  await noBrowseButtons(page);
  await page.getByRole('link', { name: /^回到 IP 质量实测合集$/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
});

test('带 ?from= 打开 IP 质量实测合集：有“返回刚才的步骤”，正文末尾是“回到 附录”', async ({ page }) => {
  await page.goto('./ip-tests/?from=check-ip');
  await expectReady(page);
  await expect(returnLinks(page)).toHaveCount(2);
  await expect(returnLinks(page).first()).toHaveAttribute('href', /\/check-ip\/$/);
  await expect(page.getByRole('link', { name: /^回到 附录$/ })).toHaveAttribute('href', /\/appendix\/$/);
});

for (const path of ['./faq/', './faq/split-routing/', './ip-tests/', './ip-tests/ipequal/', './faq/?from=no-such-page', './faq/?from=faq']) {
  test(`直接打开 ${path}：没有“返回刚才的步骤”，也没有“打开目录”按钮`, async ({ page }) => {
    await page.goto(path);
    await expectReady(page);
    await expect(returnLinks(page)).toHaveCount(0);
    await noBrowseButtons(page);
  });
}

test('常见问题是各条问题的目录（一问一页见 ac-23）：点进一条，“回到 常见问题”回来', async ({ page }) => {
  await page.goto('./faq/');
  await expectReady(page);
  await page.locator('.prose').getByRole('link', { name: '装过了，想重装？' }).click();
  await expect(page).toHaveURL(/\/faq\/reinstall\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('装过了，想重装？');
  await page.getByRole('link', { name: /^回到 常见问题$/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('常见问题');
});

test('从后记进入附录，附录链到常见问题和 IP 质量实测合集', async ({ page }) => {
  await page.goto('./afterword/');
  await expectScriptRan(page);
  await stepNav(page).getByRole('link', { name: /下一步.*附录/ }).click();
  await expect(page).toHaveURL(/\/appendix\/$/);
  const prose = page.locator('.prose').filter({ visible: true });
  await expect(prose.getByRole('link', { name: '常见问题' })).toHaveAttribute('href', /\/faq\/\?from=appendix$/);
  await expect(prose.getByRole('link', { name: 'IP 质量实测合集' })).toHaveAttribute('href', /\/ip-tests\/\?from=appendix$/);
});

test.describe('关掉 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('带 ?from= 打开常见问题：保持构建时的样子（构建时返回链接是隐藏的）', async ({ page }) => {
    await page.goto('./faq/?from=plan3-residential-node');
    await expect(returnLinks(page)).toHaveCount(0);
    // 没有 JS 时参考页也有目录：≥720px 是常驻侧边栏，<720px 是链到首页完整目录的“目录”（FR-16）
    const sidebar = page.locator('aside[data-toc-sidebar]');
    if ((page.viewportSize()?.width ?? 0) >= 720) await expect(sidebar).toBeVisible();
    else await expect(page.locator('[data-toc-open]')).toHaveAttribute('href', /\/#home-chapters$/);
  });
});
