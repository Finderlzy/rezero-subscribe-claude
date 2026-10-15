/**
 * 步骤视频门面的纯逻辑（FR-40–42，design §4.7，架构 §3 M3）。
 *
 * DOM 操作留在 `src/scripts/video-facade.ts`，这里只放不碰 DOM 的部分：
 * 每个平台的播放器地址和外链、平台顺序（默认 B 站）、“打不开？”提示的文案。
 */

/** 步骤 frontmatter 的 `video` 字段（M1 schema 已校验格式）。 */
export interface StepVideo {
  bilibili?: string | undefined;
  youtube?: string | undefined;
}

export type VideoPlatform = 'bilibili' | 'youtube';

export interface VideoSource {
  platform: VideoPlatform;
  /** 界面上的平台名 */
  name: string;
  /** 外链文字，例如“在 B 站打开” */
  openLabel: string;
  /** 读者点击后才插入的 iframe 地址 */
  embedUrl: string;
  /** 平台上的视频页，总显示在播放器下方（FR-42） */
  pageUrl: string;
}

/**
 * 按显示顺序列出这个步骤可用的视频来源：B 站在前，是默认显示的平台（FR-40）。
 *
 * 播放器参数（#17 实测，写回架构 §3 M3）：
 * - B 站只要 `bvid`，不需要 `aid`/`cid`；`player.bilibili.com` 不发 X-Frame-Options，可以嵌入。
 *   不写 `autoplay` 时播放器会自动播放，`autoplay=0` 能关掉；读者已经点过播放，这里明写 `autoplay=1`。
 * - YouTube 用无 Cookie 域名，同样加 `autoplay=1`，免得读者要再点一次。
 */
export function videoSources(video: StepVideo | undefined): VideoSource[] {
  const sources: VideoSource[] = [];
  if (video?.bilibili) {
    const id = encodeURIComponent(video.bilibili);
    sources.push({
      platform: 'bilibili',
      name: 'B 站',
      openLabel: '在 B 站打开',
      embedUrl: `https://player.bilibili.com/player.html?bvid=${id}&autoplay=1`,
      pageUrl: `https://www.bilibili.com/video/${id}/`,
    });
  }
  if (video?.youtube) {
    const id = encodeURIComponent(video.youtube);
    sources.push({
      platform: 'youtube',
      name: 'YouTube',
      openLabel: '在 YouTube 打开',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
      pageUrl: `https://youtu.be/${id}`,
    });
  }
  return sources;
}

/** 外链后面的提示（design §4.7）。只有一个平台时没有“换平台”可选。 */
export function unavailableHint(sourceCount: number): string {
  return sourceCount > 1 ? '打不开？试试换平台或开代理' : '打不开？试试开代理';
}

/** 插入的 iframe 的标题：步骤名加平台，读屏软件据此区分页面上的嵌入内容。 */
export function playerTitle(stepTitle: string, source: VideoSource): string {
  return `${stepTitle} · ${source.name}`;
}
