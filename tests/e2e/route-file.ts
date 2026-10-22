import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { movedEntries, type MovedEntry } from '../../src/lib/route/route-map';

/**
 * route.yaml 的跳转表（e2e 用）。Playwright 里没有 Vite 的 `?raw`，所以直接读文件，
 * 再用 M2 的 `movedEntries()` 取（不在测试里另写一套形状规则）。
 */
export function movedPages(): MovedEntry[] {
  return movedEntries(parse(readFileSync(new URL('../../src/content/route.yaml', import.meta.url), 'utf8')));
}

/** 跳转页在构建产物里的路径，如 `plan1-free-isp/`（built-pages.ts 用来把旧地址排除在逐页用例之外） */
export function movedPagePaths(): string[] {
  return movedPages().map(({ from }) => `${from}/`);
}
