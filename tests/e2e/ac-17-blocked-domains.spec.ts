import { expect, test, type Page } from '@playwright/test';
import { builtPages } from './built-pages';

// AC-17（NFR-03）：屏蔽 Google 和 YouTube 域名后访问 → 除 YouTube 视频外，内容完整显示。
// 按架构 §8 屏蔽下面这些域名（含子域名），逐页断言：没有失败的请求，正文、截图、样式都在。
// 视频门面在点击前不请求视频平台（AC-07），所以任何页面都不应碰到被屏蔽的域名。
const BLOCKED = /^https?:\/\/([^/]+\.)?(google\.com|googleapis\.com|gstatic\.com|youtube\.com|youtube-nocookie\.com|ytimg\.com)(:\d+)?\//;

const PAGES = builtPages();

/** 屏蔽域名并记下失败的请求：被屏蔽的、网络失败的、HTTP 4xx/5xx 的（页面本身的状态由用例另外检查）。 */
async function watchRequests(page: Page) {
  const blocked: string[] = [];
  const failed: string[] = [];
  await page.route(BLOCKED, (route) => {
    blocked.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  page.on('requestfailed', (request) => {
    if (!BLOCKED.test(request.url())) failed.push(`${request.url()}：${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.request().isNavigationRequest()) {
      failed.push(`${response.url()}：HTTP ${response.status()}`);
    }
  });
  return { blocked, failed };
}

test('屏蔽规则覆盖子域名、不误伤其他域名', () => {
  for (const url of ['https://www.google.com/', 'https://fonts.googleapis.com/css', 'https://i.ytimg.com/vi/x.jpg', 'https://www.youtube-nocookie.com/embed/x']) {
    expect(BLOCKED.test(url), url).toBe(true);
  }
  for (const url of ['http://localhost:4321/', 'https://player.bilibili.com/', 'https://notgoogle.com/']) {
    expect(BLOCKED.test(url), url).toBe(false);
  }
});

for (const path of PAGES) {
  test(`屏蔽 Google 和 YouTube 后 /${path} 内容完整、没有失败的请求`, async ({ page }) => {
    const { blocked, failed } = await watchRequests(page);
    const response = await page.goto(`./${path}`, { waitUntil: 'load' });
    // 直接打开 404.html 时各服务器给的状态不一样，只要它的内容完整
    if (path !== '404.html') expect(response?.status()).toBe(200);

    // 截图是 loading="lazy"：改成立即加载，等每一张解码完（加载失败时 decode() 会拒绝），确认都能从本站取到
    const brokenImages = await page.locator('img').evaluateAll((list: HTMLImageElement[]) =>
      Promise.all(
        list.map((img) => {
          img.loading = 'eager';
          return img.decode().then(
            () => (img.naturalWidth > 0 ? null : img.currentSrc),
            () => img.currentSrc || img.src,
          );
        }),
      ).then((results) => results.filter(Boolean)),
    );
    expect(brokenImages).toEqual([]);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    await expect(page.locator('main')).not.toBeEmpty();
    // 样式表加载出来了：页面底色来自 tokens.css，没有样式时是透明
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');

    expect(failed).toEqual([]);
    expect(blocked).toEqual([]);
  });
}
