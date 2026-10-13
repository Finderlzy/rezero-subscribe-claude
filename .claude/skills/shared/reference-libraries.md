# 参考库

`agent-skills/`（Addy Osmani）和 `mattpocock/`（Matt Pocock，v1.2.3）是第三方原版副本，只读：不改不删，升级时整体替换。每个主题只认下表的主源，其他条目只在 Skill 明确引用时使用。引用一律写成相对链接：安装器按链接闭包只安装用到的条目。

| 主题 | 主源 |
| --- | --- |
| 需求追问 | [grilling](../mattpocock/grilling/SKILL.md) |
| 术语与 ADR | [domain-modeling](../mattpocock/domain-modeling/SKILL.md) |
| TDD | [tdd](../mattpocock/tdd/SKILL.md) |
| 排错 | [diagnosing-bugs](../mattpocock/diagnosing-bugs/SKILL.md) |
| 模块设计、架构改进 | [codebase-design](../mattpocock/codebase-design/SKILL.md)、[improve-codebase-architecture](../mattpocock/improve-codebase-architecture/SKILL.md) |
| 任务拆分 | [planning-and-task-breakdown](../agent-skills/plan/planning-and-task-breakdown/SKILL.md) |
| 代码评审 | [code-review-and-quality](../agent-skills/review/code-review-and-quality/SKILL.md) 的维度，流程见 task-implement 第 5 步 |

原文与 [开发流程契约](workflow-contract.md) 冲突时以契约为准：
- **调用**：原文要求用 Skill 工具调用或 `/<名称>` 调用某技能时，改为读取同一参考库中的 `<名称>/SKILL.md`。
- **确认关卡**：原文要求等用户确认或挑选的环节（追问收敛、测试接缝、改进候选、假设排序），按契约的“授权与推进”和“需求追问与代决策”处理，不逐项停下。
- **位置**：按契约的权威来源表，`tasks/plan.md`、`tasks/todo.md` 改为 `docs/implementation-plan.md` 和 Issues；写到系统临时目录的报告是本次临时产物。
- **Git**：原文中的提交、PR、Issue 操作按契约的“Git 与合并策略”执行。
