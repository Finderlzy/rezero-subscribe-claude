import { expect, test } from '@playwright/test';
import { CONTACTS } from '../../src/lib/contact';
import { GROUP_NUMBER, GROUP_URL } from '../../src/lib/group';

// AC-25（FR-23、FR-22）：页眉有作者的联系方式，≥720px 是图标，手机上收进“联系”按钮；后记正文末尾写了进群方式。

for (const path of ['./afterword/', './ip-tests/']) {
  test(`${path} 的页眉有四个联系方式`, async ({ page }) => {
    await page.goto(path);
    const nav = page.getByRole('navigation', { name: '作者的联系方式' });
    if (page.viewportSize()!.width < 720) {
      await expect(nav.locator('.contact-icon').first()).toBeHidden();
      await nav.getByText('联系', { exact: true }).click();
    } else {
      await expect(nav.getByText('联系', { exact: true })).toBeHidden();
      await expect(nav.locator('.contact-icon')).toHaveCount(CONTACTS.length);
      for (const icon of await nav.locator('.contact-icon').all()) await expect(icon).toBeVisible();
    }
    for (const contact of CONTACTS) {
      await expect(nav.getByRole('link', { name: contact.name, exact: false }).filter({ visible: true })).toHaveAttribute(
        'href',
        contact.url,
      );
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('手机上点别处收起“联系”', async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 720, '只有手机宽度有“联系”按钮');
  await page.goto('./afterword/');
  const menu = page.locator('[data-contact-menu]');
  await menu.getByText('联系', { exact: true }).click();
  await expect(menu).toHaveAttribute('open', '');
  await page.locator('main').click({ position: { x: 10, y: 10 } });
  await expect(menu).not.toHaveAttribute('open');
});

test('后记正文末尾有群号和加群链接', async ({ page }) => {
  await page.goto('./afterword/');
  const article = page.locator('main');
  await expect(article.getByText(GROUP_NUMBER).filter({ visible: true }).first()).toBeVisible();
  await expect(article.locator(`a[href="${GROUP_URL}"]`).filter({ visible: true }).first()).toBeVisible();
});
