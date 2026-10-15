import { expect, test } from '@playwright/test';

// AC-11（FR-20）：在“运行脚本”点“打开面板排查” → 打开该常见问题；点“返回刚才的步骤” → 回到“运行脚本”；
// 常见问题页面没有上一步/下一步。
test('从“运行脚本”进入“打开面板排查”，再返回刚才的步骤', async ({ page }) => {
  await page.goto('./run-script/');
  await page.getByRole('main').getByRole('link', { name: '打开面板排查' }).click();

  await expect(page).toHaveURL(/\/faq\/open-panel\/\?from=run-script$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('打开面板排查');
  await expect(page.getByRole('navigation', { name: '上一步和下一步' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /上一步|下一步/ })).toHaveCount(0);

  // 标题上方和正文末尾各一个返回链接；列表入口照常保留
  const back = page.getByRole('link', { name: '← 返回刚才的步骤：运行脚本' });
  await expect(back).toHaveCount(2);
  await expect(page.getByRole('link', { name: '常见问题列表' })).toBeVisible();

  await back.first().click();
  await expect(page).toHaveURL(/\/run-script\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('运行脚本');
});

test('直接打开常见问题：没有返回链接，有常见问题列表入口', async ({ page }) => {
  await page.goto('./faq/open-panel/');
  await expect(page.getByRole('link', { name: /返回刚才的步骤/ })).toHaveCount(0);

  await page.getByRole('link', { name: '常见问题列表' }).click();
  await expect(page).toHaveURL(/\/faq\/$/);
  await expect(page.getByRole('link', { name: /上一步|下一步/ })).toHaveCount(0);
  const list = page.getByRole('main').getByRole('list');
  await expect(list.getByRole('link')).toHaveText([
    '打开面板排查',
    '装过了，想重装？',
    '“1 人独享”怎么确认真的只有我在用？',
    '分流规则具体怎么写？',
  ]);
});

test('from 不是已知步骤时当作直接打开', async ({ page }) => {
  await page.goto('./faq/reinstall/?from=no-such-step');
  await expect(page.getByRole('link', { name: /返回刚才的步骤/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '常见问题列表' })).toBeVisible();
});
