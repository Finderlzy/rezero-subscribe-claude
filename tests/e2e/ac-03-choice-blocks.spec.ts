import { expect, test } from '@playwright/test';
import { chooseOption, expectScriptRan, optionBlock, stepNav } from './route-helpers';

// AC-03（FR-12、FR-13）和选择页的选项块（design §4.2）：每个选项是一整块可点区域，点空白处进入它的第一步并记住选择；
// 回到选择页时该块标“已选”和 aria-current，“下一步”指向所选选项的第一步（V04：选项是细边框卡片）。

test('AC-03：选方案三 → 进入方案三；下一步到“导入代理软件”；点“上一步” → 回到方案三', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await chooseOption(page, '方案三');
  await expect(page).toHaveURL(/\/plan3-residential-node\/$/);

  await stepNav(page).getByRole('link', { name: /下一步/ }).click();
  await expect(page).toHaveURL(/\/import-proxy\/$/);
  await expectScriptRan(page);

  await stepNav(page).getByRole('link', { name: /上一步/ }).click();
  await expect(page).toHaveURL(/\/plan3-residential-node\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('方案三：直接买住宅节点');
});

test('回到选择页：所选的块标“已选”和 aria-current，其他块不标；“下一步”出现', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await expect(page.getByRole('main').getByText('已选')).toHaveCount(0);
  await expect(page.locator('.option-block[aria-current]')).toHaveCount(0);

  await chooseOption(page, '方案二');
  await expect(page).toHaveURL(/\/plan2-residential-server\/$/);
  await page.goBack();
  await expectScriptRan(page);

  const chosen = optionBlock(page, '方案二');
  await expect(chosen).toHaveAttribute('aria-current', 'true');
  await expect(chosen.getByText('已选')).toBeVisible();
  await expect(page.locator('.prose').filter({ visible: true }).locator('.option-block[aria-current]')).toHaveCount(1);
  await expect(page.getByRole('main').getByText('已选').filter({ visible: true })).toHaveCount(1);
  await expect(stepNav(page).getByRole('link', { name: /下一步.*方案二：住宅 IP 服务器/ })).toHaveAttribute('href', /\/plan2-residential-server\/$/);

  // 页面固定原理视图（用户 2026-10-22 决定去掉视图切换、固定原理视图）：原理版正文里的这一块标着
  await expect(optionBlock(page, '方案二')).toHaveAttribute('aria-current', 'true');
});

test('点块里的其他站内链接，同样先记下这个选项再跳转', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await optionBlock(page, '方案一').getByRole('link', { name: '二、购买 ISP 代理', exact: true }).click();
  await expect(page).toHaveURL(/\/plan1-buy-isp\/$/);

  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await expect(optionBlock(page, '方案一')).toHaveAttribute('aria-current', 'true');
});

test('改选：选过安卓，再选 iPhone，选择页标 iPhone', async ({ page }) => {
  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  await chooseOption(page, '安卓');
  await expect(page).toHaveURL(/\/android-proxy\/$/);

  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  await expect(optionBlock(page, '安卓')).toHaveAttribute('aria-current', 'true');
  await chooseOption(page, 'iPhone');
  await expect(page).toHaveURL(/\/iphone-app-store-austria\/$/);

  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  await expect(optionBlock(page, 'iPhone')).toHaveAttribute('aria-current', 'true');
  await expect(optionBlock(page, '安卓')).not.toHaveAttribute('aria-current', /.*/);
});

// 打开只属于一个选项的页面时页面脚本本来就会记下选项（FR-17），所以这里取消跳转，证明选择是点击时、跳转前写下的。
// 取消放在 window 上：点击先冒泡到 document（页面脚本在这里写选择），再到 window。
test('点选项块时先写下选择：跳转被取消也已经记下', async ({ page }) => {
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await page.evaluate(() => window.addEventListener('click', (event) => event.preventDefault()));
  await optionBlock(page, '方案二').click({ position: { x: 6, y: 6 } });
  await expect(page).toHaveURL(/\/choose-plan\/$/);
  expect(await page.evaluate(() => localStorage.getItem('rezero-subscribe-claude:v2'))).toContain('"node-plan":"plan-2"');
  await expect(optionBlock(page, '方案二')).toHaveAttribute('aria-current', 'true');
  // 同一页里导航立即按新选择重算
  await expect(stepNav(page).getByRole('link', { name: /下一步.*方案二：住宅 IP 服务器/ })).toBeVisible();
});

// v3（V04，design §4.2）：选项是细边框卡片，不加编号圆圈和箭头，卡片间距 12px；内边距手机 14px 16px、平板起 16px 20px
test('选项是细边框卡片：没有编号圆圈和箭头，1px 边框、6px 圆角、间距 12px', async ({ page }) => {
  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  const prose = page.locator('.prose').filter({ visible: true });
  await expect(prose.locator('.option-no, .option-go, .option-row')).toHaveCount(0);

  const blocks = prose.locator('.option-block');
  await expect(blocks).toHaveCount(2);
  const styles = await blocks.evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { width: s.borderTopWidth, style: s.borderTopStyle, radius: s.borderRadius };
    }),
  );
  for (const s of styles) {
    expect(s.width).toBe('1px');
    expect(s.style).toBe('solid');
    expect(s.radius).toBe('6px');
  }

  const wide = (page.viewportSize()?.width ?? 0) >= 720;
  const padding = await blocks.first().evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.paddingTop, s.paddingRight];
  });
  expect(padding).toEqual(wide ? ['16px', '20px'] : ['14px', '16px']);

  const first = (await blocks.nth(0).boundingBox())!;
  const second = (await blocks.nth(1).boundingBox())!;
  expect(Math.round(second.y - (first.y + first.height))).toBe(12);

  // 悬停：边框变成 --control-border（design §4.2）
  const controlBorder = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--control-border)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await blocks.first().hover();
  await expect(blocks.first()).toHaveCSS('border-top-color', controlBorder);
});

test('两个选项共用的结尾（“两条路走完，都接着注册 Gmail”）不在任何选项块里', async ({ page }) => {
  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  const shared = page.locator('.prose').filter({ visible: true }).getByRole('link', { name: '注册 Gmail', exact: true });
  await expect(shared).toHaveCount(1);
  await expect(page.locator('.option-block').getByRole('link', { name: '注册 Gmail', exact: true })).toHaveCount(0);
});

// 路线图 default 的选项是推荐的：标题后一直写“推荐”；本机没选时它按“已选”的样子高亮（不标“已选”），选了别的就只高亮所选的
test('选择方案：方案二标“推荐”，没选时高亮方案二；选了方案一后只高亮方案一', async ({ page }) => {
  const background = (name: string) => optionBlock(page, name).evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await expect(optionBlock(page, '方案二').getByText('推荐', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('推荐', { exact: true }).filter({ visible: true })).toHaveCount(1);
  const plain = await background('方案三');
  expect(await background('方案二')).not.toBe(plain);
  expect(await background('方案一')).toBe(plain);

  await chooseOption(page, '方案一');
  await page.goto('./choose-plan/');
  await expectScriptRan(page);
  await expect(optionBlock(page, '方案二').getByText('推荐', { exact: true })).toBeVisible();
  expect(await background('方案一')).not.toBe(plain);
  expect(await background('方案二')).toBe(plain);
});

test('选择手机系统没有 default，不标“推荐”', async ({ page }) => {
  await page.goto('./choose-phone/');
  await expectScriptRan(page);
  await expect(page.getByRole('main').getByText('推荐', { exact: true })).toHaveCount(0);
});
