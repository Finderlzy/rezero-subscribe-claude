import { expect, test } from '@playwright/test';
import { expectScriptRan } from './route-helpers';

// NFR-02（design §4.7）：命令和代码块一键复制，复制成功后在按钮上显示“已复制”并用 aria-live 播报，
// 2 秒后复位；长行在代码块内部横向滚动、不折行。截图点击后用 <dialog> 看大图，Esc 或点背景关闭。
//
// 剪贴板：Playwright 的 Chromium 需要显式授权 clipboard-read / clipboard-write，
// 否则 navigator.clipboard.writeText 会被拒（页面的兜底 execCommand 在无头模式下也拿不到系统剪贴板）。
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** 读回系统剪贴板里的文字。 */
async function readClipboard(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

test.describe('代码块复制', () => {
  test('复制后剪贴板内容与代码块原文一致，按钮显示“已复制”并播报', async ({ page }) => {
    await page.goto('./plan1-make-node/');

    // 代码块由 Markdown 渲染，复制按钮由页面脚本挂上（没有 JS 时正文照常可读）。
    const block = page.locator('.code-block').filter({ visible: true, hasText: 'bash <(curl -fsSL' }).first();
    await expect(block).toHaveCount(1);

    const pre = block.locator('pre');
    const source = (await pre.textContent()) ?? '';
    expect(source).toContain('bash <(curl -fsSL');
    // 命令原样复制：末尾换行和内容一起去比。
    expect(source.length).toBeGreaterThan(0);

    const button = block.getByRole('button', { name: '复制', exact: true });
    await expect(button).toBeVisible();
    await button.click();

    // 剪贴板内容和代码块原文完全一致（不是包含、不是去空白后的相等）。
    expect(await readClipboard(page)).toBe(source);

    // 按钮换成“已复制”，并且用 aria-live 播报（design §4.7 要求播报）。
    await expect(block.getByRole('button', { name: '已复制', exact: true })).toBeVisible();
    await expect(block.locator('[data-code-copy-status]')).toHaveText('已复制');
    await expect(block.locator('[data-code-copy-status]')).toHaveAttribute('aria-live', 'polite');
  });

  test('“已复制”保持约 2 秒后回到“复制”', async ({ page }) => {
    await page.goto('./plan1-make-node/');
    const block = page.locator('.code-block').filter({ visible: true, hasText: 'bash <(curl -fsSL' }).first();
    // exact: '复制' 是 '已复制' 的子串，用子串匹配会立刻命中仍是“已复制”的按钮，
    // 断言就永远看不到复位（这条用例本身踩过这个坑）。
    const idle = block.getByRole('button', { name: '复制', exact: true });
    const copied = block.getByRole('button', { name: '已复制', exact: true });

    const started = Date.now();
    await idle.click();
    await expect(copied).toBeVisible();

    // 先卡住下界：1 秒时还在“已复制”。只有真的等满 2 秒才复位，才说明写的是 2 秒而不是更短。
    await page.waitForTimeout(1000);
    await expect(copied).toBeVisible();

    // 再卡上界：复位发生在 2 秒之后、3 秒之内（design §4.7：成功后 2 秒内显示）。
    await expect(idle).toBeVisible({ timeout: 2500 });
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(elapsed).toBeLessThan(3500);
    await expect(block.locator('[data-code-copy-status]')).toHaveText('');
  });

  test('复制按钮的可点区域至少 44×44px（design §5）', async ({ page }) => {
    await page.goto('./plan1-make-node/');
    const box = (await page.locator('.code-copy').filter({ visible: true }).first().boundingBox())!;
    // v2.2 W4c：看得见的按钮是 28px 高的幽灵按钮，::after 上下各扩 8px，可点区域仍是 44px 高
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(28);
    // 按钮不能被代码块压住：点在按钮中心，以及按钮上下沿外 7px（扩出来的可点区域里）命中的都应该是按钮自己（B3 的层叠疑问）。
    const hits = await page.evaluate(
      ([x, top, bottom]) => [top! - 7, (top! + bottom!) / 2, bottom! + 7].map((y) => document.elementFromPoint(x!, y)?.closest('.code-copy') !== null),
      [box.x + box.width / 2, box.y, box.y + box.height],
    );
    expect(hits).toEqual([true, true, true]);
    expect(box.height + 16).toBeGreaterThanOrEqual(44);
  });

  test('复制按钮不随长行横向滚动移出视野', async ({ page }) => {
    await page.goto('./plan1-make-node/');
    const block = page.locator('.code-block').filter({ visible: true, hasText: 'bash <(curl -fsSL' }).first();
    const pre = block.locator('pre');

    // 最长的一行必须真的溢出，这个用例才有意义。
    const overflow = await pre.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeGreaterThan(0);

    const button = block.getByRole('button', { name: '复制', exact: true });
    const before = await button.boundingBox();
    await pre.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const after = await button.boundingBox();
    // 按钮在代码块容器上，代码块自己滚动：横向滚动后按钮位置不变。
    expect(after?.x).toBeCloseTo(before?.x ?? -1, 0);
  });
});

test.describe('剪贴板接口不可用时的兜底', () => {
  test('退回 execCommand 复制后，焦点回到复制按钮', async ({ page }) => {
    // 模拟 http 部署这类非安全上下文：没有 navigator.clipboard，脚本只能走临时文本框兜底。
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined });
    });
    await page.goto('./plan1-make-node/');
    const button = page.locator('.code-copy').filter({ visible: true }).first();
    await button.focus();
    await page.keyboard.press('Enter');
    // 兜底要把焦点挪到临时文本框才能选中文字；复制完必须还给按钮，键盘用户不丢位置。
    await expect(button).toBeFocused();
    await expect(page.locator('body > textarea')).toHaveCount(0);
  });
});

