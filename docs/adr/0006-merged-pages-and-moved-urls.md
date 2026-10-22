# 合并页用新标识，旧网址按跳转表跳到视图对应的小节

- 状态：accepted（2026-10-21，架构 v3）；2026-10-22 作者交来新稿，合并清单和 `moved:` 已由 V10/V11 落地
- 修订：[ADR-0002](0002-url-scheme.md) 的 2026-10-19 做法（`REMOVED_PAGES` + Astro `redirects`）由本文取代
- 实施：V09（2026-10-22）完成跳转表、跳转页、sitemap 过滤和校验；V10/V11 按作者新稿填入全部条目。第 3 条按单版本修正，见下面的“2026-10-22 实施记录”

> **2026-10-22 实施记录（V11，全量）**：作者交来 `docs/v3-rewrite/` 的 11 页单版本新稿并确认页面地图（实施计划 §3.1）。`route.yaml` 的 `moved:` 现有 47 条：37 条旧页面（含 6 条按手机选项分流的 `choice`）、`plan1-free-isp`、8 条旧常见问题路径和旧 `faq` 目录；`/ip-tests/` 和 6 篇实测保留原网址，不写 `moved:`。手机旧页的 `fallback` 是 `client-desktop#下一步`——选项卡片不在导入正文里，由 `ChoiceCards.astro` 输出 `id="下一步"`，`site.ts` 的 `resolveMovedTarget` 单独接受这一个锚点；其他页写 `section: 下一步` 仍构建失败。`faq` 是旧参考页目录：允许作为 `moved:` 的键，但仍不能用作页面标识。同角色沿用旧标识（`preface`、`overview`、`plan2-residential-server`、`afterword`）是对第 1 条的放宽，其余合并页用新标识。`ac-33-moved.spec.ts` 逐条核对全部 47 条、6 条分流的两个选项、无 JS、子路径和 `#下一步` 落点。

> **2026-10-22 实施记录（V09，以下面这段为准）**：用户在 V01 决定页面固定原理视图、去掉视图切换（架构 §13.12），所以第 3 条“按视图分开、换视图再滚动”不再适用：锚点只有原理版一种（`#<slug>`），`section-hash` 只负责滚动；`moved:` 的 `section` 用同一个 `sectionAnchor()` 解析。跳转页 `MovedPage` 用 `BaseLayout noindex` + 顶栏 + 正文栏（design §4.6，没有侧边栏），`<head>` 内联脚本立即 `location.replace`；`meta refresh` 改成 **5 秒延迟**，让禁用 JS 的读者先看到“这一页已经并入《…》”和链接（AC-33；0 秒会直接走掉，和 FR-25 的“没有 JS 时显示”矛盾）。校验分两层：`buildRouteMap` 查形状、旧标识/目标页/保留字/不串联；`site.ts` 用 M1 的 headings 查 `section`。`REMOVED_PAGES` 和 Astro `redirects` 已经删除，`plan1-free-isp` 已迁进 `moved:`。同一天补齐了实施计划 §3.1 要的两件事：**按分叉点选择分流**（`choice: { fork, options, fallback }`，手机相关的旧页按 M4 里的手机选项落地，没选过、读不到本机选择或没有 JS 时用 `fallback`，内联脚本在 `src/lib/moved.ts`，和 M4 用同一个存储键）和 **`faq/<id>` 这类多段旧参考页路径**（由 `src/pages/[...moved].astro` 生成同样的跳转页，单段仍由 `[page].astro` 生成；和现有参考页同址时构建失败）。

v3 把重写稿里拆得太碎的几页合成一页（需求 FR-05），站点 2026-10-19 已上线，被合并掉的旧网址要跳到合并页里对应的小节（FR-25）。我们决定：

1. **合并页一般用新的英文标识**，不沿用分组里任何一个旧标识；页面角色和标题都没变的沿用旧标识（`preface`、`overview`、`plan2-residential-server`、`afterword`），这是作者 2026-10-22 确认的放宽。旧标识全部进跳转表，以后不能再分给别的页面。新标识按 ADR-0002 的写法（英文 kebab-case、看名字知道属于哪个选项），完整清单见本节末尾的表。
2. **跳转表写在 `src/content/route.yaml` 的 `moved:` 段**（旧标识 → `{ to: 新页面, section?: 小节标题 }`），2026-10-19 的 `plan1-free-isp → choose-plan` 也搬进来，`route-map.ts` 的 `REMOVED_PAGES` 和 `astro.config.mjs` 的 `redirects` 删掉。跳转页由 `src/pages/[page].astro` 自己生成（`MovedPage`），不再用 Astro 的 `redirects`。
3. **小节锚点只有一版**（V09 按用户 2026-10-22 的决定修正）：页面固定唯一的正文，`section-hash` 只负责滚到 `#<slug>`；不再有 `op-` 前缀、按视图选锚点或“换视图再滚动”。

## Considered Options

