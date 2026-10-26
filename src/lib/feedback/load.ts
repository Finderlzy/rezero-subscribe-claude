import type { ImageMetadata } from 'astro';
import { parseDocument } from 'yaml';
import feedbackText from '../../content/feedback.yaml?raw';
import { formatFeedbackProblems, parseFeedback, type FeedbackEntry } from './index';

/** 构建时把截图交给 astro:assets 处理（出 webp、写宽高）；键是文件名 */
const imageModules = import.meta.glob<{ default: ImageMetadata }>('../../assets/feedback/*.{png,jpg,jpeg,webp}', { eager: true });

/** 校验通过、并且已经拿到图片元数据的一张截图 */
export interface ResolvedFeedbackEntry extends FeedbackEntry {
  src: ImageMetadata;
}

/**
 * 构建期读取 feedback.yaml 并校验（M9、FR-124、FR-125；和 update-log 的 load.ts 同一套做法）。
 * YAML 写法错误、字段写错、截图不存在或没登记都抛出带“第几条”的报错，构建直接失败。
 */
export function loadFeedback(): ResolvedFeedbackEntry[] {
  const doc = parseDocument(feedbackText, { prettyErrors: true });
  const [first] = doc.errors;
  if (first) {
    const line = first.linePos?.[0].line;
    throw new Error(`src/content/feedback.yaml${line ? ` 第 ${line} 行` : ''}：YAML 写法有误：${first.message}`);
  }
  const byName = new Map(Object.entries(imageModules).map(([path, module]) => [path.slice(path.lastIndexOf('/') + 1), module.default]));
  const { entries, problems } = parseFeedback(doc.toJS(), [...byName.keys()].sort());
  if (problems.length > 0) {
    throw new Error(`读者反馈校验失败，共 ${problems.length} 处：\n${formatFeedbackProblems(problems).join('\n')}`);
  }
  return entries.map((entry) => ({ ...entry, src: byName.get(entry.image)! }));
}
