import { parseDocument } from 'yaml';
import updateLogText from '../../content/update-log.yaml?raw';
import {
  formatUpdateLogProblems,
  parseUpdateLog,
  resolveEntryPages,
  type ResolvedUpdateEntry,
  type UpdateLogProblem,
} from './index';

/**
 * 构建期读取 update-log.yaml 并校验（M7、FR-85、FR-86）。
 * YAML 语法错误、字段写错、page 指向不存在的页面都抛出带“第几条”的报错，构建直接失败；
 * 不在这里排序——分类和排序是 update-log/index.ts 的纯函数。
 *
 * `pageTitles` 由 loadSite() 从路线图取出（页面标识 → 标题），所以这个函数要等路线图编译完再调用。
 */
export function loadUpdateLog(pageTitles: ReadonlyMap<string, string>, today: string): ResolvedUpdateEntry[] {
  const problems: UpdateLogProblem[] = [];
  const doc = parseDocument(updateLogText, { prettyErrors: true });
  const [first] = doc.errors;
  if (first) {
    const line = first.linePos?.[0].line;
    throw new Error(`src/content/update-log.yaml${line ? ` 第 ${line} 行` : ''}：YAML 写法有误：${first.message}`);
  }
  const parsed = parseUpdateLog(doc.toJS(), today);
  problems.push(...parsed.problems);
  const { resolved, problems: pageProblems } = resolveEntryPages(parsed.entries, pageTitles);
  problems.push(...pageProblems);
  if (problems.length > 0) {
    throw new Error(`更新日志校验失败，共 ${problems.length} 处：\n${formatUpdateLogProblems(problems).join('\n')}`);
  }
  return resolved;
}
