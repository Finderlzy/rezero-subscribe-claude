import { expect, test } from '@playwright/test';
import { UPDATE_LOG_PATH } from '../../src/lib/update-log';

// AC-36（FR-83、FR-84）：条目按日期倒序、同一天保持文件里的顺序；置顶公告在「全部」和「公告」里排最前；
// 条目的 page 渲染成指向被改动页面的链接。
// AC-37（FR-87）：首页五章简介下面是“最近更新”，正好 5 条，和「全部」排最前的 5 条一致。


/** 页面里的条目：data-entry-date / data-entry-type / 标题 */
const entriesOf = async (page: import('@playwright/test').Page, panel = 'all') =>
  page.locator(`[data-update-panel="${panel}"] [data-update-entry]`).evaluateAll((nodes) =>
    nodes.map((node) => ({
      date: node.getAttribute('data-entry-date')!,
      type: node.getAttribute('data-entry-type')!,
      title: node.querySelector('.update-title')!.textContent!.trim(),
      href: node.querySelector('.update-title a')!.getAttribute('href')!,
      pinned: node.classList.contains('update-entry-pinned'),
      body: node.querySelector('.update-body')?.textContent?.trim() ?? '',
    })),
  );

test.describe('AC-36：排序、置顶和页面链接', () => {
  test('每个分类里按日期倒序，置顶公告在「全部」和「公告」里排最前', async ({ page }) => {
    await page.goto('./update-log/');
    await expect(page.locator('html[data-update-log-ready]')).toBeAttached();

    for (const category of ['all', 'notice', 'content', 'site']) {
      await page.locator(`[data-update-tab="${category}"]`).click();
      const entries = await entriesOf(page, category);
      if (entries.length === 0) continue;
      // 条目都有四个字段：日期、类型、标题、内容（列表页）
      for (const entry of entries) {
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(['notice', 'content', 'site']).toContain(entry.type);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.body.length).toBeGreaterThan(0);
      }
      // 分类内的条目都属于这一类
      if (category !== 'all') for (const entry of entries) expect(entry.type).toBe(category);

      // 置顶的排在所有非置顶之前（因此也在最前面）
      const pinnedCount = entries.filter((entry) => entry.pinned).length;
      expect(entries.slice(0, pinnedCount).every((entry) => entry.pinned)).toBe(true);
      const rest = entries.slice(pinnedCount);
      // 非置顶的部分按日期倒序；置顶的部分之间也按日期倒序
      const dates = (list: typeof entries) => list.map((entry) => entry.date);
      const isDesc = (list: string[]) => list.every((date, index) => index === 0 || list[index - 1]! >= date);
      expect(isDesc(dates(entries.slice(0, pinnedCount)))).toBe(true);
      expect(isDesc(dates(rest))).toBe(true);
    }
  });

  test('条目的 page 渲染成指向被改动页面的链接', async ({ page }) => {
    await page.goto('./update-log/');
    await expect(page.locator('html[data-update-log-ready]')).toBeAttached();
    const entries = await entriesOf(page);
    // 至少有内容类条目挂了页面（初始数据的 client-desktop、plan1、ip-tests）
    const linked = entries.filter((entry) => !entry.href.endsWith(UPDATE_LOG_PATH) && entry.href !== './update-log/');
    expect(linked.length).toBeGreaterThan(0);
    for (const entry of linked) expect(entry.href).toMatch(/^\/[^/]+\/$/);

    // 点一条挂到页面的条目，进入那一页
    const target = entries.find((entry) => entry.href === '/plan1/');
    expect(target, '初始数据里应有一条挂到 /plan1/ 的更新').toBeTruthy();
    await page.locator(`[data-update-panel="all"] [data-update-entry] .update-title a[href="/plan1/"]`).first().click();
    await expect(page).toHaveURL(/\/plan1\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('方案一：搭建专属住宅代理节点');
  });
});

