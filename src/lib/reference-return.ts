/**
 * 参考页（常见问题、IP 质量实测合集、各篇实测）的“返回刚才的步骤”（FR-20，架构 §3 M3）：从 `?from=<page-id>` 找回页面。
 * 步骤链到参考页的双链由 M1 自动带上 `?from=`。纯函数，单元测试直接覆盖；只认路线图里已有的页面标识
 * （步骤、选择页、旁支页共用一个标识空间），其他值一律当作直接打开。
 */
export interface ReferenceReturn {
  id: string;
  title: string;
}

/** `search` 是 `location.search`；`pages` 是页面标识 → 标题。 */
export function referenceReturn(search: string, pages: Readonly<Record<string, string>>): ReferenceReturn | null {
  const id = new URLSearchParams(search).get('from');
  if (!id || !Object.hasOwn(pages, id)) return null;
  return { id, title: pages[id]! };
}
