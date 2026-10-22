import { expect, test, type APIRequestContext } from '@playwright/test';
import { REMOVED_PAGES } from '../../src/lib/route/route-map';
import { builtPages } from './built-pages';

// AC-15（FR-60）：构建产物放到静态文件服务器的根路径或子路径下 → 所有页面、图片、导航都正常。
// playwright.config.ts 让这个文件跑两种 base：根路径由 mobile-360、tablet-768、desktop-1280 测（dist/，astro preview），
// sub-path 测 /sub/（dist-sub/，tests/e2e/static-server.mjs，子路径以外的请求一律 404）。
// 页面清单取自该 project 的构建产物（metadata.dist）。

const builtPagesOfProject = () => builtPages(test.info().project.metadata.dist as string);

/** HTML 里引用的站内地址（href、src、srcset），返回解码前的路径；外链、锚点不算。 */
function sameOriginRefs(html: string, pageUrl: URL): URL[] {
  const values = [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) {
    values.push(...m[1].split(',').map((candidate) => candidate.trim().split(/\s+/)[0]));
  }
  return values
    .filter((value) => value && !value.startsWith('#'))
    .map((value) => new URL(value.replaceAll('&amp;', '&'), pageUrl))
    .filter((url) => url.origin === pageUrl.origin);
}

async function statusOf(request: APIRequestContext, url: URL) {
  return (await request.get(url.href, { maxRedirects: 0 })).status();
}

test('每个页面引用的站内链接、图片、样式和脚本都在 base 下，而且都能打开', async ({ request, baseURL }) => {
  // 只发请求、和视口无关：根路径在 desktop-1280 里查一次就够
  test.skip(['mobile-360', 'tablet-768'].includes(test.info().project.name), '与 desktop-1280 的根路径检查相同');
  const base = new URL(baseURL!).pathname;
  const pages = builtPagesOfProject();
  const targets = new Map<string, string>(); // 去掉锚点的地址 → 第一次出现的页面
  for (const path of pages) {
    const pageUrl = new URL(path, baseURL);
    const response = await request.get(pageUrl.href);
    if (path !== '404.html') expect(response.status(), `/${path}`).toBe(200);
    for (const ref of sameOriginRefs(await response.text(), pageUrl)) {
      expect(ref.pathname.startsWith(base), `${pageUrl.pathname} 引用了 base 以外的 ${ref.pathname}`).toBe(true);
      ref.hash = '';
      if (!targets.has(ref.href)) targets.set(ref.href, pageUrl.pathname);
    }
  }
  // 防止提取引用的正则失效、什么都没抓到而让用例空过：每页至少有自己的样式、脚本和导航链接
  expect(targets.size).toBeGreaterThan(pages.length);

  const broken: string[] = [];
  for (const [href, from] of targets) {
    const status = await statusOf(request, new URL(href));
    if (status !== 200) broken.push(`${from} → ${href}（${status}）`);
  }
  expect(broken).toEqual([]);
});

test('从首页点进去，沿“下一步”和选择页走几步，地址一直在 base 下', async ({ page, baseURL }) => {
  const nav = page.getByRole('navigation', { name: '上一步和下一步' });
  const expectAt = async (path: string) => {
    await expect(page).toHaveURL(new URL(path, baseURL).href);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  };

  await page.goto('./');
  await expectAt('./');
  await page.getByRole('link', { name: '从第 00 章开始' }).click();
  await expectAt('./preface/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./disclaimer/');
  // 固定原理视图（用户 2026-10-22 决定去掉视图切换、固定原理视图）：经过原理独有的整体思路
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./overview/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./clean-up/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./choose-plan/');

  // 选择页的正文链接进入方案二；方案二只属于这个选项，导航按它计算，页面脚本记下这个选项（FR-17）
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '方案二：住宅 IP 服务器', exact: true }).click();
  await expectAt('./plan2-residential-server/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./import-proxy/');
  // 汇合点的上一步是所选分支的最后一步（FR-13），由页面脚本按本机选择改写，地址同样要带 base
  await expect(page.locator('main[data-route-ready]')).toHaveCount(1);
  await nav.getByRole('link', { name: /上一步/ }).click();
  await expectAt('./plan2-residential-server/');
});

test('截图在 base 下加载出来', async ({ page, baseURL }) => {
  const base = new URL(baseURL!).pathname;
  await page.goto('./iphone-apple-id/');
  const images = page.locator('.prose').filter({ visible: true }).locator('img');
  const count = await images.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const image = images.nth(i);
    await image.scrollIntoViewIfNeeded(); // 截图是 loading="lazy"
    await expect(image).toHaveJSProperty('complete', true);
    const { naturalWidth, currentSrc } = await image.evaluate((img: HTMLImageElement) => ({
      naturalWidth: img.naturalWidth,
      currentSrc: img.currentSrc,
    }));
    expect(naturalWidth, currentSrc).toBeGreaterThan(0);
    expect(new URL(currentSrc).pathname.startsWith(base), currentSrc).toBe(true);
  }
});

test('不存在的页面显示“找不到这一页”，“回到首页”回到 base 下的首页', async ({ page, baseURL }) => {
  const response = await page.goto('./no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到这一页');
  await page.getByRole('link', { name: '回到首页' }).click();
  await expect(page).toHaveURL(new URL('./', baseURL).href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude（Re:Zero − Starting Life with Claude）');
});

// ADR-0002：已经发布的地址不能失效。删掉的页面留一个跳转页，在 base 下跳到 REMOVED_PAGES 登记的页面。
test('已删除页面的旧地址跳到登记的页面，地址一直在 base 下', async ({ page, baseURL }) => {
  const entries = Object.entries(REMOVED_PAGES);
  expect(entries.length).toBeGreaterThan(0);
  for (const [from, to] of entries) {
    const response = await page.goto(`./${from}/`);
    expect(response?.status(), `/${from}/`).toBe(200);
    await expect(page).toHaveURL(new URL(`./${to}/`, baseURL).href);
    await expect(page.locator('main[data-route-ready]')).toHaveCount(1);
  }
});
