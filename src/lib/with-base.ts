/**
 * 给站内路径拼上部署根路径（`import.meta.env.BASE_URL`，来自 BASE_PATH）。
 * 站内链接一律经由这里生成，不手写以 `/` 开头的绝对路径（架构 §3 M5）。
 *
 * - 同时适用于根路径 `/` 和子路径 `/sub/` 部署；
 * - 路径部分的重复斜杠会合并，查询参数和锚点原样保留。
 */
export function withBase(path: string): string {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const suffix = cut === -1 ? '' : path.slice(cut);
  const base = import.meta.env.BASE_URL;
  return `/${base}/${pathname}`.replace(/\/{2,}/g, '/') + suffix;
}
