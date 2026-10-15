import { READER_STATE_KEY, WINDOW_NAME_PREFIX } from './reader-store';

/**
 * 步骤页 `<head>` 里的内联脚本（架构 §3 M3“视图”）：在首次绘制前按本机保存的视图偏好设置
 * `<html data-view="operation|principle">`，原理视图的读者不会先看到操作版正文再换掉（ADR-0004）。
 *
 * 内联脚本不能导入模块，这里按 M4 的格式和兜底顺序只取 `view` 一个字段：localStorage 可用就只看它，
 * 访问或读取抛异常（禁用存储）时看 `window.name` 里本站写的值；其余校验仍由 M4 负责。
 * 取不到、值不是 JSON、`view` 不合法时一律用操作视图（FR-30 默认值，AC-18）。
 * 没有 JS 时不会有 `data-view`，CSS 按操作视图显示，并隐藏切换控件（design §5）。
 */
const KEY = JSON.stringify(READER_STATE_KEY);
const PREFIX = JSON.stringify(WINDOW_NAME_PREFIX);

export const VIEW_BOOT_SCRIPT =
  `(function(){var r=null,v="operation";` +
  `try{r=localStorage.getItem(${KEY})}catch(e){try{var n=window.name;r=n.indexOf(${PREFIX})===0?n.slice(${PREFIX}.length):null}catch(e){}}` +
  `try{if(JSON.parse(r).view==="principle")v="principle"}catch(e){}` +
  `document.documentElement.dataset.view=v})()`;
