import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectScriptRan } from './route-helpers';
import { openToc } from './toc-helpers';

// AC-11（FR-20）：参考页没有上一步/下一步，页脚“回到：<上级>”，从步骤链接进来时还有“返回刚才的步骤”。
// 目录由常驻侧边栏或页眉的目录提供，参考页上没有“打开目录”按钮（v2.2 W4c）；v3（V04）这两块和步骤页的翻页一样
// 是两行文字链接（design §4.6），不是实心按钮。
//
// V10（作者新稿）只剩 IP 实测这一组参考页：/ip-tests/ 和 6 篇 /ip-tests/<id>/；眉题“日常维护 · …”，
// 合集页脚回“日常维护、风控应对与常见故障”，各篇实测页脚回“IP 质量实测合集”；目录把它挂在“日常维护”章末尾。
// 步骤页正文不再链到参考页，也没有常见问题、附录、旁支页（google-appeal）和方案三：原来“从方案三进入常见问题/
// 实测页”“从后记进入附录”等依赖这些页面和正文链接的用例随 V10 删除，参考页改为从目录或直接地址进入。
// `?from=` 的机制由 src/lib/reference-return.test.ts 和组件测试覆盖；e2e 没有正文入口，只保留直接带 ?from=
// 打开参考页时“返回刚才的步骤”的核对。
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
  await expect(page.getByRole('navigation', { name: '上一步和下一步' })).toHaveCount(0);
  await expect(page.locator('main .button')).toHaveCount(0);
};
const expectReady = (page: Page) => expect(page.locator('main[data-reference-ready]')).toHaveCount(1);

test('从目录进入 IP 质量实测合集：页脚回到日常维护，没有上一步/下一步', async ({ page }) => {
  await page.goto('./maintenance/');
  await expectScriptRan(page);
  const toc = await openToc(page);
  await toc.getByRole('link', { name: 'IP 质量实测合集' }).click();

  await expect(page).toHaveURL(/\/ip-tests\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
  await expect(page.locator('.page-body .eyebrow')).toHaveText('日常维护 · IP 质量实测合集');
  await expectReady(page);
  await noBrowseButtons(page);
  // design §4.6：页脚“← 回到”，写出上级页面的标题
  const back = page.getByRole('link', { name: /^回到 日常维护、风控应对与常见故障$/ });
  await expect(back).toHaveAttribute('href', /\/maintenance\/$/);
  // design §5：可点区域 ≥44px
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('从实测合集的表格进入一篇实测：页脚回到实测合集', async ({ page }) => {
  await page.goto('./ip-tests/');
  await expectReady(page);
  await page.locator('.prose').getByRole('link', { name: '实测：VoyraCloud 住宅服务器' }).click();

  await expect(page).toHaveURL(/\/ip-tests\/voyracloud\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('实测：VoyraCloud 住宅服务器');
  await expect(page.locator('.page-body .eyebrow')).toHaveText('日常维护 · IP 质量实测合集');
  await expectReady(page);
  await noBrowseButtons(page);
  const back = page.getByRole('link', { name: /^回到 IP 质量实测合集$/ });
  await expect(back).toHaveAttribute('href', /\/ip-tests\/$/);
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  await back.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
});

// 步骤页没有链到参考页的正文链接（V10），这里直接带 ?from= 打开，核对返回块本身
for (const { path, href, title } of [
  { path: './ip-tests/?from=maintenance', href: /\/maintenance\/$/, title: '日常维护、风控应对与常见故障' },
  { path: './ip-tests/voyracloud/?from=client-desktop', href: /\/client-desktop\/$/, title: '客户端配置与环境验证：电脑端' },
]) {
  test(`直接带 ?from= 打开 ${path}：有两块“返回刚才的步骤”`, async ({ page }) => {
    await page.goto(path);
    await expectReady(page);
    await expect(returnLinks(page)).toHaveCount(2);
    for (const link of await returnLinks(page).all()) {
      await expect(link).toHaveAttribute('href', href);
      await expectReturnLink(link, title);
    }
  });
}

for (const path of ['./ip-tests/', './ip-tests/voyracloud/', './ip-tests/?from=no-such-page', './ip-tests/?from=ip-tests']) {
  test(`直接打开 ${path}：没有“返回刚才的步骤”，也没有“打开目录”按钮`, async ({ page }) => {
    await page.goto(path);
    await expectReady(page);
    await expect(returnLinks(page)).toHaveCount(0);
    await noBrowseButtons(page);
  });
}

test.describe('关掉 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('带 ?from= 打开 IP 质量实测合集：保持构建时的样子（构建时返回链接是隐藏的）', async ({ page }) => {
    await page.goto('./ip-tests/?from=maintenance');
    await expect(returnLinks(page)).toHaveCount(0);
    // 没有 JS 时参考页也有目录：≥720px 是常驻侧边栏，<720px 是链到首页章节简介的“目录”（FR-16）
    const sidebar = page.locator('aside[data-toc-sidebar]');
    if ((page.viewportSize()?.width ?? 0) >= 720) await expect(sidebar).toBeVisible();
    else await expect(page.locator('[data-toc-open]')).toHaveAttribute('href', /\/#home-chapters$/);
  });
});
