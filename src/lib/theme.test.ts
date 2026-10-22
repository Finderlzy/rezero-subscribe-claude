import { describe, expect, it } from 'vitest';
import { THEME_BOOT_SCRIPT, THEME_KEY, effectiveTheme, nextTheme, parseTheme } from './theme';

/** 把假的 document、localStorage 作为同名形参传给内联脚本运行，返回它设置的 data-theme。 */
function boot(getItem: (key: string) => string | null): string | undefined {
  const root = { dataset: {} as Record<string, string> };
  new Function('document', 'localStorage', THEME_BOOT_SCRIPT)({ documentElement: root }, { getItem });
  return root.dataset.theme;
}

describe('THEME_BOOT_SCRIPT：首次绘制前按存过的选择设主题', () => {
  it('存过 light 或 dark → 写进 data-theme', () => {
    expect(boot((key) => (key === THEME_KEY ? 'dark' : null))).toBe('dark');
    expect(boot((key) => (key === THEME_KEY ? 'light' : null))).toBe('light');
  });

  it('没存过、值不认识 → 不写 data-theme（跟随系统）', () => {
    expect(boot(() => null)).toBeUndefined();
    expect(boot(() => 'sepia')).toBeUndefined();
  });

  it('存储被禁用时不报错，跟随系统', () => {
    expect(
      boot(() => {
        throw new Error('SecurityError');
      }),
    ).toBeUndefined();
  });
});

describe('主题的取值', () => {
  it('parseTheme 只认 light、dark', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    for (const value of [null, undefined, '', 'Dark', 'system', 1]) expect(parseTheme(value)).toBeNull();
  });

  it('没选过跟随系统，选过以选的为准', () => {
    expect(effectiveTheme(null, true)).toBe('dark');
    expect(effectiveTheme(null, false)).toBe('light');
    expect(effectiveTheme('light', true)).toBe('light');
    expect(effectiveTheme('dark', false)).toBe('dark');
  });

  it('切换在浅色、深色之间来回', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});
