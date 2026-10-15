import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import VideoFacade from './VideoFacade.astro';

// 门面的构建产物（FR-40–42）：点击前只有本站画的占位和外链，不含 iframe；
// 两个平台时有切换（默认 B 站）。点击后插入 iframe 由 AC-07 的 e2e 覆盖；现有内容没有两个平台的步骤，
// 切换的行为（换外链、撤掉播放器）在 #17 里用开发服务器人工核对过。
async function render(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  return container.renderToString(VideoFacade, { props });
}

describe('VideoFacade', () => {
  it('没有视频信息时只有一行“视频制作中”', async () => {
    const html = await render({ stepTitle: '防 IPv6 泄漏' });
    expect(html).toContain('视频制作中');
    expect(html).not.toContain('data-video-frame');
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
