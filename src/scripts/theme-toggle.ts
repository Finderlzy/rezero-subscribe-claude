import { THEME_KEY, effectiveTheme, nextTheme, parseTheme, type Theme } from '../lib/theme';

/**
 * 顶栏的昼夜切换（ThemeToggle.astro，用户 2026-10-22 决定）。按钮构建时带 `hidden`（没有 JS 时不显示，页面跟随系统），
 * 这里露出它，并负责：点一下在浅色、深色之间切换，写 `<html data-theme>` 和 localStorage（失败时只在本页生效），
 * 同步 `aria-pressed`（按下 = 深色）；没选过时系统换了深浅，按钮状态跟着变；从往返缓存恢复时按存储重读。
 * 首次绘制前的 `data-theme` 由 `<head>` 里的 THEME_BOOT_SCRIPT 设好。
 */
export function initThemeToggle(doc: Document): void {
  const buttons = [...doc.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];
  if (buttons.length === 0) return;
  const win = doc.defaultView;
  const root = doc.documentElement;
  const media = win?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

  const current = (): Theme => effectiveTheme(parseTheme(root.dataset.theme), media?.matches ?? false);
  const sync = () => {
    const dark = current() === 'dark';
    for (const button of buttons) button.setAttribute('aria-pressed', String(dark));
  };
  const stored = (): Theme | null => {
    try {
      return parseTheme(win?.localStorage.getItem(THEME_KEY));
    } catch {
      return null;
    }
  };

  for (const button of buttons) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const theme = nextTheme(current());
      root.dataset.theme = theme;
      try {
        win?.localStorage.setItem(THEME_KEY, theme);
      } catch {
        // 存储不可用：只在本页生效，下一页照常跟随系统
      }
      sync();
    });
  }
  // 旧版 Safari（<14）的 MediaQueryList 只有 addListener
  if (media?.addEventListener) media.addEventListener('change', sync);
  else media?.addListener?.(sync);
  win?.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const theme = stored();
    if (theme) root.dataset.theme = theme;
    sync();
  });
  sync();
}
