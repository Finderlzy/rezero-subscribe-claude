import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// build-logo.mjs 的输出是确定的：重跑两次逐字节相同，并且和仓库里的生成物一致（生成物不手改）。
// 转曲用的字体不入库（.cache/fonts/，下载地址见脚本开头）；没有字体的机器上这组用例跳过，并在名字里写明原因。
const root = join(import.meta.dirname, '..');
const script = join(root, 'scripts/build-logo.mjs');
const fonts = ['Cinzel.ttf', 'CormorantGaramond.ttf', 'RobotoCondensed.ttf', 'SourceHanSansCN-Heavy.otf'];
const hasFonts = fonts.every((f) => existsSync(join(root, '.cache/fonts', f)));

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function build(): Map<string, string> {
  const out = mkdtempSync(join(tmpdir(), 'rezero-logo-'));
  dirs.push(out);
  execFileSync(process.execPath, [script, '--out', out], { stdio: 'pipe' });
  const files = new Map<string, string>();
  for (const entry of readdirSync(out, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    files.set(relative(out, file), readFileSync(file, 'utf8'));
  }
  return files;
}

describe.skipIf(!hasFonts)('build-logo.mjs（需要 .cache/fonts/ 里的字体）', () => {
  it('重跑两次输出相同，且和仓库里的生成物一致', () => {
    const first = build();
    const second = build();
    expect([...first.keys()].sort()).toEqual([
      'public/favicon.svg',
      'src/assets/logo/logo-en.svg',
      'src/assets/logo/logo-zh.svg',
      'src/assets/logo/mark.svg',
      'src/assets/numerals/metrics.json',
      'src/assets/numerals/symbols.svg',
    ]);
    for (const [file, content] of first) {
      expect(second.get(file), file).toBe(content);
      expect(readFileSync(join(root, file), 'utf8'), `${file} 和脚本输出不一致，重跑 node scripts/build-logo.mjs`).toBe(content);
    }
  });

  it('编号只有 0–9、用等高数字：0、1、4 一样高（只剩找不到页的 404 用）', () => {
    const symbols = build().get('src/assets/numerals/symbols.svg')!;
    // design v3 §3.2：固定字形只剩 404，不再生成短横
    expect([...symbols.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1])).toEqual([...'0123456789'].map((d) => `numeral-${d}`));
    // 每个 symbol 的路径竖向范围（y 是字体单位，基线为 0，向上为负）
    const range = (id: string) => {
      const d = symbols.match(new RegExp(`id="numeral-${id}"[^>]*><path d="([^"]+)"`))![1];
      const ys = [...d.matchAll(/(-?\d+) (-?\d+)/g)].map((m) => Number(m[2]));
      return { top: Math.min(...ys), bottom: Math.max(...ys) };
    };
    const zero = range('0');
    // 旧式数字的 0 只有约 400 单位高，等高数字约 650
    expect(zero.bottom - zero.top).toBeGreaterThan(600);
    for (const id of ['1', '4']) expect(Math.abs(range(id).top - zero.top)).toBeLessThan(25);
  });
});
