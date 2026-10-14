import { COPIED_LABEL, COPIED_RESET_MS, COPY_LABEL, codeTextOf, zoomAltOf } from '../lib/code-zoom/labels';

/**
 * 代码复制与看大图的页面脚本（design §4.7，NFR-02）。
 *
 * 渐进增强：没有 JS 时页面照常可读，代码块仍是普通 `<pre>`，截图仍是普通图片。
 * 本脚本在正文里挂上两样东西：
 * - 每个代码块的右上角加一个“复制”按钮，成功后换成“已复制”并播报，2 秒后复位；
 * - 每张带 `data-zoom` 的截图变成按钮，点击后用 `<dialog>` 看大图。
 *
 * 看大图照 DOM 里已有的 `<img>` 复制一份放进 `<dialog>`，不改原图：原图保持原文的显示宽度，
 * 大图用 `srcset` 里最宽的一档（M1 写了宽度时生成了 1x/2x，见 remark-obsidian）。
 */

/** 复制按钮和“已复制”提示的图标（design §3.3：图标自己画，内联 SVG，1.5px 线宽、24px 网格）。 */
const COPY_ICON =
  '<svg class="code-copy-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' +
  '<rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
  '<path d="M15 6.5V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V13a2 2 0 0 0 2 2h1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';

const COPIED_ICON =
  '<svg class="code-copy-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">' +
  '<path d="M4.5 12.5 9.5 17.5 19.5 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

function svg(doc: Document, markup: string): SVGElement {
  const wrapper = doc.createElement('template');
  wrapper.innerHTML = markup.trim();
  return wrapper.content.firstElementChild as SVGElement;
}

/**
 * 把文本写进剪贴板。
 *
 * 优先用 `navigator.clipboard`；它需要安全上下文（https 或 localhost），在本机预览或
 * 通过 http 访问的部署上可能没有。没有时退回 `document.execCommand('copy')`，
 * 让老浏览器上按钮仍然可用。两条路都失败时返回 false，按钮保持“复制”，不谎报成功。
 */
