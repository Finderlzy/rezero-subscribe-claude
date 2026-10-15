import { describe, expect, it } from 'vitest';
import { playerTitle, unavailableHint, videoSources } from './sources';

describe('videoSources：步骤视频的来源和顺序', () => {
  it('没有视频信息时没有来源（不输出视频区域）', () => {
    expect(videoSources(undefined)).toEqual([]);
    expect(videoSources({})).toEqual([]);
  });

  it('两个平台都有时 B 站在前，是默认平台', () => {
    const sources = videoSources({ youtube: 'BcTUtYYheyA', bilibili: 'BV1GJ411x7h7' });
    expect(sources.map((s) => s.platform)).toEqual(['bilibili', 'youtube']);
  });

  it('B 站用实测过的嵌入参数：只要 bvid，点击后自动播放', () => {
    const [bili] = videoSources({ bilibili: 'BV1GJ411x7h7' });
    expect(bili).toEqual({
      platform: 'bilibili',
      name: 'B 站',
      openLabel: '在 B 站打开',
      embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&autoplay=1',
      pageUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7/',
    });
  });

  it('YouTube 嵌入用无 Cookie 域名，外链和原文一样用 youtu.be', () => {
    const [yt] = videoSources({ youtube: 'BcTUtYYheyA' });
    expect(yt).toEqual({
      platform: 'youtube',
      name: 'YouTube',
      openLabel: '在 YouTube 打开',
      embedUrl: 'https://www.youtube-nocookie.com/embed/BcTUtYYheyA?autoplay=1',
      pageUrl: 'https://youtu.be/BcTUtYYheyA',
    });
  });
});

describe('门面文案', () => {
  it('只有一个平台时不提“换平台”', () => {
    expect(unavailableHint(1)).toBe('打不开？试试开代理');
    expect(unavailableHint(2)).toBe('打不开？试试换平台或开代理');
  });

  it('iframe 标题写出步骤名和平台', () => {
    const [, yt] = videoSources({ bilibili: 'BV1GJ411x7h7', youtube: 'BcTUtYYheyA' });
    expect(playerTitle('整体思路', yt!)).toBe('整体思路 · YouTube');
  });
});
