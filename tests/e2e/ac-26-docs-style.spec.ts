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

// 正文栏和内容组件（design v3 §3.2、§4.7）：字号、h2 细线、正文链接下划线、代码、表格、
// 截图图版、作者待补提示块和 QQ 群入口。AC-26 的 FR-72 把整站换成文档站排版，外壳之外这些也要一起核对。
// h2/h3/h4 和合并页的小节在 v3 重写稿导入后才有（V11），这里在正文里临时插入三个标题量样式，
// 不依赖当时的内容；其余组件都用真实页面。
test('正文：字号、行高、标题层级和链接下划线（design §3.2、§4.7）', async ({ page }) => {
  const width = page.viewportSize()!.width;
  await page.goto('./plan1-make-node/');
  const styles = await page.evaluate(() => {
    const prose = document.querySelector('.prose')!;
    const read = (el: Element) => {
      const s = getComputedStyle(el);
      return {
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        marginTop: s.marginTop,
        paddingBottom: s.paddingBottom,
        borderBottom: s.borderBottomWidth,
      };
    };
    const h2 = document.createElement('h2');
    h2.textContent = '小节';
    const h3 = document.createElement('h3');
    h3.textContent = '小节';
    const h4 = document.createElement('h4');
    h4.textContent = '小节';
    prose.append(h2, h3, h4);
    // 段落上下 16px：取一个不是首个子元素的段落（首段的 margin-top 会被 .prose > :first-child 清掉）
    const paragraph = [...prose.querySelectorAll(':scope > p')].find((p) => p !== prose.firstElementChild) ?? prose.querySelector('p')!;
    const link = getComputedStyle(prose.querySelector('a')!);
    const result = {
      h2: read(h2),
      h3: read(h3),
      h4: read(h4),
      body: read(paragraph),
      linkColor: link.color,
      decoration: link.textDecorationLine,
      thickness: link.textDecorationThickness,
      offset: link.textUnderlineOffset,
    };
    h2.remove();
    h3.remove();
    h4.remove();
    return result;
  });

  // §3.2：手机 h2 22 / h3 18 / h4 16，平板起 26 / 21 / 17；正文 16px、行高 1.75（28px）
  expect(styles.h2.fontSize).toBe(width >= 720 ? '26px' : '22px');
  expect(styles.h3.fontSize).toBe(width >= 720 ? '21px' : '18px');
  expect(styles.h4.fontSize).toBe(width >= 720 ? '17px' : '16px');
  expect(parseFloat(styles.h2.lineHeight)).toBeCloseTo(parseFloat(styles.h2.fontSize) * 1.3, 1);
  expect(parseFloat(styles.h3.lineHeight)).toBeCloseTo(parseFloat(styles.h3.fontSize) * 1.4, 1);
  expect(parseFloat(styles.h4.lineHeight)).toBeCloseTo(parseFloat(styles.h4.fontSize) * 1.5, 1);
  expect(styles.body.fontSize).toBe('16px');
  expect(styles.body.lineHeight).toBe('28px');
  expect(styles.body.marginTop).toBe('16px');
  // h2 上方 40px、下方 1px 细线加 5px 内边距；h3 上方 28px
  expect(styles.h2.marginTop).toBe('40px');
  expect(styles.h2.paddingBottom).toBe('5px');
  expect(styles.h2.borderBottom).toBe('1px');
  expect(styles.h3.marginTop).toBe('28px');
  // §4.7：正文链接是 --accent + 1px 下划线（不能只靠颜色区分），离字 0.2em（16px 字下是 3.2px），悬停 2px
  expect(styles.linkColor).toBe(await tokenColor(page, '--accent'));
  expect(styles.decoration).toBe('underline');
  expect(styles.thickness).toBe('1px');
  expect(parseFloat(styles.offset)).toBeCloseTo(3.2, 1);
  const link = page.locator('.prose a').first();
  await link.hover();
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationThickness)).toBe('2px');
});