- **合并页沿用分组第一页的标识**（例如方案一合并后仍叫 `plan1-buy-server`）：少一条跳转，但网址说的是“买服务器”，内容却是整个方案一，以后分享出去的链接名不副实。
- **继续用 Astro 的 `redirects`**：它只生成 `<meta http-equiv="refresh">` 页面，目标是固定地址，做不到“按读者当前视图选锚点”和 FR-25 要求的“没有 JS 时显示已经并入哪一页”。
- **两版正文共用同一个小节 id**：同一页里会出现重复 id，浏览器只认第一个，隐藏那版的标题会抢走锚点。
- **跳转表留在代码常量里**：小节标题是内容，跳转表要随合并清单一起改，放在路线图旁边，由作者能读懂的 YAML 维护更合适。

## Consequences

- 跳转表校验（构建失败并指出 `route.yaml`）：旧标识是 kebab-case、不是现有页面标识或保留字；`to` 是现有的步骤、选择页或旁支页，不能指向另一个旧标识（不串联）；写了 `section` 时，它必须是 `to` 页面原理版正文里唯一的 h2 或 h3（单版本后只核对这一版；常见问题并进各章后是一问一个 h3，实施计划 §3.1）。跳转页不进目录、搜索和 sitemap（sitemap 在 `astro.config.mjs` 里过滤）。
- 读者从旧网址进来时，跳转页按构建时算好的锚点用 `location.replace` 跳过去（不留历史记录），同时写一行 `<meta http-equiv="refresh">` 和“这一页已经并入《合并页》”的链接，作为没有 JS 时的退路；没有 JS 的读者先看到说明和链接，5 秒后自动前往（实施记录）。
- 旧标识的本机选择（FR-17）不需要专门处理：合并页和被合并的页面属于同一个分叉点选项（需求 Q-19），打开合并页时 `route-enhance` 照常写入这个选项。
- 跳转表的 `section` 已按真实内容填好（V11）；h2/h3 的文字取自新稿正文，标题里的标点会影响生成的 slug，`section` 写标题原文，锚点由 `sectionAnchor()` 算。AC-33 已在 e2e 里逐条核对落点。
- 以后再合并或删页，都只改 `route.yaml` 的 `moved:` 段，不改代码。

## 合并清单（V11 现状，作者 2026-10-22 确认）

| 新标识 / 沿用标识 | 合并页标题 | 旧标识 → 小节（`moved:` 全量以 `route.yaml` 为准） |
| --- | --- | --- |
| `preface`（沿用） | 前言 | `disclaimer` → `免责声明` |
| `overview`（沿用） | 整体思路与方案选型 | `clean-up` → `清理旧账号和配置`；`choose-plan` → `接下来怎么选`；`plan3-residential-node` → `为什么不推荐直接买住宅节点`；`plan1-free-isp` → `方案一和方案二` |
| `plan1` | 方案一：搭建专属住宅代理节点 | `plan1-buy-server` → `购买海外 VPS`；`plan1-buy-isp` → `购买静态住宅 ISP 代理`；`plan1-make-node` → `SSH 连接服务器`；`plan1-panel` → `打开面板（可选）` |
| `plan2-residential-server`（沿用） | 方案二：配置住宅 IP 服务器 | —（同一页扩写） |
| `client-desktop` | 客户端配置与环境验证：电脑端 | `import-proxy` → `安装代理软件`；`check-ip` → `验收清单`；`recap` → `先看一眼整条链路`；`leak-protection` → `防泄漏`；`timezone` → `改时区`；`choose-phone` → `下一步` |
| `iphone-prepare` | 客户端配置与环境验证：iOS 端 | `iphone-app-store-austria` → `准备一个能下载代理软件的 App Store`；`iphone-proxy` → `在 V2Box 里导入节点`；`iphone-gmail` → `下载 Gmail` |
| `iphone-subscription` | 账号注册与订阅全流程：iOS 端 | `iphone-why-us-apple-id`、`iphone-apple-id` → `注册美区 Apple ID`；`iphone-app-store-login` → `只在 App Store 登录`；`iphone-gift-card` → `买礼品卡充值`；`iphone-subscribe` → `在 App 内订阅`；`iphone-purchase-failed` → `如果提示“购买未完成”` |
| `android-prepare` | 客户端配置与环境验证：安卓端 | `android-proxy` → `安装 v2rayNG`；`android-google-play` → `准备 Google Play`；`android-gmail` → `下载 Gmail` |
| `android-subscription` | 账号注册与订阅全流程：安卓端 | `android-subscribe` → `支付` |
| `maintenance` | 日常维护、风控应对与常见故障 | `after-subscribe` → `订阅之后，继续像普通人一样用`；`google-appeal` → `账号受限之后`；`appendix` → 页顶；`faq` → 页顶；8 条 `faq/<id>` → 对应 h3 |
| `afterword`（沿用） | 后记与致谢 | `thanks` → `致谢` |
| 手机分流（6 条 `choice`） | — | `register-gmail`、`chrome-sign-in`、`use-two-days`、`google-region`、`register-claude`、`subscribe`：iPhone → `iphone-subscription` 对应小节，安卓 → `android-subscription` 对应小节，未选 → `client-desktop#下一步` |
| 参考页（保留） | IP 质量实测合集 + 6 篇实测 | 不写 `moved:`，原网址不变 |
