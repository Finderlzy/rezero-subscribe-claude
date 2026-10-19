import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav } from './route-helpers';
import { openToc } from './toc-helpers';

// AC-22（FR-11、FR-20，requirements §5 路线表）：附录 `appendix` 是路线的最后一章，后记的“下一步”是附录，
// 附录的“下一步”是“回到首页”；附录链到常见问题和 IP 质量实测合集。参考页不进入上一步/下一步序列，
// 在目录里列在附录页下面（取代 v2.2 计划 W5 第 2、3 条的“附录阅读顺序”和“上一条 / 下一条”）。

test('后记 → 附录 → 回到首页；附录的上一步是后记', async ({ page }) => {
  await page.goto('./afterword/');
  await expectScriptRan(page);
  await stepNav(page).getByRole('link', { name: /下一步.*附录/ }).click();
  await expect(page).toHaveURL(/\/appendix\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('附录');
  await expectScriptRan(page);

  const nav = stepNav(page);
  await expect(nav.getByRole('link', { name: /上一步.*后记/ })).toHaveAttribute('href', /\/afterword\/$/);
  await nav.getByRole('link', { name: /回到首页/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: '从第 00 章开始' })).toBeVisible();
});

test('附录在两种视图下都链到常见问题和 IP 质量实测合集；眉题只写“附录”，不显示步数', async ({ page }) => {
  await page.goto('./appendix/');
  await expectScriptRan(page);
  for (const view of ['原理', '操作']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    // W5 第 1 条：附录不计入“共 m 步”，看得见的眉题和读屏文字都只写“附录”
    await expect(page.locator('.band [data-route-eyebrow]')).toHaveText('附录');
    await expect(page.locator('.band [data-route-progress]')).toHaveText('附录');
    const prose = page.locator('.prose').filter({ visible: true });
    await expect(prose.getByRole('link', { name: '常见问题' })).toHaveAttribute('href', /\/faq\/\?from=appendix$/);
    await expect(prose.getByRole('link', { name: 'IP 质量实测合集' })).toHaveAttribute('href', /\/ip-tests\/\?from=appendix$/);
  }
});

test('目录的最后一章是附录，常见问题和 IP 质量实测合集列在附录页下面', async ({ page }) => {
  await page.goto('./appendix/');
  await expectScriptRan(page);
  const toc = await openToc(page);
  const chapter = toc.locator('.toc-chapter').last();
  await expect(chapter).toContainText('附录');
  await expect(chapter.getByRole('link', { name: '附录' })).toHaveAttribute('aria-current', 'page');
  const references = chapter.locator('ol.toc-reference a');
  await expect(references).toHaveText(['常见问题', 'IP 质量实测合集']);
  await expect(references.nth(0)).toHaveAttribute('href', /\/faq\/$/);
  await expect(references.nth(1)).toHaveAttribute('href', /\/ip-tests\/$/);
});

for (const path of ['./faq/', './faq/reinstall/', './ip-tests/', './ip-tests/decodo/']) {
  test(`${path} 不在上一步/下一步序列里，眉题写“附录 · …”`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main[data-reference-ready]')).toHaveCount(1);
    await expect(stepNav(page)).toHaveCount(0);
    await expect(page.locator('.band .eyebrow')).toHaveText(/^附录 · (常见问题|IP 质量实测合集)$/);
  });
}
