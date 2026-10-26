import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { checkSkill } from './check';
import { diffSkill } from './diff';
import { formatSkillProblem, type SkillProblem } from './generate';
import { AGENT_SKILL_ZIP_PATH, SKILL_DIR } from './index';
import { generateFromRepo, readSkillDir } from './load';
import { zipSkill } from './zip';

export interface AgentSkillOptions {
  /** 仓库根目录（绝对路径） */
  repoRoot: string;
}

/**
 * 构建开始时的校验（架构 §16.4 第 1–3 步，FR-113，AC-41、AC-42）：
 * 先重新生成一遍和入库的生成物逐字对照，再对入库的文件查一遍规则。
 * 返回逐条的“文件：说明”，空数组表示通过。
 */
export function verifySkill(repoRoot: string): string[] {
  let problems: SkillProblem[];
  try {
    const expected = generateFromRepo(repoRoot);
    const actual = readSkillDir(join(repoRoot, SKILL_DIR));
    problems = [...diffSkill(expected, actual), ...checkSkill(actual)];
  } catch (error) {
    const listed = (error as { problems?: readonly SkillProblem[] }).problems;
    if (listed !== undefined) return listed.map(formatSkillProblem);
    // 路线图、链接索引这些输入本身有错（如 RouteValidationError）：message 已是逐行的“文件：说明”
    return (error as Error).message.split('\n');
  }
  return problems.map(formatSkillProblem);
}

export function agentSkill({ repoRoot }: AgentSkillOptions): AstroIntegration {
  return {
    name: 'rezero:agent-skill',
    hooks: {
      'astro:build:start': ({ logger }) => {
        const lines = verifySkill(repoRoot);
        if (lines.length === 0) return;
        for (const line of lines) logger.error(line);
        throw new Error(`订阅 Skill 校验失败，共 ${lines.length} 处，见上方 [rezero:agent-skill] 的逐条输出`);
      },
      // 构建结束时把入库的生成物打成 zip，随站点发布（架构 §16.4，FR-114）
      'astro:build:done': ({ logger, dir }) => {
        const out = join(dir instanceof URL ? fileURLToPath(dir) : dir, AGENT_SKILL_ZIP_PATH);
        mkdirSync(join(out, '..'), { recursive: true });
        const zip = zipSkill(join(repoRoot, SKILL_DIR));
        writeFileSync(out, zip);
        logger.info(`订阅 Skill 已打包：${AGENT_SKILL_ZIP_PATH}（${zip.length} 字节）`);
      },
    },
  };
}
