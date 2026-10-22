import { READER_STATE_KEY, WINDOW_NAME_PREFIX } from './reader-state/reader-store';

/**
 * 跳转页 `<head>` 里的内联脚本（FR-25、ADR-0006）：按本机保存的分叉点选择（M4）挑去向。
 *
 * 手机相关的旧页面在新稿里 iOS、安卓各有一份（实施计划 §3.1），打开旧网址时要按读者选过的手机系统落地。
 * 和 `theme.ts` 的 `THEME_BOOT_SCRIPT` 一样写成字符串、由页面内联到 `<head>`：必须在首次绘制前就换地址，
 * 所以不能等打包好的模块脚本。读取顺序和 M4 一致：localStorage → `window.name`；两层都读不到、
 * 没有存过这个分叉点、或者读出来的值不在 `options` 里时，用页面写好的 `fallback`（没有 JS 时也停在 fallback）。
 *
 * 页面把去向写在 `<script type="application/json" id="moved-data">` 里：
 * `{ fork, options: { <选项>: <地址> }, fallback: <地址> }`，地址已经带好 base 和小节锚点。
 */
export const MOVED_BOOT_SCRIPT = `(function () {
  var fallback = null;
  try {
    var data = JSON.parse(document.getElementById('moved-data').textContent);
    fallback = data.fallback;
    var option = readChoices()[data.fork];
    location.replace(option && data.options[option] ? data.options[option] : fallback);
  } catch (error) {
    if (fallback) location.replace(fallback);
  }
  function readChoices() {
    var state = fromLocalStorage();
    if (!state) state = fromWindowName();
    return (state && state.choices) || {};
  }
  function fromLocalStorage() {
    try {
      var raw = localStorage.getItem(${JSON.stringify(READER_STATE_KEY)});
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }
  function fromWindowName() {
    try {
      var name = window.name || '';
      return name.indexOf(${JSON.stringify(WINDOW_NAME_PREFIX)}) === 0
        ? JSON.parse(name.slice(${WINDOW_NAME_PREFIX.length}))
        : null;
    } catch (error) {
      return null;
    }
  }
})();`;
