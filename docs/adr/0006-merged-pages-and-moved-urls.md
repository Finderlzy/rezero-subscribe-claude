# 合并页用新标识，旧网址按跳转表跳到视图对应的小节

- 状态：accepted（2026-10-21，架构 v3）；合并清单和新标识待作者改完重写稿后填（需求 Q-18）
- 修订：[ADR-0002](0002-url-scheme.md) 的 2026-10-19 做法（`REMOVED_PAGES` + Astro `redirects`）由本文取代
- 实施：V09（2026-10-22）完成跳转表、跳转页、sitemap 过滤和校验；第 3 条按单版本修正，见下面的“2026-10-22 实施记录”

> **2026-10-22 实施记录（V09，以下面这段为准）**：用户在 V01 决定页面固定原理视图、去掉视图切换（架构 §13.12），所以第 3 条“按视图分开、换视图再滚动”不再适用：锚点只有原理版一种（`#<slug>`），`section-hash` 只负责滚动；`moved:` 的 `section` 用同一个 `sectionAnchor()` 解析。跳转页 `MovedPage` 用 `BaseLayout noindex` + 顶栏 + 正文栏（design §4.6，没有侧边栏），`<head>` 内联脚本立即 `location.replace`；`meta refresh` 改成 **5 秒延迟**，让禁用 JS 的读者先看到“这一页已经并入《…》”和链接（AC-33；0 秒会直接走掉，和 FR-25 的“没有 JS 时显示”矛盾）。校验分两层：`buildRouteMap` 查形状、旧标识/目标页/保留字/不串联；`site.ts` 用 M1 的 headings 查 `section`。`REMOVED_PAGES` 和 Astro `redirects` 已经删除，`plan1-free-isp` 已迁进 `moved:`。同一天补齐了实施计划 §3.1 要的两件事：**按分叉点选择分流**（`choice: { fork, options, fallback }`，手机相关的旧页按 M4 里的手机选项落地，没选过、读不到本机选择或没有 JS 时用 `fallback`，内联脚本在 `src/lib/moved.ts`，和 M4 用同一个存储键）和 **`faq/<id>` 这类多段旧参考页路径**（由 `src/pages/[...moved].astro` 生成同样的跳转页，单段仍由 `[page].astro` 生成；和现有参考页同址时构建失败）。

v3 把重写稿里拆得太碎的几页合成一页（需求 FR-05），站点 2026-10-19 已上线，被合并掉的旧网址要跳到合并页里对应的小节（FR-25）。我们决定：

1. **合并页用新的英文标识**，不沿用分组里任何一个旧标识。旧标识全部进跳转表，以后不能再分给别的页面。新标识按 ADR-0002 的写法（英文 kebab-case、看名字知道属于哪个选项），例如方案一的四页合成 `plan1`、iPhone 准备三页合成 `iphone-prepare`、安卓准备三页合成 `android-prepare`、iPhone 订阅六页合成 `iphone-subscription`（`iphone-subscribe` 是旧标识，不能复用）。以上只是提议，作者定了合并清单后写进本节末尾的表。
2. **跳转表写在 `src/content/route.yaml` 的 `moved:` 段**（旧标识 → `{ to: 新页面, section?: 小节标题 }`），2026-10-19 的 `plan1-free-isp → choose-plan` 也搬进来，`route-map.ts` 的 `REMOVED_PAGES` 和 `astro.config.mjs` 的 `redirects` 删掉。跳转页由 `src/pages/[page].astro` 自己生成（`MovedPage`），不再用 Astro 的 `redirects`。
3. **小节锚点按视图分开，页面脚本负责“换视图再滚动”**：沿用 ADR-0004 的 id 规则（原理版 `#<slug>`，操作版 `#op-<slug>`）。页面加载和 `hashchange` 时，`section-hash` 脚本去掉 `op-` 前缀得到小节名：当前视图有这个小节就滚到当前视图的那一个；只有另一视图有，就切到那个视图（和读者点切换一样写进本机）再滚动。站内双链、跳转表和站内搜索生成的锚点优先用同一视图的 id，这一视图没有时用另一视图的。

## Considered Options

- **合并页沿用分组第一页的标识**（例如方案一合并后仍叫 `plan1-buy-server`）：少一条跳转，但网址说的是“买服务器”，内容却是整个方案一，以后分享出去的链接名不副实。
- **继续用 Astro 的 `redirects`**：它只生成 `<meta http-equiv="refresh">` 页面，目标是固定地址，做不到“按读者当前视图选锚点”和 FR-25 要求的“没有 JS 时显示已经并入哪一页”。
- **两版正文共用同一个小节 id**：同一页里会出现重复 id，浏览器只认第一个，隐藏那版的标题会抢走锚点。
- **跳转表留在代码常量里**：小节标题是内容，跳转表要随合并清单一起改，放在路线图旁边，由作者能读懂的 YAML 维护更合适。

## Consequences

- 跳转表校验（构建失败并指出 `route.yaml`）：旧标识是 kebab-case、不是现有页面标识或保留字；`to` 是现有的步骤、选择页或旁支页，不能指向另一个旧标识（不串联）；写了 `section` 时，它必须是 `to` 页面原理版正文里的 h2（单版本后只核对这一版）。跳转页不进目录、搜索和 sitemap（sitemap 在 `astro.config.mjs` 里过滤）。
- 读者从旧网址进来时，跳转页按构建时算好的锚点用 `location.replace` 跳过去（不留历史记录），同时写一行 `<meta http-equiv="refresh">` 和“这一页已经并入《合并页》”的链接，作为没有 JS 时的退路；没有 JS 的读者先看到说明和链接，5 秒后自动前往（实施记录）。
- 旧标识的本机选择（FR-17）不需要专门处理：合并页和被合并的页面属于同一个分叉点选项（需求 Q-19），打开合并页时 `route-enhance` 照常写入这个选项。
- 合并页里每个小节的 h2 文字就是原页面标题，跳转表的 `section` 在这一版还没有真实数据（合并清单 Q-18 未定）；V11 合出合并页后填 `section`，AC-33 的“停在对应小节”在那时用真实数据逐条核对。
- 以后再合并或删页，都只改 `route.yaml` 的 `moved:` 段，不改代码。

## 合并清单（Q-18 定后填写）

| 新标识 | 合并页标题 | 旧标识 → 小节 |
| --- | --- | --- |
| — | — | 作者改完重写稿后填写 |
