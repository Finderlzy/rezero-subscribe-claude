/**
 * 常见问题页的“返回刚才的步骤”（FR-20，架构 §3 M3）：从 `?from=<step-id>` 找回步骤。
 * 1.0.0 的页面脚本已在 #25 删除；#27 把它泛化成 reference-return（按页面标识）后再接上。纯函数，单元测试直接覆盖；只认路线图里已有的步骤标识，其他值一律当作直接打开。
 */
export interface FaqReturn {
  id: string;
  title: string;
}

/** `search` 是 `location.search`；`steps` 是步骤标识 → 标题。 */
export function faqReturn(search: string, steps: Readonly<Record<string, string>>): FaqReturn | null {
  const id = new URLSearchParams(search).get('from');
  if (!id || !Object.hasOwn(steps, id)) return null;
  return { id, title: steps[id]! };
}
