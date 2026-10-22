# 实施计划：Re:从零开始订阅 claude

- 状态：**v3 计划（2026-10-22 修订）**，把代码从 v2.2 改到 v3：文档站风格（design v3）、站内搜索（M6）、按作者新稿 `docs/v3-rewrite/` 换成单版本内容、旧网址跳转（ADR-0006）。对应需求 FR-05、FR-16、FR-18、FR-24、FR-25、FR-72 和 AC-26–AC-33（AC-31 是全量回归），架构 [§13](architecture.md#13-v3-增量架构2026-10-21)，实施前评审见[架构 §13.11](architecture.md#1311-v3-实施前评审2026-10-21)（通过，没有阻塞项）。目标站点版本 **3.0.0**（V12 验收通过后升版）。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，标题以 `[v3]` 开头（**草稿，待发布**；发布后在 §3 回填编号）。任务范围、状态和完成证据以 Issue 为准，本文只保留里程碑、顺序和链接；§4 是发布时的正文草稿。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。
- 历史：v2.2 已完成（2026-10-19，[v2.2 改版计划](v2.2-plan.md)，没有建 Issue）；v2.1（#32–#40）、v2.0（#23–#31）和 1.0.0 的计划在文末附录。

> **2026-10-22 修订：作者交来新稿 `docs/v3-rewrite/`，计划按它调整。** 新稿 11 个文件，一章一页，已经按章合并好，只有一版正文；文件之间用相对 Markdown 链接，不再有双链。方案三、独立常见问题、附录不再收录（常见问题并入各章和 `09` 的小节）；IP 质量实测合集保留为参考页。因此：V10 从“机械合并脚本”改为“换成 v3 单版本的页面和路线图”；V11 从“按清单合并页面”改为“旧网址、验收和文档/仓库同步”；V06–V09 去掉两种视图，V07 不再切视图。V01–V05 已完成，样式不动。页面标识、章节和旧网址去向见 §3.1，**作者 2026-10-22 已确认**。

> **现在可开工：V06（搜索索引）、V07（小节锚点）、V09（跳转表）**，各用独立 worktree（改动范围见 §2）。V08 等 V06、V07；V10 等 V09；V11 等 V10。

## 1. 里程碑（v3）

一个里程碑一个任务。

| 里程碑 | 任务 | 交付的可用能力 | 覆盖 |
| --- | --- | --- | --- |
| MS11 骨架 | V01 | 全站换成 v3 令牌；顶栏（logo、站名、小形象、昼夜切换（用户 2026-10-22 决定取代视图切换）、联系方式）；≥720px 常驻侧边栏、<720px 抽屉；页头色带和章首页一组去掉，眉题 + 纯文字 h1；页脚 | FR-72（顶栏、正文栏、主色）、FR-16（断点）、FR-23；AC-26（搜索框除外） |
| MS12 侧边栏 | V02 | 只展开当前章、点章名开合；当前页下列出原理版正文的 h2；当前项紫字 + 左边线 | FR-16；AC-27 |
| MS13 正文排版 | V03 | h1–h4、链接、行内代码（4px 圆角）和代码块（6px 圆角）、表格、提示块、截图按 design §3.2、§4.7 | FR-72（正文栏）、FR-21 |
| MS14 翻页和选择页 | V04 | 文字链接翻页（≥44px）、跳过小字、回到/返回刚才的步骤；手机不再吸底；选项卡片 | FR-72、FR-10、FR-15、FR-12、FR-19、FR-20；AC-30 |
| MS15 首页和找不到页 | V05 | VuePress 式首屏 + 按章目录；找不到页换外壳；删掉章节副标题和多余的编号字形 | FR-18、FR-72；AC-29 |
| MS16 搜索索引 | V06 | `src/lib/search/` 纯函数 + `search-index.json` 静态端点；索引单版本的全部页面和 h2、h3 | FR-24（数据部分）；AC-28 的单元测试 |
| MS17 小节锚点 | V07 | 小节 id 和单版本的锚点解析；`section-hash` 让带小节锚点的链接滚到位置；构建时校验锚点存在 | FR-05（锚点校验）、ADR-0006 第 3 条 |
| MS18 搜索框 | V08 | 顶栏搜索（桌面输入框、手机图标）、下拉、键盘、没有找到；打开小标题结果直接滚动 | FR-24；AC-28、AC-26（搜索框） |
| MS19 跳转表 | V09 | `route.yaml` 的 `moved:` 段和校验、跳转页、sitemap 过滤；`plan1-free-isp` 迁过来 | FR-25、ADR-0006；AC-33（用现有数据）、AC-15 |
| MS20 单版本内容 | V10 | 按 `docs/v3-rewrite/` 换成 11 页：单版本内容集合和导入、相对链接转换、5 章 2 个分叉点的路线图；保留 IP 实测参考页；侧边栏不显示章节号；删掉操作版、常见问题页和旧内容 | FR-01、FR-03、FR-04、FR-05、FR-12、FR-16 |
| MS21 旧网址和同步 | V11 | 全部旧标识进 `moved:`（跳到合并页的小节；手机相关的旧页按已选手机系统分流）；改验收和文档；同步 Writing 和大肥鱼；删旧稿 | FR-05、FR-25；AC-32、AC-33、AC-31 |
| MS22 v3 验收 | V12 | 三种宽度、深浅两色截图对照；AC-26–AC-33 和 AC-01–AC-25 全量回归；升 3.0.0 | AC-31、design §7 |


## 2. 依赖与顺序（v3）

```
V01 骨架（已完成，强）── V02 侧边栏 / V03 正文排版 / V04 翻页 / V05 首页（已完成）
V06 搜索索引（立即）──┐
V07 小节锚点（立即）──┴── V08 搜索框
V07 ────────────────────── V09 跳转表（强）──┐
V10 换成 v3 单版本（强）───────────────┴── V11 旧网址和同步（强）── V12 v3 验收
```

- **立即可开工**：V06、V07。V06 只新建 `src/lib/search/` 和一个端点；V07 改 `src/lib/content/`、新建 `section-anchor.ts` 和 `section-hash.ts`（在 `PageLayout` 里只加一行脚本引用）。
- V08 依赖 V01（顶栏挂载点）、V06（索引）、V07（打开小标题结果靠 `section-hash`）。
- V09 依赖 V07（跳转页复用“小节 → 锚点”的规则）；先把 `moved:` 的机制和 `plan1-free-isp` 做出来。
- V10 依赖 V02（侧边栏列小节）、V09（旧标识不丢）；作者已确认 §3.1，其余任务先做不影响。
- V11 依赖 V10（新页面和路线图先落地），负责旧网址、验收和文档/仓库同步。
- V12 最后做。

## 3. 任务索引（v3）

| 任务 | 标题 | 依赖 | 档位 | 细化 | Issue |
| --- | --- | --- | --- | --- | --- |
| V01 | 换成文档站的令牌、顶栏和两栏骨架 | 无 | 强 | 已实施（2026-10-22，已合并 main） | 待发布 |
| V02 | 侧边栏按章折叠并列出当前页小节 | V01 | 标准 | 已实施（2026-10-22，已合并 main；章节号在 V10 去掉） | 待发布 |
| V03 | 按 design v3 重排正文和内容组件 | V01 | 标准 | 已实施（2026-10-22，已合并 main） | 待发布 |
| V04 | 文字链接翻页和选择页卡片 | V03 | 标准 | 已实施（2026-10-22，已合并 main；选项卡片改由 frontmatter 渲染在 V10） | 待发布 |
| V05 | VuePress 式首页和找不到页 | V01 | 标准 | 已实施（2026-10-22，已合并 main；同日又按作者要求改成五栏章节简介） | 待发布 |
| V06 | 站内搜索的索引和匹配 | 无 | 标准 | 已细化（按单版本，含 IP 实测参考页） | 待发布 |
| V07 | 小节锚点和落点 | 无 | 标准 | 已细化（按单版本） | 待发布 |
| V08 | 顶栏搜索框 | V01、V06、V07 | 标准 | 已细化 | 待发布 |
| V09 | 跳转表和旧网址跳转页 | V07 | 强 | 已细化（含按手机系统分流） | 待发布 |
| V10 | 换成 v3 单版本的页面和路线图 | V02、V09 | 强 | 待细化 | 待发布 |
| V11 | 旧网址、验收和文档同步 | V10 | 强 | 待细化 | 待发布 |
| V12 | v3 视觉验收和全量回归 | 全部 | 标准 | 待细化 | 待发布 |

## 3.1 新稿的页面地图（V10、V11 的依据，作者 2026-10-22 确认）

`docs/v3-rewrite/` 的 11 个文件就是 v3 的 11 页，一章一页、只有一版正文。下表是导入时的一一对应；**标识加粗的沿用旧标识**（页面角色没变，旧网址不用跳），其余都是新标识（原页面被合并或改名，旧标识全部进 `moved:`）。

| 新稿文件 | 页面标题 | 标识 | 章节 | 旧页面（跳到本页的小节） |
| --- | --- | --- | --- | --- |
| `00-前言.md` | 前言 | **`preface`** | 开始 | `disclaimer` → `#免责声明` |
| `01-整体思路与方案选型.md` | 整体思路与方案选型 | **`overview`** | 准备节点和住宅 IP | `clean-up` → `#清理旧账号和配置`；`choose-plan` → `#接下来怎么选`；`plan3-residential-node` → `#为什么不推荐直接买住宅节点`；`plan1-free-isp` → `#方案一和方案二` |
| `02-方案一：搭建专属住宅代理节点.md` | 方案一：搭建专属住宅代理节点 | `plan1` | 准备节点和住宅 IP | `plan1-buy-server` → `#第一步：购买海外 VPS`；`plan1-buy-isp` → `#第二步：购买静态住宅 ISP 代理`；`plan1-make-node` → `#第三步：SSH 连接服务器`；`plan1-panel` → `#第五步（可选）：打开面板` |
| `03-方案二：配置住宅IP服务器.md` | 方案二：配置住宅IP服务器 | **`plan2-residential-server`** | 准备节点和住宅 IP | 同一页扩写，没有旧网址要跳 |
| `04-客户端配置与环境验证-电脑端.md` | 客户端配置与环境验证：电脑端 | `client-desktop` | 客户端配置与订阅 | `import-proxy` → `#安装代理软件`；`check-ip` → `#验收清单`；`recap` → `#先看一眼整条链路`；`leak-protection` → `#防泄漏`；`timezone` → `#改时区`；`choose-phone` → `#下一步` |
| `05-客户端配置与环境验证-iOS端.md` | 客户端配置与环境验证：iOS 端 | `iphone-prepare` | 客户端配置与订阅 | `iphone-app-store-austria` → `#第一步：准备一个能下载代理软件的 App Store`；`iphone-proxy` → `#第二步：在 V2Box 里导入节点`；`iphone-gmail` → `#第五步：下载 Gmail` |
| `06-客户端配置与环境验证-安卓端.md` | 客户端配置与环境验证：安卓端 | `android-prepare` | 客户端配置与订阅 | `android-proxy` → `#第一步：安装 v2rayNG`；`android-google-play` → `#第二步：准备 Google Play`；`android-gmail` → `#第五步：下载 Gmail` |
| `07-账号注册与订阅全流程-iOS端.md` | 账号注册与订阅全流程：iOS 端 | `iphone-subscription` | 客户端配置与订阅 | `iphone-why-us-apple-id`、`iphone-apple-id` → `#第六阶段：注册美区 Apple ID`；`iphone-app-store-login` → `#第七阶段：只在 App Store 登录`；`iphone-gift-card` → `#第八阶段：买礼品卡充值`；`iphone-subscribe` → `#第九阶段：在 App 内订阅`；`iphone-purchase-failed` → `#如果提示“购买未完成”` |
| `08-账号注册与订阅全流程-安卓端.md` | 账号注册与订阅全流程：安卓端 | `android-subscription` | 客户端配置与订阅 | `android-subscribe` → `#第七阶段：支付` |
| `09-日常维护、风控应对与常见故障.md` | 日常维护、风控应对与常见故障 | `maintenance` | 日常维护 | `after-subscribe` → `#订阅之后，继续像普通人一样用`；`google-appeal` → `#账号受限之后`；`appendix` → 页顶；8 条常见问题按 h3 原文跳：`ssh-permission-denied` → `#SSH 提示 Permission denied`、`ssh-port-not-22` → `#SSH 端口不是 22`、`reinstall` → `#装过了，想重装`、`panel-login` → `#面板的用户名、密码、端口大家都一样，安全吗`、`dedicated-ip-check` → `#怎么确认“1 人独享”真的只有我在用`、`different-ips` → `#测出来好几个不同的 IP`、`split-routing` → `#分流规则具体怎么写`、`shadowrocket-not-working` → `#节点导入小火箭后用不了` |
| `10-后记.md` | 后记与致谢 | **`afterword`** | 结尾 | `thanks` → `#致谢` |

**手机相关的旧页面按已选手机系统分流**（作者 2026-10-22 确认）：这几个页面在新稿里 07/08 各写了一份，`moved:` 条目要带 `choice`，打开时按 M4 里的手机选项选目标；没选过时落到 `client-desktop#下一步`（就是选手机系统的地方），没有 JS 时也停在这里。

| 旧标识 | 选了 iPhone | 选了安卓 | 没选（没有 JS 也一样） |
| --- | --- | --- | --- |
| `register-gmail` | `iphone-subscription#第一阶段：注册 Gmail` | `android-subscription#第一阶段：注册 Gmail` | `client-desktop#下一步` |
| `chrome-sign-in` | `iphone-subscription#第二阶段：登录 Chrome，完善资料` | `android-subscription#第二阶段：登录 Chrome，完善资料` | `client-desktop#下一步` |
| `use-two-days` | `iphone-subscription#第三阶段：先用两天` | `android-subscription#第三阶段：先用两天` | `client-desktop#下一步` |
| `google-region` | `iphone-subscription#第四阶段：修改 Google 账号地区（可选）` | `android-subscription#第四阶段：修改 Google 账号地区（可选）` | `client-desktop#下一步` |
| `register-claude` | `iphone-subscription#第五阶段：注册 Claude` | `android-subscription#第五阶段：注册 Claude` | `client-desktop#下一步` |
| `subscribe` | `iphone-subscription#第九阶段：在 App 内订阅` | `android-subscription#第七阶段：支付` | `client-desktop#下一步` |

**参考页：IP 质量实测（保留，作者 2026-10-22 确认）**：新稿没有这部分，继续用旧的 7 个文件，URL 不变，不写 `moved:`：

| 页面 | 标识 / 路径 | 返回 |
| --- | --- | --- |
| IP 质量实测合集 | `ip-tests`（`/ip-tests/`） | 回到：日常维护（`maintenance`） |
| 实测：proxy.qsu.hk 白嫖 ISP | `ip-tests/qsu-free-isp` | 回到：IP 质量实测合集 |
| 实测：VoyraCloud 住宅服务器 | `ip-tests/voyracloud` | 同上 |
| 实测：丽萨住宅服务器 | `ip-tests/lisahost` | 同上 |
| 实测：QSU 住宅服务器 | `ip-tests/qsu-residential` | 同上 |
| 实测：ipequal 住宅节点 | `ip-tests/ipequal` | 同上 |
| 实测：Decodo ISP | `ip-tests/decodo` | 同上 |

- 内容源：把 `docs/rewrite/原理版/IP 质量实测合集.md` 和 6 个 `实测：*.md` 移到 `docs/v3-rewrite/reference/`（连同它们的 `附件/` 图片），导入脚本继续支持参考页；常见问题的文件和目录删掉。
- 入口和返回：没有附录页以后，`ip-tests` 列在侧边栏“日常维护”这一章的末尾（`showReferences`），实测页的“回到”是 `ip-tests`，合集的是 `maintenance`。正文里不硬加链接（新稿没有）；如果作者希望 09 的“测出来好几个不同的 IP”末尾也有入口，V11 在重写稿里加一句再导入。
- 搜索和 sitemap 把 `ip-tests` 和 6 篇实测当正常参考页收录（V06 的索引要含它们）。

章节和分叉点（`route.yaml`）：

1. `start` 开始：`preface`
2. `node-and-ip` 准备节点和住宅 IP：`overview`（选择页，分叉点 `node-plan`，默认 `plan-2`）→ `plan-1: [plan1]`、`plan-2: [plan2-residential-server]`
3. `client-and-subscribe` 客户端配置与订阅：`client-desktop`（选择页，分叉点 `phone`）→ `iphone: [iphone-prepare, iphone-subscription]`、`android: [android-prepare, android-subscription]`
4. `maintenance` 日常维护：`maintenance`（章末列 `ip-tests` 参考页）
5. `ending` 结尾：`afterword`

要点：

- **侧边栏不显示数字**（作者 2026-10-22）：章节名前面没有“第 n 章”，步骤也没有编号；V10 删掉 `TocNav` 的章节号和 `toc.css` 的 `.toc-chapter-no`，找不到页的目录一起改，AC-27 加断言。
- **一个章节下面放不同的方案**：方案一、方案二是“准备节点和住宅 IP”同一章下的两个选项（`或：`分组），不各占一章；iPhone/安卓同理，是“客户端配置与订阅”一章下的两个选项。
- **选择页就在正文页上**：新稿没有单独的“选择方案”“选择手机系统”文件，`overview` 的“方案一和方案二 / 接下来怎么选”和 `client-desktop` 的“下一步”就是分叉点。V10 把选项卡片改成按 frontmatter 的 `options` 渲染在正文末尾，不再要求正文里有加粗的选项块标题；`overview`/`client-desktop` 因此是选择页，不能当普通步骤。
- **方案三、附录、独立常见问题不再有页面**：方案三的内容变成 `overview` 的“为什么不推荐直接买住宅节点”；常见问题按上表散进各章；`/appendix/` 跳到 `maintenance`。IP 质量实测合集保留为参考页（见上）。
- **手机相关的旧页面按已选手机系统分流**：`register-gmail`、`chrome-sign-in`、`use-two-days`、`google-region`、`register-claude`、`subscribe` 用上表的目标；没选过时落到 `client-desktop#下一步`。M2/M4 要不改选择也能读到手机选项。
- **页面标识的沿用规则**：页面角色和标题都没变的沿用旧标识（`preface`、`overview`、`plan2-residential-server`、`afterword`）；被合并后语义变成“一整章”的起新标识（`plan1`、`client-desktop`、`iphone-prepare`、`android-prepare`、`iphone-subscription`、`android-subscription`、`maintenance`）。这是对 ADR-0006“合并页一律用新标识”的放宽，V11 写进 ADR。
- **参考页路径**：旧 `/faq/<id>/` 不是路线图里的页面，V09 的 `moved:` 要能收 `faq/<id>` 这类带 `/` 的键，生成同样的跳转页，但不进目录、搜索和 sitemap；`/faq/` 跳到 `maintenance`。`/ip-tests/…` 保留，不写 `moved:`。

**已确认（作者 2026-10-22，V10 开工前不再等）**：

1. 上表的标识、章节名（含新起的 `客户端配置与订阅`）和五栏简介按此实施；侧边栏不要章节号，方案放在同一章下面。
2. `/ip-tests/` 和 6 篇实测保留为参考页（入库、搜索、侧边栏入口见上）。
3. 手机相关的旧页面按已选手机系统分流（V09 支持 `choice`，V11 填条目）。
4. `overview` 继续默认方案二并标“推荐”。

## 4. 任务正文（v3，发布用草稿）

公共约定（每个任务都适用，不在各 Issue 里重复）：按 [design.md](design.md) v3 和[架构 §13](architecture.md#13-v3-增量架构2026-10-21)做，颜色、间距只用 `src/styles/tokens.css` 的令牌；代码注释里引用 design 章节时用 v3 的章节号；不放宽任何内容校验，不删断言——**只有需求明确去掉的功能**（FR-72 去掉的页头色带、章首页一组、黑色主按钮、手机吸底翻页栏）对应的断言可以换成 v3 的断言，并在提交说明里写明对应的 FR（架构 §13.11 R-3、R-4）；`npm run check` 和 `npm run test:e2e` 是每个任务的通用验收，下面只写各任务自己的。

> **V01–V05 已完成，正文里的 `/import-proxy/`、`/plan1-panel/` 等页面是当时的旧页面**；V10 换成 `docs/v3-rewrite/` 的 11 页后，这些示例只作历史记录，验收以 V10/V11 的页面为准。样式和组件的行为不变，只换内容。

### V01 换成文档站的令牌、顶栏和两栏骨架

> **用户决定（2026-10-22，以此为准）**：本节原定的“视图切换改成两个文字按钮”**不做**。顶栏原来放视图切换的位置换成**昼夜（浅色/深色）主题切换**：默认跟随系统 `prefers-color-scheme`，点击后在 `<html>` 上写 `data-theme="light|dark"` 并存进 localStorage 的一个键（`rezero-subscribe-claude:theme`，读写失败时照常跟随系统），`<head>` 内联脚本提前应用；没有 JS 时按钮隐藏。原理/操作视图切换的 UI 从页面上去掉，**页面固定显示原理视图**（只输出原理版正文，导航和步数按原理视图算；内容集合里的操作版数据暂不删，等 docs/v3-rewrite 的单版本重写统一处理）。因此 `ViewToggle.astro`、`view-toggle.ts` 删除，依赖视图切换或操作视图的 e2e/单元测试作为“功能移除”删除或改写（ac-06、ac-02-walk、ac-12、ac-19、ac-22、a11y、ac-16、nfr-02、design-diagrams、ac-18-storage-disabled、view-boot.test 等，每处注释写明原因），主题切换的 e2e 在 `ac-26-docs-style.spec.ts`。对后续任务的影响见架构 §13.12。

**目标**：全站换成 design v3 的外壳（FR-72、FR-16 的断点、FR-23）：令牌按 design §3 改；首页以外的页面是“顶栏 + 侧边栏 | 正文区”两栏，≥720px 侧边栏常驻、独立滚动，<720px 是抽屉；去掉页头色带和章首页一组，h1 上方一行灰色眉题；小形象挪到顶栏站名旁；~~视图切换改成两个文字按钮~~ 换成昼夜切换、页面固定原理视图（见上方用户决定）；页脚一行非官方声明。侧边栏的内容和样式先沿用 v2.2 的 `TocNav`（折叠和小节列表在 V02），正文排版沿用（V03），翻页沿用（V04）。

**涉及范围**：`src/styles/tokens.css`、`tokens.test.ts`、`base.css`、`toc.css`（断点 1100 → 720，抽屉宽度）；`src/components/SiteHeader.astro`、`ViewToggle.astro`、`ContactLinks.astro`、`Mascot.astro`（只改放置和尺寸令牌，不改画）、`SiteFooter.astro`、`Toc.astro`；`src/layouts/PageLayout.astro`、`ReferenceLayout.astro`、`BaseLayout.astro`；`src/scripts/toc.ts`（断点）；`src/content/route.yaml`、`src/lib/site.ts`、`src/lib/route/`（删除 `intro` 字段及其核对和测试，连同构建级坏内容用例 `tests/fixtures/intro-not-in-body/`，这是 FR-72 去掉的功能，架构 §13.1）；`src/lib/nav-text.ts`（`isChapterStart` 等不再用的导出删除）；`tests/e2e/ac-02-chapter-card.spec.ts` → `ac-26-docs-style.spec.ts`，以及因外壳改动失效的选择器；`docs/architecture.md` §13（改成现状）。

**依赖**：可立即开工

**建议档位**：`强` — 首个端到端骨架：断点、令牌和两个布局一起换，后面 V02–V05、V08 都挂在它定下的结构和挂载点上。

**参照**：
- 布局结构和尺寸：design §3.3、§4.0、§4.1、§4.5；参考站实测 design §1.1。
- 令牌：design §3.1 表的“浅色/深色”列；`--primary-*` 改紫色，`--radius-control`/`--radius-panel` 合并成 `--radius`（6px），新增 `--radius-pill`、`--sidebar-width`（平板 256px、桌面 300px）、`--measure: 740px`；1100px 的媒体查询改成 960px。
- 顶栏右侧为搜索留一个空挂载点（`<div data-search-slot hidden>`），V08 填。
- 侧边栏：`Toc.astro` 现有的 `aside[data-toc-sidebar]` + `<dialog>` 两份结构保留（架构 §13.11 R-5），`position: sticky; top: 0; max-height: 100vh; overflow-y: auto`。
- 眉题挂载点 `[data-route-progress]`、`[data-route-total]` 名字不变，`route-enhance.ts` 不改逻辑。
- 边界：360px 顶栏全部元素放得下（design §4.0 预算），不出现横向滚动；没有 JS 时昼夜切换隐藏（原写“视图切换隐藏”）、≥720px 侧边栏可点、<720px“目录”是链接。

**验收**：
- [ ] 测试：`npm test`（`tokens.test.ts` 含 design §3.1 新增的对比度组合）
- [ ] 构建：`npm run check`
- [ ] e2e：`npx playwright test tests/e2e/ac-26-docs-style.spec.ts tests/e2e/ac-16-responsive.spec.ts tests/e2e/ac-25-contact.spec.ts tests/e2e/a11y.spec.ts`，再跑全量 `npm run test:e2e`
- [ ] 手工验证：1280 打开 `/import-proxy/` → 顶栏白底细线，左边“Re:”标记、站名、小形象，右边昼夜切换（原写“视图切换”）和四个联系图标；没有浅紫色带；h1 上方有眉题；左侧侧边栏独立滚动。768 → 侧边栏仍常驻；719 → 没有侧边栏，点“目录”打开抽屉。360 → 顶栏不横向滚动

### V02 侧边栏按章折叠并列出当前页小节

**目标**：FR-16 的 v3 行为（AC-27）：每章一个 `<details>`，只展开当前页所在的章，点章名开合（不写本机）；当前页下面列出它原理版正文的 h2（用户 2026-10-22 决定去掉视图切换、页面固定原理视图，架构 §13.12，不再按视图切换）；当前项 600 `--accent` + 4px 左边线；分叉点、其他路线、原理、可跳过的标记按 design §4.5。

**涉及范围**：`src/pages/[page].astro`、`src/pages/faq/*.astro`、`src/pages/ip-tests/*.astro`（把 `render()` 的 `headings` 传下去，参考页记下要高亮的上级）、`src/layouts/PageLayout.astro`、`ReferenceLayout.astro`（新参数 `sections`、`currentReference`）、`src/components/Toc.astro`、`TocNav.astro`、新建 `TocItems.astro`、`TocSections.astro`、`src/lib/toc-sections.ts`、`src/styles/toc.css`、`src/scripts/toc.ts`（只在需要时调整对 `<details>` 的重画）；`tests/e2e/ac-27-sidebar.spec.ts`（新）、`src/components/TocNav.test.ts`（新）、`toc-helpers.ts`。

**依赖**：依赖 V01

**建议档位**：`标准` — 结构和接口在架构 §13.3、§13.11 R-1 已定，沿用 `TocNav` 的标记契约。

**参照**：
- 接口：`tocSections(headings)` 只取 `depth === 2`，`PageLayout` 和 `ReferenceLayout` 的新参数 `sections: { slug: string; text: string }[]`；固定原理视图，所以只有一份列表、没有 `data-view-only`。
- 参考页：`ReferenceLayout` 的 `currentReference` 是常见问题或 IP 质量实测合集的标识；各条问题、各篇实测高亮上级，附录章跟着展开；子页也把 `headings` 传下去，小节挂在上级项下面，锚点仍落在子页正文。
- 链接锚点直接用 `headings` 的 `slug`；`toc.ts` 按 `outline()` 改写弱化和当前项的逻辑不变，不碰 `<details>` 的开合；首页和找不到页的目录（`TocNav` 不传 `collapsible`）不折叠。
- 边界：没有 h2 的页面不输出列表；当前章是附录时参考页也展开附录章；旁支页不在目录里，不标当前项，但用 `openChapterId` 展开它所属的章。

**验收**：
- [ ] 测试：`npx vitest run src/components/TocNav.test.ts`
- [ ] e2e：`npx playwright test tests/e2e/ac-27-sidebar.spec.ts`（768、1280；用例里另设 719 宽）
- [ ] 手工验证：1280 打开 `/import-proxy/` → 只有第 1 章展开；点“注册和订阅”展开它；`/faq/reinstall/` → 附录章展开、“常见问题”高亮；`/ip-tests/voyracloud/` → “IP 质量实测合集”下列出两个 h2，点一个滚到正文；禁用 JS → 章仍能开合

### V03 按 design v3 重排正文和内容组件

**目标**：正文栏的排版和内容组件按 design §3.2、§4.7（FR-72 的正文栏）：h1–h4 字号和 h2 下边线；正文 16px/1.75、最大 740px；正文链接下划线、导航链接不加；行内代码 4px、代码块 6px 圆角；表格全格线 + 隔行；提示块“浅底 + 4px 左色条”（普通提示、作者待补、caution；视图提示随固定原理视图删除，架构 §13.12）；截图 4px 圆角 + 细边框；QQ 群入口改成提示块样式。

**涉及范围**：`src/styles/tokens.css`、`tokens.test.ts`、`src/styles/prose.css`、`code-zoom.css`、`src/components/CodeCopy.astro`、`GroupInvite.astro`（只改样式和外层结构）、`src/lib/content/markdown.ts`（只在提示块标签需要改时）；`tests/e2e/ac-12-author-todo.spec.ts`、`ac-24-qq-group.spec.ts`、`nfr-02-copy-zoom.spec.ts` 的选择器，`ac-26-docs-style.spec.ts` 补正文和内容组件的样式断言。

**依赖**：依赖 V01

**建议档位**：`标准` — 纯样式，规格全在 design §3.2、§4.7。

**参照**：design §4.7 的表逐行实现；对比度组合已在 V01 的 `tokens.test.ts` 里；表格第一列粘性固定和横向滚动沿用 `rehype-scrollable-tables.ts` 的输出。边界：360 下表格、代码块只在自己的容器里横向滚动；深色模式的隔行和提示块底色对比度。

**验收**：
- [ ] e2e：`npx playwright test tests/e2e/ac-26-docs-style.spec.ts tests/e2e/ac-12-author-todo.spec.ts tests/e2e/ac-24-qq-group.spec.ts tests/e2e/nfr-02-copy-zoom.spec.ts tests/e2e/ac-16-responsive.spec.ts tests/e2e/a11y.spec.ts`
- [ ] 手工验证：浅色和深色下看 `/ip-tests/`（表格）、一页有“作者待补”的页面、`/plan2-residential-server/`（代码块和截图）→ 和 design §4.7 一致

### V04 文字链接翻页和选择页卡片

**目标**：AC-30 和 design §4.1、§4.2、§4.6 的翻页：正文末尾细线下“← 上一步 / 标题”和“下一步 → / 标题”，可点区域 ≥44px；“跳过”是下一步下面的一行小字；旁支页、参考页的“回到”“返回刚才的步骤”同样式；手机不再吸底。选择页的选项改成细边框卡片，去掉编号圆圈和箭头，“推荐”“当前选择”沿用。

**涉及范围**：`src/components/StepNav.astro`、`src/layouts/PageLayout.astro`（去掉底栏预留空白）、`ReferenceLayout.astro`（回到/返回的块）、`src/lib/content/option-blocks.ts`（不再插编号和箭头）及其测试、`src/styles/prose.css`（选项卡片）；`tests/e2e/ac-30-page-nav.spec.ts`（新）、`ac-03-choice-blocks.spec.ts`、`ac-05-skip.spec.ts`、`ac-11-reference-return.spec.ts`、`ac-19-side-page.spec.ts`、`ac-16-responsive.spec.ts` 的选择器。

**依赖**：依赖 V03

**建议档位**：`标准` — 导航数据和 `route-enhance` 的改写逻辑不变，只换标记和样式。

**参照**：`route-enhance.ts` 改写的挂载点（链接地址、目标标题、跳过）名字保持不变；`option-blocks.ts` 保留 `data-recommended` 和整块可点的结构；“当前选择”标签 `span.option-current` 沿用。边界：只有上一步或只有下一步时各靠自己一侧；标题很长时折行不截断；选择页未选时没有“下一步”。

**验收**：
- [ ] 测试：`npx vitest run src/lib/content/option-blocks.test.ts`
- [ ] e2e：`npx playwright test tests/e2e/ac-30-page-nav.spec.ts tests/e2e/ac-03-choice-blocks.spec.ts tests/e2e/ac-05-skip.spec.ts tests/e2e/ac-19-side-page.spec.ts tests/e2e/ac-11-reference-return.spec.ts`
- [ ] 手工验证：已选方案一，打开 `/plan1-panel/` → 正文末尾左“← 三、把服务器变成节点”、右“导入代理软件 →”，没有黑色按钮，“跳过”在下面一行；360 下两个链接高度 ≥44px，页面底部没有吸底栏

### V05 VuePress 式首页和找不到页

**目标**：FR-18、AC-29 和 design §4.4、§4.6：首页没有顶栏和侧边栏，首屏居中放 logo（h1，`aria-label` 含站名和英文副标题）、小形象、一句话（构建核对保留）、紫色主按钮“从第 00 章开始 →”、QQ 群小字；下面一条线，按章列五章简介（**作者 2026-10-22 看过上线首页后调整**）：章名（h2，不写“第几章”，链到这一章第一页）和 `route.yaml` 的 `summary`，不列具体页面；桌面五栏一行、平板三栏、手机一栏，页脚居中。找不到页换成 v3 的顶栏和正文栏，`404` 固定字形保留。删除不再使用的章节副标题和章级索引。

**涉及范围**：`src/pages/index.astro`、`src/content/route.yaml`（章节 `summary`）、`src/lib/route/types.ts`、`route-map.ts` 及测试、`src/pages/404.astro`、`Logo.astro`（`aria-label` 文案）、`GroupInvite.astro`（紧凑版样式）；删除 `TocNav`/`TocItems` 的首页变体和 `toc.css` 的 `.toc-home`；删除 `ChapterSubtitle.astro`（及测试）、`src/assets/numerals/chapter-0X.svg`，`scripts/build-logo.mjs` 和 `build-logo.test.ts` 去掉对应输出；`NumeralSprite` 只在找不到页内联；`AGENTS.md` 的生成物清单；`tests/e2e/ac-01-home.spec.ts`、`ac-29-home.spec.ts`（新）、`ac-18-not-found.spec.ts`。

**依赖**：依赖 V01

**建议档位**：`标准` — 规格在 design §4.4，构建核对沿用 #38 的实现。

**参照**：一句话的核对在 `src/pages/index.astro`（#38）；五章简介读 `RouteData.chapters` 的 `title`、`summary`；章名链接取这一章第一项（分支段取第一个选项的第一个页面）；logo 的 `aria-label` 在 `Logo.astro` 的 `defaultTitles`；`build-logo.mjs` 的输出要和 `build-logo.test.ts` 一致（生成物不手改，删输出后重跑脚本，需要 `.cache/fonts/`）。边界：手机 logo 满宽减边距；首页仍没有“继续上次”和已读标记（AC-10）；没有 JS 时“目录”落在首页章节简介，从章名进入这一章。

**验收**：
- [ ] 测试：`npx vitest run scripts/build-logo.test.ts`
- [ ] e2e：`npx playwright test tests/e2e/ac-29-home.spec.ts tests/e2e/ac-01-home.spec.ts tests/e2e/ac-18-not-found.spec.ts tests/e2e/ac-10-no-progress.spec.ts`
- [ ] 手工验证：360 和 1280 打开首页 → 首屏居中的 logo、一句话、主按钮、QQ 群小字；下面五章简介（1280 五栏一行、360 一列），只有章名和一句简介，没有“第几章”和页面列表，没有侧边栏；打开 `/nope/` → v3 顶栏 + 大号 404

### V06 站内搜索的索引和匹配

**目标**：FR-24 的数据部分（架构 §13.2，新模块 M6）：构建时把路线图里全部页面的标题和正文的 h2、h3，以及保留的参考页（IP 质量实测合集和 6 篇实测）的标题和 h2 做成 `search-index.json`（v3 单版本，只有一版正文）；浏览器用纯函数 `search()` 匹配并给出最多 10 条、已选好锚点的结果。不做界面（V08）。

**涉及范围**：`src/lib/search/index.ts`、`index.test.ts`（新）；`src/pages/search-index.json.ts`（新，静态端点）；`src/lib/site.ts`（导出页面顺序和参考页）；`docs/architecture.md` §13.2 改成现状。

**依赖**：可立即开工

**建议档位**：`标准` — 接口签名、匹配和排序规则都在架构 §13.2 写定；单版本比原计划少一半数据。

**参照**：
- 签名：`buildSearchIndex(sources: SearchSource[]): SearchEntry[]`、`search(index, query, limit = 10): SearchHit[]`。`SearchSource = { path: string; title: string; order: number; headings: Heading[] }`（页面用 `/<id>/`，参考页用 `/ip-tests/…`），`Heading` 取 Astro `MarkdownHeading` 的 `depth/slug/text`；不再有 `view` 参数和两版合并。
- 端点：`export const GET`，不需要 `getStaticPaths`；用 `loadSite()` 的页面清单和 `render()` 的 `headings`，参考页用 `site.references` 和 reference 集合（只有 `ip-tests` 和 6 篇实测）。跳转页（V09 之后的 `moved:`）、首页、找不到页不进索引。
- 规范化：`normalize = s => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '')`。
- 排序：页面标题命中 > 小标题命中；开头命中 > 中间命中；再按 `order`。
- 锚点：`href` 是 `withBase(path + '#' + slug)`；页面标题命中的 `href` 是 `withBase(path)`。
- 边界用例：空查询返回空；“时区”命中 `client-desktop` 的“改时区”；大小写和全角半角（`ＩＰ`、`ip`）都命中；同一个小标题在多个页面出现时各算一条；结果超过 10 条截断；同分按目录顺序；`overview`、`client-desktop` 这类选择页也要进索引；`ip-tests/voyracloud` 这类参考页也在索引里。

**验收**：
- [ ] 测试：`npx vitest run src/lib/search/`
- [ ] 构建：`npm run build`，然后 `node -e "const i=require('./dist/search-index.json');console.log(i.length, i.some(e=>e.path==='/maintenance/'), i.some(e=>e.path==='/ip-tests/voyracloud/'))"` 输出条数和两个 `true`
- [ ] 手工验证：看 `dist/search-index.json` 体积在几 KB 量级，没有正文段落；索引里没有 `faq`、首页和找不到页

### V07 小节锚点和落点

**目标**：ADR-0006 第 3 条和架构 §13.4：小节 id 在单版本下稳定；`[[页面#小标题]]`（新稿是同一页的 `[文字](#小标题)`，导入后也不再有跨页双链）解析到 `#<slug>`，目标不存在时构建失败；页面脚本 `section-hash` 在加载和 `hashchange` 时滚到小节，并处理从搜索/旧网址带 `#小节` 进来的情况。不切视图（V01 已固定原理视图）。

**涉及范围**：`src/lib/content/link-index.ts`（`IndexedPage.headings` 只留一版）、`remark-obsidian.ts`（锚点解析）、对应测试；`src/lib/section-anchor.ts`（新，纯函数）；`src/scripts/section-hash.ts`（新）和测试、`src/layouts/PageLayout.astro`（加载脚本，一行）；`tests/e2e/section-hash.spec.ts`（新或改写）；`docs/architecture.md` §13.4 改成现状。

**依赖**：可立即开工

**建议档位**：`标准` — 单版本不再需要跨视图选锚点，规则比原计划简单；V08、V09 复用“小节 → 锚点”的校验。

**参照**：
- 纯函数 `sectionAnchor(headings, text): string | undefined`（放 `src/lib/section-anchor.ts`）：按标题文字（先精确、再规范化）找唯一的 slug；M1 构建时和 V09 的跳转页共用。
- `section-hash.ts`：解码 `location.hash`；找 `[data-body="principle"] #slug`（或正文容器里的 `#slug`）；`scrollIntoView()`；hash 不是小节（如 `#main`）时不处理；没有 JS 时浏览器原生跳转照常工作。
- 新稿没有跨页小节双链，构建级坏内容用例改成“同一页的 `[文字](#不存在的小节)`”和“`moved:` 的 `section` 不存在”，沿用 AC-14 的机制（`tests/build/ac-14-build-fail.test.ts` 加一条）。
- 不引用 `view-toggle.ts`（已删除）、不引用 `OPERATION_ID_PREFIX`（操作版在 V10 删除，V07 不等它）。

**验收**：
- [ ] 测试：`npx vitest run src/lib/content/ src/lib/section-anchor.test.ts src/scripts/`
- [ ] 构建级：`npm run test:build`
- [ ] e2e：`npx playwright test tests/e2e/section-hash.spec.ts`（打开 `/maintenance/#ssh-提示-permission-denied` 这类地址 → 小节在视口内；点击正文里的 `#小节` 链接同样滚过去；改 hash 也生效）

### V08 顶栏搜索框

**目标**：FR-24、AC-28 和 design §4.8 的界面：桌面和平板是胶囊输入框，手机是放大镜按钮、点开后盖住顶栏；输入后下拉最多 10 条（页面标题，命中小标题时第二行写小标题），上下键、回车、Esc；没有结果“没有找到”；第一次聚焦才下载 `search-index.json`，请求里没有搜索文字；打开小标题结果直接滚到小节，不切视图。

**涉及范围**：`src/components/SiteSearch.astro`（新）、`src/scripts/search.ts`（新）和测试、`src/components/SiteHeader.astro`（填 V01 留的挂载点）、`src/styles/`（搜索的样式，新文件 `search.css`）；`tests/e2e/ac-28-search.spec.ts`（新）、`ac-26-docs-style.spec.ts`（补搜索框的断言）。

**依赖**：依赖 V01、V06、V07

**建议档位**：`标准` — 数据和落点分别由 V06、V07 提供，这里按 ARIA combobox 模式和 design §4.8 做界面。

**参照**：ARIA APG 的 combobox（list autocomplete）模式；索引地址 `withBase('/search-index.json')`；打开结果时直接改 `location.href`（带 `#小节`），由 `section-hash` 滚动，不读本机视图；抽屉的打开/关闭和焦点归还参照 `src/scripts/toc.ts`。边界：输入法组字时（`compositionstart`/`compositionend`）不触发搜索；索引下载失败时下拉显示“搜索暂时不可用”且不报错；360 下打开后没有横向滚动；没有 JS 时控件 `hidden`。

**验收**：
- [ ] 测试：`npx vitest run src/scripts/search.test.ts`
- [ ] e2e：`npx playwright test tests/e2e/ac-28-search.spec.ts tests/e2e/ac-26-docs-style.spec.ts tests/e2e/a11y.spec.ts`
- [ ] 手工验证：搜“时区”→ 有“改时区”，回车打开；搜“zzzz”→“没有找到”；DevTools 网络面板里只有一次 `search-index.json` 请求、不带查询文字

### V09 跳转表和旧网址跳转页

**目标**：FR-25、ADR-0006：`route.yaml` 新增 `moved:` 段（旧标识 → `{ to, section? }`，或按分叉点选择 → `{ choice: { fork, options: { <option>: { to, section } }, fallback: { to, section } } }`）和校验；`[page].astro` 为每个单段旧标识生成跳转页，多段的参考页路径（`faq/<id>`）用 `src/pages/[...moved].astro` 生成同样的跳转页；跳转页内联脚本按 M4 的选择用 `location.replace` 到目标页的小节，meta refresh 指向 fallback 的锚点，`canonical`、`noindex`，正文“这一页已经并入《…》”和链接；sitemap 过滤旧标识；`REMOVED_PAGES` 和 `astro.config.mjs` 的 `redirects` 删除，`plan1-free-isp → choose-plan` 迁进 `moved:`（V10 换页面地图时同步改成 `overview#方案一和方案二`，避免目标页被删后构建失败）。`moved:` 的键除了页面标识，还要能收 `faq/<id>` 这类旧参考页路径，它们同样生成跳转页，但不进路线图、目录、搜索和 sitemap；`/ip-tests/…` 保留，不写 `moved:`。

**涉及范围**：`src/content/route.yaml`、`src/lib/route/route-map.ts`、`types.ts` 及测试（`moved` 的解析和校验、`choice`）、`src/lib/site.ts`（`section` 对照 M1 的 headings）、`src/pages/[page].astro`、`src/pages/[...moved].astro`（新，多段参考页路径）、`src/components/MovedPage.astro`（新）、`src/scripts/moved.ts`（新，读 M4 的选择）、`astro.config.mjs`；`tests/fixtures/moved-*`（目标不存在、小节不存在、旧标识被复用、串联、参考页路径、choice 的选项和 fallback）；`tests/build/ac-14-build-fail.test.ts`；`tests/e2e/ac-33-moved.spec.ts`（新）、`ac-15-base-path.spec.ts`；`docs/adr/0002`、ADR-0006 和架构的“现状”。

**依赖**：依赖 V07

**建议档位**：`强` — 已发布 URL 的契约和路线图的数据迁移；跳转页还要在根路径和子路径下、按本机选择都正确。

**参照**：ADR-0006 的“Consequences”是校验清单；锚点用 V07 的 `sectionAnchor()`；地址一律 `withBase()`（架构 §13.11 R-6）；sitemap 过滤沿用 `astro.config.mjs` 现有的 `filter`；`RouteData` 不收录旧标识（目录和搜索自然不含）。边界：没有 `section` 的条目跳到目标页顶部；旧标识等于保留字或现有页面标识时构建失败；`to` 是另一个旧标识时构建失败；参考页路径的键只能以 `faq/` 开头，段内仍是 kebab-case；`section` 必须在目标页的标题里存在；`choice.fork` 必须是路线图里的分叉点，`choice.options` 的键要和该分叉点的选项一致，`choice.fallback` 必须有；M4 读写失败或没有选择时用 fallback（没有 JS 时也停在 fallback）。

**验收**：
- [ ] 测试：`npx vitest run src/lib/route/ src/lib/site.test.ts src/scripts/moved.test.ts`
- [ ] 构建级：`npm run test:build`
- [ ] e2e：`npx playwright test tests/e2e/ac-33-moved.spec.ts tests/e2e/ac-15-base-path.spec.ts`（无痕打开 `/plan1-free-isp/` → 到 `/choose-plan/`；V10 换页面后这条改成 `/overview/#方案一和方案二`；禁用 JS → 看到“已经并入”和链接；带 `choice` 的样例在 localStorage 里选了 iPhone/安卓 → 落到各自目标，没选 → 落到 fallback；用 `SITE_URL=https://example.test npm run build` 构建后，`dist/sitemap-0.xml`、`dist/search-index.json` 里没有 `plan1-free-isp`；子路径同样跳对）

### V10 换成 v3 单版本的页面和路线图

**目标**：按 `docs/v3-rewrite/` 的 11 个文件把站点内容换成单版本（FR-01、FR-03、FR-04、FR-05、FR-12、FR-16）：`src/content/principle/` 只留 11 页，删除操作版和常见问题页，保留 IP 质量实测参考页；导入脚本按“一章一文件”原样导入，并把相对 Markdown 链接转成站内链接；`route.yaml` 按 §3.1 的 5 章 2 个分叉点重写；选择页的选项卡片改由 frontmatter 生成；侧边栏去掉章节号；构建、单测和构建级用例通过。

**涉及范围**：`src/content/principle/`（只留 11 个）、`src/content/operation/`（删）、`src/content/reference/`（只留 `ip-tests` 和 6 篇实测）、`src/content/route.yaml`、`src/content.config.ts`、`src/lib/content/`（schemas、link-index、校验）、`src/lib/site.ts`（`TOC_REFERENCES` 只留 `ip-tests`）、`src/lib/search/`（V06 写的单版本）、`src/components/TocNav.astro`、`TocItems.astro`、`toc.css`（章节号）、`src/components/`（选项卡片）、`src/pages/faq/`（删）、`src/pages/[page].astro`、`scripts/import-rewrite.mjs`、`scripts/compare-migration.mjs`、`tests/`、`tests/fixtures/`。

**依赖**：V02、V09；作者已确认 §3.1。

**建议档位**：`强` — 内容模型、路线图和已发布 URL 同时换，跨 M1/M2/M3/M6。

**步骤**：
1. **附件和参考页**：把 `docs/rewrite/附件/` 里新稿引用的图（33 张，已核对名字都在）移到 `docs/v3-rewrite/附件/`；`IP 质量实测合集.md` 和 6 个 `实测：*.md` 移到 `docs/v3-rewrite/reference/`（图片一起移）。新稿没有引用到的旧截图和常见问题文件随旧稿在 V11 删除。旧稿 `docs/rewrite/` 在 V11 同步 Writing 之后再删，V10 当只读历史。
2. **页面骨架**：手建 `src/content/principle/<id>.md` 11 个，只写 `# 标题` 和必要 frontmatter；`overview` 写 `options: { plan-1, plan-2 }`（保留 `default: plan-2`），`client-desktop` 写 `options: { iphone, android }`（选项标题取自 §3.1）。删除其余旧页面、整个 `operation/`、`reference/faq*` 和常见问题目录；`reference/ip-tests*` 保留。
3. **导入**：`import-rewrite.mjs` 默认读 `docs/v3-rewrite/`，按标题匹配站点文件；单版本，不再找 `操作版/`；把 `[文字](02-….md)` 转成 `[[目标页标题|文字]]`（文字与标题相同时省略 `|`），同一页的 `[文字](#小节)` 原样保留；图片从 `docs/v3-rewrite/附件/` 复制到 `src/assets/screenshots/`，说明图到 `src/assets/diagrams/`；参考页从 `docs/v3-rewrite/reference/` 导入 `reference/`；连跑两次第二次无改动。
4. **路线图**：按 §3.1 写 5 章和 2 个分叉点；`overview` 和 `client-desktop` 用 `{ choose: …, page: … }`；章节 `summary` 先按新章名写（作者可直接改）；`side:` 删掉（新稿没有旁支页）；`TOC_REFERENCES` 只留 `ip-tests`，挂在 `maintenance` 章末（把 `showReferences` 从“最后一章”改成按章标识判断）；V09 迁过来的 `plan1-free-isp` 同步改成 `overview#方案一和方案二`（旧目标 `choose-plan` 在这一步被删）。
5. **选择页卡片**：V04 的样式保留，但不再要求正文里有加粗的 `heading` 块；选项由 frontmatter 的 `options` 生成卡片，挂在正文末尾，`data-option-start` 指向每个选项的第一步。`options` schema 去掉 `heading` 字段，`link-index` 不再按正文标题拆选项。选择页没有“下一步”，选项卡片就是导航。
6. **侧边栏去掉数字**：`TocNav.astro` 删掉 `第 {chapterIndex} 章` 和 `.toc-chapter-no`，侧边栏、抽屉和找不到页的目录都只显示章名；方案一/方案二仍在“准备节点和住宅 IP”一章的分叉点选项里，iPhone/安卓在“客户端配置与订阅”一章；`TocNav.test.ts` 和 `ac-27-sidebar` 改成断言没有章节号。
7. **参考页和操作版**：删 `src/pages/faq/`、FAQ 相关组件和 `site.tocReferences` 里的 `faq`；保留 `src/pages/ip-tests/`、`ReferenceLayout` 的参考页分支、`site.references` 和 `ip-tests` 的返回路径；`TocNav`/`TocItems` 的参考页挂在 `maintenance` 章（不再固定最后一章），`chapterOpen` 对参考页也展开这一章；删 `schemas.operationSchema`，`referenceSchema` 保留给实测页。`[page].astro` 只渲染唯一的正文。
8. **校验**：`checkPages`/`checkLinks` 改成单版本；`compare-migration.mjs` 对照 `docs/v3-rewrite/` 的一版（参考页仍对照旧稿的 7 个文件）；AC-13 的比对口径同步。**不许**放宽缺图、缺页、缺锚点的校验。
9. **休眠代码和测试**：M2/M4 的 `view`/`principleOnly`/`skippable` 字段先留着（V01 已固定原理视图，`principleOnly` 统一为 false）；`operation` 相关测试删除或改写成“页面只有一版”。先改因页面删除而必然失败的 e2e（`ac-02-walk` 改成 4 种组合、`ac-26` 换成新页面、`ac-27` 的章节号、`ac-33` 的 `plan1-free-isp` 目标）；旧页面专有的测试删掉或写成 V11 的待办。V10 合并后到 V11 合并前，旧网址会暂时 404，**main 不发版**。

**验收**：
- [ ] `npm run check`、`npm run test:build` 通过
- [ ] 构建后 `dist/` 有 11 个页面、首页、404、`search-index.json`、`ip-tests/` 和 6 篇实测；没有 `faq/`
- [ ] e2e 冒烟：`npx playwright test tests/e2e/ac-02-walk.spec.ts tests/e2e/ac-26-docs-style.spec.ts tests/e2e/ac-27-sidebar.spec.ts`（4 种组合：plan1/plan2 × iphone/android 能从前言走到后记；选择卡片可点；侧边栏、抽屉和找不到页目录都没有章节号）
- [ ] `node scripts/compare-migration.mjs` 通过：11 个文件的命令、外链、截图和正文都在，7 个实测页和旧稿一致
- [ ] 手工：`/overview/` 正文末尾是方案一/方案二两张卡片；`/client-desktop/` 末尾是 iPhone/安卓两张卡片；`/maintenance/` 的长页侧边栏列出 h2/h3，章末有“IP 质量实测合集”
- [ ] 作者确认 11 页标题、章节名和侧边栏（§3.1）

**不要做**：不填其余旧标识的 `moved:`（V11）、不改需求/架构/ADR 文字（V11）、不动样式令牌。

### V11 旧网址、验收和文档同步

**目标**：把 §3.1 里全部旧标识（页面和 `faq/<id>` 路径）写进 `moved:`，手机相关的旧页按已选手机系统分流，旧网址都能跳到新页面和小节；保留的 `/ip-tests/` 和 6 篇实测继续可用；按新页面改写 e2e 和验收项；更新需求/架构/ADR/design/migration-checklist/AGENTS；同步 Writing 和大肥鱼；删除旧稿。

**涉及范围**：`src/content/route.yaml`、`tests/e2e/`、`docs/requirements.md`（§0.2、§5.2、FR-05、FR-12、FR-16、FR-20、FR-25、FR-30、FR-31、AC-02/03/04/05/08/09/11/19/22/23/27/28/30/32/33）、`docs/architecture.md`（§3 M1、§13.2、§13.4、§13.5、§13.6、§13.12）、`docs/adr/0002`、`docs/adr/0006`、`docs/design.md`（§4.4 五栏章名/简介、§4.5 侧边栏无章节号）、`docs/migration-checklist.md`、`AGENTS.md`、`README.md`、`docs/delivery.md`；`docs/rewrite/`（删）；Writing、大肥鱼两个仓库。

**依赖**：V10

**建议档位**：`强` — 已发布 URL 的完整迁移（含按本机选择分流），加三个仓库的同步。

**步骤**：
1. 按 §3.1 的表逐条写 `moved:`；手机相关的 6 个旧页写成 `choice: { fork: phone, options: { iphone, android }, fallback: client-desktop#下一步 }`；FAQ 的 8 条写成 `faq/<id>` 键，`/faq/` 本身跳到 `maintenance`；`/appendix/` 跳到 `maintenance`；`/ip-tests/…` 保留、不写 `moved:`；`plan1-free-isp` 已在 V10 改好，不在这里重做。
2. 跑 `ac-33-moved` 覆盖每一条（至少每个目标页一条）；分别用 localStorage 设 iPhone/安卓/不设，确认三个去向；禁用 JS 看 fallback、“已经并入”和链接；子路径构建再跑一次；确认 sitemap 和 `search-index.json` 里没有旧标识、但有 `ip-tests`。
3. 补齐 V10 没改完的 e2e：AC-02 的 4 种组合（方案一/二 × iPhone/安卓）在 V10 已能走通，这里补断言；AC-03/04 改成分叉在 `overview`/`client-desktop` 上；AC-05、AC-30 的“四、打开面板”“跳过”改成 `plan1` 内的小节（新稿没有可跳过页面，跳过按钮不再出现，断言改成“没有跳过按钮”并写明 FR-15 在当前内容下没有适用页）；AC-08/09/11/19/22 改成新页面；AC-23 从常见问题改成 `/ip-tests/` 和 6 篇实测的目录与返回；AC-27 加“侧边栏没有章节号”；AC-28 加“搜得到一篇实测”；AC-32 改成“新稿 11 页和 §3.1 的合并关系一一对应，7 篇实测和旧稿一致”；AC-33 全量。
4. 更新需求：§0.2 改成“新稿 11 章、单版本；方案三、独立常见问题、附录不收录；IP 质量实测合集保留为参考页”；§5.2 换成 §3.1 的页面地图和参考页表；FR-05 的机械合并改成“作者已在新稿里合并，站点只导入”；FR-12 的选择页改成“分叉点的正文页末尾渲染选项卡片”；FR-16 写明侧边栏不显示章节号、方案在同一章下；FR-20 参考页只留 IP 实测合集，常见问题并入正文；FR-25 的锚点规则改成单版本并支持按手机选项分流；FR-30/FR-31 标为已取消；AC 按第 3 步改。
5. 更新架构：§3 M1 改成单集合（11 页）+ 保留的 `ip-tests` 参考页、M3 的参考页/选择页、§13.2 搜索只有一版（含实测页）、§13.4 锚点、§13.5 标为“不再执行（新稿已合并）”、§13.6 跳转页的 `choice`、§13.12 现状。
6. ADR-0002 记一次作者批准的标识例外（§3.1 的新标识）；ADR-0006 的合并清单换成 §3.1 的表，并写清“同角色沿用旧标识、合并页新标识、手机旧页按选项分流、实测页保留”；design §4.4 的五栏章名和简介按新章名更新（文案由作者改），§4.5 去掉侧边栏的章节号。
7. 同步 Writing：把 `docs/v3-rewrite/` 的 11 个文件按 Writing 的目录和链接规则落到 `docs/04技术/`（Writing 里的相对链接改成 wiki 链接、保留 frontmatter/slug），7 篇实测留在原处并核对内容没变，截图和说明图到 `docs/09附件/`；删掉 Writing 里被合并的旧页和常见问题；在 Writing 单独提交“同步订阅教程：……”。
8. 大肥鱼：本仓库合并后运行 `build_corpus.py` 重新生成 `corpus.json`，按它的 README 同步（上服务器前先问作者）。
9. 删除 `docs/rewrite/`；把 AGENTS 的“文章同步”和目录说明改成 `docs/v3-rewrite/`；更新 README 的页面清单和 delivery.md 的 v3 小节。

**验收**：
- [ ] `npm run check`、`npm run test:e2e`（含 `BASE_PATH=/sub/`）全部通过；AC-31 的全量回归在 V12 再跑一次
- [ ] `ac-33-moved` 覆盖 §3.1 的每一条旧标识（含 6 条按手机分流的）；无 JS、子路径、sitemap、搜索索引都对
- [ ] `/ip-tests/` 和 6 篇实测能打开，侧边栏有入口，“回到”正确，搜索能搜到
- [ ] 侧边栏、抽屉和找不到页的目录都没有章节号；方案一/方案二在同一章下
- [ ] `docs/` 里搜索“操作版”“两版”“merge-rewrite”“docs/rewrite”没有过时说法（历史附录除外）；“参考页”只指 IP 实测
- [ ] Writing 和大肥鱼按各自规则完成（大肥鱼上服务器前已问作者）
- [ ] 作者确认合并后的页面标题、侧边栏和旧网址去向

**不要做**：不改新稿正文（要改就改 `docs/v3-rewrite/` 再导入）；不删检查项，只按 AC-31 改成新页面/小节。

### V12 v3 视觉验收和全量回归（待细化）

**目标**：design §7 的截图对照（360/768/1280，深浅两色，清单见 design §7）；按 §3.1 的 11 页、7 个参考页和 4 种路线全量跑 AC-26–AC-33 和 AC-01–AC-25（AC-31），包括 axe、键盘、对比度；结果写进 delivery.md 的 v3 小节；版本升到 3.0.0（task-closeout 打标签）。

**涉及范围**：`tests/e2e/`（只补缺口）、`docs/delivery.md`、`package.json` 的 `version`。

**依赖**：依赖其余全部任务

**建议档位**：`标准` — 照 design §7 和需求 §8 核对，参照 #40（v2.1 视觉验收）。

**验收**（细化时补全）：`npm run check`、`npm run test:e2e` 全部通过；截图对照的发现逐条修完或登记为待补项；§3.1 的 11 页和 7 个参考页都至少在 360、768、1280 下看过一次，长页（`plan1`、`maintenance`、`iphone-subscription`）重点看侧边栏小节和锚点；侧边栏在三种宽度下都没有章节号。

## 5. 检查点（v3）

- **V01 合并后**：在作者的手机上看一次顶栏（360 预算、design §9 待确认第 2 条：正文 16px 是否太小）和首页以外的一页；回看本计划 V02–V05 的拆分是否仍然合适。
- **V05 合并后**：作者确认首页首屏（design §9 待确认第 1 条：站名和英文副标题由 logo 承担）。
- **V10 合并后**：作者在 360 和 1280 下各看一次 `overview`、`client-desktop` 的选择卡片、`maintenance` 的长页和侧边栏（没有章节号，方案在同一章下）；确认五栏章名和简介；打开 `/ip-tests/` 和一篇实测，确认入口和“回到”能用。
- **V11 合并后**：抽查每条旧网址（至少方案一 4 条、方案二、手机 2 条按 iPhone/安卓各一次、常见问题 1 条、附录 1 条）都落到新页面和小节；没有选择手机时落到 `client-desktop#下一步`。
- **全部完成**：V12 通过后，交 project-delivery 做 3.0.0 上线前整体验收（部署需要作者另行授权）。

---

## 附：v2.1 实施计划（2026-10-16，历史）

- v2.2：**已完成（2026-10-19）**，计划和执行记录见 [v2.2 改版计划](v2.2-plan.md)（作者 2026-10-17 同意，一次会话做完，没有建 Issue）；实现和计划的出入见 design §8、架构 §12，验收结果见 [delivery.md](delivery.md) v2.2 小节。
- 状态：**v2.1 计划（2026-10-16，作者同意）**，把代码从[设计 v2.0](design.md)（#31 的现状）改到设计 v2.1（2026-10-16 定稿，决定 D1–D11 见 design §8）。对应需求 v0.3 的 FR-10、FR-16、FR-18、FR-70、FR-71、NFR-01、NFR-03、NFR-06，[架构 §11.4 v2.1 实施前评审](architecture.md#114-v21-实施前评审2026-10-16)。v2.0 的任务（#23–#31）已全部关闭，计划保留在下文；1.0.0 的计划在文末。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，v2.1 的标题以 `[v2.1]` 开头（2026-10-16 发布，#32–#40；W 编号与 Issue 的对应见 §3）。**任务范围、状态和完成证据以 Issue 为准**，本文只保留里程碑、顺序和链接；§4 是发布时的正文草稿。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。
- 站点版本：2.0.0 还没有做整体验收。建议 v2.1 的任务全部完成后再交 project-delivery 一起验收，发布为 2.0.0（待作者确认）。

> **首个可开工任务：[#32 [v2.1] 生成编号字形并用在找不到页](https://github.com/Finderlzy/rezero-subscribe-claude/issues/32)**（W01，建议档位：强）。新开会话，用 `task-implement` 指定 #32。**[#33 令牌和控件反馈](https://github.com/Finderlzy/rezero-subscribe-claude/issues/33)（W02，标准）可以立即并行开工**（W01 改 `scripts/`、`src/assets/`、`src/components/`，W02 改 `src/styles/`，基本不重叠）。

### 1. 里程碑（v2.1）

| 里程碑 | 交付的可用能力 | 覆盖 | 任务 |
| --- | --- | --- | --- |
| **MS8 v2.1 基础** | 固定字形的编号能在页面上显示（先用在找不到页）；三档断点和字号令牌；按钮、链接的悬停和按下反馈，视图切换按下改墨色；目录在所有宽度下都是抽屉，没有 JS 时“目录”是链接 | design §3.2、§3.3、§4.0、§4.3、§4.5、§4.6（404）、§5；D5、D7、D8、D9、D11；FR-16、NFR-03 | W01、W02、W03 |
| **MS9 v2.1 页面** | 步骤页的页边栏和步骤编号；每章第一页的章节标题卡；截图编号；首页说明书封面 + 完整目录 | design §4.1、§4.2、§4.4、§4.6（旁支）、§4.7；D2、D3、D4、D6；FR-10、FR-18 | W04、W05、W06、W07 |
| **MS10 v2.1 验收** | 三种宽度、深浅两色的截图对照和可访问性检查；说明图 | design §4.7（说明图）、§6、§7；AC-16、AC-20、AC-21 | W08、W09 |

### 2. 依赖与顺序（v2.1）

```
W01（可立即开工）──┬────────────── W03 ──┬── W04 ──┬── W05 ──┐
W02（可立即开工）──┘                     │         └── W06 ──┤
                                        └── W07 ────────────┼── W09
                                            W08 ─────────────┘
```

- **立即可开工**：W01、W02，并行时各用独立 worktree。
- W03 依赖 W01（目录的章节号换成固定字形）和 W02（抽屉过渡用 W02 定的动效令牌）。W03 先拆掉常驻侧栏，W04 再在空出来的位置做页边栏，两者都改 `PageLayout`，所以串行。
- W04 之后 W05、W06 可以并行（W05 改章节标题卡，W06 改 M1 的图片输出和 `prose.css`），都会碰 `PageLayout` 的页边栏，后合并的一方变基。W07 只依赖 W03，可以和 W04–W06 并行。
- W05 还要等作者确认四章的“一句话”，W07 要等作者确认首页的一句话和小字信息行（§6）；没确认前可以先做其余部分，文案位置留空，不能自己编。
- W08 的素材和放进页面的方式作者已定（2026-10-17，§6 第 4 条）。W09 最后做。

### 3. 任务索引（v2.1）

| 任务 | 标题 | 里程碑 | 依赖 | 档位 | 细化 | 设计章节 | Issue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W01 | 生成编号字形并用在找不到页 | MS8 | 无 | 强 | 已细化 | §3.2、§4.6、§5、§9 | [#32](https://github.com/Finderlzy/rezero-subscribe-claude/issues/32) |
| W02 | 按 v2.1 调整令牌、断点和控件反馈 | MS8 | 无 | 标准 | 已细化 | §3.1、§3.2、§3.3、§4.3、§4.7、§5 | [#33](https://github.com/Finderlzy/rezero-subscribe-claude/issues/33) |
| W03 | 目录只用抽屉，没有 JS 时链到首页目录 | MS8 | W01、W02 | 标准 | 已细化 | §4.0、§4.5、§5 | [#34](https://github.com/Finderlzy/rezero-subscribe-claude/issues/34) |
| W04 | 步骤页的页边栏和步骤编号 | MS9 | W03 | 强 | 已细化 | §3.2、§3.3、§4.1、§4.2、§4.6 | [#35](https://github.com/Finderlzy/rezero-subscribe-claude/issues/35) |
| W05 | 每章第一页的章节标题卡 | MS9 | W04、作者确认四章一句话 | 标准 | 已细化 | §3.2、§4.1、§4.2 | [#36](https://github.com/Finderlzy/rezero-subscribe-claude/issues/36) |
| W06 | 截图编号和页边注 | MS9 | W04 | 标准 | 已细化 | §4.1、§4.7 | [#37](https://github.com/Finderlzy/rezero-subscribe-claude/issues/37) |
| W07 | 首页说明书封面和完整目录 | MS9 | W03、作者确认首页文案 | 标准 | 已细化 | §3.2、§3.3、§4.4 | [#38](https://github.com/Finderlzy/rezero-subscribe-claude/issues/38) |
| W08 | 原理页的说明图 | MS10 | W04 | 标准 | 已细化 | §4.7、§9 | [#39](https://github.com/Finderlzy/rezero-subscribe-claude/issues/39) |
| W09 | 按设计 v2.1 做视觉验收 | MS10 | W05、W06、W07、W08 | 标准 | 已细化 | §6、§7 | [#40](https://github.com/Finderlzy/rezero-subscribe-claude/issues/40) |

### 4. 任务正文（v2.1，发布时的草稿，现以 Issue 为准）

公共约定（每个任务都适用）：改动按 design v2.1 的对应章节做，颜色、间距只用 `src/styles/tokens.css` 的令牌；代码注释里的 `design §x.y` 引用照旧有效（章节号和 v2.0 一致），说到版本处改成 v2.1；不放宽任何内容校验和断言；`npm run check`、`npm run test:e2e` 是每个任务的通用验收，下面只写各任务自己的。

#### W01 生成编号字形并用在找不到页

**目标**：编号用和 logo“Re”同一种细衬线（Cormorant Garamond 500）的等高数字，事先转成图形，所有设备显示一样（design §3.2、D7；FR-70 的做法；NFR-03 不加载网页字体）。本任务做出字形和渲染组件，先用在找不到页的大号 `404`（design §4.6），后续任务直接复用。

**涉及范围**：`scripts/build-logo.mjs`（新增数字和短横、四条 `− CHAPTER 0n −` 副标题的输出）、`src/assets/numerals/`（新，生成物，不手改）、`src/components/Numeral.astro`（新）和 `ChapterSubtitle.astro`（新）及旁边的渲染测试、`src/pages/404.astro`、`AGENTS.md`（生成物清单加一项）、`docs/architecture.md` §3 M3（把“v2.1 计划”改成现状）。

**依赖**：可立即开工

**建议档位**：`强` — 要定一个构建时和浏览器脚本都能用的字形接口（W04 的步骤编号会在浏览器里按视图和选择改写），选错要返工后面三个任务。

**参照**：
- 字形：Cormorant Garamond 默认是旧式数字（`zero`），等高数字是字形名 `zero.lf`…`nine.lf`（2026-10-16 用 `.cache/fonts/CormorantGaramond.ttf` 核实过，GSUB 里也有 `lnum`），按字形名取，不要用 `charToGlyph`；短横用 `endash`；字重按 `build-logo.mjs` 的 `{ wght: 500 }` 变量轴。副标题用 Roboto Condensed 700，字距 `0.3em`，两端短横 24px（§4.1）。
- 接口：架构 §11.4 W-2 的推荐——每页内联一份 `<svg>` 里的 `<symbol id="numeral-0">`…，`Numeral.astro` 用 `<use>` 拼出数字串，外层 `role="img"` + `aria-label`（例如“第 2 步，共 5 步”“第 1 章”，§5），颜色用 `currentColor`，高度跟 `font-size` 走（`1em` 等于数字高度，具体比例在组件里定一次）；浏览器脚本拼同样的 `<use>`，不重新转曲。副标题是装饰，`aria-hidden="true"`。
- 已有写法：`Logo.astro` 用 `?raw` 内联 SVG、`Logo.test.ts` 的 Container API 测试。

**验收**：
- [ ] 测试：`npm test`——`Numeral` 的渲染测试覆盖 `00`、`404`、`–`、`aria-label`；`build-logo.mjs` 重跑两次输出相同
- [ ] 构建：`npm run build` 后 `dist/404.html` 里没有 `@font-face`、没有外部字体请求
- [ ] e2e：`tests/e2e/ac-18-not-found.spec.ts` 断言 404 的大号数字是 SVG 且读屏名称是“404”
- [ ] 手工验证：360 和 1280 宽打开找不到页 → `404` 是等高的细衬线数字（`0` 和 `4` 一样高），桌面 96px、手机 64px，`--text` 色，深色模式变浅

#### W02 按 v2.1 调整令牌、断点和控件反馈

**目标**：把三档断点（手机 <720、平板 720–1099、桌面 ≥1100px）和 §3.2 的字号表写进令牌；补 §3.3 的间距 96 和平板 32px 边距；按 §5（D11）加悬停、按下的轻反馈和 `prefers-reduced-motion`；视图切换按下的一段改成 `--text` 底、`--bg` 字（§3.1 用紫规则、§4.3、D8）。

**涉及范围**：`src/styles/tokens.css`、`src/styles/tokens.test.ts`、`src/styles/base.css`、`src/styles/prose.css`（链接悬停）、`src/components/ViewToggle.astro`、`src/components/StepNav.astro`（按钮悬停、按下）、`src/layouts/PageLayout.astro` 和 `ReferenceLayout`/`base.css` 的 `.page` 边距。

**依赖**：可立即开工

**建议档位**：`标准` — 照表改令牌和样式，没有新接口。

**参照**：design §3.2 字号表（章节标题卡和页边编号的令牌先定义，W04、W05 才用）、§3.3、§4.3、§4.7 主按钮/次按钮/链接三行、§5 动效表；现有 `tokens.css` 的媒体查询写法。动效时长写成令牌（抽屉 200/150ms、看大图 150ms），W03 用。

**验收**：
- [ ] 测试：`npm test`——`tokens.test.ts` 增加 `--bg` / `--text`（视图切换按下的一段）的对比度
- [ ] e2e：`tests/e2e/ac-06-view-toggle.spec.ts` 断言按下的一段背景色等于 `--text`；`ac-16-responsive.spec.ts` 增加 768 宽：正文 18px、h1 30px，没有页面级横向滚动
- [ ] 手工验证：悬停主按钮 → 箭头右移 4px、颜色不变；悬停次按钮 → 边框变 `--text`；按下任意按钮 → 下移 1px；系统开启“减少动态效果”后以上位移都没有；步骤页首屏只有主按钮一个大块紫色

#### W03 目录只用抽屉，没有 JS 时链到首页目录

**目标**：取消 ≥1100px 的常驻目录侧栏，所有宽度都从页眉的“目录”按钮打开抽屉（design §4.5、D5）；手机全屏，平板和桌面从左侧滑出宽 400px，滑入 200ms、关闭 150ms，遮罩同时淡入；看大图淡入 150ms（§5）。没有 JS 时“目录”按钮是指向首页完整目录的链接（§5，FR-16）。目录的章节号换成 W01 的固定字形（20px）。

**涉及范围**：`src/components/Toc.astro`、`TocNav.astro`、`SiteHeader.astro`、`src/scripts/toc.ts`（不再在侧栏和抽屉之间移动 `<nav>`）、`src/styles/toc.css`、`src/styles/code-zoom.css`（看大图淡入）、`src/layouts/PageLayout.astro`（去掉 `.step-shell` 两栏网格）、`tests/e2e/toc-helpers.ts`、`ac-04-change-route.spec.ts` 等用到侧栏的用例、`docs/architecture.md` §3 M3 的“目录”“页眉”两条。

**依赖**：依赖 W01、W02

**建议档位**：`标准` — 删一种布局，抽屉逻辑已有，只改打开方式和过渡。

**参照**：现有 `toc.ts` 的 `initDrawer`、`Toc.astro` 的标记契约（`data-toc-*` 不变）；参考页已有的“打开目录”链接 `/#home-chapters`（`ReferenceLayout.astro`）。没有 JS 时的写法：构建时输出 `<a href="…/#home-chapters" data-toc-open>`，脚本接管点击并加 `aria-haspopup="dialog"`；`dialog` 的关闭过渡用 `transition-behavior: allow-discrete` 或脚本延迟关闭，二选一写进架构。

**验收**：
- [ ] e2e：1280 宽步骤页没有常驻目录，点“目录”打开抽屉、Esc / 点遮罩 / 点“关闭”都能关，关闭后焦点回到按钮；`ac-04` 改为经抽屉操作后照旧通过
- [ ] e2e：`javaScriptEnabled: false` 时“目录”是链接，点击到达首页 `#home-chapters`
- [ ] 手工验证：360 宽抽屉全屏、768 和 1280 宽抽屉宽 400px 从左滑入；开启“减少动态效果”后没有滑动和淡入

#### W04 步骤页的页边栏和步骤编号

**目标**：桌面（≥1100px）的步骤页按 design §3.3、§4.1 排版：正文栏（≤38em）居中，左侧悬挂 96px 页边栏、间隔 32px；页边栏顶端是步骤编号（固定字形 56px、`--text`），和 h1 底边对齐、右对齐到页边栏右边缘，下一行“共 m 步”；数不清第几步时显示短横 `–`、不写步数；选择页放“选择”、旁支页放“旁支”（§4.2、§4.6）。平板和手机没有页边栏，编号放在 h1 前（和 h1 同字号、`--text-muted`）。眉题按宽度变化：桌面 `— 01 准备节点和住宅 IP —`，平板和手机多“ · 共 m 步”；读屏读“准备节点和住宅 IP，第 2 步，共 5 步”。编号是本章进度（FR-10），切换视图、改选分叉点后由页面脚本重算。

**涉及范围**：`src/layouts/PageLayout.astro`、`src/lib/nav-text.ts` 和测试、`src/scripts/route-enhance.ts` 和测试（改写编号和“共 m 步”）、`src/layouts/PageLayout.test.ts`、`tests/e2e/ac-02-walk.spec.ts`、`ac-06-view-toggle.spec.ts`、`ac-09-unchosen.spec.ts`、`ac-19-side-page.spec.ts`。

**依赖**：依赖 W03

**建议档位**：`强` — 构建时和浏览器两处要写出一致的编号和读屏文字，还要处理三档宽度的对齐。

**参照**：`Progress`（`src/lib/route/types.ts`，`index`/`total` 缺省即“数不清”）、`progressText()`、`[data-route-progress]` 的改写方式；W01 的 `Numeral` 组件和浏览器端拼字形的函数。

**验收**：
- [ ] 测试：`npm test`——`nav-text` 覆盖“第 n 步，共 m 步”、数不清、选择页、旁支页四种文字；`route-enhance` 测试覆盖切换视图后编号变化
- [ ] e2e：1280 宽前言页编号为 `01`，操作视图“共 3 步”、切到原理视图变“共 4 步”（整体思路是原理独有步骤），编号底边和 h1 底边差 ≤2px；“清理旧账号和配置”操作视图 `03`、原理视图 `04`；未选方案时汇合点之后的页显示 `–`；选择页显示“选择”，旁支页显示“旁支”
- [ ] e2e：360 宽编号在 h1 前、眉题含“共 m 步”；没有页面级横向滚动（AC-16）
- [ ] 手工验证：1280 宽看三个页面，编号落在同一条竖线上，页面重心偏左、右侧留白

#### W05 每章第一页的章节标题卡

**目标**：每章第一页（前言、选择方案、选择手机系统、致谢）顶部换成章节标题卡（design §4.1、D6）：英文副标题 `− CHAPTER 0n −`（固定字形）、章节号（固定字形、`--accent`）+ 章名（800），桌面和平板并排底边对齐、章节号右缘对齐页边栏右缘，手机上下排；一句话（`--text-muted`、最宽 24em）；一条横跨页边栏和正文栏的 1px `--text` 线；留白按 §4.1。没有入场动画。

**涉及范围**：`src/content/route.yaml`（章节加 `intro`）、`src/content.config.ts` 或路线图的 schema、`src/lib/route/`（`RouteDataChapter` 带上 `intro`）和测试、`src/layouts/PageLayout.astro`（替换现在的 `.chapter-intro`）、`tests/build/` 和 `tests/fixtures/`（一句话不在原文里时构建失败）、`docs/architecture.md` §3 M1/M2。

**依赖**：依赖 W04；四章的一句话由作者确认（§6）

**建议档位**：`标准` — 版式清楚，数据只加一个字段，校验照已有的写法。

**参照**：架构 §11.4 W-3：`intro` 写在 `route.yaml` 的章节上，构建时校验它是这一章第一页原理版正文里**原样出现**的一段文字，不是的话构建失败（守住 ADR-0005“不改正文”）；W01 的 `ChapterSubtitle`、`Numeral`；`isChapterStart()`。

**验收**：
- [ ] 测试：`npm test`——路线图解析带出 `intro`；`npm run test:build` 新增一例：`intro` 不在正文里 → 构建失败并报出 `route.yaml`
- [ ] e2e：四个章首页都有标题卡，章节号读屏为“第 n 章”，副标题对读屏隐藏；非章首页没有
- [ ] 手工验证：1280 宽“选择方案”的章节号是首屏唯一的大块紫色（主按钮不在首屏），章节号和章名底边对齐；360 宽章节号在章名上方

#### W06 截图编号和页边注

**目标**：截图成为编号的图版（design §4.7、D4）：统一边框、圆角、上下 24px；编号“图 02-1”（本页步骤号-序号）——桌面标在页边栏、和截图顶边对齐，平板和手机写在截图下方作图注；选择页、旁支页、参考页只用序号“图 1”；步骤号数不清时也只用序号（架构 §11.4 W-4）。`[!caution]` 在桌面的页边栏同高处标“注意”（`--caution-rule`）。

**涉及范围**：`src/lib/content/remark-obsidian.ts`（或新的 rehype 插件，把截图包成带序号的 `<figure>`，两版正文各自编号）和测试、`src/styles/prose.css`、`src/layouts/ReferenceLayout.astro`、`src/scripts/route-enhance.ts`（编号里的步骤号随视图和选择改写）、`src/scripts/code-zoom.ts`（看大图照常可用）、`tests/e2e/nfr-02-copy-zoom.spec.ts`。

**依赖**：依赖 W04

**建议档位**：`标准` — 插件改动有现成的 `rehype-scrollable-tables.ts` 可照着写，编号前缀复用 W04 的改写。

**参照**：`rehype-scrollable-tables.ts`（包一层容器的写法）、`remark-obsidian.ts` 的 `data-zoom` 图片输出、`option-blocks.ts`（选择页里的截图仍不可点）。

**验收**：
- [ ] 测试：`npm test`——插件给两版正文分别从 1 编号，原文宽度（`|262`、`|600`）保留
- [ ] e2e：1280 宽有截图的步骤页，“图 nn-1”在页边栏、顶边和截图顶边差 ≤2px；360 宽在截图下方；常见问题里是“图 1”；点截图仍能看大图
- [ ] 手工验证：“清理旧账号和配置”的截图编号和步骤编号在同一条竖线上

#### W07 首页说明书封面和完整目录

**目标**：首页按 design §4.4（D2）重做：顶部留白 96px（手机 32px）；眉题“一份照着做的说明书”；中文两行 logo 作 h1；一句话；小字信息行；主按钮“从第 00 章开始 →”（进前言）+ 文字链接“先看整体思路”。桌面 12 栏，右侧（第 9–12 栏）是四行章级索引（固定字形 32px），每行链到下方完整目录的对应章；平板和手机不显示索引。封面下一条 1px `--border` 线，上下各 64px，下面是完整目录（章节号固定字形 28px）。首页没有“继续上次”和已读标记（FR-18）。

**涉及范围**：`src/pages/index.astro`、`src/components/TocNav.astro`（首页变体：每章一个锚点、28px 章节号）、`src/styles/toc.css`、`tests/e2e/ac-01-home.spec.ts`、`docs/requirements.md` FR-18/AC-01 的按钮文字（“开始” → “从第 00 章开始”，作者在 design §8 一致性检查第 1 条已同意）。

**依赖**：依赖 W03；一句话和小字信息行由作者确认（§6）

**建议档位**：`标准` — 单页版式，组件都已有。

**参照**：design §4.4 的线框和五条留白；现有 `index.astro`；小字信息行里的章节数从 `site.route` 取，不写死；总步数之类会变的数字不写。

**验收**：
- [ ] e2e：`ac-01-home.spec.ts`——看到 logo、眉题、“从第 00 章开始”，点它进入前言；“先看整体思路”进入整体思路；1280 宽有四行章级索引，点“02”跳到下方目录的第 02 章；360 宽没有索引
- [ ] e2e：首页首屏只有主按钮和 logo 的“Re”是 `--accent`（取计算后的颜色）
- [ ] 手工验证：1280 宽封面左对齐、索引和主区顶部对齐；360 宽 logo 满宽、没有横向滚动

#### W08 原理页的说明图

**目标**：给“整体思路”“小结：从服务器到代理软件”“测 IP 质量”三页加单色线稿说明图（design §4.7、§9，作者 2026-10-16 确认这三页）。

**已定（作者 2026-10-17）**：Agent 按 §4.7 画、作者确认；作者把图加进重写稿再导入（原理版里写 `![[说明图-页面标题.svg]]`，SVG 放 `附件/`），不用 frontmatter、不补 ADR（架构 §11.4 W-7）；“整体思路”“小结”里的字符画由说明图替换；“测 IP 质量”画“为什么只有 ipinfo.io 看得到 ISP”，放在讲这件事的那段后面。

**涉及范围**：`src/lib/content/`（`diagram.ts` 检查 SVG、`remark-obsidian.ts` 内联、`rehype-figures.ts` 编号、`link-index.ts` 说明图目录）、`scripts/import-rewrite.mjs`、`src/styles/prose.css`、`src/assets/diagrams/`、重写稿三页原理版、`tests/e2e/design-diagrams.spec.ts`。

**依赖**：依赖 W04（编号、页边栏）

**建议档位**：`标准`

**验收**：
- [x] 测试：`npm test`——SVG 白名单检查（颜色只能 currentColor/none、没有脚本样式外链和 id、viewBox 宽 ≤ 328、要有 `<title>`）；`.svg` 嵌入内联成 `svg[role=img]`，找不到、不合格、写了宽度都报错；说明图和截图一起编号；导入脚本把说明图复制到 `src/assets/diagrams/`、原稿变了就更新
- [x] e2e：三页原理版各有一张说明图，有读屏名字、编号同截图；按 1:1 显示、不超出正文栏，图中文字 14px、系统字体，线条是 `--text`、强调是 `--accent`；360 宽没有横向滚动；桌面编号在页边栏；测 IP 质量的操作版没有说明图
- [ ] 作者确认：三张图的画法和强调的那一环（design §9 待确认第 2 条）

#### W09 按设计 v2.1 做视觉验收

**目标**：按 design §7 对 v2.1 做一次整体检查并留证据，作为 2.0.0 整体验收的视觉部分（AC-16、AC-21，AC-20 的 logo 部分沿用 #24 的结论）。

**涉及范围**：`playwright.config.ts`（新增 768×1024 平板项目）、`tests/e2e/ac-16-responsive.spec.ts`、`tests/e2e/a11y.spec.ts`、`docs/delivery.md`（记录结果和待补项）。

**依赖**：依赖 W05、W06、W07、W08

**建议档位**：`标准` — 跑检查、对照清单、修小问题。

**参照**：design §6 拒绝清单、§7 验收方式。

**验收**：
- [ ] e2e：`npm run test:e2e` 在 360、768、1280 三种宽度都通过；axe 没有 serious 及以上问题；只用 Tab 走完 AC-02 一条路线的前五页
- [ ] 手工验证：360×800、768×1024、1280×800，浅色和深色，截首页、步骤页（两种视图，含章首页）、选择页（未选/已选）、旁支页、目录抽屉、常见问题、实测、找不到页，逐条对照 §4、§6；每屏只有一个大块紫色；编号落在同一条竖线上（截图是临时产物，不提交）
- [ ] 手工验证（需要作者的设备）：编号字形在 iPhone、安卓、Windows 上截图对比，必须一样

### 5. 检查点（v2.1）

**MS8 结束（W01–W03 合并后）**
- [ ] 找不到页的 `404` 在作者的手机上和电脑上看起来一样（D7 的第一次真机检查）
- [ ] 回看本计划：W04 的字形接口是否够用，W05–W07 的拆分是否仍然合适

**MS9 结束**：四章标题卡和首页文案都是作者确认过的原文；构建输出的内容提示没有新增项。

**全部完成**：交 project-delivery 做 2.0.0 整体验收（AC-01–21）。

### 6. 待作者确认（v2.1）

下面的候选都是从 `docs/rewrite/` 原样摘出的句子，没有改写；作者选一个、改原文，或者决定不放。

1. **首页 logo 下的一句话**（design §4.4，最宽 22em）：
   - A（整体思路）：“所以下面每一步，其实都在做同一件事：让每一项信息都不露出‘我在国内’，而且像一个普通用户。”（可去掉开头“所以”）
   - B（后记）：“这篇文章只是一个普通人的经验记录，而不是标准答案。”
   - C（前言，原理版）：“每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。”
2. **首页小字信息行**（design §4.4，从内容取，不写会变的数字）。可用的事实和出处：
   - “4 章”（`route.yaml`，按章节数算）；
   - 成本（前言）：“我用的方案一，服务器每月 4.5 美元，另外还有 claude 本身的订阅费。”
   - 设备（选择手机系统）：“Gmail 是在手机上注册的。后面订阅也是在手机上的 claude app 里完成的。”导入代理软件一页分电脑和手机两部分。
   - 候选拼法：“4 章 · 需要一台电脑和一部手机” / “4 章 · 方案一每月约 4.5 美元，另加 claude 订阅费”。这两种都是把原文的事实缩写成短语，不是原句，需要作者认可这种写法。
3. **四章标题卡下的一句话**（design §4.1，最宽 24em，W05 校验它在这一章第一页正文里原样出现）：
   - 00 开始（前言）：“每一步我都会努力去讲清楚为什么要这么做……”同上 C；或“文中没写的情况，我不一定可以给出答案，请见谅。”
   - 01 准备节点和住宅 IP（选择方案）：“三个方案的目的都一样：让 claude 看到一个静态住宅 IP，而且只有你自己在用。”
   - 02 注册和订阅（选择手机系统）：“所以手机也是 claude 会看到的一台设备。”
   - 03 结尾（致谢）：“也感谢所有我没能记住名字、但确实帮到我的人。”
   - 注意：00 章的候选取自前言**原理版**；操作版前言里没有这句。标题卡两种视图一样，只校验原理版。
   - **已定（作者 2026-10-16，#36）**：四章都按推荐，00 章用前言原理版的整句“每一步我都会努力去讲清楚为什么要这么做，这样就算哪天某个细节失效了，你也知道该往哪个方向去调，请多包涵。”，01–03 用上面的候选；写在 `route.yaml` 各章的 `intro`。
   - **已定（作者 2026-10-17，#38）**：一句话用 A（去掉开头“所以”和加粗），小字信息行用“4 章 · 需要一台电脑和一部手机”，章节数从 `route.yaml` 取。
4. **说明图**（W08）：谁画、怎么放进页面。
   - **已定（作者 2026-10-17，#39）**：Agent 画、作者确认；加进重写稿再导入；字符画由说明图替换；测 IP 质量画“为什么只有 ipinfo.io 看得到 ISP”。
5. **版本**：v2.1 是否并入 2.0.0 一起验收发布（本计划的建议）。

---

## 附：v2.0 实施计划（2026-10-15，历史）

- 状态：v2.0 计划（2026-10-15），对应需求 v0.3、[架构 v2.0](architecture.md)（含 [§11.3 v2.0 实施前评审](architecture.md#113-v20-实施前评审2026-10-15)）、[设计 v2.0](design.md)，目标站点版本 2.0.0。任务 #23–#31 已全部关闭。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，v2.0 的标题以 `[v2.0]` 开头（2026-10-15 发布，#23–#31；V 编号与 Issue 的对应见 §3）。

### 1. 里程碑

| 里程碑 | 交付的可用能力 | 覆盖需求 | 任务 |
| --- | --- | --- | --- |
| **MS5 v2 静态骨架** | 重写稿全部 50 页导入；站点换成 v2 路线图和 URL，不运行 JS 也能从首页走到后记；两版正文都在页面里（固定操作视图）；1.0.0 的页面、内容和过时的测试删干净 | FR-01–04、FR-10、FR-11、FR-13、FR-17、FR-19（静态）、FR-21、FR-41、FR-60、FR-61；AC-07、08、09、12、14、15、17、18（找不到页） | V01、V02 |
| **MS6 v2 交互** | 按本机选择和视图改写导航；整页视图切换；选择页选项块；目录与首页；参考页返回；迁移核对 | FR-12、FR-14–16、FR-18、FR-20、FR-30、FR-31、FR-50；AC-01–06、10、11、13、18、19 | V03–V06、V09 |
| **MS7 v2 视觉与 logo** | logo 和 favicon；全部页面按设计 v2.0 重做 | FR-70、FR-71、NFR-01、NFR-06；AC-16、20、21 | V07、V08 |

全部完成后交给 project-delivery 做 2.0.0 整体验收（AC-01–21），版本号在那时定为 `2.0.0`。

### 2. 依赖与顺序

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

### 3. 任务索引

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

### 4. 检查点

**MS5 结束（V01、V02 合并后）**
- [ ] `npm run check`、`npm run test:e2e` 通过
- [ ] 关掉 JS，在 360 和 1280 宽下从首页点到后记（选方案三、iPhone），没有断链
- [ ] 新入库的截图已逐张核对打码；`docs/rewrite/附件/` 没有进仓库
- [ ] 回看本计划：MS6 任务的拆分和档位是否仍然合适

**MS6 结束**
- [ ] AC-01–06、08–13、18、19 都有 e2e 或写明的人工核对记录
- [ ] 构建输出的内容提示（操作版缺失、作者待补、博客链接待填）与作者确认一致

**全部完成**：AC-01–21 都有证据，交给 project-delivery。

### 5. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 重写稿引用的 `截图 2026-10-15 13-43-53 1.png` 不存在（需求 Q-13） | V01 导入后构建失败 | 已解决：#23 按作者选定从原图裁剪入库 |
| 作者导入期间继续改重写稿 | 内容和路线图对不上 | 导入脚本可重复运行；新页面、删页面只报告，由作者决定 |
| logo 风格作者不认可 | V08 的主色和页眉要返工 | V07 先出 logo 并取得作者确认，V08 排在最后；`--accent` 跟 logo 的“Re”紫走 |
| V02 改动面大（M2 + 全部页面 + 删旧代码） | 一次做不完、`main` 不绿 | V02 只做静态版，浏览器脚本整体留给 V03/V05，参照 `v1.0.0` 标签里的旧实现 |
| 本机存储禁用时选择丢失导致绕圈（评审 V11） | AC-18 | V03 实现 M4 的 `window.name` 兜底 |

### 6. 待决事项（不阻塞）

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
