import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { READER_STATE_KEY } from '../../src/lib/reader-state/reader-store';
import { movedPages } from './route-file';

/**
 * AC-33（FR-25、ADR-0006）：每个被合并掉或删掉的旧网址仍然是一个页面，打开后跳到目标页并停在对应小节；
 * 禁用 JS 时先看到“这一页已经并入《…》”和链接（meta refresh 5 秒后才走）。
 * 跳转页不进目录、搜索和 sitemap：搜索索引在 dev 产物里就能查；sitemap 只在给了 SITE_URL 时生成，
 * 产物断言在 tests/build/ac-33-moved-dist.test.ts。
 *
 * V11 起 `moved:` 覆盖实施计划 §3.1 的全部旧页面、8 条旧常见问题路径和 `/faq/`；手机相关的 6 条按 M4 的
 * 手机选择分流，没选过时落到 client-desktop 末尾的选项卡片（`#下一步`）。本文件逐条核对兜底去向，另用
 * `localStorage` 预置 iPhone/安卓，核对 6 条分流去向。锚点规则（section → 正文 h2/h3 的 slug）由
 * src/lib/site.test.ts、src/components/MovedPage.test.ts 和 tests/build/ac-33-moved-dist.test.ts 覆盖。
 */
const entries = movedPages();
const hashOf = (url: URL) => decodeURIComponent(url.hash);

test('route.yaml 的 moved: 非空（空了会让下面的用例悄悄消失）', () => {
  expect(entries.length).toBeGreaterThan(0);
});

test('moved: 覆盖实施计划 §3.1 的全部旧页面和 8 条旧常见问题路径（/ip-tests/ 不写）', () => {
  expect(entries.map(({ from }) => from).sort()).toEqual(
    [
      'after-subscribe',
      'android-gmail',
      'android-google-play',
      'android-proxy',
      'android-subscribe',
      'appendix',
      'check-ip',
      'choose-phone',
      'choose-plan',
      'chrome-sign-in',
      'clean-up',
      'disclaimer',
      'faq',
      'faq/dedicated-ip-check',
      'faq/different-ips',
      'faq/panel-login',
      'faq/reinstall',
      'faq/shadowrocket-not-working',
      'faq/split-routing',
      'faq/ssh-permission-denied',
      'faq/ssh-port-not-22',
      'google-appeal',
      'google-region',
      'import-proxy',
      'iphone-app-store-austria',
      'iphone-app-store-login',
      'iphone-apple-id',
      'iphone-gift-card',
      'iphone-gmail',
      'iphone-proxy',
      'iphone-purchase-failed',
      'iphone-subscribe',
      'iphone-why-us-apple-id',
      'leak-protection',
      'plan1-buy-isp',
      'plan1-buy-server',
      'plan1-free-isp',
      'plan1-make-node',
      'plan1-panel',
      'plan3-residential-node',
      'recap',
      'register-claude',
      'register-gmail',
      'subscribe',
      'thanks',
      'timezone',
      'use-two-days',
    ].sort(),
  );
  expect(entries.some(({ from }) => from === 'ip-tests' || from.startsWith('ip-tests/'))).toBe(false);
});

