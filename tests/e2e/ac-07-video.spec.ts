import { expect, test, type Page } from '@playwright/test';

// AC-07（FR-40–42，NFR-04）：没有视频信息的步骤显示“视频制作中”，正文照常，页面不向视频平台发请求。
// 视频平台的请求一律在这里拦下并回一个空页面：测试不依赖外网，也能数出页面向哪些平台发过请求。
//
// 现有内容还没有带视频的步骤（原文的配套视频按作者决定暂不放，见迁移核对表“文章开头”），
// 所以按 #17 的约定只测占位。有视频时的行为在 #17 里人工核对：开发服务器上临时给一个步骤填 B 站和
// YouTube 两个平台，点击前页面没有任何视频平台的请求；真实点击后 B 站播放器在页内开始播放、YouTube 播放器加载出来；
// 切换平台会撤掉播放器、外链跟着换。渲染结果由 src/components/VideoFacade.test.ts 覆盖。
// 有了第一条步骤视频后，在这里补上“点击前无请求、点击后插入 iframe”的用例。
const VIDEO_HOSTS = /(bilibili\.com|hdslb\.com|youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com)/;

async function recordVideoRequests(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.route(VIDEO_HOSTS, (route) => {
    seen.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' });
  });
  return seen;
}

for (const step of ['overview', 'ipv6']) {
  test(`没有视频信息的步骤 ${step} 显示“视频制作中”，不请求视频平台，正文照常`, async ({ page }) => {
    const seen = await recordVideoRequests(page);
    await page.goto(`./${step}/`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('视频制作中', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: '步骤视频' })).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('.prose')).not.toBeEmpty();
    expect(seen).toEqual([]);
  });
}

test('“视频制作中”在标题下面、正文上面（design §4.1）', async ({ page }) => {
  await page.goto('./ipv6/');
  const pending = await page.getByText('视频制作中', { exact: true }).boundingBox();
  const title = await page.getByRole('heading', { level: 1 }).boundingBox();
  const prose = await page.locator('.prose').boundingBox();
  expect(pending!.y).toBeGreaterThan(title!.y);
  expect(pending!.y).toBeLessThan(prose!.y);
});
