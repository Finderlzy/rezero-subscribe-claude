import { READER_STATE_KEY } from './reader-store';

/**
 * 步骤页 `<head>` 里的内联脚本（架构 §5“视图”）：在首次绘制前按本机保存的视图偏好设置
 * `<html data-view="operation|principle">`，原理视图的读者不会先看到操作版正文再换掉（ADR-0004）。
 *
 * 内联脚本不能导入模块，这里只按 M4 的格式取 `view` 一个字段；其余校验仍由 M4 负责。
 * 存储不可用、值不是 JSON、`view` 不合法时一律用操作视图（FR-30 默认值，AC-18）。
 * 没有 JS 时不会有 `data-view`，CSS 按操作视图显示，并隐藏切换控件（design §5）。
 */
export const VIEW_BOOT_SCRIPT = `try{document.documentElement.dataset.view=JSON.parse(localStorage.getItem(${JSON.stringify(
  READER_STATE_KEY,
)})).view==="principle"?"principle":"operation"}catch(e){document.documentElement.dataset.view="operation"}`;
