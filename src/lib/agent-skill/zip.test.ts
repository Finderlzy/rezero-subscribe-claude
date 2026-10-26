import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { SKILL_NAME } from './index';
import { assertZipSize, ZIP_MAX_BYTES, zipSkill } from './zip';

const tmp = mkdtempSync(join(tmpdir(), 'skill-zip-'));

afterEach(() => {
  rmSync(join(tmp, 'skill'), { recursive: true, force: true });
});

/** 在临时目录里写一份最小的生成物 */
function writeSkill(files: Record<string, string>): string {
  const dir = join(tmp, 'skill');
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const MINIMAL = {
  'SKILL.md': '---\nname: x\n---\n\n# x\n',
  'references/preface.md': '# 前言\n',
};

describe('zipSkill：订阅 Skill 的 zip（FR-114，NFR-07）', () => {
  it('顶层目录是 rezero-subscribe-claude/，内容按路径原样解出', () => {
    const zip = zipSkill(writeSkill(MINIMAL));
    const unzipped = unzipSync(zip);
    expect(Object.keys(unzipped).sort()).toEqual([`${SKILL_NAME}/SKILL.md`, `${SKILL_NAME}/references/preface.md`]);
    expect(new TextDecoder().decode(unzipped[`${SKILL_NAME}/SKILL.md`]!)).toBe(MINIMAL['SKILL.md']);
  });

  it('同样的内容重打两次字节相同（固定 mtime、按路径排序）', () => {
    const dir = writeSkill(MINIMAL);
    expect(Buffer.from(zipSkill(dir))).toEqual(Buffer.from(zipSkill(dir)));
  });

  it('空文件不报错；超过 1 MB 抛出（检查逻辑用 assertZipSize 直接验证，不造 1 MB 的真实夹具）', () => {
    expect(zipSkill(writeSkill({ 'SKILL.md': '' })).length).toBeGreaterThan(0);
    expect(() => assertZipSize(new Uint8Array(ZIP_MAX_BYTES))).not.toThrow();
    expect(() => assertZipSize(new Uint8Array(ZIP_MAX_BYTES + 1))).toThrow(/超过 1 MB/);
  });
});
