import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { AGENT_SKILL_PATH, AGENT_SKILL_ZIP_PATH } from '../../src/lib/agent-skill/index';
import { AGENT_INSTALL_PROMPT } from '../../src/lib/agent-skill/install-prompt';
import { AGENT_SKILL_KEY, DESCRIPTION_MAX, DESCRIPTION_MIN } from '../../src/lib/seo';
import { hasSidebar, tocButton } from './toc-helpers';

// AC-49（FR-115、FR-116）：Skill 页 /agent-skill/ 和两处入口。页上有安装提示词（Claude Code 以外，
// 复制给 Agent 自己下载到项目目录）、下载按钮、版本号、安装方法、开始语和凭据说明；
// 首页首屏主按钮旁多一个“让 AI Agent 带你做”（AC-01、AC-29 的断言照旧）；
// 侧边栏和抽屉底部在“更新日志”旁边有“Agent Skill”，Skill 页自己是当前态；不进搜索结果，进 sitemap。
// sitemap 只在给了 SITE_URL 时生成（ac-33 的口径），这里直接读构建产物核对。

// 安装提示词的复制按钮要读剪贴板：Playwright 的 Chromium 需要显式授权（同 nfr-02-copy-zoom）
test.use({ storageState: { cookies: [], origins: [] }, permissions: ['clipboard-read', 'clipboard-write'] });

test('首页首屏主按钮旁有“让 AI Agent 带你做”，链到 Skill 页', async ({ page }) => {
  await page.goto('./');
  const entry = page.locator('[data-home-agent-skill]');
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAccessibleName('让 AI Agent 带你做');
  await expect(entry).toHaveAttribute('href', AGENT_SKILL_PATH);
});

test('Skill 页有下载按钮、版本号、安装方法、开始语和凭据说明', async ({ page }) => {
  await page.goto('./agent-skill/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agent Skill');

  const download = page.locator('[data-agent-skill-download]');
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute('href', AGENT_SKILL_ZIP_PATH);
  await expect(download).toHaveAttribute('download', '');
  // 没有 JS 时下载按钮也照常可用（它本来就是普通链接，这里核对没有靠脚本补的东西）
  await expect(download).toHaveText('下载 rezero-subscribe-claude.zip');

  // 版本号和 package.json 一致（Skill 版本 = 站点版本，架构 §16.8）
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  await expect(page.locator('.agent-skill-version')).toContainText(version);

  // 安装方法：两个通用目录和只能聊天的 Agent 的边界（Q-23、Q-24）
  await expect(page.getByText('~/.agents/skills/').first()).toBeVisible();
  await expect(page.getByText('~/.claude/skills/').first()).toBeVisible();
  await expect(page.getByText('装了也只能用引导部分')).toBeVisible();

  // 开始语（FR-115）
  await expect(page.locator('.agent-skill-phrase')).toHaveText('带我订阅 Claude');

  // 凭据和清理（FR-108、FR-109）
  await expect(page.getByRole('heading', { name: '凭据和清理' })).toBeVisible();
  await expect(page.getByText('对话记录留在 Agent 和服务商那里')).toBeVisible();

  // 五块 h2 的顺序：先让 Agent 自己装，再手动安装，最后是说明（design §4.10）
  await expect(page.locator('.agent-skill-heading')).toHaveText([
    '让 Agent 自己装（Claude Code 以外）',
    '手动安装（Claude Code 等）',
    '它能做什么、不做什么',
    '装好以后',
    '凭据和清理',
  ]);
});

test('Skill 页有可复制的安装提示词（Claude Code 以外的 Agent 自己装）', async ({ page }) => {
  await page.goto('./agent-skill/');
  const block = page.locator('[data-agent-skill-prompt]');
  await expect(block).toBeVisible();
  const pre = block.locator('pre');
  // 提示词原文：下载地址、项目级目录、不写全局目录、读 SKILL.md 开始，都在这段里
  expect(await pre.textContent()).toBe(AGENT_INSTALL_PROMPT);

  // 复制按钮和 Markdown 代码块共用 initCodeCopy：先等“已复制”，再读剪贴板（writeText 是异步的）
  const copy = block.getByRole('button', { name: '复制', exact: true });
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(block.getByRole('button', { name: '已复制', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(AGENT_INSTALL_PROMPT);
});

test.describe('没有 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('提示词照常可读、可手动复制，但没有复制按钮（design §5 渐进增强）', async ({ page }) => {
    await page.goto('./agent-skill/');
    const block = page.locator('[data-agent-skill-prompt]');
    await expect(block).toBeVisible();
    await expect(block.locator('pre')).toContainText('下载 https://re0claude.us.ci/agent-skill/rezero-subscribe-claude.zip');
    // 按钮由脚本挂上：没有 JS 时不会出现点不动的空按钮
    await expect(block.getByRole('button', { name: '复制', exact: true })).toHaveCount(0);
  });
});

