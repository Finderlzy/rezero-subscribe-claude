import { expect, test, type Page } from '@playwright/test';
import { builtPages } from './built-pages';

// AC-16（NFR-01）：在 360px、768px 和 1280px 宽下逐章浏览 → 没有页面级横向滚动，导航按钮都能点到。
// 三种宽度（360、768、1280）由 playwright.config.ts 的三个 project 提供；页面清单取自构建产物（built-pages.ts），每个步骤都在内。
// 宽表格和代码块允许在各自区域内横向滚动，不算页面级。

const PAGES = builtPages();

/** 每页都要能点到的导航控件（只取当前可见的）：顶栏的首页链接、目录按钮、昼夜切换和联系方式，底部导航，页面上的按钮。 */
const NAV_CONTROLS = [
  '.site-header a',
  '.site-header button',
  'nav[aria-label="上一步和下一步"] a',
  '[data-route-skip] a',
  '[data-reference-nav] a',
  '.page-actions a',
].join(', ');

async function expectNoPageScroll(page: Page, label: string) {
  // 和 clientWidth（不含竖向滚动条）比：有常驻滚动条的浏览器里，几像素的溢出也能量出来
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${label}：页面宽 ${scrollWidth}px，可视宽 ${clientWidth}px`).toBeLessThanOrEqual(clientWidth);
}

async function expectControlsClickable(page: Page) {
  const controls = page.locator(NAV_CONTROLS).filter({ visible: true });
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    // trial：只做可点性检查（可见、稳定、没被吸顶的栏或浮层挡住），不真的点
    await controls.nth(i).click({ trial: true });
  }
}

for (const path of PAGES) {
  test(`/${path} 没有页面级横向滚动，导航按钮都能点到`, async ({ page }) => {
    await page.goto(`./${path}`, { waitUntil: 'load' });
    // 原来两版正文各量一次；用户 2026-10-22 决定去掉视图切换、固定原理视图，页面上只有原理版，量一次
    await expectNoPageScroll(page, '原理视图');
    await expectControlsClickable(page);
  });
}

// 三档断点（design v3 §3.2、§3.3：<720 / 720–959 / ≥960）的字号和正文栏左右内边距，三个宽度各由一个 project 提供
const TIERS = [
  { min: 960, body: '16px', h1: '34px', gutter: '40px' },
  { min: 720, body: '16px', h1: '34px', gutter: '40px' },
  { min: 0, body: '16px', h1: '28px', gutter: '16px' },
];

test('步骤页和参考页：正文、h1 字号和左右边距按当前档位', async ({ page }) => {
  const width = page.viewportSize()!.width;
  const tier = TIERS.find((t) => width >= t.min)!;
  // V10 的步骤页取日常维护，参考页取 IP 质量实测合集（参考页只有 IP 实测这一组）
  for (const path of ['maintenance/', 'ip-tests/']) {
    await page.goto(`./${path}`);
    const size = (selector: string) =>
      page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(await size('.prose p'), path).toBe(tier.body);
    expect(await size('h1'), path).toBe(tier.h1);
    // 左右内边距在正文栏上（步骤页 .step-body，参考页 .page-body）
    const gutter = await page.locator('.step-body, .page-body').first().evaluate((el) => getComputedStyle(el).paddingLeft);
    expect(gutter, path).toBe(tier.gutter);
  }
});

// design v3 §4.5：≥720px 的侧边栏常驻（平板 256px、桌面 300px）、sticky top 0、最高 100vh、当前页高亮、自己能滚；
// 侧边栏加上正文没有横向滚动。
test('≥720 宽：左侧目录常驻、当前页高亮、能独立滚动，页面没有横向滚动', async ({ page }) => {
  const width = page.viewportSize()!.width;
  // V10 的“日常维护、风控应对与常见故障”展开各章后目录比视口高，用来核对独立滚动
  await page.goto('./maintenance/');
  const aside = page.locator('[data-toc-sidebar]');
  if (width < 720) {
    await expect(aside).toBeHidden();
    return;
  }
  await expect(aside).toBeVisible();
  await expect(page.getByRole('button', { name: '目录', exact: true })).toBeHidden();
  // 打开页面时侧边栏自己滚到当前项，页面本身不动：顶栏和 h1 仍在首屏（顶栏不固定，滚走页面就看不到它们）
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.site-header')).toBeInViewport();
  const inAside = await aside.evaluate((el) => {
    const current = el.querySelector('[aria-current="page"]')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return current.top >= box.top && current.bottom <= Math.min(box.bottom, innerHeight);
  });
  expect(inAside).toBe(true);
  // V02：默认只展开当前章，内容可能比视口短；验证独立滚动前先展开其余章（design §4.5，FR-16）
  while ((await aside.locator('details:not([open]) > summary').count()) > 0) {
    await aside.locator('details:not([open]) > summary').first().click();
  }
  const box = await aside.evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    // v0.13（FR-88）：aside 是两行，滚动的是里面的 .toc-sidebar-scroll，底部钉着“更新日志”入口
    const scroll = el.querySelector<HTMLElement>('.toc-sidebar-scroll')!;
    return {
      position: style.position,
      stickyTop: style.top,
      // 页面在顶部时侧边栏从顶栏下面开始
      top: Math.round(rect.top - document.querySelector('.site-header')!.getBoundingClientRect().bottom),
      // 侧边栏的可视高度 = 视口高度 - 顶栏高度（v0.13 起底部那行入口要留在视口里）
      bodyViewport: innerHeight - document.querySelector('.site-header')!.getBoundingClientRect().height,
      height: Math.round(rect.height),
      viewport: innerHeight,
      scrollable: scroll.scrollHeight > scroll.clientHeight,
      overflowY: style.overflowY,
      scrollOverflowY: getComputedStyle(scroll).overflowY,
      borderRight: style.borderRightWidth,
      width: Math.round(rect.width),
      // 滚动区 + 底部入口正好占满 aside 的高度
      rows: Math.round(scroll.getBoundingClientRect().height + el.querySelector('.toc-sidebar-foot')!.getBoundingClientRect().height),
    };
  });
  expect(box.position).toBe('sticky');
  // 顶栏不固定，侧边栏 sticky 到视口顶边（design §4.5）：页面在顶部时它从顶栏下面开始，滚下去后贴到 0
  expect(box.stickyTop).toBe('0px');
  expect(box.top).toBe(0);
  expect(box.height).toBeCloseTo(box.bodyViewport, 0);
  expect(box.width).toBe(width >= 960 ? 300 : 256);
  // aside 自己不再滚（v0.13 起跨两行），滚动在 .toc-sidebar-scroll 上；两行加起来正好是侧边栏高度
  expect(box.overflowY).toBe('hidden');
  expect(box.scrollOverflowY).toBe('auto');
  expect(box.borderRight).toBe('1px');
  expect(box.scrollable).toBe(true);
  expect(box.rows).toBeCloseTo(box.height, 0);
  // 只有 .toc-sidebar-scroll 这一层滚动：里面的目录 <nav> 等都不是滚动容器（之前 nav 也吸顶、满高、overflow:auto，出现两条竖向滚动条）
  const nestedScrollers = await aside.evaluate(
    (el) =>
      [...el.querySelectorAll('*')].filter(
        (node) => /(auto|scroll)/.test(getComputedStyle(node).overflowY) && !node.classList.contains('toc-sidebar-scroll'),
      ).length,
  );
  expect(nestedScrollers).toBe(0);

  // 当前页高亮：600 --accent 字 + 4px --accent 左边线，没有底色块（design v3 §4.5），只有一个
  const current = aside.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAccessibleName(/^日常维护、风控应对与常见故障/);
  const colors = await current.evaluate((el) => {
    const probe = (name: string, prop: 'color' | 'background-color') => {
      const d = document.createElement('div');
      d.style.setProperty(prop, `var(${name})`);
      document.body.append(d);
      const v = getComputedStyle(d)[prop === 'color' ? 'color' : 'backgroundColor'];
      d.remove();
      return v;
    };
    const style = getComputedStyle(el);
    return {
      color: style.color,
      background: style.backgroundColor,
      shadow: style.boxShadow,
      weight: style.fontWeight,
      accent: probe('--accent', 'color'),
    };
  });
  expect(colors.color).toBe(colors.accent);
  expect(colors.background).toBe('rgba(0, 0, 0, 0)');
  expect(colors.shadow).toContain('4px');
  expect(colors.weight).toBe('600');

  // 侧边栏的滚动区自己滚：滚到底后页面本身没动，滚动区滚了（v0.13 起滚动发生在 .toc-sidebar-scroll 里）
  const scroll = await aside.evaluate((el) => {
    const pageY = window.scrollY;
    const inner = el.querySelector<HTMLElement>('.toc-sidebar-scroll')!;
    inner.scrollTop = inner.scrollHeight;
    return { pageY, pageYAfter: window.scrollY, scrollTop: inner.scrollTop };
  });
  expect(scroll.scrollTop).toBeGreaterThan(0);
  expect(scroll.pageYAfter).toBe(scroll.pageY);

  await expectNoPageScroll(page, '侧边栏 + 正文');

  // 往下滚：顶栏随页面滚走（不固定），侧边栏贴着视口顶边
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect(await page.locator('.site-header').evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
  expect(await aside.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0);
});

// 宽表格（design §4.7）：表头不折行，窄屏上整张表在自己的容器里横向滚动，第一列粘性固定
test('实测合集的表格：表头不折行、第一列粘性固定', async ({ page }) => {
  await page.goto('./ip-tests/');
  const table = page.locator('.prose table').first();
  const header = await table.locator('th').evaluateAll((cells) =>
    cells.map((th) => ({
      text: th.textContent!.trim(),
      height: th.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(th).lineHeight),
    })),
  );
  for (const th of header) expect(th.height, th.text).toBeLessThan(th.lineHeight * 2);

  // 放不下时表格自己横向滚动；滚动后第一列的单元格仍贴着表格容器的左缘
  const scrolled = await table.evaluate((el) => {
    if (el.scrollWidth <= el.clientWidth) return null;
    el.scrollLeft = 80;
    const left = el.getBoundingClientRect().left + el.clientLeft;
    return [...el.querySelectorAll('tr > :first-child')].map((cell) => cell.getBoundingClientRect().left - left);
  });
  if ((page.viewportSize()?.width ?? 0) < 720) expect(scrolled, '360 宽时表格应该在容器里横向滚动').not.toBeNull();
  if (scrolled) for (const offset of scrolled) expect(offset).toBeCloseTo(0, 0);
});