import { expect, test } from '@playwright/test';
import { chooseOption, collectErrors, expectScriptRan, nextUntil, pageId, stepLabel, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-02（FR-10、FR-11）：4 种选择组合（方案一/二 × iPhone/安卓），从“前言”一直点“下一步”走到“后记”，
// 中途没有断链。v3 一章一页、只有一版正文（实施计划 §3.1）：原来的“两种视图、三条方案、附录”随页面合并
// 和视图切换去掉（架构 §13.12），方案三没有了、后记是最后一页。
// 分叉点处在选择页点选项卡片（FR-12、V10：卡片由 frontmatter 的 options 生成）。不运行 JS 的静态走法见 ac-02-static-walk.spec.ts。
// 一路上的步骤编号是本章进度（FR-10）：眉题每章从第 1 步数到 m，“共 m 步”一致；选择页不计步数，写“选择”。

const PLANS = {
  方案一: ['plan1'],
  方案二: ['plan2-residential-server'],
};
const PHONES = {
  'iPhone / iPad': ['iphone-prepare', 'iphone-subscription'],
  安卓: ['android-prepare', 'android-subscription'],
};

/** 一条路线经过的全部页面（选过的方案和手机，分叉段的页面按选项走） */
function expected(plan: keyof typeof PLANS, phone: keyof typeof PHONES): string[] {
  return ['preface', 'overview', ...PLANS[plan], 'client-desktop', ...PHONES[phone], 'maintenance', 'afterword'];
}

for (const plan of Object.keys(PLANS) as (keyof typeof PLANS)[]) {
  for (const phone of Object.keys(PHONES) as (keyof typeof PHONES)[]) {
    test(`${plan} × ${phone}，前言一路“下一步”走到后记`, async ({ page }) => {
      const errors = collectErrors(page);
      const broken: string[] = [];
      page.on('response', (r) => {
        if (r.request().isNavigationRequest() && r.status() !== 200) broken.push(`${r.url()}：${r.status()}`);
      });
      const seen = ['preface'];
      const marks: (string | null)[][] = [];
      const record = async () => {
        marks.push([pageId(page), await stepNo(page), await stepTotal(page), await stepLabel(page)]);
      };
      await page.goto('./preface/');
      await expectScriptRan(page);
      await record();

      await nextUntil(page, 'overview', seen, record);
      await chooseOption(page, plan);
      seen.push(pageId(page));
      await record();
      await nextUntil(page, 'client-desktop', seen, record);
      await chooseOption(page, phone);
      seen.push(pageId(page));
      await record();
      await nextUntil(page, 'afterword', seen, record);
      // 后记是路线的最后一页（FR-11）：下一步是“回到首页”
      const home = stepNav(page).getByRole('link', { name: /下一步.*回到首页/ });
      await expect(home).toBeVisible();
      await expect(home).toHaveAttribute('href', /^\/$/);

      expect(seen).toEqual(expected(plan, phone));
      expect(marks.map(([id]) => id)).toEqual(seen);
      // 选择页写“选择”；其余页按章从第 1 步起连续编号，一章的最后一步编号等于步数
      let next = 1;
      let total: string | null = null;
      for (const [id, no, stepsTotal, label] of marks) {
        if (id === 'overview' || id === 'client-desktop') {
          expect([id, label, no]).toEqual([id, '选择', null]);
          continue;
        }
        if (next === 1) total = stepsTotal;
        expect([id, no, stepsTotal]).toEqual([id, String(next), total]);
        next = `共 ${next} 步` === total ? 1 : next + 1;
      }
      expect(next, '最后一章没有走完').toBe(1);
      expect(broken).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
