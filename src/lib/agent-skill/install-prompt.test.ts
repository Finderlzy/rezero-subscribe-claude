import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AGENT_SKILL_ZIP_PATH, SKILL_NAME, SKILL_SITE } from './index';
import { AGENT_INSTALL_DIR, AGENT_INSTALL_PROMPT } from './install-prompt';

describe('AGENT_INSTALL_PROMPT', () => {
  it('写清下载地址、项目级目录和开始步骤', () => {
    expect(AGENT_INSTALL_PROMPT).toContain(`${SKILL_SITE}${AGENT_SKILL_ZIP_PATH}`);
    expect(AGENT_INSTALL_PROMPT).toContain(`.agents/skills/${SKILL_NAME}/`);
    expect(AGENT_INSTALL_PROMPT).toContain('不要写 ~/.agents、~/.claude、~/.config/opencode 这些全局目录');
    expect(AGENT_INSTALL_PROMPT).toContain(`${AGENT_INSTALL_DIR}/SKILL.md`);
  });

  it('README 里放的是同一段纯文本提示词', () => {
    const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
    // 连 ```text 围栏一起比：读者复制到的必须是一整段纯文本，不能只是正文里恰好出现同样的句子
    expect(readme).toContain(`\`\`\`text\n${AGENT_INSTALL_PROMPT}\n\`\`\``);
  });
});
