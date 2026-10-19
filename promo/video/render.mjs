// 逐帧录制动画页，转成 mp4。用法：node promo/video/render.mjs douyin-v1.html 30（选定的 v1 用 30fps；不写 fps 默认 60）
// 只截几帧检查：node promo/video/render.mjs douyin.html --stills 2,6,11,14,19,23,28,33
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const dir = new URL('./', import.meta.url).pathname;
const file = process.argv[2] ?? 'douyin.html';
const stillsArg = process.argv.indexOf('--stills');
const fps = Number(process.argv[3]) || 60;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`file://${dir}${file}`);
// 画布里用到的字体要先加载；logo 内联进页面（file:// 下不能 fetch）
await page.evaluate(() => Promise.all(['600 40px Cinzel', '40px Heavy', '600 40px Display'].map((f) => document.fonts.load(f))));
await page.evaluate(() => document.fonts.ready);
const logo = readFileSync(`${dir}../../src/assets/logo/logo-zh.svg`, 'utf8');
await page.evaluate((svg) => window.setLogo?.(svg), logo);
await page.waitForLoadState('networkidle');
const stage = page.locator('#stage');

if (stillsArg > 0) {
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await stage.screenshot({ path: `${dir}stills/check-t${String(t).padStart(4, '0')}.png` });
  }
} else {
  const duration = await page.evaluate(() => window.DURATION);
  const out = `${dir}${file.replace(/\.html$/, '')}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / fps);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`${out}：${frames} 帧`);
}
await browser.close();
