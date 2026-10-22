import { describe, expect, it } from 'vitest';
import { markdownPipeline } from './markdown';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { createLinkIndex } from './link-index';
import { createFixture } from './test-fixture';

/** GFM 任务列表的方框是装饰：没有可访问名称的 <input type="checkbox"> 会被 axe 报 critical（V10 新稿的检查清单）。 */
describe('rehypeTaskListCheckboxes', () => {
  it('任务列表的复选框加 aria-hidden 并移出 Tab 序列，正文文字照常', async () => {
    const fx = createFixture();
    try {
      const processor = await createMarkdownProcessor({
        ...markdownPipeline({ base: '/', linkIndex: () => createLinkIndex(fx.contentRoot) }),
        syntaxHighlight: false,
      });
      const out = await processor.render('- [ ] 打开 ipinfo.io\n- [x] 打开 ipleak.net\n');
      const boxes = [...out.code.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
      expect(boxes).toHaveLength(2);
      for (const box of boxes) {
        expect(box).toContain('aria-hidden="true"');
        expect(box).toContain('tabindex="-1"');
      }
      expect(out.code).toContain('打开 ipinfo.io');
    } finally {
      fx.cleanup();
    }
  });
});