test.describe('AC-37：首页的最近更新', () => {
  test('五章简介下面正好 5 条，和「全部」最前的 5 条一致；查看全部进更新日志', async ({ page }) => {
    await page.goto('./');
    const section = page.locator('#home-updates');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('最近更新');

    const home = await section.locator('[data-update-entry]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        date: node.getAttribute('data-entry-date')!,
        type: node.getAttribute('data-entry-type')!,
        title: node.querySelector('.update-title')!.textContent!.trim(),
      })),
    );
    expect(home).toHaveLength(5);

    // 和 /update-log/ 的「全部」分类最前的 5 条完全一致
    await page.goto('./update-log/');
    await expect(page.locator('html[data-update-log-ready]')).toBeAttached();
    const all = await entriesOf(page, 'all');
    expect(home).toEqual(all.slice(0, 5).map(({ date, type, title }) => ({ date, type, title })));

    // “查看全部 →”进更新日志
    await page.goto('./');
    await page.locator('[data-home-updates-more]').click();
    await expect(page).toHaveURL(/\/update-log\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('更新日志');
  });

  test('最近更新在五章简介下面，360px 下不横向滚动', async ({ page }) => {
    await page.goto('./');
    const box = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON() as DOMRect;
      return {
        chapters: rect('#home-chapters'),
        updates: rect('#home-updates'),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    // 和五章简介隔开：在它下面
    expect(box.updates.top).toBeGreaterThan(box.chapters.bottom);
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
  });

  // 作者 2026-10-25：和五章简介一样横着排（桌面 5 列、平板 3 列、手机一列），每列里日期/类型/标题竖着放
  test('最近更新横着排：桌面 5 列同一行、平板 3 列、手机一列；每列内竖排', async ({ page }) => {
    const width = page.viewportSize()!.width;
    await page.goto('./');
    const box = await page.evaluate(() => {
      const row = (el: Element) => Math.round(el.getBoundingClientRect().top);
      const cards = [...document.querySelectorAll('#home-updates [data-update-entry]')].map((el) => {
        const rect = el.getBoundingClientRect();
        const meta = el.querySelector('.update-meta')!.getBoundingClientRect();
        const title = el.querySelector('.update-title')!.getBoundingClientRect();
        return { left: rect.left, top: rect.top, metaBottom: meta.bottom, titleTop: title.top };
      });
      return { cards, row };
    });
    expect(box.cards).toHaveLength(5);

    const sameRow = (a: number, b: number) => Math.abs(a - b) < 1;
    const tops = box.cards.map((card) => Math.round(card.top));
    if (width >= 960) {
      // 桌面：5 列一行，从左到右
      for (const top of tops) expect(sameRow(top, tops[0]!)).toBe(true);
      for (let i = 1; i < box.cards.length; i++) expect(box.cards[i]!.left).toBeGreaterThan(box.cards[i - 1]!.left);
    } else if (width >= 720) {
      // 平板：3 列一行，剩下 2 列换到第二行
      for (const card of box.cards.slice(0, 3)) expect(sameRow(Math.round(card.top), tops[0]!)).toBe(true);
      expect(box.cards[3]!.top).toBeGreaterThan(box.cards[0]!.top);
      expect(box.cards[3]!.left).toBeCloseTo(box.cards[0]!.left, 0);
      expect(box.cards[4]!.left).toBeGreaterThan(box.cards[3]!.left);
    } else {
      // 手机：一列
      for (let i = 1; i < box.cards.length; i++) {
        expect(box.cards[i]!.top).toBeGreaterThan(box.cards[i - 1]!.top);
        expect(box.cards[i]!.left).toBeCloseTo(box.cards[0]!.left, 0);
      }
    }
    // 每一列内部：日期/类型一行在上面，标题在它下面（竖排）
    for (const card of box.cards) expect(card.titleTop).toBeGreaterThanOrEqual(card.metaBottom - 0.5);
  });
});

test.describe('AC-38：360px 下分类可横向滚，没有页面级横向滚动', () => {
  test('分类一排不换行、能横向滚', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('./update-log/');
    const box = await page.evaluate(() => {
      const tabs = document.querySelector('.update-tabs')!;
      const style = getComputedStyle(tabs);
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflowX: style.overflowX,
        tabsScroll: tabs.scrollWidth >= tabs.clientWidth,
        tabTops: [...document.querySelectorAll('[data-update-tab]')].map((el) => el.getBoundingClientRect().top),
      };
    });
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
    expect(box.overflowX).toBe('auto');
    expect(box.tabsScroll).toBe(true);
    // 四个分类在同一行（不换行）
    expect(new Set(box.tabTops.map((top) => Math.round(top))).size).toBe(1);
  });
});