import { AGENT_SKILL_ZIP_PATH, SKILL_NAME, SKILL_SITE } from './index';

/**
 * 给读者的安装提示词（design §4.10）：复制给 Claude Code 以外的 Agent，让它自己下载到项目目录并开始。
 *
 * 这段文字同时用在 Skill 页和 README：改这里要两处一起改，install-prompt.test.ts 会核对 README 里放的是同一段。
 *
 * 放的位置是这次选定的项目级 `.agents/skills/`（不是 `~/.agents` 这类全局目录）；调研（§5.2）只核实过用户级
 * 目录，这里不依赖各 Agent 的自动发现规则——提示词最后一步直接让 Agent 读 SKILL.md 开始。
 * 下载地址用正式域名，和生成物里的网址一致（ADR-0007 第 4 条）。
 */
export const AGENT_INSTALL_DIR = `.agents/skills/${SKILL_NAME}`;

export const AGENT_INSTALL_PROMPT = [
  '我是《Re:从零开始订阅 claude》的读者。请帮我装好这个教程的 Skill，然后开始：',
  '',
  `1. 下载 ${SKILL_SITE}${AGENT_SKILL_ZIP_PATH}`,
  `2. 解压到当前工作目录下的 .agents/skills/，得到 ${AGENT_INSTALL_DIR}/；`,
  '   不要写 ~/.agents、~/.claude、~/.config/opencode 这些全局目录，已有同名目录就先问我。',
  `3. 读 ${AGENT_INSTALL_DIR}/SKILL.md，按它的开场流程开始，带我订阅 Claude。`,
].join('\n');