test('1280px 打开 /plan1/：侧边栏底部“更新日志”旁边有“Agent Skill”', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 720, '侧边栏只在 ≥720px 常驻');
  await page.goto('./plan1/');
  const entry = page.locator('aside[data-toc-sidebar] [data-toc-agent-skill]');
  // 和“更新日志”并排，在目录滚动区之外（常驻），不是当前页时没有当前态
  await expect(page.locator('aside[data-toc-sidebar] .toc-sidebar-foot [data-toc-update-log]')).toBeVisible();
  await expect(entry).toBeVisible();
  await expect(entry).toBeInViewport();
  await expect(entry).toHaveAccessibleName('Agent Skill');
  await expect(entry).toHaveAttribute('href', AGENT_SKILL_PATH);
  await expect(entry).not.toHaveAttribute('aria-current', 'page');
});

test('719px 打开抽屉：底部两条入口都在', async ({ page }) => {
  // AC-49 点名 719px：这一档没有常驻侧边栏，两条入口都在抽屉底部
  await page.setViewportSize({ width: 719, height: 800 });
  await page.goto('./plan1/');
  const drawer = page.getByRole('dialog', { name: '目录' });
  await expect(drawer.locator('[data-toc-update-log]')).toBeHidden();
  await expect(drawer.locator('[data-toc-agent-skill]')).toBeHidden();
  await tocButton(page).click();
  await expect(drawer.locator('[data-toc-update-log]')).toBeVisible();
  await expect(drawer.locator('[data-toc-agent-skill]')).toBeVisible();
  await expect(drawer.locator('[data-toc-agent-skill]')).toBeInViewport();
});

test('Skill 页自己是侧边栏底部的当前态，没有上一步/下一步', async ({ page }) => {
  await page.goto('./agent-skill/');
  if (hasSidebar(page)) {
    await expect(page.locator('aside[data-toc-sidebar] [data-toc-agent-skill]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('aside[data-toc-sidebar] [data-toc-update-log]')).not.toHaveAttribute('aria-current', 'page');
  } else {
    const drawer = page.getByRole('dialog', { name: '目录' });
    await tocButton(page).click();
    await expect(drawer.locator('[data-toc-agent-skill]')).toHaveAttribute('aria-current', 'page');
  }
  // 不在上一步/下一步序列里（FR-115）；也不在目录的章节列表里——侧边栏里只有底部那一条入口
  await expect(page.locator('nav.step-nav')).toHaveCount(0);
  if (hasSidebar(page)) await expect(page.locator('aside[data-toc-sidebar] a[href$="/agent-skill/"]')).toHaveCount(1);
});

test('Skill 页不进站内搜索', async ({ page, request }) => {
  // 先直接读索引：索引只有路线图页面和参考页（FR-115），没有这一页
  const index = (await (await request.get('./search-index.json')).json()) as { path: string }[];
  expect(index.length).toBeGreaterThan(10);
  expect(index.filter((entry) => entry.path === AGENT_SKILL_PATH)).toEqual([]);

  // 再在页面里真搜一次：等索引就绪、下拉打开并显示“没有找到”，避免索引还没加载就假通过
  await page.goto('./plan1/');
  const searchButton = page.getByRole('button', { name: '搜索', exact: true });
  if (page.viewportSize()!.width < 720) await searchButton.click();
  else await page.getByRole('combobox', { name: '搜索页面和小标题' }).click();
  const input = page.getByRole('combobox', { name: '搜索页面和小标题' });
  await input.fill('Skill');
  await expect(page.locator('[data-search-status]')).toHaveText('没有找到');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('Skill 页在 sitemap 里（构建产物）', async ({ request }) => {
  // npm run test:e2e 带 SITE_URL 构建，sitemap 一定会生成（和 seo.spec.ts 的口径一致）
  const sitemap = await request.get('./sitemap-0.xml');
  expect(sitemap.status()).toBe(200);
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]!).pathname);
  expect(locs).toContain(AGENT_SKILL_PATH);
});

test('360px 没有页面级横向滚动', async ({ page }) => {
  test.skip(page.viewportSize()!.width > 360, '只在最窄宽度核对横向滚动');
  await page.goto('./agent-skill/');
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
});

test('seo.yaml 有 /agent-skill/ 键', async ({ page }) => {
  await page.goto('./agent-skill/');
  const { readFileSync } = await import('node:fs');
  const { parseDocument } = await import('yaml');
  const seoYaml = parseDocument(readFileSync('src/content/seo.yaml', 'utf8')).toJS() as Record<string, { description: string }>;
  const entry = seoYaml[AGENT_SKILL_KEY];
  expect(entry, 'seo.yaml 缺 /agent-skill/ 这一页').toBeDefined();
  expect(entry!.description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
  expect(entry!.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', entry!.description);
});

test('下载按钮指向构建出的 zip（预览服务器上存在）', async ({ request }) => {
  const response = await request.get(AGENT_SKILL_ZIP_PATH);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/zip');
  expect((await response.body()).length).toBeGreaterThan(0);
});
