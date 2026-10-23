import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFixture, type Fixture } from '../content/test-fixture';
import { gitLastModified, sitemapLastmods, sitemapSources } from './lastmod';

let fx: Fixture;
let root: string;
beforeEach(() => {
  fx = createFixture();
  root = fx.root;
  mkdirSync(join(root, 'content', 'reference', 'ip-tests'), { recursive: true });
  mkdirSync(join(root, 'pages'), { recursive: true });
  writeFileSync(join(root, 'pages', 'index.astro'), '');
});
afterEach(() => fx.cleanup());

const sources = (base = '/') =>
  sitemapSources({ repoRoot: root, contentRoot: join(root, 'content'), pagesRoot: join(root, 'pages'), base });

const paths = (base = '/') => sources(base).map((source) => source.path).sort();

describe('sitemapSources', () => {
  it('首页、正文和参考页各一条，路径和路由约定一致', () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('principle/plan1.md', '# 方案一\n');
    fx.write('reference/ip-tests.md', '# IP 质量实测合集\n');
    fx.write('reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n');

    expect(paths()).toEqual(['/', '/ip-tests/', '/ip-tests/decodo/', '/plan1/', '/preface/']);
  });

  it('源文件是相对仓库根的路径（git 认这个形式）', () => {
    fx.write('principle/preface.md', '# 前言\n');

    expect(sources().find((source) => source.path === '/preface/')?.file).toBe('content/principle/preface.md');
  });

  it('子路径部署时每条都带上 base', () => {
    fx.write('principle/preface.md', '# 前言\n');
    fx.write('reference/ip-tests/decodo.md', '# 实测：Decodo ISP\n');

    expect(paths('/sub/')).toEqual(['/sub/', '/sub/ip-tests/decodo/', '/sub/preface/']);
  });

  it('只认 .md：其他文件和隐藏文件都不算一页', () => {
    fx.write('principle/a.md', '# 甲\n');
    fx.write('principle/notes.txt', 'x');
    fx.write('principle/.gitkeep', '');

    expect(paths()).toEqual(['/', '/a/']);
  });

  it('内容目录是空的或不存在时只输出首页，不报错', () => {
    const bare = mkdtempSync(join(tmpdir(), 'rezero-sitemap-'));
    try {
      mkdirSync(join(bare, 'pages'));
      writeFileSync(join(bare, 'pages', 'index.astro'), '');
      const bareSources = sitemapSources({
        repoRoot: bare,
        contentRoot: join(bare, 'content'),
        pagesRoot: join(bare, 'pages'),
        base: '/',
      });

      expect(bareSources.map((source) => source.path)).toEqual(['/']);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('sitemapLastmods', () => {
  it('有日期的页面进结果，没有日期的跳过（sitemap 里就不写这一条）', () => {
    const list = [
      { path: '/a/', file: 'a.md' },
      { path: '/b/', file: 'b.md' },
    ];
    const lastmods = sitemapLastmods(list, (file) => (file === 'a.md' ? '2026-10-22' : undefined));

    expect([...lastmods]).toEqual([['/a/', '2026-10-22']]);
  });
});

describe('gitLastModified', () => {
  const git = spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0;
  const commit = (dir: string, date: string, message: string) => {
    execFileSync('git', ['-c', 'user.name=测试', '-c', 'user.email=test@example.test', 'commit', '-qm', message], {
      cwd: dir,
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
  };

  it.skipIf(!git)('取文件最后一次提交的日期，之后改别的文件不影响这一页', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rezero-git-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: dir });
      writeFileSync(join(dir, 'a.md'), '甲');
      execFileSync('git', ['add', '.'], { cwd: dir });
      commit(dir, '2026-10-01T12:00:00+08:00', '加甲');

      writeFileSync(join(dir, 'b.md'), '乙');
      execFileSync('git', ['add', '.'], { cwd: dir });
      commit(dir, '2026-10-22T12:00:00+08:00', '加乙');

      expect(gitLastModified(dir, 'a.md')).toBe('2026-10-01');
      expect(gitLastModified(dir, 'b.md')).toBe('2026-10-22');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it.skipIf(!git)('不是仓库、没有历史或文件没提交过时返回 undefined', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rezero-git-'));
    try {
      writeFileSync(join(dir, 'a.md'), '甲');
      expect(gitLastModified(dir, 'a.md')).toBeUndefined();

      execFileSync('git', ['init', '-q'], { cwd: dir });
      expect(gitLastModified(dir, 'a.md')).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
