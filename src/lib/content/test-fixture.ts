import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * 单元测试用的临时内容目录：`<root>/content/...`、`<root>/assets/screenshots/...`、`<root>/assets/diagrams/...`
 * 和 `<root>/public/videos/...`，与仓库里 `src/content`、`src/assets/*`、`public/videos` 的相对位置相同。
 */
export interface Fixture {
  root: string;
  contentRoot: string;
  screenshotsDir: string;
  diagramsDir: string;
  /** 正文视频目录（`public/videos`）；测试里用 createLinkIndex 的第 4 个参数传进去 */
  videosDir: string;
  /** 写一个内容文件，路径相对 contentRoot，返回绝对路径 */
  write(path: string, text: string): string;
  /** 写一张截图；内容各不相同，避免图片服务按内容合并（reuse-research §4.1） */
  shot(name: string): void;
  /** 写一张说明图（SVG 原文） */
  diagram(name: string, svg: string): void;
  /** 写一个视频文件（只有文件名，内容随意） */
  video(name: string): void;
  cleanup(): void;
}

export function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'rezero-content-'));
  const contentRoot = join(root, 'content');
  const screenshotsDir = join(root, 'assets', 'screenshots');
  const diagramsDir = join(root, 'assets', 'diagrams');
  const videosDir = join(root, 'public', 'videos');
  mkdirSync(contentRoot, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(diagramsDir, { recursive: true });
  mkdirSync(videosDir, { recursive: true });
  return {
    root,
    contentRoot,
    screenshotsDir,
    diagramsDir,
    videosDir,
    write(path, text) {
      const file = join(contentRoot, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
      return file;
    },
    shot(name) {
      writeFileSync(join(screenshotsDir, name), `fake image ${name}`);
    },
    diagram(name, svg) {
      writeFileSync(join(diagramsDir, name), svg);
    },
    video(name) {
      writeFileSync(join(videosDir, name), `fake video ${name}`);
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
