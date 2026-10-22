/**
 * 步骤页 `<head>` 里的内联脚本（架构 §3 M3“视图”）：在首次绘制前设置 `<html data-view="principle">`。
 *
 * 用户 2026-10-22 决定去掉“操作｜原理”视图切换，页面固定原理视图（ADR-0004 的切换机制暂停使用，
 * 内容集合里的操作版数据暂不删）。所以这里不再读本机保存的视图偏好，一律写 principle；
 * route-enhance、toc 的视图也固定为 principle，不读这个属性。它现在只表示“页面脚本会运行”：PageLayout 按它先隐藏
 * 构建时的眉题步数，等 route-enhance 重算完再露出。没有 JS 时没有 `data-view`，页面同样是原理版。
 */
export const VIEW_BOOT_SCRIPT = `document.documentElement.dataset.view="principle"`;
