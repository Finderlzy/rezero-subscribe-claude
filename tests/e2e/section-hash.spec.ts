import { expect, test, type Page } from '@playwright/test';

/**
 * V07（架构 §13.4，ADR-0006）：带 `#小节` 的地址要落到正文里对应的小节。
 * 现在还没有一章一页的步骤页，所以用有 h2 的参考页 `/ip-tests/voyracloud/` 验证；
 * V11 换成 11 页后同一套脚本覆盖步骤页（`/maintenance/#…`）。
 */
const PAGE = './ip-tests/voyracloud/';
const HEADING = '我的第三台（现在用的）';
const SLUG = '我的第三台现在用的';

const target = (page: Page) => page.getByRole('heading', { level: 2, name: HEADING });

/** 小节标题已经滚进视口，并且靠近顶部（基础样式给锚点留 16px） */
async function expectAtSection(page: Page): Promise<void> {
  await expect(target(page)).toBeVisible();
  await expect
    .poll(async () => (await target(page).boundingBox())?.y ?? Number.POSITIVE_INFINITY)
    .toBeLessThan(160);
  const box = await target(page).boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
}

test.beforeEach(async ({ page }) => {
  // 侧边栏只在 ≥720px 常驻；抽屉里的目录也有小节链接，这里统一用桌面宽度验证
  await page.setViewportSize({ width: 1280, height: 800 });
});

test('直接打开带 #小节 的地址就停在那个小节', async ({ page }) => {
  await page.goto(`${PAGE}#${SLUG}`);
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  await expectAtSection(page);
});

test('点侧边栏的小节链接滚过去（hashchange）', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('[data-toc-sidebar] .toc-sections a', { hasText: HEADING }).click();
  await expect.poll(async () => decodeURIComponent(new URL(page.url()).hash)).toBe(`#${SLUG}`);
  await expectAtSection(page);
});

test('从别的页面带 ?from= 进来，返回块展开后仍停在那个小节', async ({ page }) => {
  await page.goto(`${PAGE}?from=preface#${SLUG}`);
  await expect(page.locator('[data-reference-return]').first()).toBeVisible();
  await expectAtSection(page);
});

test('手动改地址里的 hash 也生效', async ({ page }) => {
  await page.goto(PAGE);
  await page.evaluate((slug) => {
    location.hash = slug;
  }, SLUG);
  await expect.poll(async () => decodeURIComponent(new URL(page.url()).hash)).toBe(`#${SLUG}`);
  await expectAtSection(page);
});

test('#main 这类不是小节的地址不额外处理，页面照常可用', async ({ page }) => {
  await page.goto(`${PAGE}#main`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(80);
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('原生锚点照样落到小节（design §5 的渐进增强）', async ({ page }) => {
    await page.goto(`${PAGE}#${SLUG}`);
    await expectAtSection(page);
  });
});
