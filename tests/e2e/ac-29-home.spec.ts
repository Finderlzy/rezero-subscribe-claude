import { expect, test } from '@playwright/test';

const SITE_NAME = 'Re:从零开始订阅 claude';
const SITE_NAME_EN = 'Re:Zero − Starting Life with Claude';

// AC-29（FR-18，design v3 §4.4）：打开首页 → 居中显示 logo、站名、英文副标题、“从第 00 章开始”和 QQ 群小字，
// 下面是五章简介；首页没有侧边栏。站名和英文副标题画在 logo 里，由 h1 的 aria-label 给出（design V12）。
// 五章从左到右：桌面五栏一行、平板三栏（3 + 2）、手机一栏（作者 2026-10-22 决定）。
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
    const cards = [...document.querySelectorAll('.home-chapter')].map((el) => el.getBoundingClientRect().toJSON() as DOMRect);
    const footer = document.querySelector('.site-footer p')!;
    return {
      home,
      cards,
      logo,
      mascot,
      chapters,
      heroCenter: hero.left + hero.width / 2,
      pageCenter: home.left + home.width / 2,
      heroTextAlign: getComputedStyle(document.querySelector('.home-hero')!).textAlign,
      footerTextAlign: getComputedStyle(footer).textAlign,
      logoMax: getComputedStyle(document.querySelector('.home-logo')!).maxWidth,
      homePadLeft: parseFloat(getComputedStyle(document.querySelector('.home')!).paddingLeft),
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

  // 章节简介和首屏同一内容宽度（左右边距对开），在页面里居中摆放
  expect(box.cards[0]!.left).toBeCloseTo(box.home.left + box.homePadLeft, 0);
  expect(Math.max(...box.cards.map((card) => card.right))).toBeCloseTo(box.home.right - box.homePadLeft, 0);
  expect(box.chaptersCenter).toBeCloseTo(box.pageCenter, 0);
  expect(box.cards[0]!.top).toBeGreaterThan(box.home.top);
  // 五章从左到右：桌面五栏一行、平板三栏（3 + 2）、手机一列
  expect(box.cards).toHaveLength(5);
  const sameRow = (a: DOMRect, b: DOMRect) => Math.abs(a.top - b.top) < 1;
  if (width >= 960) {
    for (const card of box.cards) expect(sameRow(card, box.cards[0]!)).toBe(true);
    for (let i = 1; i < box.cards.length; i++) expect(box.cards[i]!.left).toBeGreaterThan(box.cards[i - 1]!.left);
  } else if (width >= 720) {
    for (const card of box.cards.slice(0, 3)) expect(sameRow(card, box.cards[0]!)).toBe(true);
    expect(box.cards[3]!.top).toBeGreaterThan(box.cards[0]!.top);
    expect(box.cards[3]!.left).toBeCloseTo(box.cards[0]!.left, 0);
    expect(box.cards[4]!.left).toBeGreaterThan(box.cards[3]!.left);
  } else {
    for (let i = 1; i < box.cards.length; i++) {
      expect(box.cards[i]!.top).toBeGreaterThan(box.cards[i - 1]!.top);
      expect(box.cards[i]!.left).toBeCloseTo(box.cards[0]!.left, 0);
    }
  }

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

  // 下面五章简介：章名是 h2，不写“第几章”，每栏带一句 summary
  const chapters = page.locator('#home-chapters');
  await expect(chapters.getByRole('heading', { level: 2 })).toHaveText([
    '开始',
    '准备节点和住宅 IP',
    '客户端配置与订阅',
    '日常维护',
    '结尾',
  ]);
  await expect(chapters).not.toContainText('第 0 章');
  await expect(chapters.locator('.home-chapter-summary')).toHaveCount(5);
  await expect(chapters.locator('.home-chapter-summary').first()).toHaveText('先弄清这份教程怎么用、要准备什么，再决定走哪条路。');
});
