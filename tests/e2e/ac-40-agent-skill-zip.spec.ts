import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { expect, test } from '@playwright/test';
import { AGENT_SKILL_ZIP_PATH, SKILL_NAME } from '../../src/lib/agent-skill/index';

/**
 * AC-40（FR-114，NFR-07）：dist/agent-skill/rezero-subscribe-claude.zip 随站点发布。
 * 直接读构建产物解压核对目录结构、frontmatter 和大小（zip 是静态文件，不需要浏览器行为），
 * 再确认预览服务器上能按站点路径下载到同样的字节。
 */

const dist = process.env.DIST_DIR ?? 'dist';
const zipPath = join(dist, AGENT_SKILL_ZIP_PATH);

/** 解压 dist 里的 zip：路径 → 字节 */
function unzipped(): Record<string, Uint8Array> {
  return unzipSync(new Uint8Array(readFileSync(zipPath)));
}

const decoder = new TextDecoder();

test.describe('AC-40 订阅 Skill 的 zip 下载', () => {
  test('构建产物里有 zip，不超过 1 MB（NFR-07）', () => {
    const bytes = readFileSync(zipPath);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes.length).toBeLessThanOrEqual(1024 * 1024);
  });

  test('zip 顶层是 rezero-subscribe-claude/，SKILL.md 和 references/ 都在', () => {
    const files = Object.keys(unzipped()).sort();
    expect(files).toContain(`${SKILL_NAME}/SKILL.md`);
    expect(files.some((path) => path.startsWith(`${SKILL_NAME}/references/`))).toBe(true);
    for (const path of files) expect(path.startsWith(`${SKILL_NAME}/`)).toBe(true);
  });

  test('解压后 frontmatter 的 name 等于目录名，metadata.version 等于 package.json', async () => {
    const skill = decoder.decode(unzipped()[`${SKILL_NAME}/SKILL.md`]!);
    expect(skill).toContain(`name: ${SKILL_NAME}`);
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(skill).toContain(`version: "${version}"`);
  });

  test('预览服务器上按站点路径能下载到同样的字节', async ({ request }) => {
    const response = await request.get(AGENT_SKILL_ZIP_PATH);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/zip');
    expect(Buffer.from(await response.body())).toEqual(readFileSync(zipPath));
  });
});
