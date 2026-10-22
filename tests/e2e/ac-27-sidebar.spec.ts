import { expect, test } from '@playwright/test';
import { hasSidebar, openToc, sidebar, tocButton } from './toc-helpers';

// AC-27（FR-16，design v3 §4.5）：侧边栏按章折叠，只展开当前页所在的章；点章名开合、不写本机；
// 当前项是 600 --accent 字 + 4px 左边线；参考页高亮上级并展开“日常维护”章（实施计划 §3.1）；
// 719px 没有常驻侧边栏，目录在抽屉里。章名不写“第 n 章”（作者 2026-10-22，V10）。
// 小节列表只挂当前页（原理版 h2）；IP 实测子页的 h2 列在上级参考项下面（见文件末尾的用例）。
// “没有 h2 就不列”、共享步骤只挂一份等结构由 TocNav.test.ts 覆盖。
const CHAPTERS = ['开始', '准备节点和住宅 IP', '客户端配置与订阅', '日常维护', '结尾'];

test('当前章展开、其余折叠；当前项高亮；点章名开合不写本机', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 720, '只在有常驻侧边栏的宽度核对，719 在另一条用例');
  await page.goto('./plan1/');
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  const toc = sidebar(page);

  const chapters = toc.locator('details.toc-chapter-details');
  await expect(chapters).toHaveCount(CHAPTERS.length);
  await expect(toc.locator('summary .toc-chapter-title')).toHaveText(CHAPTERS);
  // 章名只有章名，不写“第 n 章”
  await expect(toc.locator('.toc-chapter-no')).toHaveCount(0);
  for (const text of await toc.locator('summary').allTextContents()) expect(text).not.toMatch(/第 \d+ 章/);
  // 只展开当前页所在的第 1 章（从 0 数）
  await expect(toc.locator('details[open]')).toHaveCount(1);
  await expect(toc.locator('details[open] .toc-chapter-title')).toHaveText('准备节点和住宅 IP');
  await expect(toc.locator('[data-toc-step="plan1"]')).toBeVisible();
  await expect(toc.locator('[data-toc-step="preface"]')).toBeHidden();
  // 方案一在这一章下面；当前页正文的小节列在它下面
  await expect(toc.locator('[data-toc-option="plan-1"]')).toBeVisible();
  await expect(toc.locator('.toc-sections').first()).toBeVisible();

  const current = toc.locator('a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAccessibleName('搭建专属住宅代理节点');
  const style = await current.evaluate((el) => {
    const probe = (name: string) => {
      const d = document.createElement('div');
      d.style.color = `var(${name})`;
      document.body.append(d);
      const value = getComputedStyle(d).color;
      d.remove();
      return value;
    };
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor, shadow: s.boxShadow, weight: s.fontWeight, accent: probe('--accent') };
  });
  expect(style.color).toBe(style.accent);
  expect(style.background).toBe('rgba(0, 0, 0, 0)');
  expect(style.shadow).toContain('4px');
  expect(style.shadow).toContain('inset');
  expect(style.shadow).toContain(style.accent);
  expect(style.weight).toBe('600');

  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await toc.locator('summary').filter({ hasText: '客户端配置与订阅' }).click();
  await expect(toc.locator('details[open] .toc-chapter-title')).toHaveText(['准备节点和住宅 IP', '客户端配置与订阅']);
  await expect(toc.locator('[data-toc-step="iphone-prepare"]')).toBeVisible();
  await expect(toc.getByRole('link', { name: '换到安卓 →' })).toBeVisible();
  // 折叠只发生在 DOM 里，不写本机（FR-16）
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);

  await toc.locator('summary').filter({ hasText: '客户端配置与订阅' }).click();
  await expect(toc.locator('details[open]')).toHaveCount(1);
  await expect(toc.locator('[data-toc-step="iphone-prepare"]')).toBeHidden();
});

test('719px：没有常驻侧边栏，目录在抽屉里，章同样折叠', async ({ page }) => {
  await page.setViewportSize({ width: 719, height: 800 });
  await page.goto('./plan1/');
  await expect(page.locator('[data-toc-ready]').first()).toBeAttached();
  await expect(sidebar(page)).toBeHidden();
  await expect(tocButton(page)).toBeVisible();

  await tocButton(page).click();
  const dialog = page.getByRole('dialog', { name: '目录' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('details[open] .toc-chapter-title')).toHaveText('准备节点和住宅 IP');
  await expect(dialog.locator('[data-toc-step="preface"]')).toBeHidden();
  // 章名是抽屉里的主控，可点区域 ≥44px（design §5）
  const summaryBox = await dialog.locator('summary').filter({ hasText: '准备节点和住宅 IP' }).boundingBox();
  expect(summaryBox!.height).toBeGreaterThanOrEqual(44);
  await dialog.locator('summary').filter({ hasText: '开始' }).click();
  await expect(dialog.locator('[data-toc-step="preface"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('参考页：展开“日常维护”章，高亮 IP 质量实测合集（子页高亮上级）', async ({ page }) => {
  const cases = [
    ['./ip-tests/', 'IP 质量实测合集'],
    ['./ip-tests/decodo/', 'IP 质量实测合集'],
  ] as const;
  for (const [path, parent] of cases) {
    await page.goto(path);
    const toc = await openToc(page);
    await expect(toc.locator('details[open] .toc-chapter-title'), path).toHaveText('日常维护');
    const current = toc.locator('a[aria-current="page"]');
    await expect(current, path).toHaveCount(1);
    await expect(current, path).toHaveAccessibleName(parent);
  }
});

test('实测子页有 h2：小节列在上级参考页下面，点一个滚到正文并关掉抽屉', async ({ page }) => {
  await page.goto('./ip-tests/voyracloud/');
  const toc = await openToc(page);
  // 小节挂在“IP 质量实测合集”这一项下面，不是附录页或别的项
  const parent = toc.locator('li.toc-step:has(a[href$="/ip-tests/"])');
  const sections = parent.locator('.toc-sections a');
  await expect(sections).toHaveCount(2);
  await expect(sections.first()).toHaveAttribute('href', '#我的第一台');
  await sections.first().click();
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#我的第一台');
  await expect(page.locator('h2#我的第一台')).toBeInViewport();
  await expect(page.getByRole('dialog', { name: '目录' })).toBeHidden();
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('≥720px 的侧边栏仍能开合；<720px 没有抽屉可用', async ({ page }) => {
    await page.goto('./plan1/');
    if (!hasSidebar(page)) {
      await expect(sidebar(page)).toBeHidden();
      // 没有 JS 时“目录”是链到首页章节简介的链接（FR-16）
      await expect(page.getByRole('link', { name: '目录', exact: true })).toHaveAttribute('href', /\/#home-chapters$/);
      return;
    }
    const toc = sidebar(page);
    await expect(toc.locator('details[open] .toc-chapter-title')).toHaveText('准备节点和住宅 IP');
    await toc.locator('summary').filter({ hasText: '开始' }).click();
    await expect(toc.locator('[data-toc-step="preface"]')).toBeVisible();
  });
});
