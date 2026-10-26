import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import { diffSkill } from './diff';
import { formatSkillProblem, type SkillProblem } from './generate';
import { SKILL_DIR } from './index';
import { generateFromRepo, readSkillDir } from './load';

export interface AgentSkillOptions {
  /** 仓库根目录（绝对路径） */
  repoRoot: string;
}

/**
 * 构建开始时重新生成订阅 Skill，和入库的生成物逐字对照（架构 §16.4，FR-113 第 1、2 条，AC-41）。
 * 生成失败或对不上，都逐条打印“文件：说明”，再抛一个总结错误终止构建（和 contentValidation 同样的报错方式）。
 */
export function verifySkill(repoRoot: string): string[] {
  let problems: SkillProblem[];
  try {
    const expected = generateFromRepo(repoRoot);
    problems = diffSkill(expected, readSkillDir(join(repoRoot, SKILL_DIR)));
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
    },
  };
}
