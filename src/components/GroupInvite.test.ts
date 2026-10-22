import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { GROUP_NUMBER, GROUP_URL } from '../lib/group';
import GroupInvite from './GroupInvite.astro';

// QQ 中转群入口（FR-22）：群号、加群链接、大肥鱼的介绍；完整版带二维码，首页的紧凑版不带。
async function render(props: { compact?: boolean } = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(GroupInvite, { props });
}

describe('GroupInvite', () => {
  it('完整版：介绍大肥鱼，写出群号，链接指向加群地址，内联一张二维码', async () => {
    const html = await render();
    expect(html).toContain('进 QQ 中转群问大肥鱼');
    expect(html).toContain('AI 嘉宾');
    expect(html).toContain(GROUP_NUMBER);
    expect(html).toContain(`href="${GROUP_URL}"`);
    expect(html.match(/<svg\b/g)).toHaveLength(1);
    expect(html).toContain(`aria-label="QQ 中转群二维码，群号 ${GROUP_NUMBER}"`);
  });

  it('紧凑版：只有标题、群号和链接，没有介绍和二维码', async () => {
    const html = await render({ compact: true });
    expect(html).toContain(GROUP_NUMBER);
    expect(html).toContain(`href="${GROUP_URL}"`);
    expect(html).not.toContain('AI 嘉宾');
    expect(html).not.toContain('<svg');
  });

  it('二维码是黑码、透明底的方块路径，带 viewBox，能按宽度缩放', () => {
    const svg = readFileSync(new URL('../assets/qq-group/qrcode.svg', import.meta.url), 'utf8');
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) \1" shape-rendering="crispEdges">/);
    expect(svg).not.toMatch(/\swidth=|\sheight=/);
    expect(svg).toContain('stroke="#000"');
  });
});
