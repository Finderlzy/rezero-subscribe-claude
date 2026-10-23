#!/usr/bin/env node
// 开发脚本（2026-10-23，作者要求）：用显卡把录屏转成正文视频。
//
// 用法：
//   node scripts/encode-video.mjs <源文件> <输出名> [选项]          # 一次转一条
//   node scripts/encode-video.mjs --preset iphone 录屏.mp4 v2rayn-rules
//
// 选项：
//   --preset <名称>   裁剪和尺寸的预设，默认 iphone（v2rayNG 这类竖屏安卓录屏，见下方 PRESETS）
//   --crop <w:h:x:y>  自己指定裁剪
//   --width <像素>    输出宽度，默认 1600
//   --qp <数>         NVENC 量化参数，越大文件越小，默认 34（文字仍然清楚）
//   --gpu <序号>      用哪块显卡，默认 0
//   --from <秒> --to <秒>  只转这一段
//   --audio           保留音频（默认丢掉；录屏一般没有有用的声音）
//   --poster <秒>     顺便输出封面 jpg，默认不输出
//   --timeout <秒>    单条命令的墙钟上限，默认 900
//
// 输出：public/videos/<输出名>.mp4（名字必须是小写英文和连字符，和正文引用一致），
//       --poster 时再输出 public/videos/<输出名>.jpg。
//
// 显卡：优先 h264_nvenc，显卡只对 NVENC 会话数有限制，所以默认同时跑 min(8, 显存够的条数) 条，
// 目标是让显存带宽和 NVENC 单元吃满、GPU 利用率稳定在 90% 左右，而不是一条一条排队。
// NVENC 失败（没有显卡、驱动太旧）时自动退回 libx264，只在单条的时候退，批量的时候直接报错。

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 竖屏安卓手机录屏：状态栏 64 像素、导航条在底部，左右没有黑边 */
export const PRESETS = {
  iphone: { crop: '584:1154:0:64', note: 'v2rayNG 这类 584×1280 的安卓竖屏录屏，只留应用画面' },
};

const VIDEO_DIR = ['public', 'videos'];
const NAME_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseArgs(argv) {
  const opts = { preset: 'iphone', qp: 34, width: 1600, gpu: 0, audio: false, timeout: 900 };
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
    else if (a === '--timeout') opts.timeout = Number(next());
    else if (a.startsWith('--')) throw new Error('不认识的选项：' + a);
    else positional.push(a);
  }
  return { opts, positional };
}

/** 拼 ffmpeg 参数；preset=null 表示用 CPU 的 libx264 */
export function buildFfmpegArgs({ src, out, preset, opts }) {
  const filters = [];
  if (opts.from !== undefined) filters.push('trim=start=' + opts.from + ':end=' + opts.to ?? '');
  const crop = opts.crop ?? PRESETS[opts.preset]?.crop;
  if (crop) filters.push('crop=' + crop);
  filters.push('fps=25');

  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', src];
  if (opts.audio) {
    args.push('-map', '0:v:0', '-map', '0:a:0?');
  } else {
    args.push('-an');
  }
  if (opts.from !== undefined) {
    filters.push('setpts=PTS-STARTPTS');
  }
  filters.push('scale=' + opts.width + ':-2:flags=lanczos');
  args.push('-vf', filters.join(','));

  if (preset === 'nvenc') {
    args.push(
      '-c:v', 'h264_nvenc',
      '-gpu', String(opts.gpu),
      '-preset', 'p7',
      '-tune', 'hq',
      '-rc', 'constqp',
      '-qp', String(opts.qp),
      '-b:v', '0',
    );
  } else {
    args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', String(opts.qp), '-b:v', '0');
  }
  args.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (opts.audio) args.push('-c:a', 'aac', '-b:a', '64k');
  args.push(out);
  return args;
}

export function checkName(name) {
  if (!NAME_OK.test(name)) {
    throw new Error('输出名要用小写英文和连字符，例如 v2rayn-rules：' + name);
  }
}

/** 有没有能用的 NVENC（跑一条 1 帧的试编码） */
export function hasNvenc(gpu = 0) {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.1', '-vf', 'format=yuv420p',
      '-c:v', 'h264_nvenc', '-gpu', String(gpu), '-f', 'null', '-'],
    { stdio: 'ignore', timeout: 30_000 },
  );
  return r.status === 0;
}

function run(cmd, args, timeout) {
  const r = spawnSync(cmd, args, { timeout: timeout * 1000, stdio: 'inherit' });
  return r.status === 0;
}

async function main() {
  const { opts, positional } = parseArgs(process.argv.slice(2));
  if (positional.length < 2) {
    console.error('用法：node scripts/encode-video.mjs <源文件> <输出名> [--preset iphone] [--poster 8]');
    process.exit(2);
  }
  const [src, name] = positional;
  if (!existsSync(src)) throw new Error('找不到源文件：' + src);
  checkName(name);
  if (opts.preset && !PRESETS[opts.preset] && !opts.crop) throw new Error('没有这个预设：' + opts.preset);

  const videoDir = resolve(import.meta.dirname, '..', ...VIDEO_DIR);
  mkdirSync(videoDir, { recursive: true });
  const out = join(videoDir, name + '.mp4');

  const nvenc = hasNvenc(opts.gpu);
  const args = buildFfmpegArgs({ src, out, preset: nvenc ? 'nvenc' : null, opts });
  console.log('编码：' + (nvenc ? 'h264_nvenc（GPU ' + opts.gpu + '）' : 'libx264（没有可用显卡，退回 CPU）'));
  const started = Date.now();
  if (!run('ffmpeg', args, opts.timeout)) {
    console.error('编码失败：' + src);
    process.exit(1);
  }
  console.log('完成：' + out + '（' + ((Date.now() - started) / 1000).toFixed(1) + ' 秒）');

  if (opts.poster !== undefined) {
    const poster = join(videoDir, name + '.jpg');
    const ok = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(opts.poster), '-i', out,
      '-frames:v', '1', '-vf', 'scale=1200:-2', '-q:v', '4', poster], opts.timeout);
    console.log(ok ? '封面：' + poster : '封面生成失败，稍后手动补');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
