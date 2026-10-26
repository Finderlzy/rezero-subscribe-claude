# 订阅 Skill 由重写稿生成、生成物入库，构建时重新生成并逐字核对

- 状态：accepted（2026-10-26，架构 v3.2，[architecture.md §16](../architecture.md#16-v32-增量架构m8-订阅-skill2026-10-26)）
- 相关：[ADR-0005](0005-import-rewrite-verbatim.md)（正文原样导入）、[ADR-0002](0002-url-scheme.md)（发布后网址不能改）

订阅 Skill（需求 FR-100–FR-117）要同时满足：参考文件从重写稿生成、不手改（FR-101）；仓库里有现成的目录，clone 后就能用（FR-114）；重写稿改了没重新生成时构建失败（FR-113、AC-41）；站点上有 zip 下载（FR-114）。我们决定：

1. **手写和生成分开**。`agent-skill/source/` 是手写的 `SKILL.md` 模板和 Agent 方法文件；`agent-skill/rezero-subscribe-claude/` 是生成物，由 `npm run skill`（`scripts/build-skill.mjs`）写出。
2. **生成物入库**。目录名就是 Skill 名，读者 clone 后整个复制走就能用；评审时也能直接看到 Agent 会读到的每一个字——这些文字会指导别人的 Agent 在读者电脑和服务器上执行命令，必须能在 diff 里审。
3. **构建时重新生成一遍，和入库的逐字比较**，不一致就失败并提示运行 `npm run skill`；再对入库的文件按 FR-113 逐条校验；最后把入库的目录打成 `dist/agent-skill/rezero-subscribe-claude.zip`。生成逻辑放在 `src/lib/agent-skill/`，和站点共用链接索引与路线图；开发脚本通过 Vite 的 `runnerImport` 加载它，不另写一份 JS 版。
4. **生成物里的网址固定用正式域名**，不随 `SITE_URL`、`BASE_PATH` 变化，保证不同方式构建出的生成物一样。
5. `/agent-skill/` 和 `/agent-skill/rezero-subscribe-claude.zip` 发布后不能改。

## Considered Options

- **不入库、只在构建时生成**：没有“忘了重新生成”的问题，也不用在升版本后多跑一条命令；但仓库里没有能直接用的目录（FR-114），读者要先装 Node 跑构建，评审时也看不到 Agent 将读到的内容。
- **构建时生成并直接写回仓库**：构建会改源码目录，CI 里的产物和仓库不一致时没人发现。
- **生成器写成独立的 `.mjs`（像 `import-rewrite.mjs`）**：要把标题解析、锚点算法、路线图展开再实现一遍，两份逻辑迟早不一致。
- **`SKILL.md` 整个手写、不走模板**：版本号、重写稿指纹、路线表都要手动同步，正是 FR-113 想防的错。

## Consequences

- 改重写稿、改 `agent-skill/source/`、改 `src/lib/group.ts`、**升版本**之后都要运行 `npm run skill` 并一起提交，否则 `npm run check` 失败。这条写进 `AGENTS.md`。
- 重写稿和站点正文之间“改了没导入”的问题不归这里管（仍由 `import-rewrite.mjs` 和人工负责）；订阅 Skill 直接读重写稿，所以它总是跟重写稿一致，可能比站点正文新一步。
- 生成物是确定的；zip 按路径排序、固定修改时间，同样的内容得到同样的 zip。
- 构建级用例的夹具需要能覆盖仓库根下的文件和删除文件（`@root/`、`@delete`，architecture §16.4）。
