import { expect, test, type Page } from '@playwright/test';
import { chooseOption, collectErrors, expectScriptRan, nextUntil, pageId, stepNav } from './route-helpers';

// AC-02（FR-10、FR-11）：6 种选择组合（方案一/二/三 × iPhone/安卓）× 两种视图，从“前言”一直点“下一步”走到“后记”，
// 中途没有断链；操作视图下不经过整体思路、小结、为什么用美区 Apple ID，原理视图下经过。
// 分叉点处在选择页点选项块（FR-12）。不运行 JS 的静态走法见 ac-02-static-walk.spec.ts。

const PLANS = {
  方案一: ['plan1-free-isp', 'plan1-buy-server', 'plan1-make-node', 'plan1-buy-isp', 'plan1-panel'],
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
    'after-subscribe', 'thanks', 'afterword',
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
      test(`${view === 'operation' ? '操作' : '原理'}视图：${plan} × ${phone}，前言一路“下一步”到后记`, async ({ page }) => {
        const errors = collectErrors(page);
        const broken: string[] = [];
        page.on('response', (r) => {
          if (r.request().isNavigationRequest() && r.status() !== 200) broken.push(`${r.url()}：${r.status()}`);
        });
        const seen = ['preface'];
        await page.goto('./preface/');
        await expectScriptRan(page);
        await setView(page, view);

        await nextUntil(page, 'choose-plan', seen);
        await chooseOption(page, plan);
        seen.push(pageId(page));
        await nextUntil(page, 'choose-phone', seen);
        await chooseOption(page, phone);
        seen.push(pageId(page));
        await nextUntil(page, 'afterword', seen);
        await expect(stepNav(page).getByRole('link', { name: /下一步.*回到首页/ })).toBeVisible();

        expect(seen).toEqual(expected(plan, phone, view));
        expect(broken).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}
