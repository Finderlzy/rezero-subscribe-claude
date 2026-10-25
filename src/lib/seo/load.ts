import { parseDocument } from 'yaml';
import seoText from '../../content/seo.yaml?raw';
import { formatSeoProblems, parseSeo, type SeoEntry } from './index';

/**
 * 构建期读取 seo.yaml 并校验（和 update-log 的 load.ts 同一套做法）。
 * YAML 写法错误、字段写错、长度不合规、少写或多写页面都抛出带页面键的报错，构建直接失败。
 *
 * `pageKeys` 由 loadSite() 从路线图和参考页取出，所以这个函数要等它们都读出来再调用。
 */
export function loadSeo(pageKeys: readonly string[]): Map<string, SeoEntry> {
  const doc = parseDocument(seoText, { prettyErrors: true });
  const [first] = doc.errors;
  if (first) {
    const line = first.linePos?.[0].line;
    throw new Error(`src/content/seo.yaml${line ? ` 第 ${line} 行` : ''}：YAML 写法有误：${first.message}`);
  }
  const { entries, problems } = parseSeo(doc.toJS(), pageKeys);
  if (problems.length > 0) {
    throw new Error(`页面摘要校验失败，共 ${problems.length} 处：\n${formatSeoProblems(problems).join('\n')}`);
  }
  return new Map(entries.map((entry) => [entry.key, entry]));
}
