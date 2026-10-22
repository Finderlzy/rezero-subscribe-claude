import { expect, test, type Page } from '@playwright/test';

// AC-28（FR-24、design §4.8、架构 §13.2、§13.4）：顶栏站内搜索。
// 数据由 V06 的 search-index.json 提供，落点由 V07 的 section-hash 负责（页面固定原理视图，用户 2026-10-22 决定）；
// 第一次聚焦才下载索引，请求里没有读者输入的文字，也没有站外请求。
// 现有内容里的小标题只在 IP 质量实测的参考页（原理版正文的 h2 随 V11 合并页面补上），
// 所以“打开小标题结果”用 /ip-tests/voyracloud/ 的“我的第一台”核对。

const searchRoot = (page: Page) => page.locator('[data-site-search]');
const searchInput = (page: Page) => page.getByRole('combobox', { name: '搜索页面和小标题' });
const searchButton = (page: Page) => page.getByRole('button', { name: '搜索', exact: true });
const listbox = (page: Page) => page.getByRole('listbox', { name: '搜索结果' });
const options = (page: Page) => listbox(page).getByRole('option');
const isMobile = (page: Page) => page.viewportSize()!.width < 720;

/** 桌面和平板点输入框；手机先点放大镜把输入框打开 */
async function openSearch(page: Page): Promise<void> {
  if (isMobile(page)) await searchButton(page).click();
  else await searchInput(page).click();
}

test('第一次聚焦才下载一次索引，请求里没有搜索文字，也没有站外请求', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requested.push(request.url());
  });
  const indexRequests = () => requested.filter((url) => url.includes('search-index.json'));

  await page.goto('./import-proxy/');
  const origin = new URL(page.url()).origin;
  // 页面加载完、还没聚焦：一个索引请求都没有
  expect(indexRequests()).toEqual([]);

  await openSearch(page);
  await expect.poll(indexRequests).toHaveLength(1);
  await searchInput(page).fill('时区');
  await expect(options(page).first()).toBeVisible();

  // 输入过程中不再重复下载；地址固定、没有查询参数，同源
  const [indexUrl] = indexRequests();
  expect(indexRequests()).toHaveLength(1);
  const url = new URL(indexUrl!);
  expect(url.search).toBe('');
  expect(url.pathname.endsWith('/search-index.json')).toBe(true);
  // 整个过程的请求都同源（AC-28：没有请求站外地址），URL 里也没有搜索文字
  const encoded = encodeURIComponent('时区');
  for (const requestUrl of requested) {
    expect(new URL(requestUrl).origin, requestUrl).toBe(origin);
    expect(requestUrl, requestUrl).not.toContain(encoded);
  }
});

test('搜“时区”：下拉列出“改时区”，下键选中、回车打开页面（AC-28）', async ({ page }) => {
  await page.goto('./import-proxy/');
  await openSearch(page);
  await searchInput(page).fill('时区');

  await expect(listbox(page)).toBeVisible();
  await expect(searchInput(page)).toHaveAttribute('aria-expanded', 'true');
  const option = options(page).filter({ hasText: '改时区' }).first();
  await expect(option).toBeVisible();
  // 只命中页面标题：没有第二行小标题
  await expect(option.locator('.search-option-heading')).toHaveCount(0);
  // 命中的“时区”加粗（design §4.8）
  await expect(option.locator('strong')).toHaveText('时区');

  await searchInput(page).press('ArrowDown');
  await expect(option).toHaveAttribute('aria-selected', 'true');
  const id = await option.getAttribute('id');
  expect(id).toBeTruthy();
  await expect(searchInput(page)).toHaveAttribute('aria-activedescendant', id!);

  await searchInput(page).press('Enter');
  await expect(page).toHaveURL(/\/timezone\/$/);
  await expect(page.getByRole('heading', { level: 1, name: '改时区' })).toBeVisible();
  // 换页后搜索还在（首页以外每页都有）；手机上又收成放大镜，下拉已经收起
  if (isMobile(page)) await expect(searchButton(page)).toBeVisible();
  else await expect(searchInput(page)).toBeVisible();
  await expect(listbox(page)).toBeHidden();
});

test('鼠标点结果也能打开（design §4.8 的结果是链接）', async ({ page }) => {
  await page.goto('./import-proxy/');
  await openSearch(page);
  await searchInput(page).fill('时区');
  const option = options(page).filter({ hasText: '改时区' }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page).toHaveURL(/\/timezone\/$/);
});

