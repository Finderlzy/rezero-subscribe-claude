import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 构建级用例的公共部分（AC-14、AC-33）：把仓库的构建输入复制到临时目录，按需套上 tests/fixtures/<用例>/ 的坏内容，
 * 再执行真实的 astro build。每个用例一个独立的临时目录，`keep` 为 false 时构建一结束就删掉。
 */
const repo = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = join(repo, 'tests/fixtures');
/**
 * 构建需要的全部输入（不存在的跳过）；新增构建输入时同步这里。node_modules 另行链接，见 linkPackages。
 * `scripts/import-rewrite.mjs`：订阅 Skill 的生成器复用它的 convertRelativeLinks()（架构 §16.11 R3）。
 */
const BUILD_INPUTS = ['src', 'public', 'agent-skill', 'scripts/import-rewrite.mjs', 'astro.config.mjs', 'tsconfig.json', 'package.json'];
/** 订阅 Skill 的生成器读重写稿（架构 §16.4）：只要 `.md`，附件里的图和视频用不上 */
const REWRITE_INPUT = 'docs/v3-rewrite';
/** 夹具里按仓库相对路径覆盖的目录（如 `@root/docs/v3-rewrite/10-后记.md`），其余文件覆盖 src/content/ */
const FIXTURE_ROOT = '@root';
/** 夹具里逐行列出要删掉的仓库相对路径（空行和 # 开头的行忽略） */
const FIXTURE_DELETE = '@delete';
/** 略小于 vitest.build.config.ts 的 testTimeout，测试超时前先结束构建进程，不留下仍在写临时目录的子进程 */
const BUILD_TIMEOUT = 110_000;

export interface BuildResult {
  /** 复制出来的工程目录；`keep` 为 true 时要由调用方删除 */
  dir: string;
  code: number;
  output: string;
}

export interface BuildOptions {
  /**
   * tests/fixtures/ 下的用例名：它的内容覆盖 src/content/（通常只有坏掉的 route.yaml 或页面）；
   * `@root/` 下的文件按仓库相对路径覆盖，`@delete` 逐行列出要删掉的仓库相对路径（架构 §16.4）。
   */
  fixture?: string;
  /** 追加/覆盖的环境变量，例如 `{ SITE_URL: 'https://example.test' }`；BASE_PATH 默认 `/` */
  env?: Record<string, string>;
  /** 保留临时目录供调用方检查 dist/；默认构建完就删掉 */
  keep?: boolean;
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

/** 套上夹具：普通文件覆盖 src/content/，`@root/` 覆盖仓库根下的文件，`@delete` 里列出的文件删掉。 */
function applyFixture(source: string, dir: string): void {
  for (const entry of readdirSync(source)) {
    const from = join(source, entry);
    if (entry === FIXTURE_ROOT) cpSync(from, dir, { recursive: true });
    else if (entry === FIXTURE_DELETE) {
      for (const line of readFileSync(from, 'utf8').split(/\r?\n/)) {
        const path = line.trim();
        if (path === '' || path.startsWith('#')) continue;
        const target = join(dir, path);
        if (!existsSync(target)) throw new Error(`${from}：要删的 ${path} 不存在`);
        rmSync(target, { recursive: true });
      }
    } else cpSync(from, join(dir, 'src/content', entry), { recursive: true });
  }
}

/** 复制一份工程，套上坏内容（不传则原样），执行 astro build。 */
export function buildProject({ fixture, env: extraEnv, keep = false }: BuildOptions = {}): Promise<BuildResult> {
  const dir = mkdtempSync(join(tmpdir(), 'rezero-build-'));
  for (const input of BUILD_INPUTS) {
    if (existsSync(join(repo, input))) cpSync(join(repo, input), join(dir, input), { recursive: true });
  }
  cpSync(join(repo, REWRITE_INPUT), join(dir, REWRITE_INPUT), {
    recursive: true,
    filter: (source) => statSync(source).isDirectory() || source.endsWith('.md'),
  });
  linkPackages(dir);
  if (fixture !== undefined) applyFixture(join(fixtures, fixture), dir);

  const env = { ...process.env, BASE_PATH: '/', ...extraEnv };
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(repo, 'node_modules/astro/bin/astro.mjs'), 'build'],
      { cwd: dir, env, maxBuffer: 16 * 1024 * 1024, timeout: BUILD_TIMEOUT },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        if (!keep) rmSync(dir, { recursive: true, force: true });
        // Astro 自己的报错（如内容 schema 校验）会写绝对路径，Windows 下是反斜杠：统一成 / 再和仓库相对路径比
        resolve({ dir, code, output: `${stdout}\n${stderr}`.split('\\').join('/') });
      },
    );
  });
}
