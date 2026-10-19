import { expect, test, type Page } from '@playwright/test';
import { chooseOption, collectErrors, expectScriptRan, nextUntil, pageId, stepLabel, stepNav, stepNo, stepTotal } from './route-helpers';

// AC-02（FR-10、FR-11）：6 种选择组合（方案一/二/三 × iPhone/安卓）× 两种视图，从“前言”一直点“下一步”经“后记”走到“附录”，
// 中途没有断链；操作视图下不经过整体思路、小结、为什么用美区 Apple ID，原理视图下经过。
// 分叉点处在选择页点选项块（FR-12）。不运行 JS 的静态走法见 ac-02-static-walk.spec.ts。
// 一路上的步骤编号是本章进度（FR-10）：眉题每章从第 1 步数到 m，“共 m 步”一致；选择页不计步数，写“选择”；
// 附录不计步数（v2.2 计划 W5 第 1 条，眉题只写“附录”，见 ac-22-appendix.spec.ts）。

const PLANS = {
  方案一: ['plan1-buy-server', 'plan1-buy-isp', 'plan1-make-node', 'plan1-panel'],
  方案二: ['plan2-residential-server'],
  方案三: ['plan3-residential-node'],
};
const PHONES = {
  iPhone: {
    first: ['iphone-app-store-austria', 'iphone-proxy', 'iphone-gmail'],
    subscribe: ['iphone-why-us-apple-id', 'iphone-apple-id', 'iphone-app-store-login', 'iphone-gift-card', 'iphone-subscribe', 'iphone-purchase-failed'],
  },
  安卓: { first: ['android-proxy', 'android-google-play', 'android-gmail'], subscribe: ['android-subscribe'] },
};
/** 原理独有步骤：操作视图绕过 */
const PRINCIPLE_ONLY = ['overview', 'recap', 'iphone-why-us-apple-id'];

function expected(plan: keyof typeof PLANS, phone: keyof typeof PHONES, view: 'operation' | 'principle'): string[] {
  const all = [
    'preface', 'disclaimer', 'overview', 'clean-up', 'choose-plan',
    ...PLANS[plan],
    'import-proxy', 'check-ip', 'recap', 'leak-protection', 'timezone', 'choose-phone',
    ...PHONES[phone].first,
    'register-gmail', 'chrome-sign-in', 'use-two-days', 'google-region', 'register-claude', 'subscribe',
    ...PHONES[phone].subscribe,
    'after-subscribe', 'thanks', 'afterword', 'appendix',
  ];
  return view === 'principle' ? all : all.filter((id) => !PRINCIPLE_ONLY.includes(id));
}

async function setView(page: Page, view: 'operation' | 'principle'): Promise<void> {
  const button = page.getByRole('group', { name: '视图' }).getByRole('button', { name: view === 'principle' ? '原理' : '操作' });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

for (const view of ['operation', 'principle'] as const) {
  for (const plan of Object.keys(PLANS) as (keyof typeof PLANS)[]) {
    for (const phone of Object.keys(PHONES) as (keyof typeof PHONES)[]) {
      test(`${view === 'operation' ? '操作' : '原理'}视图：${plan} × ${phone}，前言一路“下一步”经后记到附录`, async ({ page }) => {
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
        await setView(page, view);
        await record();

        await nextUntil(page, 'choose-plan', seen, record);
        await chooseOption(page, plan);
        seen.push(pageId(page));
        await record();
        await nextUntil(page, 'choose-phone', seen, record);
        await chooseOption(page, phone);
        seen.push(pageId(page));
        await record();
        await nextUntil(page, 'appendix', seen, record);
        // 附录是路线的最后一页（v2.2 D11、FR-11）：下一步是“回到首页”
        const home = stepNav(page).getByRole('link', { name: /下一步.*回到首页/ });
        await expect(home).toBeVisible();
        await expect(home).toHaveAttribute('href', /^\/$/);

        expect(seen).toEqual(expected(plan, phone, view));
        expect(marks.map(([id]) => id)).toEqual(seen);
        // 选择页写“选择”，附录不写步数；其余页按章从第 1 步起连续编号，一章的最后一步编号等于步数
        let next = 1;
        let total: string | null = null;
        for (const [id, no, stepsTotal, label] of marks) {
          if (id === 'appendix') {
            expect([id, no, stepsTotal, label]).toEqual([id, null, null, null]);
            continue;
          }
          if (id!.startsWith('choose-')) {
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
}
