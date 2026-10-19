// 逐帧录制动画页，转成 mp4。在仓库根目录执行：
//   node promo/video/render.mjs douyin-v1.html 30        选定的抖音版（30fps）
//   node promo/video/render.mjs bilibili.html 60         B 站横版
//   node promo/video/render.mjs bilibili.html --stills 2,8.5,20   只截几帧检查，存到 stills/
// 页面要提供 window.render(t)、window.DURATION，可选 window.SIZE = [宽, 高]（默认 1080×1920）。
//
// 加速（作者 2026-10-19 要求把显卡用上）：Chromium 走 Vulkan 用独显渲染（默认是 SwiftShader 软件渲染），
// 帧按时间切成 WORKERS 段，每段一个浏览器并行截图、各自用 NVENC 编码，最后无损拼接。
// 没有 NVIDIA 显卡时设 ENCODER=libx264。
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const dir = new URL('./', import.meta.url).pathname;
const file = process.argv[2] ?? 'douyin-v1.html';
const stillsArg = process.argv.indexOf('--stills');
const fps = Number(process.argv[3]) || 60;
const WORKERS = Number(process.env.WORKERS) || 6;
const ENCODER = process.env.ENCODER ?? 'h264_nvenc';
const GPU_ARGS = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'];

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1920 } });
  await page.goto(`file://${dir}${file}`);
  // 画布里用到的字体要先加载；logo 内联进页面（file:// 下不能 fetch），用 src/assets 里的原文件
  await page.evaluate(() => Promise.all(['600 40px Cinzel', '40px Heavy', '600 40px Display'].map((f) => document.fonts.load(f))));
  await page.evaluate(() => document.fonts.ready);
  const logo = readFileSync(`${dir}../../src/assets/logo/logo-zh.svg`, 'utf8');
  await page.evaluate((svg) => window.setLogo?.(svg), logo);
  await page.waitForLoadState('networkidle');
  const [w, h] = await page.evaluate(() => window.SIZE ?? [1080, 1920]);
  await page.setViewportSize({ width: w, height: h });
  return { page, stage: page.locator('#stage') };
}

function encoderArgs(out) {
  const quality = ENCODER === 'h264_nvenc' ? ['-preset', 'p7', '-tune', 'hq', '-rc', 'vbr', '-cq', '17', '-b:v', '0'] : ['-crf', '18', '-preset', 'medium'];
  return ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', ENCODER, ...quality, '-pix_fmt', 'yuv420p', out];
}

async function renderRange(from, to, out) {
  const browser = await chromium.launch({ args: GPU_ARGS });
  const { page, stage } = await openPage(browser);
  const ff = spawn('ffmpeg', encoderArgs(out), { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = from; i < to; i++) {
    await page.evaluate((t) => window.render(t), i / fps);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  await browser.close();
  if (code !== 0) throw new Error(`ffmpeg 退出码 ${code}：${out}`);
}

if (stillsArg > 0) {
  const browser = await chromium.launch({ args: GPU_ARGS });
  const { page, stage } = await openPage(browser);
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await stage.screenshot({ path: `${dir}stills/check-t${String(t).padStart(4, '0')}.png` });
  }
  await browser.close();
} else {
  const probe = await chromium.launch();
  const duration = await (await openPage(probe)).page.evaluate(() => window.DURATION);
  await probe.close();
  const frames = Math.round(duration * fps);
  const base = file.replace(/\.html$/, '');
  const per = Math.ceil(frames / WORKERS);
  const segments = Array.from({ length: WORKERS }, (_, k) => ({ from: k * per, to: Math.min(frames, (k + 1) * per), out: `${dir}.seg-${base}-${k}.mp4` })).filter((s) => s.from < s.to);
  const started = Date.now();
  await Promise.all(segments.map((s) => renderRange(s.from, s.to, s.out)));
  const list = `${dir}.seg-${base}.txt`;
  writeFileSync(list, segments.map((s) => `file '${s.out}'`).join('\n'));
  const out = `${dir}${base}.mp4`;
  await new Promise((resolve, reject) =>
    spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', (c) =>
      c === 0 ? resolve() : reject(new Error(`拼接失败：${c}`)),
    ),
  );
  for (const s of segments) rmSync(s.out);
  rmSync(list);
  console.log(`${out}：${frames} 帧，${segments.length} 路并行，${((Date.now() - started) / 1000).toFixed(0)} 秒`);
}
