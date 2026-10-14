/**
 * 给站内路径拼上部署根路径 `base`（纯函数）。
 *
 * - 同时适用于根路径 `/` 和子路径 `/sub/` 部署；
 * - 路径部分的重复斜杠会合并，查询参数和锚点原样保留。
 *
 * 页面里用 `withBase()`；构建配置阶段拿不到 `import.meta.env` 的地方（如 M1 的 remark 插件）
 * 用它并显式传入与 `astro.config.mjs` 相同的 base。
 */
export function joinBase(base: string, path: string): string {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const suffix = cut === -1 ? '' : path.slice(cut);
  return `/${base}/${pathname}`.replace(/\/{2,}/g, '/') + suffix;
}

/**
 * 给站内路径拼上部署根路径（`import.meta.env.BASE_URL`，来自 BASE_PATH）。
 * 站内链接一律经由这里生成，不手写以 `/` 开头的绝对路径（架构 §3 M5）。
 */
export function withBase(path: string): string {
  return joinBase(import.meta.env.BASE_URL, path);
}
