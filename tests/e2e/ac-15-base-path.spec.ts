import { expect, test, type APIRequestContext } from '@playwright/test';
import { builtPages } from './built-pages';
import { movedPages } from './route-file';

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
  // 新稿的“开始”只有前言一页，下一步是“准备节点和住宅 IP”的选择页
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./overview/');
  // 选择页没选时按路线图的默认选项（方案二）写出下一步
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./plan2-residential-server/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./client-desktop/');

  // 没有默认选项的选择页：点正文末尾的选项卡片进入 iOS 分支，页面脚本记下这个选项（FR-12、FR-17）
  await page.locator('.prose').getByRole('link', { name: 'iPhone / iPad', exact: true }).click();
  await expectAt('./iphone-prepare/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./iphone-subscription/');
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./maintenance/');
  // 汇合点的上一步是所选分支的最后一步（FR-13），由页面脚本按本机选择改写，地址同样要带 base
  await expect(page.locator('main[data-route-ready]')).toHaveCount(1);
  await expect(nav.getByRole('link', { name: /上一步/ })).toHaveAttribute('href', new URL('./iphone-subscription/', baseURL).pathname);
  await nav.getByRole('link', { name: /下一步/ }).click();
  await expectAt('./afterword/');
  await nav.getByRole('link', { name: /下一步.*回到首页/ }).click();
  await expectAt('./');
});

test('截图在 base 下加载出来', async ({ page, baseURL }) => {
  const base = new URL(baseURL!).pathname;
  // V10 的步骤页没有截图（新稿换成了加粗的视频占位行），截图只在参考页（实施计划 §3.1）
  await page.goto('./ip-tests/voyracloud/');
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

// V08：站内搜索的索引地址和结果链接都由 withBase() 生成。AC-28 只跑根路径，这里在 /sub/ 下实际点一次：
// 索引请求必须落在 base 下（运行时 fetch），结果的 href 也必须带 base。
test('站内搜索在 base 下取到索引，结果地址也在 base 下', async ({ page, baseURL }) => {
  test.skip(test.info().project.name !== 'sub-path', '根路径的搜索由 AC-28 覆盖，这里只核对子路径');
  const base = new URL(baseURL!).pathname;
  await page.goto('./maintenance/');
  const input = page.getByRole('combobox', { name: '搜索页面和小标题' });
  const button = page.getByRole('button', { name: '搜索', exact: true });
  if (await input.isVisible()) await input.click();
  else await button.click();
  await input.fill('后记与致谢');

  const option = page.getByRole('listbox', { name: '搜索结果' }).getByRole('option').filter({ hasText: '后记与致谢' }).first();
  await expect(option).toBeVisible();
  const href = await option.getAttribute('href');
  expect(href).toBeTruthy();
  expect(new URL(href!, baseURL).pathname.startsWith(base)).toBe(true);

  await option.click();
  await expect(page).toHaveURL(new URL('./afterword/', baseURL).href);
});

test('不存在的页面显示“找不到这一页”，“回到首页”回到 base 下的首页', async ({ page, baseURL }) => {
  const response = await page.goto('./no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到这一页');
  await page.getByRole('link', { name: '回到首页' }).click();
  await expect(page).toHaveURL(new URL('./', baseURL).href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Re:从零开始订阅 claude（Re:Zero − Starting Life with Claude）');
});

// ADR-0002、ADR-0006：已经发布的地址不能失效。删掉或合并掉的页面留一个跳转页，
// 在 base 下跳到 route.yaml 的 moved: 登记的目标页（有 section 时还带原理版小节锚点）。
test('旧网址的跳转页在 base 下跳到登记的目标页', async ({ page, baseURL }) => {
  test.skip(['mobile-360', 'tablet-768'].includes(test.info().project.name), '和 desktop-1280 的根路径检查相同，子路径另跑一次');
  const entries = movedPages();
  expect(entries.length).toBeGreaterThan(0);
  // 同一个页面上下文会在循环里累积路线脚本写下的本机选择；每次导航前都清掉，让 choice 条目按 fallback 核对
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // about:blank 等拿不到 localStorage 的文档不用清
    }
  });
  for (const { from, to, section } of entries) {
    const response = await page.goto(`./${from}/`);
    expect(response?.status(), `/${from}/`).toBe(200);
    const expected = new URL(`./${to}/`, baseURL);
    await expect(page).toHaveURL(
      (url) => url.origin === expected.origin && url.pathname === expected.pathname && (section === undefined ? url.hash === '' : url.hash.length > 1),
    );
    // section 也必须是登记的那一小节；hash 是渲染后的 slug，不一定等于标题原文（如“打开面板（可选）” → “打开面板可选”），
    // 所以按 id 找元素，而不是拿标题原文拼 hash。
    if (section !== undefined) {
      const anchor = decodeURIComponent(new URL(page.url()).hash.slice(1));
      expect(anchor, `/${from}/ 的跳转目标小节`).not.toBe('');
      await expect(page.locator(`[id="${anchor.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"]`)).toBeVisible();
    }
    await expect(page.locator('main[data-route-ready]')).toHaveCount(1);
  }
});

// R-6（架构 §13.11）：跳转页的 location.replace 和 meta refresh 都要带 BASE_PATH。没有 JS 时只剩 meta refresh，
// 所以在子路径下单独断言它（根路径由 ac-33-moved.spec.ts 的禁用 JS 用例覆盖）。
test.describe('没有 JS 时跳转页的 meta refresh 也在 base 下', () => {
  test.use({ javaScriptEnabled: false });

  test('meta refresh 的地址以 base 开头，指向登记的目标页', async ({ page, baseURL }) => {
    test.skip(['mobile-360', 'tablet-768'].includes(test.info().project.name), '和 desktop-1280 的根路径检查相同，子路径另跑一次');
    const base = new URL(baseURL!).pathname;
    const entries = movedPages();
    expect(entries.length).toBeGreaterThan(0);
    for (const { from, to } of entries) {
      await page.goto(`./${from}/`);
      const refresh = await page.locator('meta[http-equiv="refresh"]').getAttribute('content');
      const target = new URL(refresh!.replace(/^\d+;\s*url=/, ''), page.url()).pathname;
      expect(target, `/${from}/ 的 meta refresh`).toBe(new URL(`./${to}/`, baseURL).pathname);
      expect(target.startsWith(base), `meta refresh 跳出了 base：${target}`).toBe(true);
      // 说明和链接照常显示（AC-33），5 秒后才自动前往
      await expect(page.locator('main.page a').first()).toBeVisible();
    }
  });
});
