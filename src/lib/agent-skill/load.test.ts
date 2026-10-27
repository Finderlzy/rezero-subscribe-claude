import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diffSkill } from './diff';
import { SKILL_DIR } from './index';
import { verifySkill } from './integration';
import { generateFromRepo, readSkillDir } from './load';

// 真实仓库：从 docs/v3-rewrite/ 重新生成一遍，和入库的 agent-skill/rezero-subscribe-claude/ 一致（ADR-0007）。
// 这里失败说明改了重写稿、agent-skill/source/、group.ts 或版本号之后没有运行 npm run skill。
const repoRoot = join(import.meta.dirname, '../../..');

describe('真实仓库的订阅 Skill', () => {
  const generated = generateFromRepo(repoRoot);

  it('重跑两次输出相同', () => {
    expect([...generateFromRepo(repoRoot).files]).toEqual([...generated.files]);
  });

  it('11 页 + IP 质量实测合集各一个参考文件，加 SKILL.md', () => {
    expect([...generated.files.keys()].filter((key) => key.startsWith('references/') && !key.startsWith('references/agent-'))).toEqual([
      'references/afterword.md',
      'references/android-prepare.md',
      'references/android-subscription.md',
      'references/client-desktop.md',
      'references/ip-tests.md',
      'references/iphone-prepare.md',
      'references/iphone-subscription.md',
      'references/maintenance.md',
      'references/overview.md',
      'references/plan1.md',
      'references/plan2-residential-server.md',
      'references/preface.md',
    ]);
    expect(generated.files.has('SKILL.md')).toBe(true);
  });

  it('和入库的生成物一致（不一致就运行 npm run skill）', () => {
    expect(diffSkill(generated, readSkillDir(join(repoRoot, SKILL_DIR)))).toEqual([]);
    expect(verifySkill(repoRoot)).toEqual([]);
  });

  it('生成物里没有 Obsidian 双链和嵌入', () => {
    for (const [file, text] of generated.files) {
      // 围栏代码块里的原文不转换（FR-101），这里只看代码块以外
      const prose = text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
      expect(prose, file).not.toMatch(/!?\[\[/);
    }
  });

  it('一键脚本的命令和重写稿逐字相同', () => {
    const command = 'bash <(curl -fsSL https://raw.githubusercontent.com/Finderlzy/reality-setup/v2.0.4/setup.sh)';
    expect(generated.files.get('references/plan2-residential-server.md')).toContain(`\`\`\`bash\n${command}\n\`\`\``);
  });
});
