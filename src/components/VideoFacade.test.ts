import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import VideoFacade from './VideoFacade.astro';

// 门面的构建产物（FR-40–42）：点击前只有本站画的占位和外链，不含 iframe；
// 两个平台时有切换（默认 B 站）。现有内容还没有带视频的步骤，点击后插入 iframe、切换平台（换外链、撤掉播放器）
// 的行为在 #17 里用开发服务器人工核对过，核对方式写在 tests/e2e/ac-07-video.spec.ts 开头。
async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(VideoFacade, { props });
}

describe('VideoFacade', () => {
  it('没有视频信息时不输出视频区域，也没有“视频制作中”（FR-41）', async () => {
    const html = await render({ stepTitle: '防泄漏' });
    expect(html).not.toContain('视频制作中');
    expect(html).not.toContain('data-video');
    expect(html).not.toContain('<section');
  });

  it('两个平台时有切换，默认 B 站，外链和提示跟着 B 站', async () => {
    const html = await render({ stepTitle: '整体思路', video: { bilibili: 'BV1GJ411x7h7', youtube: 'BcTUtYYheyA' } });
    expect(html).toMatch(/data-video-platform="bilibili"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/data-video-platform="youtube"[^>]*aria-pressed="false"/);
    expect(html).toMatch(/href="https:\/\/www\.bilibili\.com\/video\/BV1GJ411x7h7\/"[^>]*data-video-page/);
    expect(html).toContain('在 B 站打开');
    expect(html).toContain('打不开？试试换平台或开代理');
    expect(html).not.toContain('<iframe');
  });

  it('只有 YouTube 时没有切换，提示不提换平台', async () => {
    const html = await render({ stepTitle: '整体思路', video: { youtube: 'BcTUtYYheyA' } });
    expect(html).not.toContain('data-video-tabs');
    expect(html).toContain('在 YouTube 打开');
    expect(html).toContain('打不开？试试开代理');
  });
});
