import { expect, test, type Page } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';
const START = '从第 00 章开始';
const TAGLINE = '下面每一步，其实都在做同一件事：让每一项信息都不露出“我在国内”，而且像一个普通用户。';

const width = (page: Page) => page.viewportSize()?.width ?? 0;
const isDesktop = (page: Page) => width(page) >= 960;

// AC-01（FR-18，design v2.1 §4.4）：在新浏览器打开首页 → 看到 logo、站名、五章目录和“从第 00 章开始”，没有“继续上次”；
// 点“从第 00 章开始” → 进入“前言”。
test('新浏览器打开首页：眉题、logo 和站名、一句话、小字信息行、“从第 00 章开始”、五章目录，没有“继续上次”', async ({ page }) => {
  await page.goto('./');

  await expect(page.locator('.home-eyebrow')).toHaveText('一份照着做的说明书');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveAccessibleName(SITE_NAME);
  await expect(heading.locator('svg')).toHaveCount(1);
  // design §4.4：英文副标题画在中文 logo 的中间一行里，页面上不再单独写一行文字
  await expect(heading.locator('svg')).toBeVisible();
  await expect(page.locator('.home-tagline')).toHaveText(TAGLINE);
  // 章节数从路线图取，现在是 5 章（含附录）
  await expect(page.locator('.home-meta')).toHaveText('5 章 · 需要一台电脑和一部手机');
  await expect(page.getByRole('link', { name: START })).toBeVisible();
  await expect(page.getByRole('link', { name: '先看整体思路' })).toBeVisible();
  await expect(page.getByText('继续上次')).toHaveCount(0);
  // 首页没有页眉
  await expect(page.locator('.site-header')).toHaveCount(0);

  const toc = page.getByRole('navigation', { name: '全站目录' });
  // 章节号是固定字形（Numeral），读屏读“第 n 章”
  const chapterNos = toc.locator('.toc-chapter-no [role="img"]');
  await expect(chapterNos).toHaveCount(5);
  expect(await chapterNos.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))).toEqual([
    '第 0 章',
    '第 1 章',
    '第 2 章',
    '第 3 章',
    '第 4 章',
  ]);
  await expect(toc.locator('.toc-chapter-title')).toHaveText(['开始', '准备节点和住宅 IP', '注册和订阅', '结尾', '附录']);
  // 结构同原理版目录页：分叉点下列各选项的页面，原理独有步骤标“原理”。首页没有视图，原理独有步骤不弱化；
  // 节点方案默认方案二（FR-13 v0.6）：方案一、三的页面弱化并标“其他路线”，手机系统没有默认，两边都不弱化
  await expect(toc.locator('.toc-option-title')).toContainText(['方案一', '或：方案二', '或：方案三', 'iPhone', '或：安卓']);
  await expect(toc.getByRole('link', { name: /一、购买服务器/ })).toBeVisible();
  await expect(toc.getByRole('link', { name: /小结：从服务器到代理软件/ })).toContainText('原理');
  await expect(toc.locator('[data-toc-option="plan-2"]')).toHaveAttribute('data-selected', '');
  const others = toc.locator('[data-toc-option="plan-1"] [data-toc-step], [data-toc-option="plan-3"] [data-toc-step]');
  await expect(toc.locator('[data-off-route]')).toHaveCount(await others.count());
  await expect(toc.locator('[data-toc-option="plan-1"] [data-off-route], [data-toc-option="plan-3"] [data-off-route]')).toHaveCount(await others.count());
  await expect(toc.getByText('其他路线').filter({ visible: true })).toHaveCount(await others.count());
  // 参考页列在附录一章里，附录页下面
  const appendix = toc.locator('#chapter-appendix');
  await expect(appendix.getByRole('link')).toHaveText(['附录', '常见问题', 'IP 质量实测合集']);
  await expect(toc.getByText('卡住了再看')).toHaveCount(0);
});

test('点“从第 00 章开始”进入前言', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: START }).click();

  await expect(page).toHaveURL(/\/preface\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('前言');
});

test('点“先看整体思路”进入整体思路，一句话原样出现在它的正文里', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: '先看整体思路' }).click();

  await expect(page).toHaveURL(/\/overview\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('整体思路');
  // 一句话摘自原理版正文（去掉开头的“所以”和加粗），正文改了这里就会失败
  await expect(page.locator('main')).toContainText(TAGLINE);
});

