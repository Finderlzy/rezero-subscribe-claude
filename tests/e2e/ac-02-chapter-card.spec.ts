import { expect, test, type Page } from '@playwright/test';

// AC-02 逐章浏览时的章节标题卡（design v2.1 §4.1、§5，D6）：每章第一页（前言、选择方案、选择手机系统、致谢）顶部有标题卡，
// 章节号读屏为“第 n 章”，英文副标题对读屏隐藏，一句话是 route.yaml 里这一章的 intro；其余页面没有。

const CHAPTER_STARTS = [
  { path: './preface/', no: 0, title: '开始', intro: '每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。' },
  { path: './choose-plan/', no: 1, title: '准备节点和住宅 IP', intro: '三个方案的目的都一样：让 claude 看到一个静态住宅 IP，而且只有你自己在用。' },
  { path: './choose-phone/', no: 2, title: '注册和订阅', intro: '所以手机也是 claude 会看到的一台设备。' },
  { path: './thanks/', no: 3, title: '结尾', intro: '也感谢所有我没能记住名字、但确实帮到我的人。' },
];

for (const { path, no, title, intro } of CHAPTER_STARTS) {
  test(`${path} 有章节标题卡：第 ${no} 章 ${title}`, async ({ page }) => {
    await page.goto(path);
    const card = page.locator('.chapter-card');
    await expect(card).toBeVisible();
    await expect(card.getByRole('img', { name: `第 ${no} 章` })).toBeVisible();
    await expect(card.locator('.chapter-card-title')).toHaveText(title);
    await expect(card.locator('.chapter-card-intro')).toHaveText(intro);
    // 副标题是装饰，对读屏隐藏；卡片里能读到的只有章节号和章名、一句话
    await expect(card.locator('svg.chapter-subtitle')).toHaveAttribute('aria-hidden', 'true');
    expect(await card.getByRole('img').count()).toBe(1);
  });
}

test('非章首页没有章节标题卡：普通页、汇合点、旁支页、后记', async ({ page }) => {
  for (const path of ['./disclaimer/', './import-proxy/', './register-gmail/', './google-appeal/', './afterword/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('.chapter-card').count(), path).toBe(0);
  }
});

/**
 * 标题卡的版式（design §4.1、§3.3）。“底边对齐”指章名最后一行文字的基线（数字坐在基线上），和页边编号的写法一致。
 * 桌面：章节号右缘对齐页边栏右缘（= 下面步骤编号的右缘）、隔 32px 是章名，线从页边栏左缘画到正文栏右缘；
 * 平板：并排、底边对齐；手机：章节号在章名上方。
 */
async function measure(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('.chapter-card .numeral')).toBeVisible();
  return page.evaluate(() => {
    const title = document.querySelector('.chapter-card-title')!;
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0';
    title.append(probe);
    const baseline = probe.getBoundingClientRect().bottom;
    probe.remove();
    const rect = (el: Element | null) => {
      const r = el!.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    return {
      baseline,
      no: rect(document.querySelector('.chapter-card .numeral')),
      title: rect(title),
      card: rect(document.querySelector('.chapter-card')),
      mark: rect(document.querySelector('[data-route-mark]')),
      h1: rect(document.querySelector('h1')),
    };
  });
}

test('标题卡版式：桌面章节号挂在页边栏、和章名底边对齐；平板并排、底边对齐；手机章节号在章名上方', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0;
  for (const path of ['./preface/', './choose-plan/', './choose-phone/']) {
    const box = await measure(page, path);
    if (width >= 1100) {
      expect(Math.abs(box.no.bottom - box.baseline), path).toBeLessThanOrEqual(2);
      // 32 = --space-6，128 = --margin-width + --space-6（tokens.css）
      expect(box.title.left - box.no.right, path).toBeCloseTo(32, 0);
      // 和步骤编号在同一条竖线上：都右对齐到页边栏右缘
      expect(box.no.right, path).toBeCloseTo(box.mark.right, 0);
      // 线横跨页边栏（96px）+ 间隔（32px）+ 正文栏
      expect(box.card.left, path).toBeCloseTo(box.h1.left - 128, 0);
      expect(box.card.right, path).toBeCloseTo(box.h1.right, 0);
    } else if (width >= 720) {
      expect(box.no.right, path).toBeLessThan(box.title.left);
      expect(Math.abs(box.no.bottom - box.baseline), path).toBeLessThanOrEqual(2);
    } else {
      expect(box.no.bottom, path).toBeLessThanOrEqual(box.title.top + 1);
      expect(box.no.left, path).toBeCloseTo(box.title.left, 0);
    }
  }
});

test('标题卡的颜色：线 1px --text，章节号 --accent，一句话 --text-muted、最宽 24em', async ({ page }) => {
  await page.goto('./preface/');
  const style = await page.evaluate(() => {
    const token = (name: string) => {
      const probe = document.createElement('div');
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const card = getComputedStyle(document.querySelector('.chapter-card')!);
    const no = getComputedStyle(document.querySelector('.chapter-card-no')!);
    const intro = getComputedStyle(document.querySelector('.chapter-card-intro')!);
    return {
      line: { width: card.borderBottomWidth, color: card.borderBottomColor },
      no: no.color,
      intro: { color: intro.color, maxWidth: parseFloat(intro.maxWidth) / parseFloat(intro.fontSize) },
      tokens: { text: token('--text'), accent: token('--accent'), muted: token('--text-muted') },
    };
  });
  expect(style.line).toEqual({ width: '1px', color: style.tokens.text });
  expect(style.no).toBe(style.tokens.accent);
  expect(style.intro).toEqual({ color: style.tokens.muted, maxWidth: 24 });
});

// 用紫规则（design §3.1、§4.1）：章首页的第一屏，大块的紫是章节号。手机上“下一步”吸底，致谢页正文短，平板和桌面上
// “下一步”也在第一屏，所以章首页的“下一步”在所有宽度都用墨色；非章首页照常用紫。
test('章首页的“下一步”是墨色，其余页面是紫色', async ({ page }) => {
  // 致谢是“结尾”一章的第一页（同上面的 CHAPTER_STARTS）；选择页没选时没有“下一步”，不用来测
  for (const [path, chapterStart] of [['./preface/', true], ['./thanks/', true], ['./disclaimer/', false]] as const) {
    await page.goto(path);
    const colors = await page.evaluate(() => {
      const token = (name: string) => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = `var(${name})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      };
      const next = document.querySelector('nav[aria-label="上一步和下一步"] a[rel="next"]')!;
      return { next: getComputedStyle(next).backgroundColor, text: token('--text'), accent: token('--accent') };
    });
    expect(colors.next, path).toBe(chapterStart ? colors.text : colors.accent);
  }
});
