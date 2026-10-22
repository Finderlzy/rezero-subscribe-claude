import { describe, expect, it } from 'vitest';
import { READER_STATE_KEY } from './reader-store';
import { VIEW_BOOT_SCRIPT } from './view-boot';

/** 把假的 document、localStorage 作为同名形参传给内联脚本运行，返回它设置的 data-view。 */
function boot(stored: string | null): string | undefined {
  const root = { dataset: {} as Record<string, string> };
  const storage = { getItem: (key: string) => (key === READER_STATE_KEY ? stored : null) };
  new Function('document', 'localStorage', VIEW_BOOT_SCRIPT)({ documentElement: root }, storage);
  return root.dataset.view;
}

// 用户 2026-10-22 决定去掉视图切换、固定原理视图：v2 按本机偏好选视图的用例随功能移除，改成下面这条
describe('VIEW_BOOT_SCRIPT：首次绘制前固定设成原理视图', () => {
  it('不管本机存过什么视图，都写 principle', () => {
    for (const stored of [null, JSON.stringify({ view: 'operation' }), JSON.stringify({ view: 'principle' }), '{oops']) {
      expect(boot(stored)).toBe('principle');
    }
  });
});
