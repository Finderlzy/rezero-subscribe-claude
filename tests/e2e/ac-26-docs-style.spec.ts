import { expect, test, type Page } from '@playwright/test';
import { CONTACTS } from '../../src/lib/contact';
import { THEME_KEY } from '../../src/lib/theme';
import { expectScriptRan } from './route-helpers';

// AC-26（FR-72，design v3 §4.0、§4.1、§3.1）：文档站的外壳。顶栏白底细线，左边“Re:”标记、站名、小形象，
// 右边搜索挂载点、昼夜切换、联系方式；没有 v2.2 的页头色带和章首页一组（副标题、章名、一句话），
// h1 上方一行灰色眉题；页脚一行非官方声明。
// 取代 v2.2 的 ac-02-chapter-card.spec.ts：那份专测色带和章首页一组，FR-72 去掉了这两样（架构 §13.11 R-3）。
// 视图切换由用户 2026-10-22 决定换成昼夜切换，主题切换的用例也在这里。

/** 把一个颜色令牌放到临时元素上，取浏览器算出的颜色 */
async function tokenColor(page: Page, name: string, prop: 'color' | 'background-color' = 'color'): Promise<string> {
  return page.evaluate(
    ([name, prop]) => {
      const el = document.createElement('div');
      el.style.setProperty(prop!, `var(${name})`);
      document.body.append(el);
      const value = getComputedStyle(el)[prop === 'color' ? 'color' : 'backgroundColor'];
      el.remove();
      return value;
    },
    [name, prop],
  );
}

const CHAPTER_STARTS = ['./preface/', './choose-plan/', './choose-phone/', './thanks/', './appendix/'];
const OTHER_PAGES = ['./disclaimer/', './import-proxy/', './register-gmail/', './google-appeal/', './afterword/'];

test('顶栏：白底、1px 细线、不固定；左边标记、站名、小形象，右边搜索挂载点、昼夜切换、联系方式（design §4.0）', async ({ page }) => {
  const width = page.viewportSize()!.width;
  await page.goto('./import-proxy/');
  const header = page.locator('header.site-header');
  const style = await header.evaluate((el) => {
    const s = getComputedStyle(el);
    return { position: s.position, background: s.backgroundColor, border: s.borderBottomWidth, height: el.getBoundingClientRect().height };
  });
  expect(style.position).toBe('static');
  expect(style.background).toBe(await tokenColor(page, '--bg', 'background-color'));
  expect(style.border).toBe('1px');
  expect(style.height).toBe(56);

  const home = header.getByRole('link', { name: 'Re:从零开始订阅 claude 首页' });
  await expect(home).toBeVisible();
  // 站名 <480px 隐藏（design §3.2）
  if (width >= 480) await expect(header.locator('.site-name')).toBeVisible();
  else await expect(header.locator('.site-name')).toBeHidden();
  // 小形象紧跟在首页链接右边，不在链接里，对读屏隐藏
  const mascot = header.locator('svg.mascot');
  await expect(mascot).toHaveCount(1);
  await expect(mascot).toHaveAttribute('aria-hidden', 'true');
  expect(await mascot.evaluate((el) => el.closest('a'))).toBeNull();
  const [homeBox, mascotBox] = [await home.boundingBox(), await mascot.boundingBox()];
  expect(mascotBox!.x).toBeGreaterThanOrEqual(homeBox!.x + homeBox!.width);
  // 整页只有顶栏里这一个小形象（design §6：v3 起只在顶栏站名旁）
  await expect(page.locator('svg.mascot')).toHaveCount(1);

  // 右边一组：搜索挂载点（V08 填，现在 hidden）、昼夜切换、联系方式，按这个顺序
  await expect(header.locator('[data-search-slot]')).toBeHidden();
  const toggle = header.getByRole('button', { name: '深色模式' });
  await expect(toggle).toBeVisible();
  const contact = header.getByRole('navigation', { name: '作者的联系方式' });
  const xs = [await header.locator('[data-search-slot]').evaluate((el) => el.getBoundingClientRect().x), (await toggle.boundingBox())!.x, (await contact.boundingBox())!.x];
  expect(xs[1]).toBeGreaterThan(mascotBox!.x);
  expect(xs[2]).toBeGreaterThan(xs[1]!);
  if (width >= 720) await expect(contact.locator('.contact-icon')).toHaveCount(CONTACTS.length);

  // 视图切换已经去掉
  await expect(page.getByRole('group', { name: '视图' })).toHaveCount(0);
  await expect(page.locator('[data-view-option]')).toHaveCount(0);
});

