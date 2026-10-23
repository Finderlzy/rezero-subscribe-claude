#!/usr/bin/env node
// 开发脚本（2026-10-23，作者要求“下次用 GPU 做”）：用显卡把录屏转成正文视频。
//
// 用法：
//   node scripts/encode-video.mjs <源文件> <输出名> [选项]
//   node scripts/encode-video.mjs ~/视频/录屏.mp4 v2rayn-rules --poster 8
//
// 选项：
//   --preset <名称>   裁剪和尺寸的预设，默认 phone（v2rayNG 这类安卓竖屏录屏）
//   --crop <w:h:x:y>  自己指定裁剪，覆盖预设
//   --width <像素>    输出宽度，默认 1600
//   --qp <数>         NVENC 量化参数，越大文件越小，默认 34（文字仍然清楚）
//   --gpu <序号>      用哪块显卡，默认 0
//   --from <秒> --to <秒>  只转这一段
//   --audio           保留音频（默认丢掉；录屏一般没有有用的声音）
//   --poster <秒>     顺便输出封面 jpg
//   --jobs <数>       批量时同时跑几条，默认 AUTO_JOBS
//   --timeout <秒>    批量时单条命令的墙钟上限，默认 900
//   --batch <清单>    批量：清单一行一个“源文件 输出名”，例：
//                       v2rayNG规则配置（1）.mp4 v2rayn-rules 8
//                     （第三项可选，是封面取第几秒）
//
// 为什么整条链路都在显卡上：只在最后用 NVENC 编码、前面用 CPU 的 scale，CPU 会先被吃满
// （20 核里占 90% 以上），编码器反而在等帧，整机又慢又烫。所以先 hwupload_cuda 上传，
// 用 scale_cuda 在显卡上缩放，再交回编码：实测整机 CPU 只剩 6% 左右。
//
// 并行：实测（nvidia-smi 采到的占用）同时跑 4 条时 NVENC 88%、6 条 94%（峰值 100%）、8 条不再涨、
// 单条总耗时也跟着变长，所以批量默认一次开 AUTO_JOBS = 6 条，编码器基本吃满；
// GPU 核心的均值停在 30% 左右是正常的——裁剪和缩放之外，显卡就这么点活。
//
// 显卡不可用时退回 CPU：整条链路用 libx264，不做 GPU 缩放。

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 竖屏安卓手机录屏（v2rayNG 这类 584×1280）：留一点状态栏上方的白底，左右各收 3px 去掉窗口边框 */
export const PRESETS = {
  phone: { crop: '578:1160:3:60', note: '安卓竖屏录屏，只留应用画面' },
};

/** 批量时默认同时跑几条（见文件头：再多 NVENC 会话会排队） */
export const AUTO_JOBS = 6;

const VIDEO_DIR = ['public', 'videos'];
const NAME_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function checkName(name) {
  if (!NAME_OK.test(name)) {
    throw new Error('输出名要用小写英文和连字符，例如 v2rayn-rules：' + name);
  }
}

export function parseArgs(argv) {
  const opts = { preset: 'phone', qp: 34, width: 1600, gpu: 0, audio: false, jobs: AUTO_JOBS, timeout: 900 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(a + ' 后面要跟一个值');
      return v;
    };
    if (a === '--preset') opts.preset = next();
    else if (a === '--crop') opts.crop = next();
    else if (a === '--width') opts.width = Number(next());
    else if (a === '--qp') opts.qp = Number(next());
    else if (a === '--gpu') opts.gpu = next();
    else if (a === '--from') opts.from = next();
    else if (a === '--to') opts.to = next();
    else if (a === '--audio') opts.audio = true;
    else if (a === '--poster') opts.poster = next();
    else if (a === '--jobs') opts.jobs = Number(next());
    else if (a === '--timeout') opts.timeout = Number(next());
    else if (a === '--batch') opts.batch = next();
    else if (a.startsWith('--')) throw new Error('不认识的选项：' + a);
    else positional.push(a);
  }
  return { opts, positional };
}

/** 裁哪些边、缩到多宽；GPU 和 CPU 两条链路的滤镜都从这里生成 */
export function buildFilters({ opts, gpu }) {
  const crop = opts.crop ?? PRESETS[opts.preset]?.crop;
  const parts = [];
  if (opts.from !== undefined) parts.push('trim=start=' + opts.from + (opts.to !== undefined ? ':end=' + opts.to : ''));
  if (crop) parts.push('crop=' + crop);
  parts.push('fps=25');
  if (parts.length && opts.from !== undefined) parts.push('setpts=PTS-STARTPTS');
  if (gpu) {
    parts.push('hwupload_cuda', 'scale_cuda=' + opts.width + ':-2:interp_algo=lanczos', 'hwdownload', 'format=yuv420p');
  } else {
    parts.push('scale=' + opts.width + ':-2:flags=lanczos');
  }
  return parts.join(',');
}

