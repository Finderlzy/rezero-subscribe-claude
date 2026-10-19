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

// B 站横版：1024 宽截图。<1100px 目录收在抽屉里，侧边栏里第 01 章的标题不会入镜
const wide = await browser.newPage({ viewport: { width: 1024, height: 700 }, deviceScaleFactor: 2, colorScheme: 'light' });
await wide.goto(`${SITE}/`);
await wide.locator('.home-logo').screenshot({ path: `${out}wide-home-logo.png` });
await wide.locator('.home-actions').screenshot({ path: `${out}wide-home-actions.png` });
await wide.locator('.group-invite').screenshot({ path: `${out}wide-home-group.png` });
await wide.goto(`${SITE}/register-claude/`);
for (const [view, name] of [['操作', 'operation'], ['原理', 'principle']]) {
  await wide.getByRole('button', { name: view, exact: true }).click();
  await wide.screenshot({ path: `${out}wide-register-claude-${name}.png` });
}
// 章首页只截色带（章节标题卡）：正文和选项里有“走代理”“导入代理软件”，不能入镜
await wide.goto(`${SITE}/choose-phone/`);
await wide.locator('header.band').screenshot({ path: `${out}wide-chapter-card.png` });
await wide.goto(`${SITE}/appendix/`);
await wide.locator('.group-invite').screenshot({ path: `${out}wide-appendix-group.png` });

await browser.close();