for (const path of [...CHAPTER_STARTS, ...OTHER_PAGES]) {
  test(`${path}：没有页头色带和章首页一组，h1 上方是灰色眉题，正文只有原理版`, async ({ page }) => {
    await page.goto(path);
    await expectScriptRan(page);
    for (const gone of ['.band', '.band-inner', '.chapter-head', '.chapter-subtitle', '.chapter-title', '.chapter-intro', '.chapter-card']) {
      await expect(page.locator(gone), gone).toHaveCount(0);
    }
    const eyebrow = page.locator('main .eyebrow');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(eyebrow).toBeVisible();
    await expect(h1).toBeVisible();
    // 章首页也写全章号和章名（附录页只写“附录”）
    if (path === './appendix/') await expect(page.locator('[data-route-eyebrow]')).toHaveText('附录');
    else await expect(page.locator('[data-route-eyebrow]')).toContainText(/^第 \d+ 章 · /);
    const box = await page.evaluate(() => {
      const eyebrow = document.querySelector('main .eyebrow')!;
      const h1 = document.querySelector('h1')!;
      const body = document.querySelector('.step-body')!;
      return {
        eyebrowBeforeH1: (eyebrow.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        eyebrowColor: getComputedStyle(eyebrow).color,
        eyebrowWeight: getComputedStyle(eyebrow).fontWeight,
        eyebrowLeft: eyebrow.getBoundingClientRect().left,
        h1Left: h1.getBoundingClientRect().left,
        bodyLeft: body.getBoundingClientRect().left + parseFloat(getComputedStyle(body).paddingLeft),
        h1Weight: getComputedStyle(h1).fontWeight,
        // h1 背后没有色块：它到 <main> 之间的祖先都是透明底
        h1Backgrounds: (() => {
          const colors: string[] = [];
          for (let el: Element | null = h1; el && el.tagName !== 'BODY'; el = el.parentElement) colors.push(getComputedStyle(el).backgroundColor);
          return colors;
        })(),
      };
    });
    expect(box.eyebrowBeforeH1).toBe(true);
    expect(box.eyebrowColor).toBe(await tokenColor(page, '--text-muted'));
    expect(box.eyebrowWeight).toBe('400');
    expect(box.h1Weight).toBe('600');
    expect(box.eyebrowLeft).toBeCloseTo(box.h1Left, 0);
    expect(box.bodyLeft).toBeCloseTo(box.h1Left, 0);
    for (const color of box.h1Backgrounds) expect(color).toBe('rgba(0, 0, 0, 0)');
    // 页面固定原理视图（用户 2026-10-22 决定）：只有一版正文
    await expect(page.locator('[data-body]')).toHaveCount(0);
    await expect(page.locator('.prose')).toHaveCount(1);
  });
}

test('参考页也是眉题 + 纯文字 h1，没有色带', async ({ page }) => {
  for (const path of ['./faq/', './ip-tests/']) {
    await page.goto(path);
    await expect(page.locator('.band'), path).toHaveCount(0);
    await expect(page.locator('main .eyebrow'), path).toHaveText(/^附录/);
    await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible();
  }
});

test('页脚：正文区下面一条细线，一行 13px 的非官方声明', async ({ page }) => {
  await page.goto('./import-proxy/');
  const footer = page.locator('footer.site-footer');
  await expect(footer).toHaveText('本站是个人教程，与 Anthropic 无关。');
  const style = await footer.evaluate((el) => ({ border: getComputedStyle(el).borderTopWidth, size: getComputedStyle(el.querySelector('small')!).fontSize }));
  expect(style).toEqual({ border: '1px', size: '13px' });
  // 页脚在正文之后，左缘和正文栏对齐
  const left = await page.evaluate(() => {
    const body = document.querySelector('.step-body')!;
    const p = document.querySelector('.site-footer p')!;
    return {
      footer: p.getBoundingClientRect().left + parseFloat(getComputedStyle(p).paddingLeft),
      body: body.getBoundingClientRect().left + parseFloat(getComputedStyle(body).paddingLeft),
    };
  });
  expect(left.footer).toBeCloseTo(left.body, 0);
});

test('紫色主色：主按钮用 --primary-bg，它就是 --accent（design §3.1、V4）', async ({ page }) => {
  await page.goto('./');
  const start = page.locator('[data-home-start]');
  expect(await start.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await tokenColor(page, '--accent', 'background-color'));
});

test('360 宽：顶栏放得下全部元素，页面没有横向滚动（design §4.0 预算）', async ({ page }) => {
  test.skip(page.viewportSize()!.width !== 360, '只在 360 宽下核对');
  for (const path of ['./import-proxy/', './choose-plan/', './faq/', './ip-tests/voyracloud/', './no-such-page/']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(360);
    const right = await page.locator('.site-header-tools').evaluate((el) => el.getBoundingClientRect().right);
    expect(right, path).toBeLessThanOrEqual(360);
    await expect(page.getByRole('button', { name: '目录' }).or(page.locator('a.toc-open'))).toHaveCount(path === './no-such-page/' ? 0 : 1);
  }
});

test.describe('昼夜切换（用户 2026-10-22 决定，放在原来视图切换的位置）', () => {
  test.use({ colorScheme: 'light' });

  test('点击后 data-theme 和背景色令牌都变，刷新后保持；再点回到浅色', async ({ page }) => {
    await page.goto('./import-proxy/');
    const toggle = page.getByRole('button', { name: '深色模式' });
    const root = page.locator('html');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // 没选过：跟随系统（浅色），没有 data-theme
    await expect(root).not.toHaveAttribute('data-theme');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const light = await bg();
    expect(light).toBe('rgb(255, 255, 255)');

    await toggle.click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toBeFocused();
    expect(await bg()).toBe('rgb(18, 18, 20)');
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('dark');

    await page.reload();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await bg()).toBe('rgb(18, 18, 20)');

    // 换一页（首页没有顶栏）也是深色
    await page.goto('./');
    await expect(root).toHaveAttribute('data-theme', 'dark');
    expect(await bg()).toBe('rgb(18, 18, 20)');

    await page.goto('./faq/');
    await toggle.click();
    await expect(root).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await bg()).toBe(light);
  });

  test('键盘可操作：从首页链接 Tab 一次到按钮，空格、回车切换', async ({ page }) => {
    await page.goto('./import-proxy/');
    const toggle = page.getByRole('button', { name: '深色模式' });
    await expect(toggle).toBeVisible();
    // 顶栏里首页链接后面紧跟昼夜切换（小形象不可聚焦，搜索挂载点 V08 前是空的）
    await page.getByRole('link', { name: 'Re:从零开始订阅 claude 首页' }).focus();
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('本机存储不可用时照常跟随系统，点切换只在本页生效、不报错', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto('./import-proxy/');
    const toggle = page.getByRole('button', { name: '深色模式' });
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(errors).toEqual([]);
  });
});

test.describe('系统是深色时', () => {
  test.use({ colorScheme: 'dark' });

  test('默认跟随系统显示深色，按钮是按下状态；切到浅色后系统深色也用浅色', async ({ page }) => {
    await page.goto('./import-proxy/');
    const toggle = page.getByRole('button', { name: '深色模式' });
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(18, 18, 20)');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  });
});

test.describe('没有 JS 时', () => {
  test.use({ javaScriptEnabled: false });

  test('昼夜切换隐藏，页面跟随系统；正文是原理版', async ({ page }) => {
    await page.goto('./import-proxy/');
    await expect(page.locator('[data-theme-toggle]')).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(page.locator('.prose')).toBeVisible();
  });
});
