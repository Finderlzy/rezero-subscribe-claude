import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { buildProject, type BuildResult } from './build-project';

/**
 * AC-33 的产物部分（FR-25、ADR-0006、架构 §13.8）：用 SITE_URL 构建一次（sitemap 只在给了 site 时生成），
 * 断言旧网址生成了跳转页、跳转页带 noindex / canonical / meta refresh / 立即跳转的内联脚本，
 * 并且 sitemap 和 search-index.json 里都没有旧标识。
 *
 * 构建用 `moved-with-section` 夹具：真实 route.yaml 加一条带 `section` 的跳转，后记正文追加一个 h2。
 * 这样能验证 `section` → 原理版 h2 slug 在**真实构建**里成立——Astro 构建把页面代码打包到 `<outDir>/.prerender/`
 * 再执行，不能靠 `import.meta.url` 找 `src/content`（曾经就这样漏过：单测注入 headings 全绿，真实构建必然失败）。
 * 真实数据里的 `plan1-free-isp` 也一起断言。带小节落到合并页的 e2e 等 V11 合出合并页后补（Q-18）。
 */
let build: BuildResult;

beforeAll(async () => {
  build = await buildProject({ fixture: 'moved-with-section', env: { SITE_URL: 'https://example.test' }, keep: true });
}, 120_000);

afterAll(() => {
  if (build !== undefined) rmSync(build.dir, { recursive: true, force: true });
});

const dist = () => join(build.dir, 'dist');

describe('AC-33 跳转页、sitemap 和搜索索引', () => {
  test('对照：构建成功', () => {
    expect(build.code, build.output).toBe(0);
  });

  test('旧网址仍然是一个页面：说明、链接、noindex、canonical、meta refresh 和立即跳转的内联脚本', () => {
    const html = readFileSync(join(dist(), 'plan1-free-isp/index.html'), 'utf8');

    expect(html).toContain('这一页已经并入《选择方案》');
    expect(html).toContain('<a href="/choose-plan/">打开《选择方案》→</a>');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<link rel="canonical" href="https://example.test/choose-plan/">');
    // 有 JS 时立即 replace；没有 JS 时 5 秒后由 meta refresh 前往（AC-33 要求先看得到说明和链接）
    expect(html).toContain('location.replace("/choose-plan/");');
    expect(html).toContain('<meta http-equiv="refresh" content="5; url=/choose-plan/">');
  });

  test('带 section 的跳转页：脚本、meta refresh 和链接都指向目标页的原理版 h2 锚点', () => {
    const html = readFileSync(join(dist(), 'old-afterword-page/index.html'), 'utf8');

    expect(html).toContain('这一页已经并入《后记》');
    expect(html).toContain('打开《后记 › 临时小节》→');
    expect(html).toContain('href="/afterword/#临时小节"');
    expect(html).toContain('location.replace("/afterword/#临时小节");');
    expect(html).toContain('<meta http-equiv="refresh" content="5; url=/afterword/#临时小节">');
  });

  test('目标页渲染出的 h2 id 和跳转锚点是同一个（锚点规则和渲染一致）', () => {
    const html = readFileSync(join(dist(), 'afterword/index.html'), 'utf8');

    expect(html).toContain('id="临时小节"');
  });

  test('sitemap 里没有旧标识，目标页照常在', () => {
    const xml = readFileSync(join(dist(), 'sitemap-0.xml'), 'utf8');

    expect(xml).not.toContain('plan1-free-isp');
    expect(xml).not.toContain('old-afterword-page');
    expect(xml).toContain('<loc>https://example.test/choose-plan/</loc>');
    expect(xml).toContain('<loc>https://example.test/afterword/</loc>');
  });

  test('站内搜索的索引里没有旧标识', () => {
    const index = readFileSync(join(dist(), 'search-index.json'), 'utf8');

    expect(index).not.toContain('plan1-free-isp');
    expect(index).not.toContain('old-afterword-page');
    expect(index).toContain('"path":"/choose-plan/"');
  });
});
