import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, test } from 'vitest';

/**
 * AC-14 构建级用例（架构 §8）：把仓库的构建输入复制到临时目录，用 tests/fixtures/<用例>/ 覆盖 src/content/，
 * 再执行真实的 astro build，断言构建失败并报出具体文件。另有一个不加坏内容的对照构建，
 * 证明失败来自坏内容，而不是复制出来的工程本身就构建不了。
 */

const repo = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = join(repo, 'tests/fixtures');
/** 构建需要的全部输入（不存在的跳过）；新增构建输入时同步这里。node_modules 另行链接，见 linkPackages */
const BUILD_INPUTS = ['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json'];
/** 略小于 vitest.build.config.ts 的 testTimeout，测试超时前先结束构建进程，不留下仍在写临时目录的子进程 */
const BUILD_TIMEOUT = 110_000;

const workRoot = mkdtempSync(join(tmpdir(), 'rezero-build-'));
afterAll(() => rmSync(workRoot, { recursive: true, force: true }));

interface BuildResult {
  code: number;
  output: string;
}

/**
 * 逐个链接依赖包，不链接整个 node_modules：Astro 的缓存（`node_modules/.astro`，含内容数据）和 Vite 的缓存
 * 都在 node_modules 下的点目录里，共用时并行的构建会读到彼此的内容，也会污染仓库自己的缓存。
 */
function linkPackages(dir: string): void {
  const target = join(dir, 'node_modules');
  mkdirSync(target);
  for (const name of readdirSync(join(repo, 'node_modules'))) {
    if (name.startsWith('.')) continue;
    // junction 在 Windows 上不需要管理员权限，其他系统忽略这个参数
    symlinkSync(join(repo, 'node_modules', name), join(target, name), 'junction');
  }
}

/** 复制一份工程，套上坏内容（不传则原样），执行 astro build。 */
function buildWith(fixture?: string): Promise<BuildResult> {
  const dir = join(workRoot, fixture ?? 'control');
  for (const input of BUILD_INPUTS) {
    if (existsSync(join(repo, input))) cpSync(join(repo, input), join(dir, input), { recursive: true });
  }
  linkPackages(dir);
  if (fixture) cpSync(join(fixtures, fixture), join(dir, 'src/content'), { recursive: true });

  const env = { ...process.env, BASE_PATH: '/' };
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(repo, 'node_modules/astro/bin/astro.mjs'), 'build'],
      { cwd: dir, env, maxBuffer: 16 * 1024 * 1024, timeout: BUILD_TIMEOUT },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({ code, output: `${stdout}\n${stderr}` });
      },
    );
  });
}

describe('AC-14 坏内容让构建失败并报出文件', () => {
  test.concurrent('对照：不加坏内容时构建成功', async () => {
    const { code, output } = await buildWith();
    expect(code, output).toBe(0);
  });

  // 每个用例只覆盖一个现有文件（致谢页或 route.yaml），其余内容不变，所以只会因为这一处坏内容失败
  test.concurrent.each([
    {
      fixture: 'missing-image',
      file: 'src/content/operation/thanks.md',
      messages: ['找不到图片“no-such-screenshot.png”'],
    },
    {
      fixture: 'missing-link',
      file: 'src/content/operation/thanks.md',
      messages: ['找不到标题为“没有这一页”的页面'],
    },
    {
      fixture: 'missing-anchor',
      file: 'src/content/operation/thanks.md',
      messages: ['“常见问题”里没有小标题“没有这一条”'],
    },
    {
      fixture: 'missing-merge',
      file: 'route.yaml',
      // 路线图错误按“文件：说明”成行输出（src/lib/site.ts），连同文件名一起断言；
      // “2 处”保证只因挪走汇合点失败：真实路线图增删页面后这份副本会多报错误，要跟着同步
      messages: [
        '路线图校验失败（2 处）',
        'route.yaml：分叉点 phone 的分支段（章节 ending）之后没有汇合点',
        'route.yaml：路线的最后一项必须是普通页面',
      ],
    },
    {
      fixture: 'title-mismatch',
      file: 'src/content/operation/thanks.md',
      messages: ['操作版标题“感谢”与原理版“致谢”不同'],
    },
    {
      fixture: 'bad-metadata',
      file: 'src/content/principle/thanks.md',
      messages: ['principle → thanks data does not match collection schema', 'Unrecognized key: "skipable"'],
    },
  ])('$fixture：报出 $file', async ({ fixture, file, messages }) => {
    const { code, output } = await buildWith(fixture);
    expect(code, output).not.toBe(0);
    expect(output).toContain(file);
    for (const message of messages) expect(output).toContain(message);
  });
});
