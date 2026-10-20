import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { builtPages } from './built-pages';
import { chooseOption, expectScriptRan } from './route-helpers';
import { openToc } from './toc-helpers';

// AC-10（目录和首页部分，Never）：在目录和首页找不到已读标记、“继续上次”“清除进度”。选择页没有“默认”见 ac-10-no-default。
const BANNED = ['继续上次', '清除进度', '已读', '✓'];

test('全站构建产物里没有“继续上次”“清除进度”和已读标记', async ({ page }, testInfo) => {
  const dist = String(testInfo.project.metadata.dist ?? 'dist');
  for (const path of builtPages(dist)) {
    const file = join(dist, path.endsWith('.html') ? path : `${path}index.html`);
    const html = readFileSync(file, 'utf8');
    for (const word of BANNED.filter((w) => w !== '✓')) expect(html.includes(word), `/${path} 含有“${word}”`).toBe(false);
    if (!html.includes('✓')) continue;
    // 正文可以写“✓”（如“点右上角蓝色的 ✓ 保存”，说的是 iOS 的按钮，原样导入，ADR-0005）；
    // 已读标记是界面上的东西，所以“✓”只查正文以外的部分
    await page.goto(`./${path}`);
    const outside = await page.evaluate(() => {
      const body = document.body.cloneNode(true) as HTMLElement;
      for (const prose of body.querySelectorAll('.prose')) prose.remove();
      return body.textContent ?? '';
    });
    expect(outside.includes('✓'), `/${path} 正文以外含有“✓”`).toBe(false);
  }
});

test('读过几页、选过方案之后，首页和目录里仍然没有进度相关的内容', async ({ page }) => {
  await page.goto('./preface/');
  await expectScriptRan(page);
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案二');
  await page.goto('./import-proxy/');
  await expectScriptRan(page);

  const toc = await openToc(page);
  const tocText = await toc.innerText();
  for (const word of BANNED) expect(tocText).not.toContain(word);

  await page.goto('./');
  const homeText = await page.locator('body').innerText();
  for (const word of BANNED) expect(homeText).not.toContain(word);
});
