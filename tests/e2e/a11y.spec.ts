import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtPages } from './built-pages';

// design §7、§5：axe-core 扫描没有 serious 及以上的问题；只用 Tab 键走完一条路线的前五页（前言到方案一的第一步）。
// 浅色、深色各扫一遍（color-contrast 规则按实际渲染出的颜色量），两版正文的页面在原理视图下再扫一遍
// （切换控件由 #26 接上，这里直接改 data-view）。
// 页面清单取自构建产物（built-pages.ts），三种宽度（360、768、1280）由 playwright.config.ts 的三个 project 提供。
// 代价：约 50 页 × 两种主题 × 三种宽度，步骤页再加原理视图，整套 e2e 因此多出约 3 分钟。

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

        if ((await page.locator('[data-body="principle"]').count()) > 0) {
          await page.evaluate(() => (document.documentElement.dataset.view = 'principle'));
          await expect(page.locator('[data-body="principle"]')).toBeVisible();
          expect(await seriousViolations(page), '原理视图').toEqual([]);
        }
      });
    }

    test('看大图的浮层', async ({ page }) => {
      await page.goto('./ip-tests/voyracloud/');
      await page.locator('[data-image-zoom-opener]').first().click();
      await expect(page.locator('dialog[data-image-zoom]')).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}

// 操作视图下从前言沿“下一步”到第一个选择页（没选时选择页没有下一步），再从选项块进入方案一的第一步：共五页
const FIRST_STEPS = ['/preface/', '/disclaimer/', '/clean-up/', '/choose-plan/'];
const AFTER_CHOICE = '/plan1-buy-server/';

/** 按 Tab 直到 `target` 拿到焦点，途中每个拿到焦点的元素都要有可见的焦点环（design §5：2px，不能去掉）。 */
async function tabUntil(page: Page, target: Locator, label: string) {
  let presses = 0;
  while (!(await target.evaluate((el) => el === document.activeElement))) {
    expect(presses++, `按了 100 次 Tab 还没到${label}`).toBeLessThan(100);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { tag: el.tagName, style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline.style, `${outline.tag} 拿到焦点时没有焦点环`).not.toBe('none');
    expect(outline.width).toBe('2px');
  }
  // 吸顶的页眉、吸底的底栏不能挡住拿到焦点的目标
  await expect(target).toBeInViewport();
  await target.click({ trial: true });
}

test('只用键盘：Tab 到“跳到正文”回车，再 Tab 到“下一步”回车，从前言走到选择方案，再从选项块进入方案一', async ({ page }) => {
  await page.goto('.' + FIRST_STEPS[0]);

  const skipToMain = async () => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '跳到正文' })).toBeFocused();
    await expect(page.getByRole('link', { name: '跳到正文' })).toBeInViewport();
    await page.keyboard.press('Enter');
  };

  for (const target of FIRST_STEPS.slice(1)) {
    await skipToMain();
    // 跳过页眉和目录后，正文里的链接、按钮挨个 Tab 过去，直到“下一步”
    await tabUntil(page, page.getByRole('navigation', { name: '上一步和下一步' }).locator('a[rel="next"]'), '“下一步”');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${target.replace(/\//g, '\\/')}$`));
  }

  // 选择页没选时没有“下一步”：Tab 到方案一选项块的第一步链接，回车进入
  await skipToMain();
  await tabUntil(page, page.locator('.option-block a[data-option-start]').filter({ visible: true }).first(), '方案一的第一步');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${AFTER_CHOICE.replace(/\//g, '\\/')}$`));
});
