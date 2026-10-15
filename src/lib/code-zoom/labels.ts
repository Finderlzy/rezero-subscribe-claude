/**
 * 代码复制和看大图的纯逻辑（design §4.7，NFR-02）。
 *
 * DOM 操作留在 `src/scripts/code-zoom.ts` 里，这里只放不碰 DOM 的部分，好在单元测试里覆盖：
 * 文案、状态切换的时机（2 秒后回到“复制”）、要复制的文本怎么取、大图用哪一档。
 */

/**
 * 渲染好的正文里有没有可放大的截图（M1 给嵌入的图片写了 data-zoom），有才输出看大图的 <dialog>。
 * 匹配 `<img ... data-zoom` 而不是只找 `data-zoom`：代码块里出现同样的字面文字不会被转义，会误判成有截图
 * （图片节点由 remark-obsidian 输出，属性顺序见 remark-obsidian.test.ts 的断言）。
 */
export function hasZoomableImage(html: string): boolean {
  return /<img[^>]*\sdata-zoom(\s|>)/.test(html);
}

/** 复制按钮的两种文案（design §4.7）。图标由 CSS 按 `data-state` 切换，不在这里拼 SVG。 */
export const COPY_LABEL = '复制';
export const COPIED_LABEL = '已复制';

/** “已复制”显示多久后回到“复制”（design §4.7：成功后 2 秒内显示）。 */
export const COPIED_RESET_MS = 2000;

/**
 * 按钮要复制的文本。
 *
 * 取 `<pre>` 的 `textContent` 而不是 `innerText`：`innerText` 会受 CSS 影响
 * （代码块是 `white-space: pre`，但隐藏元素、换行折叠都可能让它和原文不一致），
 * 而 NFR-02 要求命令原样复制。
 */
export function codeTextOf(pre: Element): string {
  return pre.textContent ?? '';
}

/**
 * 看大图的替代文字（design §4.7：图片必须有替代文字，默认用文件名去掉前缀）。
 * M1 的嵌入写法已经把文件名（去掉扩展名）写进 `alt`，这里在缺 `alt` 时兜底。
 */
export function zoomAltOf(img: HTMLImageElement): string {
  const alt = img.getAttribute('alt')?.trim();
  if (alt) return alt;
  const src = img.getAttribute('src') ?? '';
  const name = src.split('/').pop()?.split(/[?#]/)[0] ?? '';
  // 文件名里的 % 序列不一定合法（内容校验只挡了 #、?、%，但 URL 可能被别处改写）。
  // decodeURIComponent 遇到坏序列会抛 URIError，这里退回原串，不让整个看大图初始化中断。
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // 保持原样
  }
  return decoded.replace(/\.[^.]+$/, '');
}

/**
 * 看大图用的地址：`srcset` 里最宽的一档（M1 写了宽度时生成 1x/2x，2x 封顶为原图宽度）。
 *
 * 不能用 `currentSrc`：普通屏幕上它是 1x，和正文里那张一样大，“看大图”等于没放大。
 * 没有 `srcset`（原文没写宽度，`src` 就是原图）或解析不出描述符时退回 `src`。
 */
export function largestSrcOf(img: HTMLImageElement): string {
  const src = img.getAttribute('src') ?? '';
  let best = src;
  let bestSize = 0;
  // 本站的 srcset 由 Astro 生成，地址已经过百分号编码、不含逗号，按“逗号 + 空白”切分即可。
  for (const candidate of (img.getAttribute('srcset') ?? '').split(/,\s+/)) {
    const [url, descriptor = '1x'] = candidate.trim().split(/\s+/);
    const size = Number.parseFloat(descriptor);
    if (url && /^[\d.]+[wx]$/.test(descriptor) && size > bestSize) {
      best = url;
      bestSize = size;
    }
  }
  return best;
}
