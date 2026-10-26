import type { GeneratedSkill, SkillProblem } from './generate';
import { SKILL_DIR } from './index';

/**
 * 生成物对照（架构 §16.4 第 2 步，FR-113 第 1、2 条，AC-41）：重新生成的期望文件和入库的文件逐字比较。
 * 少文件、多文件、内容不同各报一条，每条指出生成物的路径；内容不同时再指出源文件和第一处不同的行。
 * `actual` 的键是相对生成物目录的路径（`readSkillDir()` 的输出）。
 */
export function diffSkill(expected: GeneratedSkill, actual: ReadonlyMap<string, string>, dir: string = SKILL_DIR): SkillProblem[] {
  const problems: SkillProblem[] = [];
  const keys = [...new Set([...expected.files.keys(), ...actual.keys()])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const key of keys) {
    const want = expected.files.get(key);
    const have = actual.get(key);
    const file = `${dir}/${key}`;
    const source = expected.sources.get(key);
    if (have === undefined) {
      problems.push({ file, message: `缺少这个文件（由 ${source} 生成），运行 npm run skill 重新生成` });
    } else if (want === undefined) {
      problems.push({ file, message: '生成结果里没有这个文件，运行 npm run skill 重新生成（会删掉它）' });
    } else if (want !== have) {
      problems.push({ file, line: firstDifferentLine(want, have), message: `和 ${source} 对不上，运行 npm run skill 重新生成` });
    }
  }
  return problems;
}

/** 第一处不同的行号（1 起） */
function firstDifferentLine(a: string, b: string): number {
  const left = a.split('\n');
  const right = b.split('\n');
  let i = 0;
  while (i < left.length && i < right.length && left[i] === right[i]) i += 1;
  return i + 1;
}