test('章级索引：桌面五行，点“02”跳到下方目录的第 02 章；平板和手机没有', async ({ page }) => {
  await page.goto('./');
  const index = page.getByRole('navigation', { name: '章级索引' });
  if (!isDesktop(page)) {
    await expect(index).toBeHidden();
    return;
  }
  await expect(index.locator('.home-index-title')).toHaveText(['开始', '准备节点和住宅 IP', '注册和订阅', '结尾', '附录']);
  expect(await index.locator('[role="img"]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))).toEqual([
    '第 0 章',
    '第 1 章',
    '第 2 章',
    '第 3 章',
    '第 4 章',
  ]);

  await index.getByRole('link', { name: /第 2 章/ }).click();
  await expect(page).toHaveURL(/#chapter-register-and-subscribe$/);
  const chapter = page.getByRole('navigation', { name: '全站目录' }).locator('#chapter-register-and-subscribe');
  await expect(chapter.locator('.toc-chapter-title')).toHaveText('注册和订阅');
  await expect(chapter).toBeInViewport();
});

test('版式：桌面索引和主区顶部对齐；logo 加右下方的小形象手机满宽、logo 更宽时不超过 560px；没有横向滚动', async ({ page }) => {
  await page.goto('./');
  const box = await page.evaluate(() => {
    const rect = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().toJSON() as DOMRect;
    return {
      hero: rect('.home-hero'),
      index: rect('.home-index'),
      logo: rect('.home-title svg'),
      mascot: rect('.home-logo .mascot'),
      main: rect('.home'),
      gutter: parseFloat(getComputedStyle(document.querySelector('.home')!).paddingLeft),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
  expect(box.logo.left).toBeCloseTo(box.hero.left, 0);
  if (isDesktop(page)) {
    expect(Math.abs(box.index.top - box.hero.top)).toBeLessThan(1);
    expect(box.index.left).toBeGreaterThan(box.hero.right);
  }
  if (width(page) < 720) {
    // 手机满宽：logo 和它右下方的小形象（v2.2 W2 第 6 条）一起占满左右边距之间，小形象在 logo 右边、底边对齐
    expect(box.mascot.right).toBeCloseTo(box.main.right - box.gutter, 0);
    expect(box.mascot.left).toBeGreaterThan(box.logo.right);
    expect(box.mascot.bottom).toBeCloseTo(box.logo.bottom, 0);
  } else {
    expect(box.logo.width).toBeLessThanOrEqual(560.5);
  }
});

// 紫色只用在链接、当前位置和“推荐/当前选择”上，不做大块底色（design v3 §2 第 4 条）。v3 起主按钮用主色（design §3.1 V4，
// FR-72 去掉了 v2.2 的黑色主按钮），所以首屏除 logo 的“Re”和主按钮外，没有哪个元素的底色、边框或图形用 --accent。
test('首屏的主按钮是紫色（--primary-bg = --accent），logo 的“Re”是 --accent，没有别的紫色块', async ({ page }) => {
  await page.goto('./');
  const result = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--accent)';
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.style.color = 'var(--primary-bg)';
    const primary = getComputedStyle(probe).color;
    probe.remove();

    const offenders: string[] = [];
    const describe = (el: Element) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : ''}`;
    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect();
      // 首屏：和视口有交集、看得见的元素
      if (rect.width === 0 || rect.height === 0 || rect.bottom <= 0 || rect.top >= innerHeight) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.closest('.logo-re') || el.closest('.home-start')) continue;
      const colors: string[] = [style.backgroundColor];
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        if (parseFloat(style[`border${side}Width`]) > 0) colors.push(style[`border${side}Color`]);
      }
      if (el instanceof SVGElement) colors.push(style.fill, style.stroke);
      if (colors.includes(accent)) offenders.push(describe(el));
    }
    return {
      accent,
      primary,
      offenders,
      start: getComputedStyle(document.querySelector('.home-start')!).backgroundColor,
      re: getComputedStyle(document.querySelector('.home-title .logo-re')!).fill,
    };
  });
  expect(result.start).toBe(result.primary);
  expect(result.primary).toBe(result.accent);
  expect(result.re).toBe(result.accent);
  expect(result.offenders).toEqual([]);
});

test('首页目录的链接都能打开，参考页链接到参考页', async ({ page }) => {
  await page.goto('./');
  const toc = page.getByRole('navigation', { name: '全站目录' });
  await toc.getByRole('link', { name: 'IP 质量实测合集' }).click();
  await expect(page).toHaveURL(/\/ip-tests\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
});
