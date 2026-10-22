import { expect, test } from '@playwright/test';
import { expectScriptRan, stepNav } from './route-helpers';

// AC-19（FR-19）原本验收“被封了：申诉解封”旁支页的页脚。v3 新稿把申诉内容并进日常维护页的
// “账号受限之后 → Google 账号被停用”（实施计划 §3.1），不再有单独的旁支页，所以这里改成核对：
// 申诉内容在维护页里作为小节出现，页脚没有旁支页的“回到：…”。
test('“被封了：申诉解封”并进日常维护页的“账号受限之后”小节，没有单独的旁支页', async ({ page }) => {
  await page.goto('./maintenance/');
  await expectScriptRan(page);
  const heading = page.getByRole('heading', { level: 3, name: 'Google 账号被停用' });
  await expect(heading).toBeVisible();
  const section = page.locator('.prose').filter({ visible: true });
  await expect(section).toContainText('申诉');
  // 不再有旁支页的“回到：…”导航
  await expect(stepNav(page).getByRole('link', { name: /回到：/ })).toHaveCount(0);
});
