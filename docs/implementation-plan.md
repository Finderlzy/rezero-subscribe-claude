# 实施计划：Re:从零开始订阅 claude

- 状态：**v3.1（2026-10-23，M7 更新日志，需求 v0.13、FR-80–FR-89；2026-10-25 补 SEO 与顶栏固定，站点版本 3.1.3）已完成并合并 main**；v3 已完成（2026-10-22 实施，2026-10-22 验收并正式上线；版本 3.0.0）**，把代码从 v2.2 改到 v3：文档站风格（design v3）、站内搜索（M6）、按作者新稿 `docs/v3-rewrite/` 换成单版本内容、旧网址跳转（ADR-0006）。对应需求 FR-05、FR-16、FR-18、FR-24、FR-25、FR-72 和 AC-26–AC-33（AC-31 是全量回归），架构 [§13](architecture.md#13-v3-增量架构2026-10-21)，实施前评审见[架构 §13.11](architecture.md#1311-v3-实施前评审2026-10-21)（通过，没有阻塞项）。站点版本 **3.0.0**（V12 验收通过后升版），收尾提交以同一版本正式部署到 <https://re0claude.us.ci/>。
- 任务记录：[GitHub Issues](https://github.com/Finderlzy/rezero-subscribe-claude/issues)，标题以 `[v3]` 开头（**草稿，未发布**；发布后在 §3 回填编号）。任务范围、状态和完成证据以 Issue 为准，本文只保留里程碑、顺序和链接；§4 是发布时的正文草稿。
- 档位规则见开发流程契约“模型档位”：`强` / `标准`。
- 历史：v2.2 已完成（2026-10-19，[v2.2 改版计划](v2.2-plan.md)，没有建 Issue）；v2.1（#32–#40）、v2.0（#23–#31）和 1.0.0 的计划在文末附录。

> **2026-10-22 修订：作者交来新稿 `docs/v3-rewrite/`，计划按它调整。** 新稿 11 个文件，一章一页，已经按章合并好，只有一版正文；文件之间用相对 Markdown 链接，不再有双链。方案三、独立常见问题、附录不再收录（常见问题并入各章和 `09` 的小节）；IP 质量实测合集保留为参考页。因此：V10 从“机械合并脚本”改为“换成 v3 单版本的页面和路线图”；V11 从“按清单合并页面”改为“旧网址、验收和文档/仓库同步”；V06–V09 去掉两种视图，V07 不再切视图。V01–V05 已完成，样式不动。页面标识、章节和旧网址去向见 §3.1，**作者 2026-10-22 已确认**。

> **2026-10-22 实施情况：V10、V11 已完成**（V10 换成 11 页单版本；V11 填满 47 条旧网址、更新验收和文档、同步 Writing 和大肥鱼、删除旧稿 `docs/rewrite/`）。**2026-10-22：V12 已完成**（视觉验收和全量回归通过，升 3.0.0）。V06–V09 已于 2026-10-22 合并 main。**同日收尾**：清掉 v2 遗留的未引用截图和旧说明图，重做 README，以 3.0.0 正式上线（见 [delivery.md](delivery.md)）。

## 0. v3.1：更新日志（2026-10-23）

需求 v0.13（FR-80–FR-89、AC-34–AC-38），架构 [§14](architecture.md#14-v31-增量架构m7-更新日志2026-10-23)，设计 [§4.9](design.md#49-更新日志v013fr-80fr-86)。一个任务，一轮做完：

| 任务 | 标题 | 依赖 | 档位 | 状态 |
| --- | --- | --- | --- | --- |
| V13 | M7 更新日志：条目数据、更新日志页、首页最近 5 条、侧边栏底部入口 | 无（只依赖 M1 的页面标题） | 标准 — 纯函数 + 静态页面，参照参考页和目录的既有模式 | 已实施（2026-10-23，合并 main，站点 3.1.0） |

里程碑：MS23 更新日志 → 作者改 `src/content/update-log.yaml` 就能发布一条更新；首页和每个有目录的页面都能进到 `/update-log/`。

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
| V06 | 站内搜索的索引和匹配 | 无 | 标准 | 已实施（2026-10-22，已合并 main；按单版本，含 IP 实测参考页） | 待发布 |
| V07 | 小节锚点和落点 | 无 | 标准 | 已实施（2026-10-22，已合并 main；按单版本） | 待发布 |
| V08 | 顶栏搜索框 | V01、V06、V07 | 标准 | 已实施（2026-10-22，已合并 main） | 待发布 |
| V09 | 跳转表和旧网址跳转页 | V07 | 强 | 已实施（2026-10-22，已合并 main；单段和多段 `moved:`、`section`、`choice` 手机分流、sitemap 过滤和坏数据用例） | 待发布 |
| V10 | 换成 v3 单版本的页面和路线图 | V02、V09 | 强 | 已实施（2026-10-22；11 页、5 章、2 分叉点、选项卡片由 frontmatter 生成） | 待发布 |
| V11 | 旧网址、验收和文档同步 | V10 | 强 | 已实施（2026-10-22；47 条 `moved:`、AC-33 全量、文档和两个仓库同步、删旧稿） | 待发布 |
| V12 | v3 视觉验收和全量回归 | 全部 | 标准 | 已实施（2026-10-22；逐页截图对照、AC-01–AC-33 全量回归通过，3.0.0 已正式上线） | 待发布 |

## 3.1 新稿的页面地图（V10、V11 的依据，作者 2026-10-22 确认）

`docs/v3-rewrite/` 的 11 个文件就是 v3 的 11 页，一章一页、只有一版正文。下表是导入时的一一对应；**标识加粗的沿用旧标识**（页面角色没变，旧网址不用跳），其余都是新标识（原页面被合并或改名，旧标识全部进 `moved:`）。

| 新稿文件 | 页面标题 | 标识 | 章节 | 旧页面（跳到本页的小节） |
| --- | --- | --- | --- | --- |
| `00-前言.md` | 前言 | **`preface`** | 开始 | `disclaimer` → `#免责声明` |
| `01-整体思路与方案选型.md` | 整体思路与方案选型 | **`overview`** | 准备节点和住宅 IP | `clean-up` → `#清理旧账号和配置`；`choose-plan` → `#接下来怎么选`；`plan3-residential-node` → `#为什么不推荐直接买住宅节点`；`plan1-free-isp` → `#方案一和方案二` |
| `02-方案一：搭建专属住宅代理节点.md` | 方案一：搭建专属住宅代理节点 | `plan1` | 准备节点和住宅 IP | `plan1-buy-server` → `#第一步：购买海外 VPS`；`plan1-buy-isp` → `#第二步：购买静态住宅 ISP 代理`；`plan1-make-node` → `#第三步：SSH 连接服务器`；`plan1-panel` → `#第五步（可选）：打开面板` |
| `03-方案二：配置住宅IP服务器.md` | 方案二：配置住宅 IP 服务器 | **`plan2-residential-server`** | 准备节点和住宅 IP | 同一页扩写，没有旧网址要跳 |
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

> **2026-10-22 实施情况（已合并 main）**：`moved:` 的单段去向（`{ to, section }`）、`plan1-free-isp → choose-plan`、`MovedPage`、sitemap/搜索过滤、`tests/fixtures/moved-*` 和构建级用例落地，跳转锚点固定原理版、meta refresh 延迟 5 秒。同日补齐 §3.1 要的**按分叉点选择分流**（`choice`，手机相关的旧页按 M4 的手机选项落地，没选过或读不到时用 `fallback`，脚本在 `src/lib/moved.ts`）和 **`faq/<id>` 多段旧参考页路径**（`src/pages/[...moved].astro`；和现有参考页同址时构建失败）。真实数据里的手机旧页和 `faq/<id>` 条目等 V11 换页面地图时填。

**目标**：FR-25、ADR-0006：`route.yaml` 新增 `moved:` 段（旧标识 → `{ to, section? }`，或按分叉点选择 → `{ choice: { fork, options: { <option>: { to, section } }, fallback: { to, section } } }`）和校验；`[page].astro` 为每个单段旧标识生成跳转页，多段的参考页路径（`faq/<id>`）用 `src/pages/[...moved].astro` 生成同样的跳转页；跳转页内联脚本按 M4 的选择用 `location.replace` 到目标页的小节，meta refresh 指向 fallback 的锚点，`canonical`、`noindex`，正文“这一页已经并入《…》”和链接；sitemap 过滤旧标识；`REMOVED_PAGES` 和 `astro.config.mjs` 的 `redirects` 删除，`plan1-free-isp → choose-plan` 迁进 `moved:`（V10 换页面地图时同步改成 `overview#方案一和方案二`，避免目标页被删后构建失败）。`moved:` 的键除了页面标识，还要能收 `faq/<id>` 这类旧参考页路径，它们同样生成跳转页，但不进路线图、目录、搜索和 sitemap；`/ip-tests/…` 保留，不写 `moved:`。

**涉及范围**（已实施）：`src/content/route.yaml`、`src/lib/route/route-map.ts`、`types.ts` 及测试（`moved` 的解析和校验、`choice`）、`src/lib/site.ts`（`section` 对照 M1 的 headings；`choice` 的每个去向；和现有参考页同址的检查）、`src/lib/content/headings.ts`（`scanHeadings`，构建时扫内容集合里的正文）、`src/lib/route/route-yaml.ts`、`src/pages/[page].astro`（单段）、`src/pages/[...moved].astro`（新，多段参考页路径）、`src/components/MovedPage.astro`（新）、`src/lib/moved.ts`（新，跳转页 `<head>` 的内联脚本：读 M4 的选择挑去向，和 `theme.ts` 一样是字符串常量）及测试、`astro.config.mjs`；`tests/fixtures/moved-*`（目标不存在、小节不存在、旧标识被复用、串联、参考页路径、choice 的选项和 fallback）；`tests/build/ac-14-build-fail.test.ts`、`tests/build/build-project.ts`；`tests/e2e/ac-33-moved.spec.ts`（新）、`ac-15-base-path.spec.ts`；`docs/adr/0002`、ADR-0006 和架构的“现状”。

**依赖**：依赖 V07

**建议档位**：`强` — 已发布 URL 的契约和路线图的数据迁移；跳转页还要在根路径和子路径下、按本机选择都正确。

**参照**：ADR-0006 的“Consequences”是校验清单；锚点用 V07 的 `sectionAnchor()`；地址一律 `withBase()`（架构 §13.11 R-6）；sitemap 过滤沿用 `astro.config.mjs` 现有的 `filter`；`RouteData` 不收录旧标识（目录和搜索自然不含）。边界：没有 `section` 的条目跳到目标页顶部；旧标识等于保留字或现有页面标识时构建失败；`to` 是另一个旧标识时构建失败；参考页路径的键只能以 `faq/` 开头，段内仍是 kebab-case；`section` 必须在目标页的标题里存在；`choice.fork` 必须是路线图里的分叉点，`choice.options` 的键要和该分叉点的选项一致，`choice.fallback` 必须有；M4 读写失败或没有选择时用 fallback（没有 JS 时也停在 fallback）。

**验收**：
- [ ] 测试：`npx vitest run src/lib/route/ src/lib/site.test.ts src/scripts/moved.test.ts`
- [ ] 构建级：`npm run test:build`
- [ ] e2e：`npx playwright test tests/e2e/ac-33-moved.spec.ts tests/e2e/ac-15-base-path.spec.ts`（无痕打开 `/plan1-free-isp/` → 到 `/choose-plan/`；V10 换页面后这条改成 `/overview/#方案一和方案二`；禁用 JS → 看到“已经并入”和链接；带 `choice` 的样例在 localStorage 里选了 iPhone/安卓 → 落到各自目标，没选 → 落到 fallback；用 `SITE_URL=https://example.test npm run build` 构建后，`dist/sitemap-0.xml`、`dist/search-index.json` 里没有 `plan1-free-isp`；子路径同样跳对）

### V10 换成 v3 单版本的页面和路线图

> **2026-10-22 实施情况（已完成）**：`src/content/principle/` 换成 11 页，参考页只留 `ip-tests` 和 6 篇实测；`route.yaml` 是 5 章 2 个分叉点；选项卡片由 frontmatter 的 `options` 生成（`ChoiceCards.astro`）；侧边栏去掉章节号；`operation/`、`faq/` 和旧页面已删除。`npm run check`、`npm run test:build` 通过。

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