test('输入法组字时不搜索，组字结束才出结果（design §4.8、实施计划的边界）', async ({ page }) => {
  await page.goto('./import-proxy/');
  await openSearch(page);
  // 先把索引加载出来，再模拟组字：compositionstart 之后的 input 不触发搜索
  await searchInput(page).fill('时区');
  await expect(options(page).first()).toBeVisible();
  await searchInput(page).fill('');
  await expect(listbox(page)).toBeHidden();

  // 组字中的值本身是“时区”，如果这里触发了搜索就会出现结果；所以“没有下拉”才真正锁住 composing 守卫
  await searchInput(page).evaluate((el) => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    (el as HTMLInputElement).value = '时区';
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
  await expect(listbox(page)).toBeHidden();
  await expect(searchInput(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-search-status]')).toBeHidden();

  await searchInput(page).evaluate((el) => {
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  });
  await expect(options(page).filter({ hasText: '改时区' }).first()).toBeVisible();
});

test('打开小标题结果：第二行写“› 小标题”，落到那一页并滚到小节（AC-28、V07）', async ({ page }) => {
  await page.goto('./import-proxy/');
  await openSearch(page);
  await searchInput(page).fill('我的第一台');

  const option = options(page).filter({ hasText: '我的第一台' }).first();
  await expect(option).toBeVisible();
  await expect(option.locator('.search-option-heading')).toHaveText('› 我的第一台');
  // 没按上下键时回车打开第一条
  await searchInput(page).press('Enter');

  await expect(page).toHaveURL(/\/ip-tests\/voyracloud\/#/);
  const heading = page.locator('#我的第一台');
  await expect(heading).toBeVisible();
  await expect(heading).toBeInViewport();
});

test('没有匹配时显示“没有找到”（AC-28）', async ({ page }) => {
  await page.goto('./import-proxy/');
  await openSearch(page);
  await searchInput(page).fill('我的');
  await expect(options(page).nth(1)).toBeVisible();
  // 先选中一条，再搜到没有结果：aria-activedescendant 不能还指向已经删掉的 option
  await searchInput(page).press('ArrowDown');
  await expect(searchInput(page)).toHaveAttribute('aria-activedescendant', /.+/);

  await searchInput(page).fill('zzzz');
  await expect(page.locator('[data-search-status]')).toHaveText('没有找到');
  await expect(page.locator('[data-search-status]')).toBeVisible();
  expect(await searchInput(page).getAttribute('aria-activedescendant')).toBeNull();
  // 下拉是开着的（里面只有这一行提示），但没有任何结果项
  await expect(searchInput(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(options(page)).toHaveCount(0);
  // 读屏用始终在可访问树里的 live region 播报（design §4.8）
  await expect(page.locator('[data-search-announce]')).toHaveText('没有找到');
});

test('上下键移动、Esc 先清空再关闭、Tab 离开时关闭（design §4.8）', async ({ page }) => {
  await page.goto('./import-proxy/');
  await openSearch(page);
  await searchInput(page).fill('我的');
  await expect(options(page).nth(1)).toBeVisible();

  await searchInput(page).press('ArrowDown');
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  await searchInput(page).press('ArrowDown');
  await expect(options(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  await searchInput(page).press('ArrowUp');
  await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');

  // Esc 第一次清空输入，下拉收起，但控件还在
  await searchInput(page).press('Escape');
  await expect(searchInput(page)).toHaveValue('');
  await expect(listbox(page)).toBeHidden();
  await expect(searchInput(page)).toBeVisible();

  // 再输入后按 Tab：焦点离开，下拉收起
  await searchInput(page).fill('我的');
  await expect(listbox(page)).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(listbox(page)).toBeHidden();
});

test('参考页和找不到页的顶栏也有搜索', async ({ page }) => {
  for (const path of ['./faq/', './ip-tests/voyracloud/', './no-such-page/']) {
    await page.goto(path);
    await expect(searchRoot(page), path).toBeVisible();
    if (isMobile(page)) await expect(searchButton(page), path).toBeVisible();
    else await expect(searchInput(page), path).toBeVisible();
  }
});

test('360：只有放大镜；点开后输入框盖住顶栏，Esc 收起并还焦点，页面不横向滚动', async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 360, '只在 360 宽下核对');
  await page.goto('./import-proxy/');
  await expect(searchInput(page)).toBeHidden();
  await expect(searchButton(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  await searchButton(page).click();
  await expect(searchInput(page)).toBeVisible();
  await expect(searchInput(page)).toBeFocused();
  await expect(searchButton(page)).toBeHidden();
  // 输入框固定盖住整条顶栏：从视口最上面开始、占满宽度
  const form = await page.locator('[data-search-form]').boundingBox();
  expect(form!.y).toBe(0);
  expect(form!.width).toBeCloseTo(360, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  await searchInput(page).fill('时区');
  await expect(options(page).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  // 第一次 Esc 清空（输入框还开着），第二次 Esc 收起，焦点回到放大镜按钮
  await searchInput(page).press('Escape');
  await expect(searchInput(page)).toHaveValue('');
  await expect(searchInput(page)).toBeVisible();
  await searchInput(page).press('Escape');
  await expect(searchInput(page)).toBeHidden();
  await expect(searchButton(page)).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('360：关闭按钮收起输入框，焦点回到放大镜', async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 360, '只在 360 宽下核对');
  await page.goto('./import-proxy/');
  await searchButton(page).click();
  await expect(searchInput(page)).toBeFocused();
  await page.getByRole('button', { name: '关闭搜索' }).click();
  await expect(searchInput(page)).toBeHidden();
  await expect(searchButton(page)).toBeFocused();
});

test('索引下载失败：下拉写“搜索暂时不可用”，页面不报错（AC-28）', async ({ page }) => {
  // 浏览器会把失败的请求记成一条 console 错误（Request failed），这里只看脚本自己有没有抛错
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/search-index.json', (route) => route.abort());
  await page.goto('./import-proxy/');
  await openSearch(page);
  await searchInput(page).fill('时区');
  await expect(page.locator('[data-search-status]')).toHaveText('搜索暂时不可用');
  await expect(page.locator('[data-search-status]')).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('没有 JS 时', () => {
  test.use({ javaScriptEnabled: false });

  test('搜索控件整个不显示（design §5）', async ({ page }) => {
    await page.goto('./import-proxy/');
    await expect(searchRoot(page)).toBeHidden();
    await expect(searchInput(page)).toBeHidden();
    await expect(searchButton(page)).toBeHidden();
    // 没有 JS 时顶栏其余内容照常
    await expect(page.getByRole('link', { name: 'Re:从零开始订阅 claude 首页' })).toBeVisible();
  });
});
