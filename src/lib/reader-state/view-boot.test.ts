import { describe, expect, it } from 'vitest';
import { READER_STATE_KEY, WINDOW_NAME_PREFIX } from './reader-store';
import { VIEW_BOOT_SCRIPT } from './view-boot';

type FakeStorage = { getItem(key: string): string | null };

/** 把假的 document、localStorage、window 作为同名形参传给内联脚本运行，返回它设置的 data-view。 */
function boot(storage: FakeStorage, name = ''): string | undefined {
  const root = { dataset: {} as Record<string, string> };
  new Function('document', 'localStorage', 'window', VIEW_BOOT_SCRIPT)({ documentElement: root }, storage, { name });
  return root.dataset.view;
}

const stored = (value: string | null) => ({
  getItem: (key: string) => (key === READER_STATE_KEY ? value : null),
});

const disabled: FakeStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
};

describe('VIEW_BOOT_SCRIPT：首次绘制前按本机偏好设置视图（架构 §3 M3）', () => {
  it('存过原理视图 → principle', () => {
    expect(boot(stored(JSON.stringify({ view: 'principle', choices: {} })))).toBe('principle');
  });

  it('存过操作视图或没有存过 → operation', () => {
    expect(boot(stored(JSON.stringify({ view: 'operation' })))).toBe('operation');
    expect(boot(stored(null))).toBe('operation');
  });

  it('值不是合法 JSON、view 不是两种视图之一 → operation', () => {
    expect(boot(stored('{oops'))).toBe('operation');
    expect(boot(stored(JSON.stringify({ view: 'other' })))).toBe('operation');
    expect(boot(stored('null'))).toBe('operation');
  });

  it('localStorage 可用时不看 window.name（与 M4 的兜底顺序一致）', () => {
    expect(boot(stored(null), `${WINDOW_NAME_PREFIX}${JSON.stringify({ view: 'principle' })}`)).toBe('operation');
  });

  it('存储被禁用时读 window.name 里本站写的视图（AC-18、FR-31）', () => {
    expect(boot(disabled, `${WINDOW_NAME_PREFIX}${JSON.stringify({ view: 'principle' })}`)).toBe('principle');
  });

  it('存储被禁用、window.name 不是本站的值或为空时不报错，用 operation', () => {
    expect(boot(disabled)).toBe('operation');
    expect(boot(disabled, '{"view":"principle"}')).toBe('operation');
    expect(boot(disabled, `${WINDOW_NAME_PREFIX}{oops`)).toBe('operation');
  });
});
