import { buildRouteMap } from './route-map';
import type { PageMeta, RouteMap } from './types';

/**
 * 构建期装配（架构 §3 M3、§16.11 R1）：把原理版条目映射成 M2 的输入并编译。
 * 纯函数，不依赖 `astro:content`：站点（`src/lib/site.ts`）从内容集合传入条目，
 * 订阅 Skill 的生成器（M8，`src/lib/agent-skill/`）从磁盘读出同样形状的条目传入。
 */

/** 一条原理版正文：只取装配需要的字段，单元测试可以直接传普通对象。 */
export interface PrincipleEntry {
  id: string;
  body?: string | undefined;
  data: {
    principleOnly: boolean;
    skippable: boolean;
    skipLabel?: string | undefined;
    options?: Record<string, { title: string }> | undefined;
  };
}

/**
 * 页面标题：正文第一个非空行的 `# 标题`（架构 §3 M1）。缺标题由构建开始时的内容校验（checkPages）报错，
 * 这里只在绕过那一层时兜底。
 */
export function pageTitle(body: string | undefined, file: string): string {
  const first = (body ?? '').split('\n').find((line) => line.trim() !== '');
  const match = first === undefined ? null : /^# +(.+?)[ \t]*$/.exec(first);
  if (!match) throw new Error(`${file}：缺少第一行标题“# 页面标题”`);
  return match[1]!;
}

/**
 * 把原理版条目映射成 M2 的输入并编译。路线图有错时抛出 `RouteValidationError`（第三层校验，FR-61），
 * 它的 message 每行一条“文件：说明”，构建输出里直接可读。
 */
export function assembleRoute(spec: unknown, entries: readonly PrincipleEntry[]): RouteMap {
  const pages: PageMeta[] = entries.map(({ id, body, data }) => ({
    id,
    title: pageTitle(body, `src/content/principle/${id}.md`),
    principleOnly: data.principleOnly,
    skippable: data.skippable,
    ...(data.skipLabel !== undefined && { skipLabel: data.skipLabel }),
    // 对象键按书写顺序；选项标识以字母开头，不会被 JS 按整数键重排（schemas.ts ID_PATTERN）。
    ...(data.options !== undefined && { options: Object.entries(data.options).map(([option, { title }]) => ({ id: option, title })) }),
  }));
  return buildRouteMap(spec, pages);
}
