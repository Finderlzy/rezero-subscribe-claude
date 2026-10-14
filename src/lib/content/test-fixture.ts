import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * 单元测试用的临时内容目录：`<root>/content/...` 和 `<root>/assets/screenshots/...`，
 * 与仓库里 `src/content`、`src/assets/screenshots` 的相对位置相同。
 */
export interface Fixture {
  root: string;
  contentRoot: string;
  screenshotsDir: string;
  /** 写一个内容文件，路径相对 contentRoot，返回绝对路径 */
  write(path: string, text: string): string;
  /** 写一张截图；内容各不相同，避免图片服务按内容合并（reuse-research §4.1） */
  shot(name: string): void;
  cleanup(): void;
}

export function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'rezero-content-'));
  const contentRoot = join(root, 'content');
  const screenshotsDir = join(root, 'assets', 'screenshots');
  mkdirSync(contentRoot, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  return {
    root,
    contentRoot,
    screenshotsDir,
    write(path, text) {
      const file = join(contentRoot, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
      return file;
    },
    shot(name) {
      writeFileSync(join(screenshotsDir, name), `fake image ${name}`);
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

/** 生成带 frontmatter 的 Markdown */
export function md(frontmatter: string, body: string): string {
  return `---\n${frontmatter}\n---\n${body}`;
}
