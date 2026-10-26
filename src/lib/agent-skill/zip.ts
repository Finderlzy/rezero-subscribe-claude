import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync, type Zippable } from 'fflate';
import { SKILL_DIR, SKILL_NAME } from './index';

/**
 * zip 打包（架构 §16.4，FR-114，NFR-07）：把入库的生成物目录打成 dist/agent-skill/<name>.zip。
 * 文件按路径排序、修改时间固定，同样的内容得到同样的 zip；超过 1 MB 抛出错误，由构建终止。
 * zip 里顶层就是 `rezero-subscribe-claude/` 目录。
 */

/** zip 大小上限（NFR-07） */
export const ZIP_MAX_BYTES = 1024 * 1024;
/** 固定的修改时间（2026-01-01），保证同样的内容得到同样的 zip */
const FIXED_MTIME = new Date('2026-01-01T00:00:00Z');

/** 读一个目录下全部文件的相对路径（递归、已排序），目录不存在时为空 */
function listFiles(dir: string, prefix = ''): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), `${prefix}${entry.name}/`));
    else if (entry.isFile()) out.push(prefix + entry.name);
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** zip 大小上限（NFR-07）：超过就抛出，由构建终止 */
export function assertZipSize(zip: Uint8Array): void {
  if (zip.length > ZIP_MAX_BYTES) {
    throw new Error(`订阅 Skill 的 zip 超过 1 MB：${zip.length} 字节（上限 ${ZIP_MAX_BYTES}），检查 agent-skill/ 里有没有不该入库的内容`);
  }
}

/**
 * 打包订阅 Skill：返回 zip 的字节。
 * `dir` 是入库的生成物目录（`agent-skill/rezero-subscribe-claude/`），超过 1 MB 时抛出错误。
 */
export function zipSkill(dir: string, name: string = SKILL_NAME): Uint8Array {
  const files: Zippable = {};
  for (const path of listFiles(dir)) {
    files[`${name}/${path}`] = [readFileSync(join(dir, path)), { mtime: FIXED_MTIME }];
  }
  const zip = zipSync(files, { level: 9 });
  assertZipSize(zip);
  return zip;
}
