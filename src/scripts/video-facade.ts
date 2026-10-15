import type { VideoSource } from '../lib/video/sources';

/**
 * 步骤视频门面的页面脚本（FR-40–42，NFR-04，design §4.7）。
 *
 * 渐进增强：没有 JS 时，播放区域是指向平台视频页的普通链接，平台切换隐藏。
 * 本脚本把播放链接换成按钮，读者点击后才插入 iframe——在此之前页面不向视频平台发任何请求；
 * 有两个平台时显示切换，换平台会撤掉已插入的播放器，回到门面，外链跟着换。
 */

interface FacadeData {
  sources: (VideoSource & { title: string })[];
}

export function initVideoFacade(doc: Document): void {
  for (const root of doc.querySelectorAll<HTMLElement>('[data-video]')) setUp(doc, root);
}

function setUp(doc: Document, root: HTMLElement): void {
  const { sources } = JSON.parse(root.dataset.video ?? '{"sources":[]}') as FacadeData;
  const frame = root.querySelector<HTMLElement>('[data-video-frame]');
  const link = root.querySelector<HTMLAnchorElement>('[data-video-play]');
  if (!sources.length || !frame || !link) return;

  // 播放区域在有 JS 时是按钮：它不跳转，而是就地插入播放器。
  // 只带上 class 和 data-*（含 Astro 作用域样式的 data-astro-cid-*），链接专有的属性不搬到按钮上。
  const play = doc.createElement('button');
  for (const { name, value } of link.attributes) {
    if (name === 'class' || name.startsWith('data-')) play.setAttribute(name, value);
  }
  play.type = 'button';
  play.replaceChildren(...link.childNodes);
  link.replaceWith(play);

  let current = 0;
  play.addEventListener('click', () => {
    const source = sources[current]!;
    const iframe = doc.createElement('iframe');
    iframe.src = source.embedUrl;
    iframe.title = source.title;
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceChildren(iframe);
    // 按钮没了，焦点交给播放器，键盘用户不会掉回页面开头。
    iframe.focus();
  });

  const tabs = root.querySelector<HTMLElement>('[data-video-tabs]');
  if (!tabs) return;
  const buttons = [...tabs.querySelectorAll<HTMLButtonElement>('[data-video-platform]')];
  const name = play.querySelector<HTMLElement>('[data-video-name]');
  const page = root.querySelector<HTMLAnchorElement>('[data-video-page]');
  const open = root.querySelector<HTMLElement>('[data-video-open]');

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (index === current) return;
      current = index;
      const source = sources[index]!;
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
      if (name) name.textContent = source.name;
      if (page) page.href = source.pageUrl;
      if (open) open.textContent = source.openLabel;
      // 撤掉正在播放的另一个平台，回到门面，换平台不会自动开始加载。
      frame.replaceChildren(play);
    });
  });
  tabs.hidden = false;
}
