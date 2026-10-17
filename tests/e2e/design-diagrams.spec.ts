import { expect, test, type Page } from '@playwright/test';
import { expectScriptRan } from './route-helpers';

// 说明图（design v2.1 §4.7、§9）：整体思路、小结、测 IP 质量三页的原理版各有一张单色线稿，
// 内联的 SVG 有读屏名字，编号同截图；按 1:1 显示，手机上图中文字也是 14px，不撑出横向滚动；
// 线条跟着 --text，强调的那一环是 --accent；桌面编号在页边栏。

const PAGES = [
  { path: './overview/', name: '几个账号和环节的关系' },
  { path: './recap/', name: '方案一：请求从你的设备到 claude 的路线' },
  { path: './check-ip/', name: '方案一：为什么只有 ipinfo.io 看得到 ISP 的 IP' },
];

async function showPrinciple(page: Page) {
  await expectScriptRan(page);
  const toggle = page.getByRole('group', { name: '视图' }).getByRole('button', { name: '原理' });
  if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
}

for (const { path, name } of PAGES) {
  test(`${path}：原理版有一张说明图`, async ({ page }) => {
    await page.goto(path);
    await showPrinciple(page);
    const figure = page.locator('.prose').filter({ visible: true }).locator('figure.plate.diagram');
    await expect(figure).toHaveCount(1);
    await expect(figure.getByRole('img', { name, exact: true })).toBeVisible();
    await expect(figure.locator('.plate-no')).toHaveText(/^图 (\d\d-)?\d$/);

    const box = await figure.evaluate((el) => {
      const svg = el.querySelector('svg')!;
      const prose = el.closest('.prose')!.getBoundingClientRect();
      const r = svg.getBoundingClientRect();
      const caption = el.querySelector('.plate-no')!.getBoundingClientRect();
      return {
        width: r.width,
        viewBox: svg.viewBox.baseVal.width,
        inside: r.left >= prose.left - 0.5 && r.right <= prose.right + 0.5,
        fontSize: getComputedStyle(svg.querySelector('text')!).fontSize,
        fontFamily: getComputedStyle(svg.querySelector('text')!).fontFamily,
        bodyFont: getComputedStyle(document.body).fontFamily,
        color: getComputedStyle(svg).color,
        text: getComputedStyle(document.body).color,
        accent: getComputedStyle(svg.querySelector('.accent')!).color,
        // --accent 算出来的颜色：用一个探针元素取计算值
        accentToken: (() => {
          const probe = document.createElement('span');
          probe.style.color = 'var(--accent)';
          document.body.append(probe);
          const c = getComputedStyle(probe).color;
          probe.remove();
          return c;
        })(),
        margin: [getComputedStyle(el).marginTop, getComputedStyle(el).marginBottom],
        captionTop: caption.top,
        svgTop: r.top,
        captionRight: caption.right,
        svgLeft: r.left,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(box.width).toBe(box.viewBox);
    expect(box.inside).toBe(true);
    expect(box.fontSize).toBe('14px');
    expect(box.fontFamily).toBe(box.bodyFont);
    expect(box.color).toBe(box.text);
    expect(box.accent).toBe(box.accentToken);
    expect(box.accent).not.toBe(box.color);
    expect(box.margin).toEqual(['32px', '32px']);
    expect(box.overflow).toBe(0);
    if ((page.viewportSize()?.width ?? 0) >= 1100) {
      expect(box.captionRight).toBeLessThan(box.svgLeft);
      expect(Math.abs(box.captionTop - box.svgTop)).toBeLessThanOrEqual(2);
    }
  });
}

test('操作版没有说明图（测 IP 质量）', async ({ page }) => {
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  await expect(page.locator('[data-body="operation"] figure.diagram')).toHaveCount(0);
});

test.describe('深色模式', () => {
  test.use({ colorScheme: 'dark' });
  test('线条跟着 --text 变浅，强调仍是 --accent', async ({ page }) => {
    await page.goto('./overview/');
    await showPrinciple(page);
    const svg = page.locator('.prose').filter({ visible: true }).locator('figure.diagram svg');
    const colors = await svg.evaluate((el) => ({
      line: getComputedStyle(el).color,
      body: getComputedStyle(document.body).color,
      accent: getComputedStyle(el.querySelector('.accent')!).color,
    }));
    expect(colors.line).toBe(colors.body);
    // 深色模式的 --text 是浅色：亮度高于一半
    const [r, g, b] = colors.line.match(/\d+/g)!.map(Number);
    expect((r! + g! + b!) / 3).toBeGreaterThan(128);
    expect(colors.accent).not.toBe(colors.line);
  });
});
