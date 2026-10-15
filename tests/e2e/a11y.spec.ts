import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { builtPages } from './built-pages';
import { openToc } from './toc-helpers';

// design §7、§5：axe-core 扫描没有 serious 及以上的问题；只用 Tab 键走完 AC-02 的前五步。
// 浅色、深色各扫一遍（color-contrast 规则按实际渲染出的颜色量），步骤页在原理视图下再扫一遍（原理块展开）。
// 页面清单取自构建产物（built-pages.ts），两种宽度由 playwright.config.ts 的两个 project 提供。
// 代价：约 50 页 × 两种主题 × 两种宽度，步骤页再加原理视图，整套 e2e 因此多出约 2 分钟。
// 原理块展开有 150ms 淡入，扫描时关掉动效，免得量到半透明的颜色。

const PAGES = builtPages();

/** 只报 serious、critical 两级，每条写出规则和出问题的元素，失败时直接能看出改哪里。 */
async function seriousViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}（${v.help}）：${v.nodes.map((n) => n.target.join(' ')).join('、')}`);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme === 'light' ? '浅色' : '深色'}主题 axe 扫描`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' });

    for (const path of PAGES) {
      test(`/${path}`, async ({ page }) => {
        await page.goto(`./${path}`);
        expect(await seriousViolations(page), '操作视图').toEqual([]);

        const principle = page.getByRole('group', { name: '视图' }).getByRole('button', { name: '原理' });
        if (await principle.isVisible()) {
          await principle.click();
          await expect(principle).toHaveAttribute('aria-pressed', 'true');
          expect(await seriousViolations(page), '原理视图').toEqual([]);
        }
      });
    }

    test('打开的目录（手机上是抽屉）', async ({ page }) => {
      await page.goto('./run-script/');
      await openToc(page);
      expect(await seriousViolations(page)).toEqual([]);
    });

    test('看大图的浮层', async ({ page }) => {
      await page.goto('./plan2-buy-residential-vps/');
      await page.locator('[data-image-zoom-opener]').first().click();
      await expect(page.locator('dialog[data-image-zoom]')).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

    test('有进度的首页（继续上次）和从步骤进来的常见问题（返回刚才的步骤）', async ({ page }) => {
      await page.goto('./run-script/');
      await page.getByRole('main').getByRole('link', { name: '打开面板排查' }).click();
      await expect(page.getByRole('link', { name: '← 返回刚才的步骤：运行脚本' }).first()).toBeVisible();
      expect(await seriousViolations(page), '常见问题').toEqual([]);

      await page.goto('./');
      await expect(page.getByRole('link', { name: /^继续上次/ })).toBeVisible();
      expect(await seriousViolations(page), '首页').toEqual([]);
    });
  });
}

// AC-02 默认路线的前五步，加上走完第五步后到达的第六步
const FIRST_STEPS = [
  '/before-you-start/',
  '/overview/',
  '/clean-claude-code/',
  '/choose/node-plan/',
  '/plan1-buy-vps/',
  '/plan1-free-residential-ip/',
];

test('只用键盘：Tab 到“跳到正文”回车，再 Tab 到“下一步”回车，走完 AC-02 的前五步', async ({ page }) => {
  await page.goto('.' + FIRST_STEPS[0]);

  for (const target of FIRST_STEPS.slice(1)) {
    const next = page.getByRole('navigation', { name: '上一步和下一步' }).locator('a[rel="next"]');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '跳到正文' })).toBeFocused();
    await expect(page.getByRole('link', { name: '跳到正文' })).toBeInViewport();
    await page.keyboard.press('Enter');

    // 跳过目录后，正文里的链接、按钮挨个 Tab 过去，直到“下一步”；上限防止死循环
    let presses = 0;
    while (!(await next.evaluate((el) => el === document.activeElement))) {
      expect(presses++, '按了 100 次 Tab 还没到“下一步”').toBeLessThan(100);
      await page.keyboard.press('Tab');
      // 每个拿到焦点的元素都有可见的焦点环（design §5：2px，不能去掉）
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        return { tag: el.tagName, style: style.outlineStyle, width: style.outlineWidth };
      });
      expect(outline.style, `${outline.tag} 拿到焦点时没有焦点环`).not.toBe('none');
      expect(outline.width).toBe('2px');
    }
    await expect(next).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${target.replace(/\//g, '\\/')}$`));
  }
});
