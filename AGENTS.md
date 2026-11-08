# 仓库指南

「Re:从零开始订阅 claude」：把《如何订阅claude》做成分步引导的静态网站。正式站 <https://re0claude.us.ci/>。

## 文档入口

| 触发 | 读 |
| --- | --- |
| 任何任务 | [CONTEXT.md](CONTEXT.md)：术语，命名和文案用这里的词 |
| 判断做不做、怎么验收 | [docs/requirements.md](docs/requirements.md) |
| 改代码、目录、内容、命令 | [docs/agents/project.md](docs/agents/project.md) |
| 改页面或样式 | [docs/design.md](docs/design.md) |
| 看交付状态、未解决项 | [docs/delivery.md](docs/delivery.md) |

结构、接口、目录的权威长文是 [docs/architecture.md](docs/architecture.md)；决策记录在 `docs/adr/`。

## 工作方式

- **选方案**：需要作者在几个方案里挑时，默认推荐方案二（第二个选项），标“推荐 / (Recommended)”；选项按自然顺序排，不为了强调推荐把它挪到第一位。
- **测试**：只跑与改动相称的测试，通过后不重复。不为可逆、低影响或只复述实现的改动写测试。
- **收尾**：删除本次产生的临时文件。

## 改内容

**正文不手改。** 改 `docs/v3-rewrite/` 的重写稿，再依次运行 `node scripts/import-rewrite.mjs` 和 `npm run skill`。`src/content/` 里作者手写的登记表、素材位置、标识和旧网址的规矩见 [docs/agents/project.md](docs/agents/project.md)。

## 测试指南

- 内容出错时，构建必须失败。**不许放宽校验或删断言来让检查通过。**
- 验收基线：改了内容、路线或校验逻辑，要按 AC 跑对应用例。

## 安全

不提交凭据、真实服务器 IP、节点链接、面板账号；截图入库前先打码。

## 更新日志

里程碑用 `/closeout` 收尾时（不走里程碑的单个开发任务在提交前），往 `src/content/update-log.yaml` 的最上面写一条：

- 只写读者关心的事：正文改了哪一节、加了什么、站点新增或修好了什么。内部重构、补测试、改注释、依赖升级不写。
- 一次交付写一条，读者能感知到几件事就写几条。
- 类型选 `content`（正文）或 `site`（网站本身），需要提醒读者的用 `notice`；挂了页面就写 `page`。
- 不补写历史：已有的条目只由作者改或删。

**不修改 `.claude/skills/` 里的 Skill**：这类约定写在 `AGENTS.md` 里，Skill 是第三方/通用副本，保持原样。

## 提交

提交信息用中文祈使句，概括本次改动。

## Agent skills

研发流程用 matt 套件（`.claude/skills/`）：每个项目一次 `/wayfinder` 画地图，每个里程碑 `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` ×N → `/closeout` → `/retro`；按需 `/arch`、`/research`、`/prototype`。

## 规则来源

- 本仓库的规则以本文件为准。`CLAUDE.md` 只作入口，不复制正文，也不新增 `agent.md`、`AGENT.md` 这类同类文件。
- 通用行为约定来自作者的全局规则 `/run/media/finderzly/E/WorkSpace/Tools/AGENTS.md`；本文件不重复它，只写本仓库特有的约定。

<!-- 维护说明（不进入 Claude 的上下文）：这里只放每次会话都会用、且 Claude 推不出的规则。
多步流程、单模块规矩、能从代码查到的内容都不放；长内容放 docs/agents/project.md。 -->
