// 截取线上站点的手机画面，给宣传动画用。用法：node promo/video/capture.mjs
import { chromium } from '@playwright/test';

const SITE = 'https://re0claude.us.ci';
const out = new URL('./shots/', import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'light' });
const page = await ctx.newPage();

// 首页：只截 logo 区和按钮区，跳过中间那句话（拍摄避开，作者 2026-10-19）
await page.goto(`${SITE}/`);
await page.locator('.home-logo').screenshot({ path: `${out}home-logo.png` });
await page.locator('.home-actions').screenshot({ path: `${out}home-actions.png` });
await page.locator('.group-invite').screenshot({ path: `${out}home-group.png` });

// 步骤页：操作视图整页，在手机框里滚动
await page.goto(`${SITE}/register-claude/`);
await page.getByRole('button', { name: '操作', exact: true }).click().catch(() => {});
await page.screenshot({ path: `${out}step-register-claude.png`, fullPage: true });

// 附录：QQ 群入口。用平板宽度截：带二维码，也没有手机的吸底栏挡住
const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, colorScheme: 'light' });
await tablet.goto(`${SITE}/appendix/`);
await tablet.locator('.group-invite').screenshot({ path: `${out}appendix-group.png` });

await browser.close();
