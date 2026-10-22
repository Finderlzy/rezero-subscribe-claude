import { expect, test } from '@playwright/test';
import { GROUP_NUMBER, GROUP_URL } from '../../src/lib/group';

const SITE_NAME = 'Re:从零开始订阅 claude';
const SITE_NAME_EN = 'Re:Zero − Starting Life with Claude';
const START = '从第 00 章开始';
// V10：一句话换成新稿（docs/v3-rewrite/01）里的那句，构建时核对它原样出现在整体思路的正文里
const TAGLINE = '让 Claude 能看到的每一项信息，都指向一个 Claude 支持地区的普通用户，并且用得像个普通人。';


// AC-01（FR-18，design v3 §4.4）：在新浏览器打开首页 → 看到 logo（含站名和英文副标题）、五章简介和“从第 00 章开始”，
// 没有“继续上次”；点“从第 00 章开始” → 进入“前言”。
test('新浏览器打开首页：logo（含中英文站名）、一句话、“从第 00 章开始”和五章简介，没有“继续上次”', async ({ page }) => {
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

  // 下面五章简介：从左到右排，每栏只有章名（链到这一章的第一页）和简介，不列具体页面，也不写“第几章”
  // V10：五章按新路线图（route.yaml）：开始、准备节点和住宅 IP、客户端配置与订阅、日常维护、结尾
  const chapters = page.locator('#home-chapters');
  await expect(chapters.getByRole('heading', { level: 2 })).toHaveText([
    '开始',
    '准备节点和住宅 IP',
    '客户端配置与订阅',
    '日常维护',
    '结尾',
  ]);
  await expect(chapters).not.toContainText('第 0 章');
  await expect(chapters).not.toContainText('第 1 章');
  await expect(chapters.getByRole('link')).toHaveCount(5);
  expect(await chapters.locator('h2 a').evaluateAll((links) => links.map((a) => new URL((a as HTMLAnchorElement).href).pathname))).toEqual([
    '/preface/',
    '/overview/',
    '/client-desktop/',
    '/maintenance/',
    '/afterword/',
  ]);
  await expect(chapters.locator('.home-chapter-summary')).toHaveText([
    '先弄清这份教程怎么用、要准备什么，再决定走哪条路。',
    '两条路让 Claude 看到独享的住宅 IP：自己搭代理节点，或者直接买住宅服务器。',
    '把节点接到电脑和手机上，再一步步注册账号、完成订阅。',
    '订阅之后怎么用、怎么续费，账号受限和常见故障怎么处理。',
    '后记与致谢：这一路走下来的一些话。',
  ]);
  // 不再列具体页面（页面导航在步骤页的侧边栏里）
  await expect(chapters.getByRole('link', { name: '前言' })).toHaveCount(0);
  await expect(chapters.locator('[data-toc-step]')).toHaveCount(0);

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

test('五章简介的章名链到各章第一页；一句话仍原样出现在整体思路的正文里', async ({ page }) => {
  await page.goto('./');
  const chapters = page.locator('#home-chapters');
  await chapters.getByRole('link', { name: '开始' }).click();
  await expect(page).toHaveURL(/\/preface\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('前言');

  await page.goto('./');
  await page.locator('#home-chapters').getByRole('link', { name: '结尾' }).click();
  await expect(page).toHaveURL(/\/afterword\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('后记与致谢');

  // 一句话原样出现在整体思路的正文里（构建时也核对，ADR-0005）
  await page.goto('./overview/');
  await expect(page.locator('main')).toContainText(TAGLINE);
});
