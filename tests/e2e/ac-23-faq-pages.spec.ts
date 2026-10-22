import { expect, test } from '@playwright/test';

// AC-23（FR-20）原本验收常见问题一问一页。v3 不再有独立常见问题（实施计划 §3.1）：
// 各条问题并进正文各章的小节，保留的参考页只有 IP 质量实测合集和 6 篇实测。
// 这里改成验收实测参考页：/ip-tests/ 按重写稿的顺序列出 6 篇，每篇有自己的页面和“回到：IP 质量实测合集”。

const ITEMS = [
  { id: 'qsu-free-isp', title: '实测：proxy.qsu.hk 白嫖 ISP' },
  { id: 'lisahost', title: '实测：丽萨住宅服务器' },
  { id: 'voyracloud', title: '实测：VoyraCloud 住宅服务器' },
  { id: 'qsu-residential', title: '实测：QSU 住宅服务器' },
  { id: 'ipequal', title: '实测：ipequal 住宅节点' },
  { id: 'decodo', title: '实测：Decodo ISP' },
];

test('/ip-tests/ 按重写稿的顺序列出 6 篇实测，每篇链到 /ip-tests/<id>/', async ({ page }) => {
  await page.goto('./ip-tests/');
  const links = page.locator('.prose table a');
  await expect(links).toHaveCount(ITEMS.length);
  for (const [i, item] of ITEMS.entries()) {
    await expect(links.nth(i)).toHaveText(item.title);
    await expect(links.nth(i)).toHaveAttribute('href', new RegExp(`/ip-tests/${item.id}/$`));
  }
  await expect(page.locator('main .eyebrow')).toHaveText('日常维护 · IP 质量实测合集');
  await expect(page.getByRole('link', { name: /^回到 日常维护、风控应对与常见故障$/ })).toHaveAttribute('href', /\/maintenance\/$/);
});

for (const { id, title } of ITEMS) {
  test(`${id}：h1 是实测标题，眉题“日常维护 · IP 质量实测合集”，页脚回到合集`, async ({ page }) => {
    await page.goto(`./ip-tests/${id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('main .eyebrow')).toHaveText('日常维护 · IP 质量实测合集');
    await expect(page.getByRole('link', { name: /^回到 IP 质量实测合集$/ })).toHaveAttribute('href', /\/ip-tests\/$/);
    await expect(page.locator('.prose')).not.toBeEmpty();
  });
}

test('参考页正文里的 TODO 照常显示“作者待补”（FR-21）', async ({ page }) => {
  await page.goto('./ip-tests/qsu-residential/');
  await expect(page.locator('.prose .author-todo')).toBeVisible();
  await expect(page.locator('.prose .author-todo')).toContainText('作者待补');
});

test('参考页之间的小节链接照常可用（实测页链到方案一的购买 ISP 小节）', async ({ page }) => {
  await page.goto('./ip-tests/decodo/');
  const link = page.locator('.prose').getByRole('link', { name: /方案一：搭建专属住宅代理节点/ }).first();
  await expect(link).toHaveAttribute('href', /\/plan1\/#/);
});