test('内容组件：代码、提示块、表格、截图、作者待补和 QQ 群入口（design §4.7）', async ({ page }) => {
  // 先打开站点页面，再读令牌（about:blank 上没有 tokens.css，读出来是透明色）
  await page.goto('./plan1-make-node/');
  const token = (name: string, prop: 'color' | 'background-color') => tokenColor(page, name, prop);
  const surfaceMuted = await token('--surface-muted', 'background-color');

  // 代码块：--surface-muted 底、无边框、6px 圆角、内边距 16px 20px；右边多留出复制按钮的位置
  const code = await page.locator('.prose pre').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      border: s.borderWidth,
      radius: s.borderRadius,
      paddingTop: s.paddingTop,
      paddingRight: s.paddingRight,
      paddingBottom: s.paddingBottom,
      paddingLeft: s.paddingLeft,
    };
  });
  expect(code).toMatchObject({ bg: surfaceMuted, border: '0px', radius: '6px', paddingTop: '16px', paddingBottom: '16px', paddingLeft: '20px' });
  // 复制按钮浮在右上角，右边留白必须真的生效（选择器要压过 .prose pre 的 padding 简写）
  expect(parseFloat(code.paddingRight)).toBeGreaterThan(parseFloat(code.paddingLeft));
  // 至少放得下 44px 的按钮加两侧间距（手机 60px、桌面 84px），防止退回 20px
  expect(parseFloat(code.paddingRight)).toBeGreaterThanOrEqual(56);
  // 行内代码：浅底、上下 2px 左右 6px、4px 圆角
  const inline = await page.locator('.prose :not(pre) > code').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, radius: s.borderRadius, padding: s.padding };
  });
  expect(inline).toEqual({ bg: surfaceMuted, radius: '4px', padding: '2px 6px' });

  // 提示块：普通提示 --surface-muted 底 + --accent 条，caution 用 --caution-bg + --caution-rule 条；
  // 都是左边 4px、右侧 6px 圆角、内边距 12px 16px，标签 13px 600。
  // 现有正文没有 callout（v3 重写稿导入后才会出现），这里按 rehype-callouts 的标记临时插入。
  const callout = await page.evaluate(() => {
    const prose = document.querySelector('.prose')!;
    const make = (type: string) => {
      const block = document.createElement('div');
      block.className = 'callout';
      block.dataset.callout = type;
      block.innerHTML = `<div class="callout-title"><div class="callout-title-text">${type === 'caution' ? '注意' : '提示'}</div></div><div class="callout-content"><p>内容</p></div>`;
      return block;
    };
    const note = make('note');
    const caution = make('caution');
    prose.append(note, caution);
    const read = (el: Element) => {
      const s = getComputedStyle(el);
      const title = getComputedStyle(el.querySelector('.callout-title')!);
      return {
        bg: s.backgroundColor,
        border: s.borderLeftWidth,
        borderColor: s.borderLeftColor,
        radius: s.borderRadius,
        padding: s.padding,
        titleSize: title.fontSize,
        titleWeight: title.fontWeight,
        titleColor: title.color,
      };
    };
    const result = { note: read(note), caution: read(caution) };
    note.remove();
    caution.remove();
    return result;
  });
  expect(callout.note).toMatchObject({ bg: surfaceMuted, border: '4px', padding: '12px 16px', titleSize: '13px', titleWeight: '600' });
  expect(callout.note.borderColor).toBe(await tokenColor(page, '--accent'));
  expect(callout.note.titleColor).toBe(await tokenColor(page, '--accent'));
  expect(callout.note.radius).toBe('0px 6px 6px 0px');
  expect(callout.caution).toMatchObject({ bg: await token('--caution-bg', 'background-color'), border: '4px', padding: '12px 16px' });
  expect(callout.caution.borderColor).toBe(await tokenColor(page, '--caution-rule'));
  expect(callout.caution.titleColor).toBe(await tokenColor(page, '--caution-rule'));

  // 表格：每格 1px 格线、内边距 8px 14px，表头 600 --text + 浅底，隔行浅底，第一列粘性固定且底色跟所在行
  await page.goto('./ip-tests/');
  const table = await page.locator('.prose table').first().evaluate((el) => {
    const th = el.querySelector('th')!;
    const oddFirst = el.querySelector('tbody tr:nth-child(1) td:first-child')!;
    const evenFirst = el.querySelector('tbody tr:nth-child(2) td:first-child')!;
    const even = el.querySelector('tbody tr:nth-child(2) td:nth-child(2)')!;
    const read = (node: Element) => {
      const s = getComputedStyle(node);
      return {
        border: s.borderTopWidth,
        borderRight: s.borderRightWidth,
        borderBottom: s.borderBottomWidth,
        borderLeft: s.borderLeftWidth,
        padding: s.padding,
        bg: s.backgroundColor,
        weight: s.fontWeight,
        color: s.color,
        position: s.position,
      };
    };
    return { th: read(th), oddFirst: read(oddFirst), evenFirst: read(evenFirst), even: read(even) };
  });
  expect(table.th).toMatchObject({ border: '1px', borderRight: '1px', borderBottom: '1px', borderLeft: '1px', padding: '8px 14px', weight: '600' });
  expect(table.th.color).toBe(await tokenColor(page, '--text'));
  expect(table.th.bg).toBe(surfaceMuted);
  expect(table.even.bg).toBe(surfaceMuted);
  expect(table.oddFirst).toMatchObject({ position: 'sticky', bg: await token('--bg', 'background-color') });
  expect(table.evenFirst).toMatchObject({ position: 'sticky', bg: surfaceMuted });

  // 截图：1px 边框、4px 圆角，图版上下各 24px；编号 13px 400 --text-faint
  await page.goto('./clean-up/');
  const plate = await page.locator('.prose figure.plate').first().evaluate((el) => {
    const img = el.querySelector('img')!;
    const no = el.querySelector('.plate-no')!;
    const s = getComputedStyle(el);
    const i = getComputedStyle(img);
    const n = getComputedStyle(no);
    return {
      margin: s.marginTop,
      marginBottom: s.marginBottom,
      border: i.borderTopWidth,
      radius: i.borderRadius,
      noSize: n.fontSize,
      noWeight: n.fontWeight,
      noColor: n.color,
    };
  });
  expect(plate).toEqual({
    margin: '24px',
    marginBottom: '24px',
    border: '1px',
    radius: '4px',
    noSize: '13px',
    noWeight: '400',
    noColor: await tokenColor(page, '--text-faint'),
  });

  // 作者待补：浅黄底 + 4px 左边线、右侧 6px 圆角，标签 13px 600
  await page.goto('./android-subscribe/');
  const todo = await page.locator('.prose aside.author-todo').evaluate((el) => {
    const s = getComputedStyle(el);
    const label = getComputedStyle(el.querySelector('.author-todo-label')!);
    return {
      bg: s.backgroundColor,
      border: s.borderLeftWidth,
      borderColor: s.borderLeftColor,
      radius: s.borderRadius,
      padding: s.padding,
      labelSize: label.fontSize,
      labelWeight: label.fontWeight,
      labelColor: label.color,
    };
  });
  expect(todo).toMatchObject({ bg: await token('--todo-bg', 'background-color'), border: '4px', padding: '12px 16px', labelSize: '13px', labelWeight: '600' });
  expect(todo.borderColor).toBe(await token('--todo-rule', 'color'));
  expect(todo.labelColor).toBe(await token('--todo-rule', 'color'));
  expect(todo.radius).toBe('0px 6px 6px 0px');

  // QQ 群入口：普通提示块的形状（浅底 + 4px --accent 左边线），标签 13px 600
  await page.goto('./faq/');
  const invite = await page.locator('.group-invite').evaluate((el) => {
    const s = getComputedStyle(el);
    const lead = getComputedStyle(el.querySelector('.group-invite-lead')!);
    return {
      bg: s.backgroundColor,
      border: s.borderLeftWidth,
      radius: s.borderRadius,
      padding: s.padding,
      leadSize: lead.fontSize,
      leadWeight: lead.fontWeight,
      leadColor: lead.color,
    };
  });
  expect(invite).toMatchObject({ bg: surfaceMuted, border: '4px', padding: '12px 16px', leadSize: '13px', leadWeight: '600' });
  expect(invite.leadColor).toBe(await tokenColor(page, '--accent'));
  expect(invite.radius).toBe('0px 6px 6px 0px');

  // 首页的紧凑版只是一行 14px --text-muted 小字，不带提示块外壳（§4.4）
  await page.goto('./');
  const compact = await page.locator('.group-invite-compact').evaluate((el) => {
    const s = getComputedStyle(el);
    const lead = getComputedStyle(el.querySelector('.group-invite-lead')!);
    return { bg: s.backgroundColor, border: s.borderLeftWidth, padding: s.padding, leadSize: lead.fontSize, leadWeight: lead.fontWeight, leadColor: lead.color };
  });
  expect(compact).toMatchObject({ bg: 'rgba(0, 0, 0, 0)', border: '0px', padding: '0px', leadSize: '14px', leadWeight: '400' });
  expect(compact.leadColor).toBe(await tokenColor(page, '--text-muted'));
});
