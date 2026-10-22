import { expect, test } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';
const SITE_NAME_EN = 'Re:Zero − Starting Life with Claude';

// AC-29（FR-18，design v3 §4.4）：打开首页 → 居中显示 logo、站名、英文副标题、“从第 00 章开始”和 QQ 群小字，
// 下面是五章目录；首页没有侧边栏。站名和英文副标题画在 logo 里，由 h1 的 aria-label 给出（design V12）。
test('首屏居中：logo、中英文站名、一句话、紫色主按钮、QQ 群小字，没有顶栏和侧边栏', async ({ page }) => {
  await page.goto('./');

  const width = page.viewportSize()!.width;
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveAccessibleName(new RegExp(`^${SITE_NAME}.*${SITE_NAME_EN}`));
  await expect(heading.locator('svg')).toBeVisible();

  // 没有顶栏和侧边栏（FR-18）
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('aside.toc-sidebar')).toHaveCount(0);
  await expect(page.locator('[data-toc-dialog]')).toHaveCount(0);

  const box = await page.evaluate(() => {
    const rect = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().toJSON() as DOMRect;
    const hero = rect('.home-hero');
    const home = rect('.home');
    const logo = rect('.home-title svg');
    const mascot = rect('.home-logo .mascot');
    const chapters = rect('.home-chapters');
    const footer = document.querySelector('.site-footer p')!;
    return {
      home,
      logo,
      mascot,
      chapters,
      heroCenter: hero.left + hero.width / 2,
      pageCenter: home.left + home.width / 2,
      heroTextAlign: getComputedStyle(document.querySelector('.home-hero')!).textAlign,
      footerTextAlign: getComputedStyle(footer).textAlign,
      logoMax: getComputedStyle(document.querySelector('.home-logo')!).maxWidth,
      chaptersMax: getComputedStyle(document.querySelector('.home-chapters')!).maxWidth,
      chaptersCenter: chapters.left + chapters.width / 2,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
  // 首屏内容在页面里居中，文字和首页页脚也居中（design §4.0、§4.4）
  expect(box.heroTextAlign).toBe('center');
  expect(box.heroCenter).toBeCloseTo(box.pageCenter, 0);
  expect(box.footerTextAlign).toBe('center');

  // logo 宽 ≤560px、手机满宽；小形象在 logo 右下方、底边贴着 logo（design §4.4、V16 的位置）
  expect(box.logoMax).toBe('560px');
  if (width < 720) {
    expect(box.logo.width).toBeCloseTo(box.home.width - 2 * 16, 0);
  } else {
    expect(box.logo.width).toBeLessThanOrEqual(560);
  }
  expect(box.mascot.right).toBeCloseTo(box.logo.right, 0);
  // 小形象在 logo 下面一行，不和字重叠（design §4.4 的示意）
  expect(box.mascot.top).toBeGreaterThanOrEqual(box.logo.bottom - 1);

  // 目录宽同正文栏（740px），在页面里居中摆放
  expect(box.chaptersMax).toBe('740px');
  expect(box.chaptersCenter).toBeCloseTo(box.pageCenter, 0);
  expect(box.chapters.top).toBeGreaterThan(box.home.top);

  // 主按钮是唯一的紫色实心按钮，48px 高、6px 圆角（design §4.4、§4.7）
  const start = page.locator('[data-home-start]');
  await expect(start).toHaveText('从第 00 章开始→');
  const startStyle = await start.evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    radius: getComputedStyle(el).borderRadius,
    height: el.getBoundingClientRect().height,
  }));
  expect(startStyle.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(startStyle.height).toBeGreaterThanOrEqual(48);
  expect(startStyle.radius).toBe('6px');

  // QQ 群小字：平板起和标题、群号、链接排在同一行；首页没有二维码（FR-22、design §4.4）
  const invite = page.getByRole('region', { name: 'QQ 群' });
  await expect(invite).toBeVisible();
  await expect(invite.getByRole('img', { name: /QQ 群二维码/ })).toHaveCount(0);
  if (width >= 720) {
    // 标题和“群号”这一行排在同一行：两段文字的下沿（基线附近）相差不到 2px
    const rows = await invite.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el.querySelector('.group-invite-lead')!);
      const lead = range.getBoundingClientRect();
      const number = el.querySelector('.group-invite-number')!.getBoundingClientRect();
      return { leadBottom: lead.bottom, numberBottom: number.bottom };
    });
    expect(Math.abs(rows.leadBottom - rows.numberBottom)).toBeLessThan(2);
  }

  // 下面五章目录，每章一个 h2（章节号写成文字，design §3.2）
  const toc = page.getByRole('navigation', { name: '全站目录' });
  await expect(toc.locator('h2.toc-chapter-head')).toHaveText([
    '第 0 章　开始',
    '第 1 章　准备节点和住宅 IP',
    '第 2 章　注册和订阅',
    '第 3 章　结尾',
    '第 4 章　附录',
  ]);
});
