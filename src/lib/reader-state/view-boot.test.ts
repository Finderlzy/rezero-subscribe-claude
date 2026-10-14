import { describe, expect, it } from 'vitest';
import { READER_STATE_KEY } from './reader-store';
import { VIEW_BOOT_SCRIPT } from './view-boot';

type FakeStorage = { getItem(key: string): string | null };

/** 把假的 document、localStorage 作为同名形参传给内联脚本运行，返回它设置的 data-view。 */
function boot(storage: FakeStorage): string | undefined {
  const root = { dataset: {} as Record<string, string> };
  new Function('document', 'localStorage', VIEW_BOOT_SCRIPT)({ documentElement: root }, storage);
  return root.dataset.view;
}

const stored = (value: string | null) => ({
  getItem: (key: string) => (key === READER_STATE_KEY ? value : null),
});

describe('VIEW_BOOT_SCRIPT：首次绘制前按本机偏好设置视图（架构 §5）', () => {
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

  it('存储被禁用（读取就抛异常）时不报错，用 operation（AC-18）', () => {
    const disabled: FakeStorage = {
      getItem() {
        throw new Error('SecurityError');
      },
    };
    expect(boot(disabled)).toBe('operation');
  });
});
