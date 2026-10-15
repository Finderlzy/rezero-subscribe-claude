import { expect, test, type Page } from '@playwright/test';

// AC-07（FR-40–42，NFR-04）：有视频信息的步骤显示视频门面，点击前不向视频平台发请求，点击后才插入播放器；
// 没有视频信息的步骤显示“视频制作中”，正文照常。
// 视频平台的请求一律在这里拦下并回一个空页面：测试不依赖外网，也能数出页面向哪些平台发过请求。
// “可以播放”这一半靠人工核对（#17）：开发服务器上临时给一个步骤填 B 站和 YouTube 两个平台，
// 真实点击后 B 站播放器在页内开始播放、YouTube 播放器加载出来；切换平台会撤掉播放器、外链跟着换。
// 现有内容只有 YouTube 视频，B 站和切换没有自动化的行为用例（渲染结果见 VideoFacade.test.ts）。
const VIDEO_HOSTS = /(bilibili\.com|hdslb\.com|youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com)/;

async function recordVideoRequests(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.route(VIDEO_HOSTS, (route) => {
    seen.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' });
  });
  return seen;
}

test('“整体思路”有视频：点击前不请求视频平台，点击后插入 YouTube 播放器，外链一直在', async ({ page }) => {
  const seen = await recordVideoRequests(page);
  await page.goto('./overview/');
  await page.waitForLoadState('networkidle');

  const video = page.getByRole('region', { name: '步骤视频' });
  await expect(video).toBeVisible();
  expect(seen).toEqual([]);
  await expect(video.locator('iframe')).toHaveCount(0);

  // 只有 YouTube：没有平台切换，提示不提换平台
  await expect(video.getByRole('group', { name: '视频平台' })).toHaveCount(0);
  const external = video.getByRole('link', { name: '在 YouTube 打开' });
  await expect(external).toHaveAttribute('href', 'https://youtu.be/BcTUtYYheyA');
  await expect(video).toContainText('打不开？试试开代理');

  await video.getByRole('button', { name: /播放视频/ }).click();
  const player = video.locator('iframe');
  await expect(player).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/BcTUtYYheyA?autoplay=1');
  await expect(player).toHaveAttribute('title', '整体思路 · YouTube');
  await expect.poll(() => seen.some((u) => u.startsWith('https://www.youtube-nocookie.com/embed/BcTUtYYheyA'))).toBe(true);
  // 浏览器判断不了 iframe 是否加载失败，外链在播放器下方一直显示（FR-42）
  await expect(external).toBeVisible();
  // 正文照常
  await expect(page.locator('.prose')).toContainText('我的理解是');
});

test('没有视频信息的步骤显示“视频制作中”，不请求视频平台，正文照常', async ({ page }) => {
  const seen = await recordVideoRequests(page);
  await page.goto('./ipv6/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('视频制作中', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '步骤视频' })).toHaveCount(0);
  await expect(page.locator('.prose')).toContainText('检测网站上如果出现国内的 IPv6 地址');
  expect(seen).toEqual([]);
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('播放区域是指向视频页的普通链接，不插入播放器', async ({ page }) => {
    const seen = await recordVideoRequests(page);
    await page.goto('./overview/');
    const video = page.getByRole('region', { name: '步骤视频' });
    await expect(video.getByRole('link', { name: /播放视频/ })).toHaveAttribute('href', 'https://youtu.be/BcTUtYYheyA');
    await expect(video.locator('iframe')).toHaveCount(0);
    expect(seen).toEqual([]);
  });
});
