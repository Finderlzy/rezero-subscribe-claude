// 逐帧录制动画页，转成 mp4。在仓库根目录执行：
//   node promo/video/render.mjs douyin-v1.html 30        选定的抖音版（30fps）
//   node promo/video/render.mjs bilibili.html 60         B 站横版
//   node promo/video/render.mjs bilibili.html --stills 2,8.5,20   只截几帧检查，存到 stills/
// 页面要提供 window.render(t)、window.DURATION，可选 window.SIZE = [宽, 高]（默认 1080×1920）。
// 读者反馈：页面提供 window.setFeedback(items) 时，把 feedback/list.json 登记的截图交给它（见 feedback.js）；
// 一张都没有就拒绝渲染整片（只截帧时画占位框）。FEEDBACK_DIR 可以换成别的目录（检查用），STILLS_DIR 改截帧的存放目录。
//
// 加速（作者 2026-10-19 要求把显卡用上）：Chromium 走 Vulkan 用独显渲染（默认是 SwiftShader 软件渲染），
// 帧按时间切成 WORKERS 段，每段一个浏览器并行截图、各自用 NVENC 编码，最后无损拼接。
// 没有 NVIDIA 显卡时设 ENCODER=libx264。
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const dir = new URL('./', import.meta.url).pathname;
const file = process.argv[2] ?? 'douyin-v1.html';
const stillsArg = process.argv.indexOf('--stills');
const fps = Number(process.argv[3]) || 60;
const WORKERS = Number(process.env.WORKERS) || 6;
const ENCODER = process.env.ENCODER ?? 'h264_nvenc';
const FEEDBACK_DIR = resolve(process.env.FEEDBACK_DIR ?? `${dir}feedback`);
const STILLS_DIR = resolve(process.env.STILLS_DIR ?? `${dir}stills`);
// feedback/list.json 的 items：[{ file, kind: 'phone' | 'card', focus? }]，文件必须存在
const feedback = (() => {
  let list;
  try {
    list = JSON.parse(readFileSync(join(FEEDBACK_DIR, 'list.json'), 'utf8')).items ?? [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw new Error(`读不了 ${FEEDBACK_DIR}/list.json：${e.message}`);
  }
  return list.map(({ file, kind = 'card', focus }) => {
    const path = join(FEEDBACK_DIR, file);
    if (!existsSync(path)) throw new Error(`list.json 登记的 ${file} 不在 ${FEEDBACK_DIR} 里`);
    return { src: pathToFileURL(path).href, kind, focus };
  });
})();
const GPU_ARGS = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'];

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1920 } });
  await page.goto(`file://${dir}${file}`);
  // 画布里用到的字体要先加载；logo 内联进页面（file:// 下不能 fetch），用 src/assets 里的原文件
  await page.evaluate(() => Promise.all(['600 40px Cinzel', '40px Heavy', '600 40px Display'].map((f) => document.fonts.load(f))));
  await page.evaluate(() => document.fonts.ready);
  const logo = readFileSync(`${dir}../../src/assets/logo/logo-zh.svg`, 'utf8');
  await page.evaluate((svg) => window.setLogo?.(svg), logo);
  const used = await page.evaluate(async (items) => (window.setFeedback ? await window.setFeedback(items) : null), feedback);
  if (used && used.phone + used.cards === 0 && stillsArg < 0) throw new Error(`${FEEDBACK_DIR}/list.json 没有登记反馈截图，不能渲染整片；先放好打码后的截图并登记，见 feedback/README.md`);
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
  mkdirSync(STILLS_DIR, { recursive: true });
  console.log(`反馈截图：登记 ${feedback.length} 张（${FEEDBACK_DIR}/list.json）`);
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    const out = join(STILLS_DIR, `check-t${String(t).padStart(4, '0')}.png`);
    await stage.screenshot({ path: out });
    console.log(out);
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
