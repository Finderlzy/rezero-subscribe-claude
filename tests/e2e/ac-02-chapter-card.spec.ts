import { expect, test, type Page } from '@playwright/test';
import { expectScriptRan } from './route-helpers';

// 页头色带（design §4.1，v2.2 D4、D10）：每页顶部一块 --accent-soft 色带，里面是眉题和 h1；
// 每章第一页（前言、选择方案、选择手机系统、致谢、附录）的色带加高，眉题之前多一组副标题、章名和一句话，
// 一条 1px --border 细线之后再接眉题（这时眉题省掉章的部分）。步骤页不再出现补零的大号编号。

const CHAPTER_STARTS = [
  { path: './preface/', no: 0, title: '开始', intro: '每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。' },
  { path: './choose-plan/', no: 1, title: '准备节点和住宅 IP', intro: '三个方案的目的都一样：让 claude 看到一个静态住宅 IP，而且只有你自己在用。' },
  { path: './choose-phone/', no: 2, title: '注册和订阅', intro: '所以手机也是 claude 会看到的一台设备。' },
  { path: './thanks/', no: 3, title: '结尾', intro: '也感谢所有我没能记住名字、但确实帮到我的人。' },
  { path: './appendix/', no: 4, title: '附录', intro: '卡住了再来查，不看也能照着正文做完。' },
];

for (const { path, no, title, intro } of CHAPTER_STARTS) {
  test(`${path} 的页头色带有章首页的一组：第 ${no} 章 ${title}`, async ({ page }) => {
    await page.goto(path);
    const band = page.locator('.band');
    await expect(band).toBeVisible();
    await expect(page.locator('.chapter-head')).toBeVisible();
    await expect(band.locator('svg.chapter-subtitle')).toHaveAttribute('aria-hidden', 'true');
    await expect(band.locator('.chapter-title')).toHaveText(title);
    await expect(band.locator('.chapter-intro')).toHaveText(intro);
    // 副标题、章名、一句话、细线都在眉题之前
    const order = await page.evaluate(() => {
      const eyebrow = document.querySelector('[data-route-eyebrow]')!;
      const before = (sel: string) =>
        (document.querySelector(sel)!.compareDocumentPosition(eyebrow) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      return { subtitle: before('.chapter-subtitle'), title: before('.chapter-title'), intro: before('.chapter-intro'), rule: before('.chapter-head') };
    });
    expect(order).toEqual({ subtitle: true, title: true, intro: true, rule: true });
    // 眉题省掉章的部分（只有“第 n 步，共 m 步”或“选择”）
    await expect(page.locator('[data-route-eyebrow]')).not.toContainText('章 ·');
    // 不再有大号章节号（固定字形只在首页的章级索引和找不到页）
    await expect(band.locator('[role="img"]')).toHaveCount(0);
    await expect(page.locator('.chapter-card')).toHaveCount(0);
  });
}

test('非章首页的色带只有眉题和 h1：普通页、汇合点、旁支页、后记', async ({ page }) => {
  for (const path of ['./disclaimer/', './import-proxy/', './register-gmail/', './google-appeal/', './afterword/']) {
    await page.goto(path);
    await expect(page.locator('.band h1')).toBeVisible();
    await expect(page.locator('[data-route-eyebrow]')).toContainText(/^第 \d+ 章 · /);
    expect(await page.locator('.chapter-head').count(), path).toBe(0);
  }
});

test('色带的颜色和留白：--accent-soft 底、眉题 --accent、h1 600，上下内边距取 --band-pad-y', async ({ page }) => {
  // 普通页：章首页的色带上沿多出 --space-6，细线只在章首页
  await page.goto('./plan1-buy-server/');
  const style = await page.evaluate(() => {
    const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const band = document.querySelector<HTMLElement>('.band')!;
    const text = (name: string, prop: 'color' | 'background-color') => {
      const el = document.createElement('div');
      el.style.setProperty(prop, `var(${name})`);
      document.body.append(el);
      const value = getComputedStyle(el)[prop === 'color' ? 'color' : 'backgroundColor'];
      el.remove();
      return value;
    };
    return {
      background: getComputedStyle(band).backgroundColor,
      padding: [parseFloat(getComputedStyle(band).paddingTop), parseFloat(getComputedStyle(band).paddingBottom)],
      accent: getComputedStyle(document.querySelector<HTMLElement>('[data-route-eyebrow]')!).color,
      h1Weight: getComputedStyle(document.querySelector('h1')!).fontWeight,
      hasRule: document.querySelector('.chapter-head') !== null,
      tokens: { soft: text('--accent-soft', 'background-color'), accent: text('--accent', 'color'), pad: parseFloat(token('--band-pad-y')) },
    };
  });
  expect(style.background).toBe(style.tokens.soft);
  expect(style.accent).toBe(style.tokens.accent);
  expect(style.padding).toEqual([style.tokens.pad, style.tokens.pad]);
  expect(style.h1Weight).toBe('600');
  expect(style.hasRule).toBe(false);
});

test('色带里的文字和正文栏左对齐（桌面、平板、手机都一样）', async ({ page }) => {
  for (const path of ['./plan1-buy-server/', './choose-plan/']) {
    await page.goto(path);
    const box = await page.evaluate(() => {
      const rect = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
      // 眉题取 <p> 自己的左缘（行内 span 不在行首时它的盒子不是行首位置）；正文取第一个子元素的左缘
      return { h1: rect('.band h1').left, body: rect('.step-body').left + parseFloat(getComputedStyle(document.querySelector('.step-body')!).paddingLeft), eyebrow: rect('.band .eyebrow').left };
    });
    expect(box.eyebrow, path).toBeCloseTo(box.h1, 0);
    expect(box.body, path).toBeCloseTo(box.h1, 0);
  }
});

// 用紫规则（design §3.1，v2.2 D2）：紫色只用在链接、当前位置、眉题和“已选”上；
// 一屏只有主按钮是实心的（墨色），章首页和非章首页的“下一步”都是墨色主按钮。
test('所有页面的“下一步”都是墨色主按钮，不再分章首页', async ({ page }) => {
  for (const path of ['./preface/', './thanks/', './disclaimer/']) {
    await page.goto(path);
    await expectScriptRan(page);
    const colors = await page.evaluate(() => {
      const probe = (name: string) => {
        const el = document.createElement('div');
        el.style.backgroundColor = `var(${name})`;
        document.body.append(el);
        const value = getComputedStyle(el).backgroundColor;
        el.remove();
        return value;
      };
      const next = document.querySelector('nav[aria-label="上一步和下一步"] a[rel="next"]')!;
      return { next: getComputedStyle(next).backgroundColor, primary: probe('--primary-bg'), accent: probe('--accent') };
    });
    expect(colors.next, path).toBe(colors.primary);
    expect(colors.next, path).not.toBe(colors.accent);
  }
});
