---
name: project-prd
description: 从项目想法或已有文档（含 project-lite 的 brief）出发，用 grilling 式分轮追问澄清需求，按 domain-modeling 把项目术语写入 CONTEXT.md，生成带三级边界和可观察验收的 docs/requirements.md，完成需求立项；已有项目的增量需求也在此原地更新。需求定稿后建议换新会话衔接 project-arch。
---

# 需求立项与 PRD 定稿

流程：讨论需求并整理草稿 → 将术语写入 `CONTEXT.md` → 生成结构化 PRD → 交接给架构阶段。本 Skill 只负责产品和业务需求，技术选型交给 project-arch，实施计划交给 project-plan。

## 输入

- 读取 [开发流程契约](../shared/workflow-contract.md)，写 PRD 之前读取 [规划内容](../shared/planning.md)。
- 目标路径以用户指定的为准；无法确定时先问，避免把文件写进无关的仓库。等待路径期间可以先整理草稿。
- 用户提供的文档（包括 project-lite 的 `docs/brief.md`）直接作为输入：先读，跳过已经覆盖的讨论，只针对影响范围或验收的缺口和冲突提问。文档读不到时说明缺口，不要声称已经读过。
- 已有文档沿用原位置，没有约定时写到 `docs/requirements.md`，不另外复制一份 `PRD.md`。

**已有项目的增量需求**：在原需求文档中原地更新，标注目标版本和变更内容，并写明不能倒退的已有行为。

## 讨论需求

- 按规划内容中“PRD 追问”分轮追问，关键假设没有高风险疑点时收敛。
- 讨论中出现术语冲突或模糊用词时，按 [domain-modeling](../mattpocock/domain-modeling/SKILL.md) 当场澄清并更新 `CONTEXT.md`；满足 ADR 门槛的决策写入 `docs/adr/`。
- 讨论结果持续整理进草稿，区分四类内容：用户明确要求、授权后选定的方案、假设、待决策项。非阻塞的细节标为待定，继续推进。
- 需求文档的篇幅与项目规模相称，要能回答四个问题：做什么、为谁做、首期做到什么程度、怎样验收。

## 写入术语

讨论收敛后、PRD 定稿前，核对已经确定的术语都已写入 `CONTEXT.md`，格式按规划内容中“项目术语”一节。即使跳过了访谈，也要做这一步。还没确定的含义留在需求的待决策项里，不写成正式定义。

## 生成 PRD

- 综合全部讨论和纠正，按规划内容中“PRD 成文”的结构和定稿检查来写。不能只依据最后一轮回答，也不能按聊天顺序拼接。
- 必须包含三级边界（Always / Ask first / Never）。存在多个独立模块时，按 [spec-driven-development](../agent-skills/define/spec-driven-development/SKILL.md) 画出能力地图。
- 用 `CONTEXT.md` 中的术语和稳定的需求标识组织规则和验收。
- 关键问题还没解决时，交付草稿，并单独列出这些问题的影响，不要声称需求已经没有歧义。不为整份文档额外设置强制批准环节。

## 交付

1. 核对 `CONTEXT.md` 与 PRD 是否一致、链接是否有效、三级边界是否完整，然后列出文档链接。
2. 执行 [task-closeout](../task-closeout/SKILL.md)，提交文档改动。
3. 建议用户开一个新会话进入架构阶段，并提供下面这句话：
   > 在 `<项目路径>` 执行 `project-arch`，基于已落盘的 `CONTEXT.md` 和 `docs/requirements.md` 推进系统架构与工程初始化。

   如果用户要求在当前会话继续，直接衔接 [project-arch](../project-arch/SKILL.md)。
