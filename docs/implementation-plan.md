# 实施计划：Re:从零开始订阅 claude

- 状态：**v2.0 计划（2026-10-15）**，对应需求 v0.3、[架构 v2.0](architecture.md)（含 [§11.3 v2.0 实施前评审](architecture.md#113-v20-实施前评审2026-10-15)）、[设计 v2.0](design.md)，目标站点版本 2.0.0。1.0.0 的计划保留在文末，任务已全部关闭（#16 见下文）。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，v2.0 的标题以 `[v2.0]` 开头（2026-10-15 发布，#23–#31；V 编号与 Issue 的对应见 §3）。**任务范围、状态和完成证据以 Issue 为准**，本文只保留里程碑、顺序和链接。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。

> **首个可开工任务：[#23 [v2.0] 把重写稿导入 v2 内容集合](https://github.com/Finderlzy/rezero-subscribe-claude/issues/23)**（V01，建议档位：强）。新开会话，用 `task-implement` 指定 #23。**[#24 logo](https://github.com/Finderlzy/rezero-subscribe-claude/issues/24)（V07，强）也可以立即并行开工**（改动范围基本不重叠）。

## 1. 里程碑（v2.0）

| 里程碑 | 交付的可用能力 | 覆盖需求 | 任务 |
| --- | --- | --- | --- |
| **MS5 v2 静态骨架** | 重写稿全部 50 页导入；站点换成 v2 路线图和 URL，不运行 JS 也能从首页走到后记；两版正文都在页面里（固定操作视图）；1.0.0 的页面、内容和过时的测试删干净 | FR-01–04、FR-10、FR-11、FR-13、FR-17、FR-19（静态）、FR-21、FR-41、FR-60、FR-61；AC-07、08、09、12、14、15、17、18（找不到页） | V01、V02 |
| **MS6 v2 交互** | 按本机选择和视图改写导航；整页视图切换；选择页选项块；目录与首页；参考页返回；迁移核对 | FR-12、FR-14–16、FR-18、FR-20、FR-30、FR-31、FR-50；AC-01–06、10、11、13、18、19 | V03–V06、V09 |
| **MS7 v2 视觉与 logo** | logo 和 favicon；全部页面按设计 v2.0 重做 | FR-70、FR-71、NFR-01、NFR-06；AC-16、20、21 | V07、V08 |

全部完成后交给 project-delivery 做 2.0.0 整体验收（AC-01–21），版本号在那时定为 `2.0.0`。

## 2. 依赖与顺序（v2.0）

```
V01 ── V02 ──┬── V03 ──┬── V04 ──┐
             │         └── V05 ──┤
             ├── V06 ────────────┼── V08
             └── V09             │
V07（可立即开工）─────────────────┘
```

- **立即可开工**：V01、V07。两者并行时各用独立 worktree；都会改 `package.json` / `.gitignore`，后合并的一方解决冲突。
- V01 是 expand（新集合与 1.0.0 内容并存，1.0.0 站点照常构建），V02 是 contract（换路线和页面，删掉 1.0.0 的内容、页面和测试）。之后 `main` 上只有 v2。
- V02 之后可以并行：V03、V06、V09。V04、V05 都改 `route-enhance` 周边，排在 V03 之后，二者之间按“先合并的先来”，后者变基。
- V08 最后做：要等页面结构（V03–V06）和 logo（V07）都定型。

## 3. 任务索引（v2.0）

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 细化 | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| V01 | 把重写稿导入 v2 内容集合 | MS5 | 无 | 强 | 已细化 | [#23](https://github.com/Finderlzy/rezero-subscribe-claude/issues/23) |
| V02 | 切换到 v2 路线图和静态页面 | MS5 | V01 | 强 | 已细化 | [#25](https://github.com/Finderlzy/rezero-subscribe-claude/issues/25) |
| V03 | 按本机选择和视图改写导航 | MS6 | V02 | 强 | 待细化 | [#26](https://github.com/Finderlzy/rezero-subscribe-claude/issues/26) |
| V04 | 实现选择页的选项块 | MS6 | V03 | 标准 | 待细化 | [#29](https://github.com/Finderlzy/rezero-subscribe-claude/issues/29) |
| V05 | 实现目录与首页 | MS6 | V03 | 标准 | 待细化 | [#30](https://github.com/Finderlzy/rezero-subscribe-claude/issues/30) |
| V06 | 实现旁支页和参考页的返回 | MS6 | V02 | 标准 | 待细化 | [#27](https://github.com/Finderlzy/rezero-subscribe-claude/issues/27) |
| V07 | 制作 logo 和 favicon | MS7 | 无 | 强 | 已细化 | [#24](https://github.com/Finderlzy/rezero-subscribe-claude/issues/24) |
| V08 | 按设计 v2.0 重做全站视觉 | MS7 | V04、V05、V06、V07 | 标准 | 待细化 | [#31](https://github.com/Finderlzy/rezero-subscribe-claude/issues/31) |
| V09 | 对照重写稿完成迁移核对 | MS6 | V02 | 标准 | 待细化 | [#28](https://github.com/Finderlzy/rezero-subscribe-claude/issues/28) |

## 4. 检查点（v2.0）

**MS5 结束（V01、V02 合并后）**
- [ ] `npm run check`、`npm run test:e2e` 通过
- [ ] 关掉 JS，在 360 和 1280 宽下从首页点到后记（选方案三、iPhone），没有断链
- [ ] 新入库的截图已逐张核对打码；`docs/rewrite/附件/` 没有进仓库
- [ ] 回看本计划：MS6 任务的拆分和档位是否仍然合适

**MS6 结束**
- [ ] AC-01–06、08–13、18、19 都有 e2e 或写明的人工核对记录
- [ ] 构建输出的内容提示（操作版缺失、作者待补、博客链接待填）与作者确认一致

**全部完成**：AC-01–21 都有证据，交给 project-delivery。

## 5. 风险（v2.0）

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 重写稿引用的 `截图 2026-10-15 13-43-53 1.png` 不存在（需求 Q-13） | V01 导入后构建失败 | 已解决：#23 按作者选定从原图裁剪入库 |
| 作者导入期间继续改重写稿 | 内容和路线图对不上 | 导入脚本可重复运行；新页面、删页面只报告，由作者决定 |
| logo 风格作者不认可 | V08 的主色和页眉要返工 | V07 先出 logo 并取得作者确认，V08 排在最后；`--accent` 跟 logo 的“Re”紫走 |
| V02 改动面大（M2 + 全部页面 + 删旧代码） | 一次做不完、`main` 不绿 | V02 只做静态版，浏览器脚本整体留给 V03/V05，参照 `v1.0.0` 标签里的旧实现 |
| 本机存储禁用时选择丢失导致绕圈（评审 V11） | AC-18 | V03 实现 M4 的 `window.name` 兜底 |

## 6. 待决事项（不阻塞）

需求 Q-01（部署位置）、Q-07（联系方式）、Q-11（博客地址，#23 已解决）、Q-13（缺失截图，#23 已解决）。1.0.0 的 [#16 完成迁移核对](https://github.com/Finderlzy/rezero-subscribe-claude/issues/16) 核对的是旧文章，已被 V09 取代，建议关闭（需作者同意）。

---

## 附：1.0.0 实施计划（v0.2，2026-10-13，历史）

- 状态：v0.2（2026-10-13），首期（需求 v0.2，步骤地图按作者意见重排为十一章）全部范围
- 输入：[需求](requirements.md)、[架构](architecture.md)（含 [§11 实施前评审](architecture.md#11-实施前架构评审2026-10-13)）、[设计](design.md)、[复用调研](reuse-research.md)、[术语](../CONTEXT.md)
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)（私密仓库，2026-10-13 发布）。**任务范围、状态和完成证据以 Issue 为准**，本文只保留里程碑、顺序和链接。Issue 正文里的依赖已写成 Issue 编号；T01–T12 与 #1–#12 一一对应；T22 是 #13，T13–T21 依次是 #14–#22，以下表为准。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。

> **首个可开工任务：[#1 建立 Astro 工程脚手架与命令](https://github.com/Finderlzy/rezero-subscribe-claude/issues/1)**（建议档位：强）。新开会话，用 `task-implement` 指定 #1。

### 1. 里程碑

| 里程碑 | 交付的可用能力 | 覆盖需求 | 任务 |
| --- | --- | --- | --- |
| **MS1 端到端骨架** | 首页 →“直接开始”→ 开始之前 → 整体思路 → 节点方案选择页 → 默认路线的第一章 → 检查 IP 质量 → 完成页，全部是构建时写死的导航；内容校验在构建里生效 | FR-01–04、FR-10–13（静态部分）、FR-17、FR-18（无进度）、FR-60、FR-61；AC-01、AC-08 与 AC-19（静态部分）、AC-18（找不到页） | T01–T06 |
| **MS2 完整 P0** | 全部十一章和常见问题迁完；任意路线按本机选择计算上一步/下一步；操作/原理视图；内容待补占位；构建失败用例；迁移核对 | FR-03、FR-11–15、FR-20、FR-21、FR-30、FR-31、FR-50（写入）；AC-02、03、05、06、08、11、12、13、14、18、19 | T07–T15、T22 |
| **MS3 P1** | 视频门面、步骤目录（改路线、清除进度）、继续上次、代码复制与看大图 | FR-14、FR-16、FR-18、FR-19、FR-40–42、FR-50、FR-51、NFR-02；AC-04、07、09、10 | T16–T19 |
| **MS4 P2 与交付准备** | 两种宽度和两种主题下的视觉、可访问性；子路径部署；屏蔽境外域名后完整显示 | NFR-01、NFR-03、NFR-04、NFR-05、design §7；AC-15、16、17 | T20–T21 |

MS1、MS2 结束各有一个检查点（§4）。MS2 之后的任务先保留目标和依赖，开工前由 `task-implement` 细化并补参照。

### 2. 依赖与顺序

```
T01 ─┬─ T02 ── T04 ─┐
     ├─ T03 ────────┴─ T05 ── T06 ──┬─ T10 ── T11 ── T12 ── T22 ── T13 ── T15
     │                              ├─ T14
     │                              ├─ T16 ── T21
     │                              ├─ T19 ─────────────────┐
     └─ T07 ─────────────────(T06+T07)─┬─ T08 ── T17 ── T18 ─┴─ T20
                                       └─ T09
```

- **立即可开工**：T01。
- T01 完成后可以并行：T02、T03、T07（互不改同一目录）。
- T06 完成后可以并行：T08（需 T07）、T09（需 T07）、T10、T14、T16、T19。内容迁移 T10 → T11 → T12 → T22 → T13 **串行**，因为都要改 `route.yaml`。
- 并行写代码时各用独立 worktree，按上图从左到右合并；没有循环依赖。

### 3. 任务索引

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 细化 | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | 建立 Astro 工程脚手架与命令 | MS1 | 无 | 强 | 已细化 | [#1](https://github.com/Finderlzy/rezero-subscribe-claude/issues/1) |
| T02 | 验证 Markdown 管线的四个技术疑点 | MS1 | T01 | 强 | 已细化 | [#2](https://github.com/Finderlzy/rezero-subscribe-claude/issues/2) |
| T03 | 实现路线图模块 M2 | MS1 | T01 | 强 | 已细化 | [#3](https://github.com/Finderlzy/rezero-subscribe-claude/issues/3) |
| T04 | 实现内容格式与 Obsidian 写法插件 M1 | MS1 | T01、T02 | 强 | 已细化 | [#4](https://github.com/Finderlzy/rezero-subscribe-claude/issues/4) |
| T05 | 走通“开始”章：首页、步骤页、完成页、找不到页 | MS1 | T03、T04 | 强 | 已细化 | [#5](https://github.com/Finderlzy/rezero-subscribe-claude/issues/5) |
| T06 | 迁移第一章并实现节点方案选择页 | MS1 | T05 | 标准 | 已细化 | [#6](https://github.com/Finderlzy/rezero-subscribe-claude/issues/6) |
| T07 | 实现本机状态模块 M4 | MS2 | T01 | 标准 | 已细化 | [#7](https://github.com/Finderlzy/rezero-subscribe-claude/issues/7) |
| T08 | 浏览器按本机选择改写导航 | MS2 | T06、T07 | 强 | 待细化 | [#8](https://github.com/Finderlzy/rezero-subscribe-claude/issues/8) |
| T09 | 实现操作/原理视图切换 | MS2 | T06、T07 | 标准 | 待细化 | [#9](https://github.com/Finderlzy/rezero-subscribe-claude/issues/9) |
| T10 | 迁移电脑代理、防泄漏、电脑改时区并实现内容待补占位 | MS2 | T06 | 标准 | 待细化 | [#10](https://github.com/Finderlzy/rezero-subscribe-claude/issues/10) |
| T11 | 迁移清理配置、IP 不合格与手机代理并实现跳过 | MS2 | T10 | 标准 | 待细化 | [#11](https://github.com/Finderlzy/rezero-subscribe-claude/issues/11) |
| T12 | 迁移 Google 账号、养号与注册 claude | MS2 | T11 | 标准 | 待细化 | [#12](https://github.com/Finderlzy/rezero-subscribe-claude/issues/12) |
| T22 | 迁移订阅、订阅之后与完成页内容 | MS2 | T12 | 标准 | 待细化 | [#13](https://github.com/Finderlzy/rezero-subscribe-claude/issues/13) |
| T13 | 迁移常见问题并实现常见问题页 | MS2 | T22 | 标准 | 待细化 | [#14](https://github.com/Finderlzy/rezero-subscribe-claude/issues/14) |
| T14 | 补齐构建失败用例 | MS2 | T06 | 标准 | 待细化 | [#15](https://github.com/Finderlzy/rezero-subscribe-claude/issues/15) |
| T15 | 完成迁移核对 | MS2 | T13 | 标准 | 待细化 | [#16](https://github.com/Finderlzy/rezero-subscribe-claude/issues/16) |
| T16 | 实现步骤视频门面 | MS3 | T06 | 标准 | 待细化 | [#17](https://github.com/Finderlzy/rezero-subscribe-claude/issues/17) |
| T17 | 实现步骤目录与清除进度 | MS3 | T08 | 标准 | 待细化 | [#18](https://github.com/Finderlzy/rezero-subscribe-claude/issues/18) |
| T18 | 实现“继续上次”与完成页操作 | MS3 | T08、T17 | 标准 | 待细化 | [#19](https://github.com/Finderlzy/rezero-subscribe-claude/issues/19) |
| T19 | 实现代码复制与看大图 | MS3 | T06 | 标准 | 待细化 | [#20](https://github.com/Finderlzy/rezero-subscribe-claude/issues/20) |
| T20 | 视觉打磨、响应式与可访问性验收 | MS4 | T17、T18、T19 | 标准 | 待细化 | [#21](https://github.com/Finderlzy/rezero-subscribe-claude/issues/21) |
| T21 | 子路径部署与国内可访问验收 | MS4 | T16 | 标准 | 待细化 | [#22](https://github.com/Finderlzy/rezero-subscribe-claude/issues/22) |

### 4. 检查点

**MS1 结束（T01–T06 合并后）**
- [ ] `npm run check` 通过；`npm run test:e2e` 通过
- [ ] 在 360 和 1280 宽下，从首页沿默认路线点到完成页，没有断链
- [ ] 截图入库前已逐张核对打码（R8）
- [ ] 回看本计划：MS2 任务的顺序和档位是否仍然合适

**MS2 结束（T07–T15、T22 合并后）**
- [ ] AC-02、03、05、06、08、11、12、13、14、18、19 全部有对应的 e2e 用例或人工核对记录
- [ ] 构建输出的占位清单和作者确认一致

**全部完成**：AC-01–AC-18 都有证据，交给 project-delivery 做整体验收。

### 5. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| `rehype-callouts` 不支持自定义 `why`，或插件图片进不了 Astro 图片流程 | 中 | 已在 T02（#2）验证可行，风险解除（reuse-research §4.1） |
| Astro 7 / Vitest 5 / TS 6 组合有未知兼容问题 | 中 | T01 锁版本并跑通全部命令后再开其他任务 |
| 迁移时漏内容或改了命令、链接 | 高 | 每个迁移任务更新 `docs/migration-checklist.md`；T15 用脚本比对命令和链接 |
| 截图露出服务器 IP 等敏感信息 | 高 | T06 起每个迁移任务的验收都有逐张核对项 |
| Playwright 浏览器需要联网下载 | 低 | T01 安装 chromium 一次；离线时 e2e 无法运行要如实报告 |

### 6. 待决事项（不阻塞）

需求 Q-01（部署位置）、Q-02（F2 选项）、Q-07（联系方式，T22 用占位）、Q-10（注册 claude 单独成章，作者可改）。
