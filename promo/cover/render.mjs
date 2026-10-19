// 生成封面和群头像。用法：node promo/cover/render.mjs（在仓库根目录执行，输出在 promo/cover/ 下）
import { chromium } from '@playwright/test';

const dir = new URL('./', import.meta.url);
const VARIANTS = ['douyin-3x4', 'douyin-4x3', 'bilibili-16x9', 'avatar-light', 'avatar-dark'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1400 } });
for (const v of VARIANTS) {
  await page.goto(new URL(`cover.html?v=${v}`, dir).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
  const out = new URL(`${v}.png`, dir).pathname;
  await page.locator('#stage').screenshot({ path: out });
  console.log(out);
}
await browser.close();
