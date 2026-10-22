import { expect, test, type Page } from '@playwright/test';

// AC-07（FR-40、FR-41，NFR-04）：没有视频信息的步骤，页面上没有视频区域，也没有“视频制作中”；不向视频平台发请求。
// 视频平台的请求一律在这里拦下并回一个空页面：测试不依赖外网，也能数出页面向哪些平台发过请求。
//
// V10（作者新稿）把截图换成了加粗的视频占位行，principle/ 的 frontmatter 仍然都没写 video，所以只测“没有视频”。
// 页面换成新稿的 11 页（route.yaml）：没有视频的步骤不出现视频区域，也不向视频平台发请求。
// 有视频时的门面渲染由 src/components/VideoFacade.test.ts 覆盖；有了第一条步骤视频后，
// 在这里补上“点击前无请求、点击后插入 iframe”的用例（1.0.0 的人工核对方式见 git 历史里的本文件）。
const VIDEO_HOSTS = /(bilibili\.com|hdslb\.com|youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com)/;

async function recordVideoRequests(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.route(VIDEO_HOSTS, (route) => {
    seen.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' });
  });
  return seen;
}

for (const step of [
  'preface',
  'overview',
  'plan1',
  'plan2-residential-server',
  'client-desktop',
  'iphone-prepare',
  'iphone-subscription',
  'android-prepare',
  'android-subscription',
  'maintenance',
  'afterword',
]) {
  test(`没有视频信息的 ${step} 没有视频区域，不请求视频平台，正文照常`, async ({ page }) => {
    const seen = await recordVideoRequests(page);
    await page.goto(`./${step}/`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('视频制作中')).toHaveCount(0);
    await expect(page.getByRole('region', { name: '步骤视频' })).toHaveCount(0);
    await expect(page.locator('[data-video]')).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('.prose').filter({ visible: true })).not.toBeEmpty();
    expect(seen).toEqual([]);
  });
}
