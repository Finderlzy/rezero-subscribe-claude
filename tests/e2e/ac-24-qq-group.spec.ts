import { expect, test } from '@playwright/test';
import { GROUP_NUMBER, GROUP_URL } from '../../src/lib/group';

// AC-24（FR-22）：首页、附录和参考页都有 QQ 群入口；二维码只在 ≥720px 显示，手机点链接加群。

for (const path of ['./', './appendix/', './faq/']) {
  test(`${path} 有加群链接和群号`, async ({ page }) => {
    await page.goto(path);
    const invite = page.getByRole('region', { name: 'QQ 群' });
    await expect(invite.getByRole('link', { name: /加入群聊/ })).toHaveAttribute('href', GROUP_URL);
    await expect(invite).toContainText(GROUP_NUMBER);
  });
}

for (const path of ['./appendix/', './faq/']) {
  test(`${path} 的二维码：平板和桌面显示，手机不显示`, async ({ page }) => {
    await page.goto(path);
    const qr = page.getByRole('img', { name: /QQ 群二维码/ });
    const width = page.viewportSize()!.width;
    if (width >= 720) await expect(qr).toBeVisible();
    else await expect(qr).toBeHidden();
  });
}

test('首页的紧凑版不放二维码', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('img', { name: /QQ 群二维码/ })).toHaveCount(0);
});
