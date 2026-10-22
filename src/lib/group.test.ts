import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUP_NUMBER, GROUP_URL } from './group';

// 后记正文从重写稿原样导入（ADR-0005），群号和链接写在正文里；改了 group.ts 要同步改重写稿再导入（FR-22）。
describe('后记里的进群方式', () => {
  it('principle/afterword.md 的群号和链接和 group.ts 一致', () => {
    const text = readFileSync(new URL('../content/principle/afterword.md', import.meta.url), 'utf8');
    expect(text).toContain(GROUP_NUMBER);
    expect(text).toContain(`](${GROUP_URL})`);
  });
});
