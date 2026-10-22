/**
 * 昼夜（浅色/深色）主题（用户 2026-10-22 决定：顶栏原来放视图切换的位置换成昼夜切换，取代 design §3.1“不提供手动切换”）。
 *
 * 默认跟随系统的 `prefers-color-scheme`，`<html>` 上没有 `data-theme`；读者点了顶栏的切换后写
 * `data-theme="light|dark"`，tokens.css 按它取深浅两套令牌。选择只存 localStorage 的一个键，
 * 读写都包 try/catch：存储不可用时照常跟随系统，点切换只在本页生效。
 * 这份选择和 M4 的本机选择（分叉点、视图）无关，不进 READER_STATE_KEY。
 */
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'rezero-subscribe-claude:theme';

/** 存储里的值只认 light、dark 两种，其余（没有、写坏了）都当作“跟随系统”。 */
export function parseTheme(value: unknown): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** 页面实际用的主题：读者选过就用选的，没选过跟随系统。 */
export function effectiveTheme(chosen: Theme | null, systemDark: boolean): Theme {
  return chosen ?? (systemDark ? 'dark' : 'light');
}

/** 点一次切换之后的主题：当前是深色就换浅色，反之换深色（只在两种之间来回，不回到“跟随系统”）。 */
export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * 所有页面 `<head>` 里的内联脚本：首次绘制前按存过的选择设 `data-theme`，深色读者不会先闪一下白底。
 * 内联脚本不能导入模块，取值规则同 `parseTheme`；没存过、存储被禁用时什么都不做（跟随系统）。
 */
export const THEME_BOOT_SCRIPT =
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});` +
  `if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;