test.describe('代码块长行不折行（NFR-02）', () => {
  test('长行在代码块内部横向滚动，white-space 保持 pre', async ({ page }) => {
    await page.goto('./plan1-make-node/');
    const pre = page.locator('.code-block').filter({ visible: true, hasText: 'bash <(curl -fsSL' }).locator('pre').first();
    const styles = await pre.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { whiteSpace: computed.whiteSpace, overflowX: computed.overflowX };
    });
    expect(styles.whiteSpace).toBe('pre');
    expect(styles.overflowX).toBe('auto');
  });
});

test.describe('截图看大图', () => {
  test('点击截图打开 <dialog>，Esc 关闭', async ({ page }) => {
    await page.goto('./ip-tests/voyracloud/');

    const opener = page.locator('[data-image-zoom-opener]').first();
    await expect(opener).toBeVisible();
    // 按钮的可访问名来自里面 <img> 的 alt，不是脚本拼的句子（design §4.7：图片必须有替代文字）。
    await expect(opener).toHaveAccessibleName('VoyraCloud住宅服务器实测-ipinfo');
    await expect(opener).toHaveAttribute('aria-haspopup', 'dialog');
    await opener.click();

    // 用原生 <dialog> 的 showModal：打开后是 modal（design §5）。
    const dialog = page.locator('dialog[data-image-zoom]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveJSProperty('open', true);

    // 大图显示的是这一张截图，替代文字沿用正文里的 alt。
    const big = dialog.locator('[data-image-zoom-image]');
    await expect(big).toBeVisible();
    await expect(big).toHaveAttribute('alt', 'VoyraCloud住宅服务器实测-ipinfo');

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(dialog).toHaveJSProperty('open', false);
  });

  test('大图用 srcset 里最宽的一档，比正文里那张大', async ({ page }, testInfo) => {
    await page.goto('./ip-tests/voyracloud/');
    const inline = page.locator('[data-image-zoom-opener] img').first();
    await inline.scrollIntoViewIfNeeded();
    const inlineBox = (await inline.boundingBox())!;
    const inlineNatural = await inline.evaluate((el: HTMLImageElement) => el.naturalWidth);

    await page.locator('[data-image-zoom-opener]').first().click();
    const big = page.locator('dialog[data-image-zoom] [data-image-zoom-image]');
    await expect(big).toBeVisible();
    await expect.poll(() => big.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeTruthy();

    // 正文写的是 |600，1x 是 600px；大图要拿 2x（封顶为原图宽度），像素必须更多。
    const bigNatural = await big.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(bigNatural).toBeGreaterThan(inlineNatural);

    const bigBox = (await big.boundingBox())!;
    // 整张图在视口内，不用在浮层里滚动。
    expect(bigBox.y).toBeGreaterThanOrEqual(0);
    expect(bigBox.y + bigBox.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    // 桌面上有空间，显示出来也要比正文里那张大；手机上两者都被屏宽限住，不比显示尺寸。
    if (testInfo.project.name === 'desktop-1280') {
      expect(bigBox.width).toBeGreaterThan(inlineBox.width + 100);
    }
  });

  test('关闭按钮不压在大图上', async ({ page }) => {
    await page.goto('./ip-tests/voyracloud/');
    await page.locator('[data-image-zoom-opener]').first().click();
    const dialog = page.locator('dialog[data-image-zoom]');
    const big = dialog.locator('[data-image-zoom-image]');
    await expect(big).toBeVisible();
    const close = (await dialog.locator('[data-image-zoom-close]').boundingBox())!;
    const image = (await big.boundingBox())!;
    expect(close.y + close.height).toBeLessThanOrEqual(image.y);
  });

  test('点背景关闭，点大图本身不关闭', async ({ page }) => {
    await page.goto('./ip-tests/voyracloud/');
    await page.locator('[data-image-zoom-opener]').first().click();

    const dialog = page.locator('dialog[data-image-zoom]');
    await expect(dialog).toBeVisible();

    // 点大图本身不关闭。
    await dialog.locator('[data-image-zoom-image]').click({ position: { x: 5, y: 5 } });
    await expect(dialog).toBeVisible();

    // 点背景（dialog 的内边距区域）关闭。
    const box = (await dialog.boundingBox())!;
    await page.mouse.click(box.x + box.width - 2, box.y + 2);
    await expect(dialog).not.toBeVisible();
  });

  test('关闭按钮可用，关闭后焦点回到触发的那张截图', async ({ page }) => {
    await page.goto('./ip-tests/voyracloud/');
    const opener = page.locator('[data-image-zoom-opener]').first();
    await opener.click();
    await expect(page.locator('dialog[data-image-zoom]')).toBeVisible();

    await page.locator('[data-image-zoom-close]').click();
    const dialog = page.locator('dialog[data-image-zoom]');
    await expect(dialog).not.toBeVisible();
    // 键盘用户关掉大图后不丢位置。
    await expect(opener).toBeFocused();
  });

  test('一页有多张截图时，各自打开自己的那张', async ({ page }) => {
    // 两台服务器各两张：ipinfo、scamalytics
    await page.goto('./ip-tests/voyracloud/');
    const openers = page.locator('[data-image-zoom-opener]');
    await expect(openers).toHaveCount(4);

    const dialog = page.locator('dialog[data-image-zoom]');
    await openers.nth(1).click();
    await expect(dialog.locator('[data-image-zoom-image]')).toHaveAttribute('alt', 'VoyraCloud住宅服务器实测-scamalytics');
    // 大图下面写出它的替代文字，看大图时不丢上下文（design §4.7）。
    await expect(dialog.locator('[data-image-zoom-caption]')).toHaveText('VoyraCloud住宅服务器实测-scamalytics');
  });

  test('没有截图的步骤不输出空的 <dialog>', async ({ page }) => {
    await page.goto('./preface/');
    await expect(page.locator('dialog[data-image-zoom]')).toHaveCount(0);
  });
});

// 截图图版（design §4.7）：统一边框，编号“图 02-1”（本页步骤号-序号）；三种宽度都写在截图下方
// （v2.2 去掉了桌面页边栏）。参考页只用序号“图 1”（常见问题没有截图，用实测页）。
test.describe('截图图版', () => {
  /** 当前可见正文里第 n 个图版的编号文字和位置 */
  async function plate(page: import('@playwright/test').Page, n = 0) {
    const figure = page.locator('.prose').filter({ visible: true }).locator('figure.plate').nth(n);
    await figure.locator('img').scrollIntoViewIfNeeded();
    return figure.evaluate((el) => {
      const rect = (node: Element | null) => {
        const r = node!.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      };
      const img = el.querySelector('img')!;
      return {
        text: el.querySelector('.plate-no')!.textContent,
        caption: rect(el.querySelector('.plate-no')),
        img: rect(img),
        border: getComputedStyle(img).borderTopWidth,
        stepNo: /第 (\d+) 步，共 \d+ 步/.exec(document.querySelector('[data-route-eyebrow]')?.textContent ?? '')?.[1] ?? null,
      };
    });
  }

  /** 步骤页的图版：编号是“步骤号-序号”，写在截图下方 */
  async function expectStepPlates(page: import('@playwright/test').Page) {
    // clean-up 的截图在列表项里（有缩进），iphone-apple-id 的在正文里（打开分支页会记下选项，能数清第几步）
    for (const path of ['./clean-up/', './iphone-apple-id/']) {
      await page.goto(path);
      await expectScriptRan(page);
      const box = await plate(page);
      expect(box.stepNo, path).toMatch(/^\d+$/);
      expect(box.text, path).toBe(`图 ${box.stepNo!.padStart(2, '0')}-1`);
      expect(box.border, path).toBe('1px');
      // 三种宽度的编号都在截图下方（v2.2 去掉了桌面页边栏，见下一项工作 W3 的侧边栏）
      expect(box.caption.top, path).toBeGreaterThanOrEqual(box.img.bottom);
      expect(box.caption.left, path).toBeCloseTo(box.img.left, 0);
    }
  }

  test('步骤页：编号是“步骤号-序号”，写在截图下方', async ({ page }) => {
    await expectStepPlates(page);
  });

  test.describe('没有 JS', () => {
    test.use({ javaScriptEnabled: false });
    test('编号按构建时的操作视图写好步骤号', async ({ page }) => {
      await page.goto('./clean-up/');
      const caption = page.locator('[data-body="operation"] figure.plate .plate-no').first();
      await expect(caption).toBeVisible();
      // 构建时按操作视图写好的眉题里就有步骤号（补足两位进“图 02-1”）
      const no = /第 (\d+) 步，共 \d+ 步/.exec((await page.locator('[data-route-eyebrow]').textContent()) ?? '')?.[1];
      expect(no).toMatch(/^\d+$/);
      await expect(caption).toHaveText(`图 ${no!.padStart(2, '0')}-1`);
    });
  });

  test('第二张截图是“-2”', async ({ page }) => {
    await page.goto('./iphone-apple-id/');
    await expectScriptRan(page);
    expect((await plate(page, 1)).text).toBe(`图 ${(await plate(page)).stepNo!.padStart(2, '0')}-2`);
  });

  test('节点方案没选时按默认的方案二数步骤（FR-13 v0.6）', async ({ page }) => {
    // 数不清第几步时只用序号（架构 §11.4 W-4）：真实内容里已没有带截图、又在没选的分叉点之后的页面，
    // 这一条由 src/scripts/route-enhance.test.ts 用没有 default 的夹具覆盖
    await page.goto('./check-ip/');
    await expectScriptRan(page);
    const first = await plate(page);
    expect(first.stepNo).toMatch(/^\d+$/);
    expect(first.text).toBe(`图 ${first.stepNo!.padStart(2, '0')}-1`);
    expect((await plate(page, 1)).text).toBe(`图 ${first.stepNo!.padStart(2, '0')}-2`);
  });

  test('切到原理视图后编号跟着原理视图的步骤号（清理旧账号前面多一个原理独有步骤）', async ({ page }) => {
    await page.goto('./clean-up/');
    await expectScriptRan(page);
    const operation = await plate(page);
    await page.getByRole('group', { name: '视图' }).getByRole('button', { name: '原理' }).click();
    await expect.poll(async () => (await plate(page)).stepNo).not.toBe(operation.stepNo);
    const principle = await plate(page);
    expect(principle.text).toBe(`图 ${principle.stepNo!.padStart(2, '0')}-1`);
  });

  test('参考页只用序号“图 1”', async ({ page }) => {
    await page.goto('./ip-tests/voyracloud/');
    expect((await plate(page)).text).toBe('图 1');
    expect((await plate(page, 1)).text).toBe('图 2');
  });

  test('点步骤页的截图仍能看大图', async ({ page }) => {
    await page.goto('./clean-up/');
    await expectScriptRan(page);
    await page.locator('.prose').filter({ visible: true }).locator('figure.plate [data-image-zoom-opener]').first().click();
    await expect(page.locator('dialog[data-image-zoom]')).toBeVisible();
  });
});