test.describe('打开旧网址', () => {
  for (const { from, to, section } of entries) {
    test(`${from} → ${to}${section === undefined ? '' : `（${section}）`}`, async ({ page }) => {
      // 每个 Playwright 测试都有独立的浏览器上下文，等于无痕窗口：没有本机选择、没有阅读记录
      await page.goto(`./${from}/`);

      await expect(page).toHaveURL((url) => url.pathname.endsWith(`/${to}/`) && (section === undefined ? url.hash === '' : hashOf(url) !== ''));
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('这一页已经并入');
      await expect(page.locator('main[data-route-ready]')).toHaveCount(1);

      if (section === undefined) {
        expect(await page.evaluate(() => window.scrollY), '没有 section 时跳到页顶').toBeLessThan(80);
      } else {
        // 落点用地址里的 hash 找元素：h2/h3 的 id 会去掉标点（如“打开面板（可选）” → “打开面板可选”），
        // 选择页末尾的选项卡片则是一个带 id="下一步" 的 div，不一定是标题。
        const anchor = decodeURIComponent(new URL(page.url()).hash.slice(1));
        const target = page.locator(`[id="${anchor.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"]`);
        await expect(target).toBeVisible();
        await expect(target).toBeInViewport();
        // 页尾附近的小节最多只能滚到页面底部，不能像页中小节那样顶到视口上方，所以只要求落在视口里。
        const y = (await target.boundingBox())?.y ?? Number.POSITIVE_INFINITY;
        expect(y).toBeLessThan(page.viewportSize()!.height);
      }
    });
  }
});

test.describe('按手机选择分流', () => {
  const choiceEntries = entries.filter((entry) => entry.choice !== undefined);

  test('6 条手机相关的旧页都带 choice（空表会让下面的用例悄悄消失）', () => {
    expect(choiceEntries.map(({ from }) => from).sort()).toEqual([
      'chrome-sign-in',
      'google-region',
      'register-claude',
      'register-gmail',
      'subscribe',
      'use-two-days',
    ]);
  });

  for (const entry of choiceEntries) {
    for (const [option, target] of Object.entries(entry.choice!.options)) {
      test(`${entry.from}（选了 ${option}）→ ${target.to}${target.section === undefined ? '' : `（${target.section}）`}`, async ({ page }) => {
        await page.addInitScript(
          ({ key, fork, option }) => localStorage.setItem(key, JSON.stringify({ choices: { [fork]: option } })),
          { key: READER_STATE_KEY, fork: entry.choice!.fork, option },
        );
        await page.goto(`./${entry.from}/`);

        await expect(page).toHaveURL(
          (url) => url.pathname.endsWith(`/${target.to}/`) && (target.section === undefined ? url.hash === '' : decodeURIComponent(url.hash) !== ''),
        );
        await expect(page.locator('main[data-route-ready]')).toHaveCount(1);
        if (target.section !== undefined) {
          const anchor = decodeURIComponent(new URL(page.url()).hash.slice(1));
          await expect(page.locator(`[id="${anchor}"]`)).toBeVisible();
        }
      });
    }
  }
});

test.describe('禁用 JS', () => {
  test.use({ javaScriptEnabled: false });

  test('先看到“这一页已经并入”和链接，点链接到目标页', async ({ page }) => {
    expect(entries.length).toBeGreaterThan(0);
    for (const { from, to, section } of entries) {
      await page.goto(`./${from}/`);

      // h1 只认格式：不在测试里再查一遍目标页的标题（多一次请求会和 5 秒的 meta refresh 抢时间）
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^这一页已经并入《.+》$/);
      // 没有 JS 时不靠脚本：meta refresh 是延迟的，读者先看得到说明和链接（AC-33）
      await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(1);
      const link = page.locator('main.page a').first();
      const href = await link.getAttribute('href');
      expect(href?.startsWith(`/${to}/`)).toBe(true);
      if (section !== undefined) expect(href).toContain('#');

      await link.click();
      await expect(page).toHaveURL((url) => url.pathname.endsWith(`/${to}/`));
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('这一页已经并入');
    }
  });
});

test('跳转页不进目录和搜索索引', async ({ page }) => {
  expect(entries.length).toBeGreaterThan(0);
  const dist = test.info().project.metadata.dist as string;
  for (const { from, to } of entries) {
    await page.goto(`./${to}/`);
    expect(await page.locator(`a[href*="/${from}/"]`).count(), '目录和正文里没有旧网址').toBe(0);

    const index = readFileSync(join(dist, 'search-index.json'), 'utf8');
    expect(index).not.toContain(from);
  }
});