export function buildFfmpegArgs({ src, out, gpu, opts }) {
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  args.push('-i', src);
  if (!opts.audio) args.push('-an');
  args.push('-vf', buildFilters({ opts, gpu }));
  if (gpu) {
    args.push('-c:v', 'h264_nvenc', '-gpu', String(opts.gpu), '-preset', 'p7', '-tune', 'hq',
      '-rc', 'constqp', '-qp', String(opts.qp), '-b:v', '0');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', String(opts.qp));
  }
  args.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (opts.audio) args.push('-c:a', 'aac', '-b:a', '64k');
  args.push(out);
  return args;
}

function runFfmpeg(args, timeout) {
  return new Promise((resolvePromise) => {
    const p = spawn('ffmpeg', args, { stdio: 'inherit' });
    const timer = setTimeout(() => p.kill('SIGKILL'), timeout * 1000);
    p.on('exit', (code) => {
      clearTimeout(timer);
      resolvePromise(code === 0);
    });
  });
}

/** 有没有能用的 NVENC（跑一条 1 帧的试编码；尺寸太小时 NVENC 会拒绝，所以用 256×256） */
export function hasNvenc(gpu = 0) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.1',
    '-vf', 'format=yuv420p', '-c:v', 'h264_nvenc', '-gpu', String(gpu), '-f', 'null', '-'],
  { stdio: 'ignore', timeout: 30_000 });
  return r.status === 0;
}

async function encodeOne({ src, name, poster, opts, gpu, videoDir }) {
  checkName(name);
  const out = join(videoDir, name + '.mp4');
  const started = Date.now();
  const ok = await runFfmpeg(buildFfmpegArgs({ src, out, gpu, opts }), opts.timeout);
  if (!ok) return { name, ok: false };
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (poster !== undefined) {
    const jpg = join(videoDir, name + '.jpg');
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(poster), '-i', out,
      '-frames:v', '1', '-vf', 'scale=1200:-2', '-q:v', '4', jpg], opts.timeout);
  }
  return { name, ok: true, seconds };
}

/** 一次跑 jobs 条，跑完一条补一条 */
export async function encodeMany(tasks, { jobs, opts, gpu, videoDir }) {
  const queue = [...tasks];
  const results = [];
  const workers = Array.from({ length: Math.max(1, Math.min(jobs, queue.length)) }, async () => {
    for (;;) {
      const t = queue.shift();
      if (!t) return;
      const r = await encodeOne({ ...t, opts, gpu, videoDir });
      results.push(r);
      console.log((r.ok ? '完成：' + r.name + '（' + r.seconds + ' 秒）' : '失败：' + r.name), '\n');
    }
  });
  await Promise.all(workers);
  return results;
}

/** 批量清单：一行 “源文件 输出名 [封面秒数]”，空行和 # 开头的行跳过，相对路径按清单所在目录算 */
export function readBatch(file) {
  const base = dirname(resolve(file));
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const [src, name, poster] = line.split(/\s+/);
      return { src: resolve(base, src), name, poster };
    });
}

async function main() {
  const { opts, positional } = parseArgs(process.argv.slice(2));
  const videoDir = resolve(import.meta.dirname, '..', ...VIDEO_DIR);
  mkdirSync(videoDir, { recursive: true });
  const gpu = hasNvenc(opts.gpu);
  console.log(gpu ? '编码：显卡（h264_nvenc + scale_cuda，CPU 基本不干活）' : '编码：CPU（libx264，没找到能用的显卡）');

  let tasks;
  if (opts.batch) {
    tasks = readBatch(opts.batch);
  } else if (positional.length >= 2) {
    tasks = [{ src: resolve(positional[0]), name: positional[1], poster: opts.poster }];
  } else {
    console.error('用法：node scripts/encode-video.mjs <源文件> <输出名> [--preset phone] [--poster 8]');
    console.error('      node scripts/encode-video.mjs --batch 清单.txt [--jobs 4]');
    process.exit(2);
  }
  for (const t of tasks) {
    if (!existsSync(t.src)) {
      console.error('找不到源文件：' + t.src);
      process.exit(1);
    }
  }
  if (gpu) console.log('同时跑 ' + Math.min(opts.jobs, tasks.length) + ' 条');
  const started = Date.now();
  const results = await encodeMany(tasks, { jobs: opts.jobs, opts, gpu, videoDir });
  const failed = results.filter((r) => !r.ok);
  console.log('共 ' + results.length + ' 条，用时 ' + ((Date.now() - started) / 1000).toFixed(1) + ' 秒，失败 ' + failed.length + ' 条');
  if (failed.length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.stack ?? e.message ?? e);
    process.exit(1);
  });
}