async function writeClipboard(doc: Document, text: string): Promise<boolean> {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // 落到下面的兜底：权限被拒或不是安全上下文
    }
  }
  try {
    const field = doc.createElement('textarea');
    field.value = text;
    // 不能 display:none，那样选不中；放在视口外，避免页面跳动。
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '0';
    field.style.left = '-9999px';
    doc.body.append(field);
    field.select();
    const ok = doc.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * 每个代码块右上角加“复制”按钮（design §4.7，NFR-02）。
 *
 * 按钮在 `<pre>` 的容器里绝对定位，`<pre>` 自己横向滚动：按钮不随代码横向滚动移出视野，
 * 也不会盖住第一行后面的命令（容器留出右上角的空间，见 prose.css）。
 */
export function initCodeCopy(doc: Document): void {
  for (const pre of doc.querySelectorAll<HTMLElement>('.prose pre')) {
    // 已经包过的（脚本重跑，如往返缓存恢复）不再加第二个按钮。
    if (pre.parentElement?.classList.contains('code-block')) continue;
    // 代码块里没有文本时不加按钮：没有可复制的内容。
    const text = codeTextOf(pre);
    if (text.trim() === '') continue;

    const wrapper = doc.createElement('div');
    wrapper.className = 'code-block';
    pre.before(wrapper);
    wrapper.append(pre);

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.setAttribute('data-code-copy', '');
    // 图标和文案一起换：颜色不是唯一的状态标识（design §6）。
    const render = (state: 'idle' | 'copied') => {
      const label = doc.createElement('span');
      label.className = 'code-copy-text';
      label.textContent = state === 'copied' ? COPIED_LABEL : COPY_LABEL;
      // 手机上 CSS 把 .code-copy-text 收成 visually-hidden：按钮只留图标，文案仍读得到。
      button.dataset.state = state;
      button.replaceChildren(svg(doc, state === 'copied' ? COPIED_ICON : COPY_ICON), label);
    };
    render('idle');

    // 播报区：`aria-live` 放在按钮外，按钮本身的文字变化不一定被读到。
    // design §4.7 要求用 aria-live 播报复制成功。
    const live = doc.createElement('span');
    live.className = 'visually-hidden';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('data-code-copy-status', '');

    let resetTimer: number | undefined;
    const reset = () => {
      render('idle');
      live.textContent = '';
    };

    button.addEventListener('click', async () => {
      if (!(await writeClipboard(doc, text))) return;
      render('copied');
      live.textContent = COPIED_LABEL;
      // 连点几次时重新计时，“已复制”总是完整显示 2 秒。
      if (resetTimer !== undefined) doc.defaultView?.clearTimeout(resetTimer);
      resetTimer = doc.defaultView?.setTimeout(reset, COPIED_RESET_MS);
    });

    wrapper.append(button, live);
  }
}

/**
 * 截图点击看大图（design §4.7，NFR-02）。
 *
 * 把带 `data-zoom` 的图片包成一个按钮（可点区域 ≥ 44×44px，design §5），点击后打开
 * `ImageZoom.astro` 放在页面里的 `<dialog>`：把原图那份填进 dialog。
 * Esc 由 `<dialog>` 原生支持；点背景关闭由下面的点击处理负责。
 */
export function initImageZoom(doc: Document): void {
  const images = [...doc.querySelectorAll<HTMLImageElement>('.prose img[data-zoom]')];
  if (images.length === 0) return;
  const dialog = doc.querySelector<HTMLDialogElement>('dialog[data-image-zoom]');
  // 脚本要靠页面里的 dialog 才能工作；页面没放时不静默失败，也不自己造一个（那样会脱离组件样式）。
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const big = dialog.querySelector<HTMLImageElement>('[data-image-zoom-image]');
  const caption = dialog.querySelector<HTMLElement>('[data-image-zoom-caption]');
  const close = dialog.querySelector<HTMLButtonElement>('[data-image-zoom-close]');
  if (!big) return;

  let opener: HTMLElement | null = null;

  // 点背景（不是图片本身）关闭：dialog 的内边距区域算背景。
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  close?.addEventListener('click', () => dialog.close());
  // 关闭后把焦点还给触发的图片按钮，键盘用户不丢位置。
  dialog.addEventListener('close', () => {
    opener?.focus();
    opener = null;
  });

  for (const img of images) {
    const trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.className = 'image-zoom-opener';
    trigger.setAttribute('data-image-zoom-opener', '');
    // 不写 aria-label：让它里面的 <img> 的 alt 自然成为按钮的可访问名（design §4.7 要求图片有替代文字）。
    // 写 aria-label 会用拼出来的字符串盖掉 alt，读屏听到的是我们编的句子而不是图片说明。
    // aria-haspopup 说明按下会开一个对话框，补上“看得见的功能、听不出的行为”。
    trigger.setAttribute('aria-haspopup', 'dialog');
    img.before(trigger);
    trigger.append(img);

    trigger.addEventListener('click', () => {
      const label = zoomAltOf(img);
      // 用当前解析出的地址（含 srcset 的 2x），大图不至于糊（reuse-research §4.1）。
      big.src = img.currentSrc || img.src;
      // 和正文用同一份替代文字；缺 alt 时由 zoomAltOf 用文件名兜底，不留空 alt。
      big.alt = label;
      // 大图重新加载前先按原图比例占位，避免打开时高度跳一下。
      if (img.naturalWidth > 0) {
        big.width = img.naturalWidth;
        big.height = img.naturalHeight;
      }
      if (caption) caption.textContent = label;
      opener = trigger;
      dialog.showModal();
    });
  }
}

/** 目前由 StepLayout 调用（步骤页和选择页）；首页、完成页将来有代码块或截图时也要接上。 */
export function initCodeZoom(doc: Document): void {
  initCodeCopy(doc);
  initImageZoom(doc);
}
