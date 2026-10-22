import { expect, test, type Page } from '@playwright/test';

// AC-02 的静态部分（Issue #25 的验收）：不运行 JS，从首页点“开始”，按 V10 的新路线走完 4 种选择组合
// （方案一/二 × iPhone/安卓），一直走到后记再回到首页，中途没有断链。
// V10（实施计划 §3.1）：一章一页、5 章 2 个分叉点。没有 JS 时节点方案按路线图的默认走——整体思路的“下一步”是方案二；
// 手机系统没有默认，电脑端（选择页）没有“下一步”，要点正文里的选项卡片进入分支。卡片由原理版 frontmatter 的 options
// 在构建时生成，每个选项的标题就是链到它第一步的 <a>（FR-12），所以不运行 JS 也能选。
//
// V10 删除的用例（页面和功能都没有了）：
// - 旁支页“被封了：申诉解封”（google-appeal）：route.yaml 的 side 段在 V10 为空，没有旁支页，FR-19 的“回到：…”页脚不存在；
// - 附录：V10 是 11 页 5 章，后记是最后一页（下一步“回到首页”），旧用例里“后记 → 附录 → 首页”的两跳合并成一跳。
test.use({ javaScriptEnabled: false });

const PLANS = {
  方案一: { card: 'plan-1', first: 'plan1' },
  方案二: { card: 'plan-2', first: 'plan2-residential-server' },
};
const PHONES = {
  'iPhone / iPad': { card: 'iphone', steps: ['iphone-prepare', 'iphone-subscription'] },
  安卓: { card: 'android', steps: ['android-prepare', 'android-subscription'] },
};

/** 当前页的标识：`/<id>/` 里的 id */
const pageId = (page: Page) => new URL(page.url()).pathname.split('/').at(-2)!;

/** 选择页上某个选项的卡片（由 frontmatter 生成，FR-12） */
const card = (page: Page, option: string) => page.locator(`.prose .option-block[data-option="${option}"]`);

/** 沿“下一步”走到 `until`（含），把经过的页面标识追加到 `seen` */
async function nextUntil(page: Page, until: string, seen: string[]): Promise<void> {
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  for (let n = 0; pageId(page) !== until; n++) {
    expect(n, `沿“下一步”走不到 ${until}，停在 ${page.url()}`).toBeLessThan(30);
    await nav.getByRole('link', { name: /下一步/ }).click();
    seen.push(pageId(page));
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  }
}

for (const plan of Object.keys(PLANS) as (keyof typeof PLANS)[]) {
  for (const phone of Object.keys(PHONES) as (keyof typeof PHONES)[]) {
    test(`关掉 JS：首页 → ${plan} → ${phone} → 后记 → 首页，没有断链`, async ({ page }) => {
      const seen: string[] = [];
      const responses: string[] = [];
      page.on('response', (r) => {
        if (r.request().isNavigationRequest() && r.status() !== 200) responses.push(`${r.url()}：${r.status()}`);
      });

      await page.goto('./');
      await page.getByRole('link', { name: '从第 00 章开始' }).click();
      await expect(page).toHaveURL(/\/preface\/$/);
      seen.push('preface');

      // 前言 → 整体思路（节点方案的选择页）
      await nextUntil(page, 'overview', seen);
      // 卡片构建时就是链到这个选项第一步的链接，点它进入方案一/二
      await expect(card(page, PLANS[plan].card).getByRole('link')).toHaveAttribute('href', new RegExp(`/${PLANS[plan].first}/$`));
      await card(page, PLANS[plan].card).getByRole('link').click();
      await expect(page).toHaveURL(new RegExp(`/${PLANS[plan].first}/$`));
      seen.push(pageId(page));

      // 方案的页面 → 客户端配置（手机的选择页）。没选手机时这里没有“下一步”（FR-12）
      await nextUntil(page, 'client-desktop', seen);
      await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步/ })).toHaveCount(0);
      await expect(card(page, PHONES[phone].card).getByRole('link')).toHaveAttribute(
        'href',
        new RegExp(`/${PHONES[phone].steps[0]}/$`),
      );
      await card(page, PHONES[phone].card).getByRole('link').click();
      await expect(page).toHaveURL(new RegExp(`/${PHONES[phone].steps[0]}/$`));
      seen.push(pageId(page));

      // 手机的两页 → 日常维护 → 后记
      await nextUntil(page, 'afterword', seen);
      // 后记是路线的最后一页（FR-11）：下一步是“回到首页”
      await page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步.*回到首页/ }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude（Re:Zero − Starting Life with Claude）');

      expect(responses).toEqual([]);
      expect(seen).toEqual(['preface', 'overview', PLANS[plan].first, 'client-desktop', ...PHONES[phone].steps, 'maintenance', 'afterword']);
    });
  }
}

// 选择卡片是构建时写好的链接（FR-12，design §4.2）：不运行 JS 也能选；方案二按路线图的 default 标“推荐”。
test('关掉 JS：两个选择页的选项卡片都是构建时写好的链接，方案二标“推荐”', async ({ page }) => {
  await page.goto('./overview/');
  await expect(page.locator('.prose .option-block')).toHaveCount(2);
  await expect(card(page, 'plan-1').getByRole('link')).toHaveAttribute('href', /\/plan1\/$/);
  await expect(card(page, 'plan-2').getByRole('link')).toHaveAttribute('href', /\/plan2-residential-server\/$/);
  await expect(card(page, 'plan-2').locator('.option-tag')).toHaveText('推荐');
  await expect(card(page, 'plan-1').locator('.option-tag')).toHaveCount(0);
  // 没有 JS 时导航按默认的方案二算
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步.*方案二：配置住宅 IP 服务器/ })).toHaveAttribute(
    'href',
    /\/plan2-residential-server\/$/,
  );

  await page.goto('./client-desktop/');
  await expect(page.locator('.prose .option-block')).toHaveCount(2);
  await expect(card(page, 'iphone').getByRole('link')).toHaveAttribute('href', /\/iphone-prepare\/$/);
  await expect(card(page, 'android').getByRole('link')).toHaveAttribute('href', /\/android-prepare\/$/);
  // 手机系统没有 default，不标“推荐”；没选时没有“下一步”
  await expect(page.locator('.prose .option-tag')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: '上一步和下一步' }).getByRole('link', { name: /下一步/ })).toHaveCount(0);
});

test('关掉 JS：前言的上一步写“首页”，后记的下一步写“回到首页”（FR-11、design §4.1）', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  await page.goto('./preface/');
  await expect(nav.locator('a[rel="prev"] [data-route-title]')).toHaveText('首页');
  await page.goto('./afterword/');
  await expect(nav.locator('a[rel="next"] [data-route-title]')).toHaveText('回到首页');
  await expect(nav.locator('a[rel="next"]')).toHaveAttribute('href', /^\/(?:index\.html)?$/);
});
