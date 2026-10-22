import { parseDocument } from 'yaml';

/**
 * 解析 `route.yaml` 的文本（架构 §3 M2、§13）。纯函数，不依赖 `astro:content`：
 * 构建配置 `astro.config.mjs` 为了 sitemap 过滤也要读一遍跳转表，和 `site.ts` 共用这一份解析。
 *
 * YAML 语法错误时报出文件和行号；形状交给 M2 的 `buildRouteMap` 校验。
 */
export function parseRouteYaml(text: string): unknown {
  const doc = parseDocument(text, { prettyErrors: true });
  const [first] = doc.errors;
  if (first) {
    const line = first.linePos?.[0].line;
    throw new Error(`route.yaml${line ? ` 第 ${line} 行` : ''}：YAML 写法有误：${first.message}`);
  }
  return doc.toJS();
}
