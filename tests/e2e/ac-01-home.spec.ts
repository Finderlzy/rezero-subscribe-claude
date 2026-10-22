import { expect, test, type Page } from '@playwright/test';
import { GROUP_NUMBER, GROUP_URL } from '../../src/lib/group';

const SITE_NAME = 'Re:从零开始订阅 claude';
const SITE_NAME_EN = 'Re:Zero − Starting Life with Claude';
const START = '从第 00 章开始';
const TAGLINE = '下面每一步，其实都在做同一件事：让每一项信息都不露出“我在国内”，而且像一个普通用户。';

const width = (page: Page) => page.viewportSize()?.width ?? 0;

// AC-01（FR-18，design v3 §4.4）：在新浏览器打开首页 → 看到 logo（含站名和英文副标题）、五章目录和“从第 00 章开始”，
// 没有“继续上次”；点“从第 00 章开始” → 进入“前言”。
test('新浏览器打开首页：logo（含中英文站名）、一句话、“从第 00 章开始”和五章目录，没有“继续上次”', async ({ page }) => {
  await page.goto('./');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveAccessibleName(new RegExp(`^${SITE_NAME}.*${SITE_NAME_EN}`));
  await expect(heading.locator('svg')).toHaveCount(1);
  await expect(heading.locator('svg')).toBeVisible();
  await expect(page.locator('.home-tagline')).toHaveText(TAGLINE);
  await expect(page.getByRole('link', { name: START })).toBeVisible();
  await expect(page.getByText('继续上次')).toHaveCount(0);

  // v2.2 的首屏元素都去掉了（design §4.4、V13）
  await expect(page.locator('.home-eyebrow')).toHaveCount(0);
  await expect(page.locator('.home-meta')).toHaveCount(0);
  await expect(page.locator('.home-index')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '先看整体思路' })).toHaveCount(0);

  // 首页没有顶栏、没有侧边栏（FR-18）
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('aside.toc-sidebar')).toHaveCount(0);
  await expect(page.locator('[data-toc-dialog]')).toHaveCount(0);

  const toc = page.getByRole('navigation', { name: '全站目录' });
  // 每章一个 h2“第 n 章　章名”，章节号写成文字，不再用固定字形（design §3.2、§4.4）
  await expect(toc.locator('h2.toc-chapter-head')).toHaveText([
    '第 0 章　开始',
    '第 1 章　准备节点和住宅 IP',
    '第 2 章　注册和订阅',
    '第 3 章　结尾',
    '第 4 章　附录',
  ]);
  await expect(toc.locator('[role="img"]')).toHaveCount(0);
  // 目录全部展开、不折叠（首页没有当前路线）
  await expect(toc.locator('details')).toHaveCount(0);

  // 分叉点下按“或 方案一”分组；node-plan 的默认方案二标“推荐”，但首页不高亮当前路线、不标“其他路线”
  await expect(toc.locator('.toc-option-title')).toContainText(['方案一', '或 方案二', '或 方案三', 'iPhone', '或 安卓']);
  await expect(toc.locator('[data-toc-option="plan-2"]')).toHaveAttribute('data-recommended', '');
  await expect(toc.locator('[data-toc-option="plan-2"] .toc-recommend')).toHaveText('推荐');
  await expect(toc.locator('[data-selected]')).toHaveCount(0);
  await expect(toc.locator('[data-off-route]')).toHaveCount(0);
  await expect(toc.getByText('其他路线')).toHaveCount(0);
  await expect(toc.locator('[data-toc-switch]')).toHaveCount(0);
  // 原理独有步骤仍标“原理”（首页目录不弱化，所以没有样式上的弱化，只有这个标签）
  await expect(toc.getByRole('link', { name: /小结：从服务器到代理软件/ })).toContainText('原理');

  // 参考页列在附录一章里、附录页下面
  const appendix = toc.locator('#chapter-appendix');
  await expect(appendix.getByRole('link')).toHaveText(['附录', '常见问题', 'IP 质量实测合集']);
  await expect(toc.getByText('卡住了再看')).toHaveCount(0);

  // 首屏的 QQ 群是紧凑版：群号、加群链接，没有二维码（FR-22、design §4.4）
  const invite = page.getByRole('region', { name: 'QQ 群' });
  await expect(invite.getByRole('link', { name: /加入群聊/ })).toHaveAttribute('href', GROUP_URL);
  await expect(invite).toContainText(GROUP_NUMBER);
  await expect(invite.getByRole('img', { name: /QQ 群二维码/ })).toHaveCount(0);
});

test('点“从第 00 章开始”进入前言', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: START }).click();

  await expect(page).toHaveURL(/\/preface\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('前言');
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
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : ''}`;
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
  await toc.getByRole('link', { name: '整体思路' }).click();
  await expect(page).toHaveURL(/\/overview\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('整体思路');
  // 一句话原样出现在整体思路的正文里（构建时也核对，ADR-0005）
  await expect(page.locator('main')).toContainText(TAGLINE);

  await page.goto('./');
  await page
    .getByRole('navigation', { name: '全站目录' })
    .getByRole('link', { name: 'IP 质量实测合集' })
    .click();
  await expect(page).toHaveURL(/\/ip-tests\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IP 质量实测合集');
});
