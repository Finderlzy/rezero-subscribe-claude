import { expect, test } from '@playwright/test';
import { expectScriptRan } from './route-helpers';

// AC-23（FR-20，design v2.2 D12）：常见问题一问一页。每条问题是重写稿里的一个文件，由 import-rewrite.mjs 原样导入成
// src/content/reference/faq/<id>.md（ADR-0005），页面是 /faq/<id>/；/faq/ 是重写稿《常见问题》原样的目录。
// 步骤里链到某一问的链接直达那一页，带 ?from=，“← 返回刚才的步骤”能回去；眉题写“附录 · 常见问题”。

const ITEMS = [
  { id: 'ssh-permission-denied', title: 'SSH 提示 Permission denied？' },
  { id: 'ssh-port-not-22', title: 'SSH 端口不是 22？' },
  { id: 'reinstall', title: '装过了，想重装？' },
  { id: 'panel-login', title: '面板的用户名、密码、端口，大家都一样，安全吗？' },
  { id: 'dedicated-ip-check', title: '“1 人独享”怎么确认真的只有我在用？' },
  { id: 'different-ips', title: '测出来好几个不同的 IP？' },
  { id: 'split-routing', title: '分流规则具体怎么写？' },
];

test('/faq/ 按重写稿的顺序列出 7 条问题，每条链到 /faq/<id>/', async ({ page }) => {
  await page.goto('./faq/');
  const links = page.locator('.prose li a');
  await expect(links).toHaveText(ITEMS.map((item) => item.title));
  for (const [i, item] of ITEMS.entries()) await expect(links.nth(i)).toHaveAttribute('href', new RegExp(`/faq/${item.id}/$`));
  await expect(page.locator('.band .eyebrow')).toHaveText('附录 · 常见问题');
  await expect(page.getByRole('link', { name: '回到：附录' })).toHaveAttribute('href', /\/appendix\/$/);
});

for (const { id, title } of ITEMS) {
  test(`${id}：h1 是问题原文，眉题“附录 · 常见问题”，页脚“回到：常见问题”`, async ({ page }) => {
    await page.goto(`./faq/${id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('.band .eyebrow')).toHaveText('附录 · 常见问题');
    await expect(page.getByRole('link', { name: '回到：常见问题' })).toHaveAttribute('href', /\/faq\/$/);
    await expect(page.locator('.prose')).not.toBeEmpty();
  });
}

// 常见问题的 TODO 都补完了（2026-10-19），用同为参考页的实测页核对
test('参考页正文里的 TODO 照常显示“作者待补”（FR-21）', async ({ page }) => {
  await page.goto('./ip-tests/qsu-residential/');
  await expect(page.locator('.prose .author-todo')).toBeVisible();
  await expect(page.locator('.prose .author-todo')).toContainText('作者待补');
});

test('步骤里的常见问题链接直达对应的那一问，“返回刚才的步骤”能回去', async ({ page }) => {
  await page.goto('./check-ip/');
  await expectScriptRan(page);
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '测出来好几个不同的 IP？' }).click();
  await expect(page).toHaveURL(/\/faq\/different-ips\/\?from=check-ip$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('测出来好几个不同的 IP？');
  const back = page.getByRole('link', { name: '← 返回刚才的步骤：测 IP 质量' });
  await expect(back).toHaveCount(2);
  await back.first().click();
  await expect(page).toHaveURL(/\/check-ip\/$/);
});

test('“三、把服务器变成节点”链到 SSH 的两条问题', async ({ page }) => {
  await page.goto('./plan1-make-node/');
  await expectScriptRan(page);
  const prose = page.locator('.prose').filter({ visible: true });
  await expect(prose.getByRole('link', { name: 'SSH 端口不是 22？' })).toHaveAttribute('href', /\/faq\/ssh-port-not-22\/\?from=plan1-make-node$/);
  await expect(prose.getByRole('link', { name: 'SSH 提示 Permission denied？' })).toHaveAttribute('href', /\/faq\/ssh-permission-denied\/\?from=plan1-make-node$/);
});

test('从附录进常见问题，再点进一条', async ({ page }) => {
  await page.goto('./appendix/');
  await expectScriptRan(page);
  await page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '常见问题' }).click();
  await expect(page).toHaveURL(/\/faq\/(\?from=appendix)?$/);
  await page.locator('.prose').getByRole('link', { name: '分流规则具体怎么写？' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('分流规则具体怎么写？');
  await expect(page.locator('.prose')).toContainText('DOMAIN-SUFFIX');
});
