# 交付记录

## 2026-10-15 首期整体验收

- **基线**：`main` @ `6145899`（合并 #22 之后），与 `origin/main` 一致。验收时版本号 0.1.0；验收通过后按作者决定定为 **1.0.0**（`package.json`、`package-lock.json`），尚未打标签、发布或部署。
- **范围**：需求 v0.2 首期全部范围，[实施计划](implementation-plan.md) MS1–MS4。Issue #1–#15、#17–#22 已关闭且都已合并进 `main`；**#16 仍开着**，剩余项都在等作者提供素材（见“未解决项”）。
- **环境**：Linux，Node v24.21.0，npm 11.19.0，Playwright Chromium（`@playwright/test` ~1.64）。
- **结论**：所有自动化检查通过，构建产物在干净目录可装、可构建，根路径和子路径都没有断链。功能验收通过；**内容完整性（AC-13）还差作者待补的素材**，上线前要么补齐、要么接受当前占位。部署位置未定（Q-01），本次没有部署或发布。

### 回归与构建

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 + 单元 + 构建级 + 构建 | `npm run check` | 通过：`astro check` 0 错误 0 警告（2 条提示）；Vitest 18 个文件 302 个用例；构建级 5 个用例；构建 54 页 |
| 端到端 | `npm run test:e2e` 等价（见下） | 通过：641 passed，1 skipped（`ac-15` 在 mobile-360 下有意跳过，与 desktop-1280 的根路径检查相同） |
| 迁移比对 | `node scripts/compare-migration.mjs` | 退出码 2：命令、链接、截图差异 0，只剩已登记的待补 10 项 |
| 构建占位清单 | `npm run build` 输出 | 14 个占位步骤，与 [迁移核对表](migration-checklist.md) 一致 |

e2e 运行时本机 4321 端口被另一个 `astro dev` 占用（不是本次启动的），所以用一份只改端口（4331/4332）和输出目录的临时配置跑同一套用例，跑完删除。项目配置本身没有改动。

### 干净目录验证

在临时目录 `git clone` 基线后执行：

1. `npm ci` → 成功；`npm run build` → 54 页，`dist/` 3.3 MB；`BASE_PATH=/sub/ npx astro build --outDir dist-sub` → 成功。
2. 根路径产物用 `python3 -m http.server`（与项目无关的静态服务器）提供，子路径产物用 `tests/e2e/static-server.mjs` 挂在 `/sub/`。从首页起广度抓取全部站内 `href`、`src`、`srcset` 和 CSS `url()`：两份产物各 100 个地址，失败 0，子路径产物没有跳出 `/sub/` 的链接。
3. 产物里没有任何外部 `src`/`srcset`/样式表，没有统计脚本或第三方字体；外部域名只出现在正文链接里（ipinfo、scamalytics、ipequal 等原文链接）。
4. 提交历史扫描 IP、`vless://`、密码和密钥写法：只有正文里的示例文字（`8.8.8.8`、`1.1.1.1`、`vless://` 前缀说明等），没有真实服务器 IP、节点链接或凭据。截图打码已在各迁移 Issue 和 #21 中逐张核对。

### 验收矩阵

| 编号 | 场景 | 方式 | 结果 |
| --- | --- | --- | --- |
| AC-01 | 首页：前言、直接开始，无致谢后记 | `ac-01-home.spec.ts` | 通过 |
| AC-02 | 默认路线点到完成页无断链 | `ac-02-default-route.spec.ts`；a11y 里另有纯键盘走前五步 | 通过 |
| AC-03 | 选方案三、汇合、上一步回分支 | `ac-03-branch-merge.spec.ts` | 通过 |
| AC-04 | 目录里改方案后导航按新路线 | `ac-04-change-route.spec.ts` | 通过 |
| AC-05 | 跳过按钮与自定文案 | `ac-05-skip.spec.ts` | 通过 |
| AC-06 | 操作/原理视图切换与记忆 | `ac-06-view-toggle.spec.ts` | 通过 |
| AC-07 | 视频区域 | `ac-07-video.spec.ts` 测“视频制作中”和点击前不请求视频平台；有视频时的播放在 #17 人工核对 | 部分：现有内容没有带视频的步骤，真实播放这次未复测 |
| AC-08 | 方案三步骤 URL 在无痕窗口直接打开 | `ac-08-direct-url.spec.ts` | 通过 |
| AC-09 | 继续上次 | `ac-09-resume.spec.ts` | 通过 |
| AC-10 | 清除进度 | `ac-10-clear-progress.spec.ts` | 通过 |
| AC-11 | 常见问题“返回刚才的步骤” | `ac-11-faq-return.spec.ts` | 通过 |
| AC-12 | 内容待补占位、构建列出清单 | `ac-12-placeholder.spec.ts` + 构建输出 | 通过 |
| AC-13 | 原文逐节对照 | 比对脚本 + 核对表 | **未完全通过**：命令和链接与原文一致；8 张截图、配套视频 2 个链接待补 |
| AC-14 | 坏内容让构建失败并报文件 | `tests/build/ac-14-build-fail.test.ts` | 通过 |
| AC-15 | 根路径、子路径部署 | `ac-15-base-path.spec.ts` + 本次干净目录抓取 | 通过 |
| AC-16 | 360/1280 无页面级横向滚动 | `ac-16-responsive.spec.ts` | 通过 |
| AC-17 | 屏蔽 Google/YouTube 后完整 | `ac-17-blocked-domains.spec.ts` | 通过 |
| AC-18 | 找不到页；禁用存储时走完 AC-02 | `ac-18-not-found.spec.ts`、`ac-18-storage-disabled.spec.ts` | 通过 |
| AC-19 | 共享步骤的上一步按 S5 | `ac-19-shared-step.spec.ts` | 通过 |
| FR-19/20、NFR-02 | 完成页操作、常见问题页目录、复制与看大图 | `fr-19-done`、`fr-20-faq-toc`、`nfr-02-copy-zoom` | 通过 |
| 可访问性 | 两种主题 axe 扫描、键盘操作 | `a11y.spec.ts`、`src/styles/tokens.test.ts` | 通过 |
| NFR-05 | iOS Safari、Firefox、Edge | — | **未执行**：自动化只覆盖 Chromium |

### 产物

- 构建产物：`npm run build` 生成 `dist/`，子路径版本用 `BASE_PATH=<路径> npm run build`。产物不入库。
- 使用与部署说明：[README](../README.md)。

### 未解决项

| 项 | 影响 | 去向 |
| --- | --- | --- |
| 8 张 SSH / 脚本截图未打码，未入库 | 第一章 `ssh-connect`、`run-script` 少截图，文字步骤完整 | 作者打码后补入，#16 |
| 原文配套视频暂不放；`iphone-app-store-austria` 的视频信息未提供 | 各步骤显示“视频制作中” | 作者给出分步视频后写进 frontmatter，#16 |
| 完成页联系方式为占位 | 完成页显示“联系方式待补。” | 需求 Q-07，作者提供 |
| 14 个占位步骤 | 读者在这些步骤看到“内容待补” | 需求 Q-03，作者陆续补写，不阻塞上线 |
| 部署位置未定 | 未部署 | 需求 Q-01；公开仓库前再扫一次提交历史 |
| Safari、Firefox 未实测 | NFR-05 无证据 | 上线前在真机上抽查首页、一条分支路线、目录和看大图 |
