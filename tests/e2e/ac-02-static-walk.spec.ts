import { expect, test, type Page } from '@playwright/test';

// AC-02 的静态部分（Issue #25 的验收）：不运行 JS，从首页点“开始”，在选择页选方案三、iPhone，一路点到“后记”“附录”再回到首页，
// 中途没有断链。没有 JS 时导航是“操作视图 + 未选”：节点方案按默认的方案二走，“选择方案”的下一步是方案二，选方案三要点正文里的链接；
// 手机系统没有默认，“选择手机系统”没有“下一步”，要点正文里的链接进入分支；
// “订阅”的下一步指向“选择手机系统”（再点会回到手机的第一段），所以那里点正文里的订阅分支链接（架构 §3 M3 的降级体验）。
// 每次换页都检查新页面是 200、标题对得上，并记下走过的页面。
test.use({ javaScriptEnabled: false });

/** 沿“下一步”走到 `until`（含），返回走过的页面标识 */
async function nextUntil(page: Page, until: string, seen: string[]): Promise<void> {
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  for (let n = 0; !page.url().endsWith(`/${until}/`); n++) {
    expect(n, `沿“下一步”走不到 ${until}，停在 ${page.url()}`).toBeLessThan(30);
    await nav.getByRole('link', { name: /下一步/ }).click();
    seen.push(new URL(page.url()).pathname.split('/').at(-2)!);
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  }
}

/** 点当前可见正文里的站内链接 */
async function bodyLink(page: Page, name: string, seen: string[]): Promise<void> {
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  seen.push(new URL(page.url()).pathname.split('/').at(-2)!);
}

test('关掉 JS：首页 → 方案三 → iPhone → 后记 → 附录 → 首页，没有断链', async ({ page }) => {
  const seen: string[] = [];
  const responses: string[] = [];
  page.on('response', (r) => {
    if (r.request().isNavigationRequest() && r.status() !== 200) responses.push(`${r.url()}：${r.status()}`);
  });

  await page.goto('./');
  await page.getByRole('link', { name: '从第 00 章开始' }).click();
  await expect(page).toHaveURL(/\/preface\/$/);
  seen.push('preface');

  await nextUntil(page, 'choose-plan', seen);
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步.*方案二：住宅 IP 服务器/ })).toBeVisible();
  await bodyLink(page, '方案三：直接买住宅节点', seen);
  await nextUntil(page, 'import-proxy', seen);
  // 没有 JS 时导航按默认的方案二算：汇合点的上一步是方案二（AC-09），不是刚走过的方案三
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /上一步.*方案二：住宅 IP 服务器/ })).toBeVisible();

  await nextUntil(page, 'choose-phone', seen);
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步/ })).toHaveCount(0);
  await bodyLink(page, 'iPhone：把 App Store 改到奥地利', seen);
  await nextUntil(page, 'subscribe', seen);
  await bodyLink(page, 'iPhone：注册美区 Apple ID', seen);
  await nextUntil(page, 'appendix', seen);

  // 附录是路线的最后一页（v2.2 D11、FR-11）：下一步是“回到首页”
  await page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步.*回到首页/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude（Re:Zero − Starting Life with Claude）');

  expect(responses).toEqual([]);
  // 构建时按原理视图写导航（用户 2026-10-22 决定去掉视图切换、固定原理视图）：经过原理独有的整体思路和小结
  expect(seen).toEqual([
    'preface', 'disclaimer', 'overview', 'clean-up', 'choose-plan',
    'plan3-residential-node', 'import-proxy', 'check-ip', 'recap', 'leak-protection', 'timezone', 'choose-phone',
    'iphone-app-store-austria', 'iphone-proxy', 'iphone-gmail',
    'register-gmail', 'chrome-sign-in', 'use-two-days', 'google-region', 'register-claude', 'subscribe',
    'iphone-apple-id', 'iphone-app-store-login', 'iphone-gift-card', 'iphone-subscribe', 'iphone-purchase-failed',
    'after-subscribe', 'thanks', 'afterword', 'appendix',
  ]);
});

test('关掉 JS：旁支页“被封了：申诉解封”的页脚是“回到：先用两天”和“下一步：修改 Google 账号地区”（FR-19）', async ({ page }) => {
  await page.goto('./google-appeal/');
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await expect(nav.getByRole('link', { name: /回到.*先用两天/ })).toHaveAttribute('href', /\/use-two-days\/$/);
  await expect(nav.getByRole('link', { name: /下一步.*修改 Google 账号地区/ })).toHaveAttribute('href', /\/google-region\/$/);
  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveCount(0);
  await expect(page.locator('[data-route-progress]')).toHaveText('注册和订阅 · 旁支');
});

test('关掉 JS：前言的上一步写“首页”，后记的下一步是“附录”，附录的下一步写“回到首页”（FR-11、design §4.1）', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await page.goto('./preface/');
  await expect(nav.locator('a[rel="prev"] [data-route-title]')).toHaveText('首页');
  await page.goto('./afterword/');
  await expect(nav.locator('a[rel="next"] [data-route-title]')).toHaveText('附录');
  await page.goto('./appendix/');
  await expect(nav.locator('a[rel="next"] [data-route-title]')).toHaveText('回到首页');
});
