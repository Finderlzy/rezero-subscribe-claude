# 交付记录

## 2026-10-23 录屏转码统一走显卡

作者看到转码时 CPU 占到 92%，要求“下次用 GPU 做”，并明确可以并行。

- **为什么原来在用 CPU**：上一版只是最后一步编码交给 NVENC，前面的缩放还是 CPU 的 `scale`，20 核先被吃满，编码器反而在等帧。
- **改法**：`scripts/encode-video.mjs` 改成 `crop/fps`（CPU）→ `hwupload_cuda` → `scale_cuda`（显卡缩放）→ 编码，整条链路 CPU 基本不干活（实测整机 CPU 只剩 5% 左右）。解码不能开 `-hwaccel cuda`：滤镜图会直接拿到 CUDA 帧，`crop`/`fps` 在 CUDA 帧上用不了，要等显卡缩放那一步才上传。
- **并行**：`--batch` 清单（一行“源文件 输出名 [封面秒数]”），默认同时跑 6 条。实测 nvidia-smi：单条 2% / 4 条 NVENC 88% / 6 条 94%（峰值 100%）/ 8 条不再涨、单条反而变慢；GPU 核心均值停在 30% 左右，那是裁剪之外显卡的活就这么多，不是没在跑。
- **其它**：`--preset phone` 换成 `crop=578:1160:3:60`（留一点状态栏上方的白底、左右各收 3px 去掉窗口边框）；没有可用显卡自动退回 `libx264`。
- **核对**：单条 14 秒的录屏 3.4 秒转完（原来 36 秒），批量 4 条 38 秒、6 条 58 秒；用法写进 [v3-rewrite-video-list.md](v3-rewrite-video-list.md) 第 4 步。

## 2026-10-23 新录屏（v2rayNG）和 VoyraCloud 华盛顿服务器实测

作者交来两段新的 v2rayNG 录屏（安卓，584×1280、无声）和三张 VoyraCloud 美国华盛顿住宅服务器的检测截图。

- **录屏**：两段都先按“不提交真实服务器 IP、节点名、项目名”脱敏再入库。
  - 第 1 段 57 秒：开头 3 秒是节点列表（带着 IP 和“美国华盛顿特区”这种我们填的节点名），整段剪掉，从进入“路由设置”开始；中间来回滚动、停 2 秒的段落剪掉，只留加两条 Claude 规则的连续动作；结尾回到列表页和拖动顺序的部分，剪到拖动后画面稳定的第 1 秒为止，后面静止的 5 秒不要。
  - 第 2 段 14 秒没有露出 IP 和节点名，只剪掉开头的展开动作（3 帧）。
  - 两段都裁掉手机状态栏和导航栏（`crop=584:1154:0:64`），只留应用画面，再放大到 1600 宽。第 1 段最后 3 秒是一条 outboundTag 下拉菜单，菜单里露出了“美国华盛顿特区（主节点/备用节点）”这两个节点名，所以剪到菜单打开之前，和结尾返回列表的片段接在一起。
  - 编码改用显卡：`h264_nvenc -preset p7 -tune hq -rc constqp -qp 34`，42 秒 1600×3162 的片子 2.9 MB、编码 8 秒左右；CPU 的 `libx264 -preset slow` 同一段要跑 3 分钟以上。抽帧 OCR 复核过，文字清楚。
  - 成品：`public/videos/v2rayn-rules.mp4`（42.4 秒，2.9 MB，替换 2026-10-23 上午那版 46 秒的）和新的 `public/videos/v2rayn-rules-order.mp4`（14.2 秒，1.4 MB），封面分别取了讲到规则内容的第 8 秒和第 7 秒。正文里“加两条 Claude 规则”和“检查顺序”分别嵌一段。
- **脱敏核对**：录屏全片按 4 fps 抽帧 OCR，全文搜 `66.`、IP 段、节点名和标签页项目名，只有 outboundTag 下拉菜单那几帧命中节点名（已剪掉），没有 IP。
- **华盛顿服务器**：作者在 VoyraCloud 另买了一台华盛顿的住宅服务器。ipinfo 显示 AS48529 Quantumbeam、AS Type 是 **ISP**、Privacy 是 false、位置 Washington DC；IPPure 认成原生住宅 IP、系数 10%；Scamalytics 0 分。作者反馈洛杉矶的服务器质量有时很差，所以测了这一台，质量不错，现在用这台。
- **截图脱敏**：三张图的 IP（标签页、查询框、地址栏、Range 值、Hostname 里的 IP 段）、地图坐标，以及第二个标签页标题里的项目名都遮掉了。IP 用“保留第一段、其余画成 `***`”的样式，和之前几篇实测截图一致；项目名直接用标签页底色盖掉，不重新画字（猜错字体和字号反而显眼）。原图没有提交，仓库里只有脱敏后的 `src/assets/screenshots/voyra-washington-{ipinfo,scamalytics,ippure}.png`。
- **正文**：`实测：VoyraCloud 住宅服务器` 加“我的第三台（现在用的）”，写清数据、地区是华盛顿（IPPure 里有数据库给纽约）、ASN 和 Scamalytics 说明不一致、换 IP 后仍要做检查；“IP 质量实测合集”的表格更新；方案二的“住宅服务器也可能是机房 IP”补一段华盛顿这台的结论。
- **核对**：`npm run check` 通过（astro check 0 错误、单元测试 559 个、构建级 27 个、构建 67 页）；`npx playwright test` 950 通过、20 跳过、0 失败（实测页多了第三台和一张 IPPure 截图，改了 `ac-27-sidebar`、`nfr-02-copy-zoom`、`section-hash` 三个用例里的小节数、截图数和当前小节标题）；预览服务器上看了实测页和电脑端页，两个视频都渲染成 `<figure class="video">`，`/videos/v2rayn-rules.mp4`（2,862,623 字节）、`/videos/v2rayn-rules-order.mp4`（1,353,051 字节）和两张封面都返回 200。

## 2026-10-23 正文视频（自托管）

作者开始给正文配录屏（一条小节一个小视频），决定不放 B 站——分成很多条小视频，放外站反而难找——改成站点自己托管。

- **写法**：正文 `![[名字.mp4]]` 独占一行，文件放 `public/videos/`，只认 mp4（H.264，Safari 和 iPhone 也能播）。渲染成原生 `<video controls preload="none" playsinline>`，占满正文栏、1px 边框、不编号；同名的 `.jpg` 当封面，点了播放才开始下载。
- **代码**：`link-index` 扫 `public/videos`（新增 `videosDir`、`videos`）；`remark-obsidian` 的 `convertVideo` 校验文件名（小写英文和连字符）和文件存在；`rehype-figures` 把独占一行的视频包成 `figure.video`（不参与图版编号）；`prose.css` 加视频块和 2px 焦点环；`import-rewrite.mjs` 不把 `.mp4` 当截图复制。
- **标记用 `data-body-video`**：不占 VideoFacade 的 `data-video`——那个属性存的是平台和地址 JSON，空的会让它的脚本 `JSON.parse('')` 抛错（AC-07、AC-17 会跟着失败）。
- **为什么 `preload="none"`**：`preload="metadata"` 时 Chrome 拿到元数据后会自己中断请求，预览服务器把它记成 `ERR_ABORTED`，AC-17“没有失败的请求”会挂；一页一个视频，打开页面就预取也不划算。封面补上预览。
- **视频**：v2rayN 规则配置，嵌进《客户端配置与环境验证：电脑端》的“配置v2rayN 规则集”。作者 2026-10-23 重录了一版（72 秒、7.7 MB 的 webm）；原片开头和结尾会露出节点列表和日志里的真实服务器 IP，按“不提交真实服务器 IP”剪掉前 8 秒和后 18 秒，只留 8–54 秒的规则设置窗口（46 秒），转成 `public/videos/v2rayn-rules.mp4`（1600 宽、CRF 28、523 KB）和封面 `v2rayn-rules.jpg`（60 KB）。源 webm 不进仓库（Obsidian 的本地提交已撤销，没推送过）。
- **连带修正**：作者把小节标题改成“配置v2rayN 规则集”，`09` 里指向旧标题的双链会让构建失败，同步改成新标题后导入。
- **核对**：`npm run check` 通过（astro check 0 错误、单元测试 559 个、构建级 27 个、构建 67 页）；`npx playwright test` 950 通过、20 跳过、0 失败；1280 和 360 宽截图看了视频块和封面；`dist/videos/v2rayn-rules.mp4` 和封面在；页面里是 `<figure class="video"><video src="/videos/…" preload="none" poster="/videos/….jpg">`；子路径构建的地址带 `/sub/`（单元测试）。
- **仓库体积**：82 秒录屏 1.0 MB + 封面 59 KB；30 条约 30 MB。视频进了 Git 历史，删了也不会变小，所以只提交转好的 mp4。
- **线上**：部署后 `/client-desktop/` 里是 `<figure class="video"><video src="/videos/v2rayn-rules.mp4" preload="none" poster="/videos/v2rayn-rules.jpg">`；两个文件都返回 200（mp4 534,542 字节、封面 60,941 字节）。

## 2026-10-23 站点地图补 lastmod（谷歌收录）

v3 上线后线上 sitemap 已经是 v3 的网址，但每条没有 `lastmod`。本轮补上，让谷歌知道每页最后一次真的改动是什么时候。

- **范围**：`sitemap-index.xml` 和 `sitemap-0.xml` 的地址不变，只给每条 `<url>` 加 `<lastmod>`；跳转页和 404 照旧不进 sitemap。
- **改法**：`astro.config.mjs` 的 sitemap 集成加 `serialize`；[`src/lib/sitemap/lastmod.ts`](../src/lib/sitemap/lastmod.ts) 按“网址路径 → 源文件”的约定（首页 `src/pages/index.astro`、`src/content/principle/<id>.md`、`src/content/reference/<id>.md` 和 `reference/<id>/<id>.md`）取 `git log -1 --format=%cs`，写 `YYYY-MM-DD`（`@astrojs/sitemap` 输出成 ISO 时间）。
- **不用构建时间**：CI 每次 checkout 的 mtime 和构建时刻都在变，会把所有页面写成同一个“今天”，谷歌会因为 lastmod 不准而不再相信它。没有 git 历史的构建（`tests/build/` 的临时目录、源码压缩包）就不写这一条，而不是写假的日期。
- **部署**：[`deploy.yml`](../.github/workflows/deploy.yml) 的 `actions/checkout` 改为 `fetch-depth: 0`，默认的浅克隆里大部分文件取不到历史。
- **核对**：`SITE_URL=https://re0claude.us.ci npm run build` 的 `dist/sitemap-0.xml` 19 条都有 `lastmod`（都是 2026-10-22，v3 内容的提交日期），跳转页仍然不在里面；`BASE_PATH=/sub/` 的构建同样 19 条；`npm run check` 通过（astro check 0 错误，单元测试 548 个，构建级用例 27 个，构建 67 页）。
- **线上**：部署后 <https://re0claude.us.ci/sitemap-0.xml> 19 条都带 `lastmod`（2026-10-22），跳转页仍然不在里面；`sitemap-index.xml` 和 `robots.txt` 里的地址没变。
- **控制台**：sitemap 地址没变，Search Console 里不用新增，只要重新提交一次 `https://re0claude.us.ci/sitemap-index.xml`（“站点地图”页点已提交那条右侧的“重新提交”，或删掉再提交同一地址），再用“网址检查”对重点页逐个“请求编入索引”。

## 2026-10-22 v3 正式上线（3.0.0）

v3.0.0 验收通过后，本轮把交付收口并正式上线：清理 v2 遗留资源、重做 README、校准文档日期和验收文字。站点版本保持 **3.0.0**，本次就是 v3 的正式上线。

- **基线**：`main` @ `4a66d47`（V12 验收之后的顶栏昼夜图标、QQ 群号和文案回退提交）。环境：Linux，Node v24.21.0，npm，Playwright Chromium。
- **清理**：删除 `src/assets/screenshots/` 里 29 张在 `src/content/`、`docs/`、`scripts/`、`tests/`、`promo/` 中都没有引用的 v2 截图（2.87 MiB）、v2 的 `说明图-测 IP 质量.svg` 和空的 `.gitkeep`；删除 36 个已合并的本地开发分支和遗留的 `.claude/worktrees/` 工作区。v2.2 计划、v2 交付记录和 `docs/rewrite/` 的删除记录保留作历史，Git 提交历史不动。
- **README**：顶部居中 logo（深浅两版，由 `scripts/build-logo.mjs` 生成，README 用 `<picture>` 按主题切换）、站点/QQ 群/版本/部署/Node/许可/Stars 徽章、深浅两版首页截图、路线概览、QQ 群（群号 1131606770 和加群链接）、本地运行、部署、改内容、开发命令、项目结构、已知限制和文档入口。
- **文档**：V12 的验收日期从误写的 2026-10-24 改回 2026-10-22（提交时间也是 10-22）；需求升 v0.12，把 2026-10-22 作者调整（侧边栏列出全部选项、去掉“换到方案二 →”、悬停/选中不加下划线、走完分支到下一章）写回 FR-16、AC-04 和变更摘要。
- **版本**：保持 **3.0.0**（只做修复和交付整理，没有新增功能）。中途曾按 3.0.1 准备补丁版本，作者要求以本次为 v3 正式上线后改回 3.0.0，`v3.0.1` 的标签和 Release 已撤回。

### 回归与构建

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型、单元、构建级、构建 | `npm run check` | 通过：astro check 0 错误；单元测试 540 通过（40 个文件，含 README 横幅的生成物核对）；构建级用例 27 个；构建 67 页 |
| e2e | `npm run test:e2e` | 950 通过、20 跳过、0 失败（360、768、1280 三种宽度 + `/sub/` 子路径） |
| 内容提示 | `npm run build` | 只剩 1 条作者待补：`ip-tests/qsu-residential` |
| 内容比对 | `node scripts/compare-migration.mjs` | 18 页、正文/命令/链接/截图差异 0；退出码 2（只剩登记的作者待补 1 处） |
| 导入幂等 | `node scripts/import-rewrite.mjs` | 写入 0 个文件，18 个没有变化 |
| 干净目录 | `rsync` 到临时目录（不含 `node_modules/`、`dist/`、`.git/`）后 `npm ci` + `npm run check` | 通过：67 页构建成功，1 条作者待补 |
| 线上 | <https://re0claude.us.ci/> | 已上线，见下方“上线” |

### 上线

- 部署方式不变：推送 `main` 后由 [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) 构建并发布到 GitHub Pages。
- **上线结果**：正式上线提交推送后，Actions 的 build 和 deploy 都成功；V12 验收之后的 README、资源清理和文档变更都在线上版本里。
- **标签和 Release**：附注标签 `v3.0.0` 指向本次正式上线提交；GitHub Release <https://github.com/Finderlzy/rezero-subscribe-claude/releases/tag/v3.0.0> 已创建（非草稿、非预发布）。
- **线上核对**：`/`、`/preface/`、`/plan1/`、`/ip-tests/`、`/search-index.json`、`/sitemap-index.xml`、`/404.html` 都返回 200；旧网址 `/plan1-buy-isp/` 返回“这一页已经并入《方案一：搭建专属住宅代理节点》”，meta refresh 指向 `/plan1/#购买静态住宅-isp-代理`；首页有群号 1131606770。README 的四张图（深浅 logo、深浅首页截图）在 `raw.githubusercontent.com` 上都能取到。

### 未解决项

| 项 | 影响 | 去向 |
| --- | --- | --- |
| 1 页作者待补 | `ip-tests/qsu-residential` 的 TODO 显示“作者待补” | 作者改重写稿再导入；不阻塞上线 |
| 大肥鱼服务器语料 | 只在本地重新生成 `corpus.json`，没同步服务器（上服务器会影响线上群） | 问作者后按插件 README 同步、重启 core |
| v3 的 Issue 草稿 | 实施计划 §3 的 12 个任务仍是草稿，没有发布到 GitHub Issues | 需要时另行授权后发布并回填编号 |
| Safari、Firefox、真机 | 自动化只覆盖 Chromium（NFR-05） | 作者在真机抽查首页、一条分支路线、目录和看大图 |
| 作者抽查 | 首页首屏、一条旧网址和 QQ 群入口 | 上线后 |

## 2026-10-22 v3 视觉验收和全量回归（V12）

V12 按 design §7 和需求 §8 对 v3 做了逐页视觉对照和全量回归，通过；站点版本升到 **3.0.0**，正式上线时附注标签 `v3.0.0` 改指上线提交（见上一节）。

- **基线**：`main` @ `dbb738c`（V10/V11 和 2026-10-22 的侧边栏调整之后）。环境：Linux，Node v24.21.0，npm，Playwright Chromium。
- **版本**：`package.json`、`package-lock.json` 的 `version` 从 2.2.4 改为 3.0.0。
- **视觉范围**：18 个内容页（11 页正文 + `/ip-tests/` 和 6 篇实测）+ 首页 + 404，在 360×800、768×1024、1280×800 三种宽度、浅色和深色各截一张；另截了选择页的选项卡片（未选/已选）、搜索下拉（有结果、没有找到）、360px 抽屉、禁用 JS 的跳转页和首页整页。截图是临时产物，不提交，对照方法是把每页三种宽度和两种主题拼成对照图逐页看。
- **视觉结论**：没有发现要改代码的问题。首页首屏（logo 承担站名和副标题、紫色主按钮、五栏章节简介）与 design §4.4 一致；正文页是顶栏 + 侧边栏 + 740px 正文栏，h1 上方只有眉题，没有色带和章首页一组；长页（`plan1`、`maintenance`、`iphone-subscription`）的侧边栏列出 h2 且锚点可点；选择页末尾是细边框选项卡片，当前路线展开、另一条收起；参考页有固定的“回到”，目录和搜索都能到；跳转页禁用 JS 时先显示“这一页已经并入”和链接；404 有固定字形和大号目录；深色下正文、表格隔行、提示块、搜索下拉和选项卡片都可读，没有橙色出现在小形象以外。
- **自动核对**（截图时顺带在每一页、每种宽度和主题上跑）：所有页面 `scrollWidth` 不超过视口，没有页面级横向滚动；≥720px 侧边栏常驻、<720px 不显示；侧边栏、抽屉和 404 目录都没有章节号（`.toc-chapter-no` 和“第 n 章”都是 0）；侧边栏只展开当前章（分叉点的当前选项展开、另一个收起）；顶栏高 56px；深色只由 `data-theme` 驱动。

### 回归与构建

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型、单元、构建级、构建 | `npm run check` | 通过：astro check 0 错误；单元测试 540 通过（40 个文件）；构建级用例 27 个（2 个文件）；构建 67 页 |
| e2e | `npm run test:e2e` | 950 通过、20 跳过、0 失败（360、768、1280 三种宽度 + `/sub/` 子路径）；AC-01–AC-33 全部重跑，含 AC-31 的 axe、键盘、对比度 |
| 内容提示 | `npm run build` | 只剩 1 条作者待补：`ip-tests/qsu-residential` |
| 内容比对 | `node scripts/compare-migration.mjs` | 18 页、正文/命令/链接/截图差异 0；退出码 2（只剩登记的作者待补 1 处） |
| 导入幂等 | `node scripts/import-rewrite.mjs` | 写入 0 个文件，18 个没有变化 |
| 线上 | <https://re0claude.us.ci/> | 已是 v3 的五章首页（本轮抓取核对）；V10/V11 合并 `main` 时已由 Pages 自动部署，3.0.0 的版本提交推送后重新构建，页面内容不变 |

### 未解决项

| 项 | 影响 | 去向 |
| --- | --- | --- |
| 1 页作者待补 | `ip-tests/qsu-residential` 的 TODO 显示“作者待补” | 作者改重写稿再导入；不阻塞 3.0.0 |
| 大肥鱼服务器语料 | 只在本地重新生成 `corpus.json`，没同步服务器（上服务器会影响线上群） | 问作者后按插件 README 同步、重启 core |
| 作者抽查 | 新页面标题、侧边栏、选项卡片和旧网址去向已经作者 2026-10-22 确认，仍建议抽查一条旧网址和首页首屏 | 上线后 |
| Safari、Firefox、真机 | 自动化只覆盖 Chromium（NFR-05） | 作者在真机抽查首页、一条分支路线、目录和看大图 |

## 2026-10-22 v3 单版本和旧网址（V10/V11）

作者 2026-10-22 交来 `docs/v3-rewrite/` 的 11 页单版本新稿并确认页面地图，V10/V11 把站点从 v2.2 的双版本内容换成 11 页、5 章、2 个分叉点，并把已发布地址全部接上。

- **范围**：11 个页面、7 个参考页（`/ip-tests/` 和 6 篇实测）；删除操作版、独立常见问题、附录、旁支页和方案三；选项卡片改由 frontmatter 生成，侧边栏去掉章节号；搜索、目录和 sitemap 只收单版本页面和参考页。
- **旧网址**：`route.yaml` 的 `moved:` 共 47 条：37 条旧页面（含 6 条按手机选项分流的 `choice`）、2026-10-19 删掉的 `plan1-free-isp`、8 条旧常见问题路径和旧 `faq` 目录；`/ip-tests/` 和 6 篇实测保留原网址。手机旧页的兜底是 `client-desktop#下一步`，锚点由 `ChoiceCards` 输出。
- **环境**：Linux，Node v24.21.0，npm，Playwright Chromium；在分支 `v3-v10-single-version` 的当前工作区运行。
- **同步**：Writing 单独提交 `10df4eb`（11 页 + 7 篇实测，删除旧页、常见问题和操作版）；大肥鱼 `corpus.json` 按教程提交 `e67ab14` 重新生成，18 页、160 块，摘要 `a38a23cb4e986154`；已登记到 `docs/project-board.md` 的 D-034，未同步服务器。

### 回归与构建

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型、单元、构建级、构建 | `npm run check` | 通过：astro check 0 错误；单元测试 540 通过；构建级用例 27 个；构建 67 页（11 页 + 7 参考页 + 首页 + 404 + 47 跳转页 + `search-index.json`） |
| e2e | `npm run test:e2e` | 950 通过、20 跳过、0 失败（360、768、1280 三种宽度 + `/sub/` 子路径）；AC-33 逐条打开 47 条旧网址，6 条手机旧页分别按 iPhone、安卓、无选择核对 |
| 内容提示 | `npm run build` | 只剩 1 条作者待补：`ip-tests/qsu-residential` |
| 内容比对 | `node scripts/compare-migration.mjs` | 18 页、正文/命令/链接/截图差异 0；退出码 2（只剩登记的作者待补 1 处） |
| 导入幂等 | `node scripts/import-rewrite.mjs` | 写入 0 个文件，18 个没有变化 |

### 2026-10-22 用户调整

- **选中项不再加下划线**：选项卡片标题、侧边栏当前项、顶栏左侧站名和正文末尾的“上一步/下一步”在悬停或选中时只靠主色、边框和底色区分，不再加下划线；AC-03、AC-26、AC-27、AC-30 加了断言。
- **侧边栏列出全部方案**：方案一/方案二、iPhone/安卓同时显示，选中的（或当前页所在的）选项展开、其余收起；点选项名只开合，点里面的页面才进入；移除“换到另一条路线 →”链接。找不到页的目录仍平铺全部选项。
- **走完分支到下一章**：`plan1`/`plan2` 的下一步是 `client-desktop`，手机分支最后一步的下一步是 `maintenance`；AC-04 覆盖了两个分叉点的切换和这一跳。
- 回归：`npm run check` 通过；完整 e2e 950 通过、20 跳过（最终数字见本轮运行）。

### 未解决项

| 项 | 影响 | 去向 |
| --- | --- | --- |
| V12 视觉验收 | 还没有按 design §7 在 360/768/1280、深浅两色下逐页截图对照 | 已完成，见上一节（2026-10-22） |
| 部署 | 这一节记录时所写的“线上仍是 2.0.0”已过时：V10/V11 合并 `main` 后 Pages 自动部署，线上已是 v3 | 3.0.0 见上一节 |
| 大肥鱼服务器语料 | 只在本地重新生成 `corpus.json`，没同步服务器（上服务器会影响线上群） | 问作者后按插件 README 同步、重启 core |
| 作者确认 | 新页面标题、侧边栏和旧网址去向已按 2026-10-22 确认的 §3.1 落地，仍建议作者抽查一条旧网址 | 上线后 |

## 2026-10-19 上线

2.0.0 部署到 GitHub Pages，正式地址 <https://re0claude.us.ci/>（需求 Q-01）。

- **部署方式**：推送 `main` 后由 `.github/workflows/deploy.yml` 构建（`SITE_URL=https://re0claude.us.ci`，根路径）并发布；首次部署是 `3250287`。部署步骤见 [README](../README.md)。
- **域名**：`re0claude.us.ci` 是 DNSHE 的免费子域名，解析是一条 CNAME 指向 `finderlzy.github.io`；Pages 设置里填了自定义域名，Let's Encrypt 证书已签发（到 2027-01-17），开了强制 HTTPS。
- **公开仓库前的历史扫描**：仓库改为公开前扫了全部 113 个提交（含所有本地分支）的差异：IP 只有示例、公共 DNS 和 GitHub Pages 地址；`vless://`、`hysteria2://` 只是正文里的前缀说明；没有密钥格式、UUID、密码或面板账号、带令牌的链接，没有提交过 `.env` 或证书文件。截图在 2.0.0 验收后没有新增，打码此前已逐张核对。
- **上线核对**：首页、样式表正常返回，不存在的地址返回 `404.html`。

## 2026-10-19 2.0.0 上线前整体验收

需求 v0.4 的 v2 全部范围（[实施计划](implementation-plan.md) 的 v2.0、v2.1 任务 #23–#40 和 [v2.2 改版](v2.2-plan.md)），准备以 **2.0.0** 上线。

- **基线**：`main` @ `2ee93a8`（与 `origin/main` 一致），验收分支 `delivery-v2.0.0`。#23–#40 都已关闭，提交都在 `main` 的历史里；没有开着的 Issue。
- **环境**：Linux，Node v24.21.0，npm，Playwright Chromium。全部检查在临时目录的干净克隆里跑（`git clone` → `npm ci`），不依赖开发目录的缓存和忽略文件；只有需要 `.cache/fonts/` 和 `docs/rewrite/附件/`（都不入库）的两项在开发目录里补跑。
- **版本**：`package.json`、`package-lock.json` 定为 2.0.0；已打附注标签 `v2.0.0`（指向 `fc559d0`）并推送。尚未创建 GitHub Release。当时未部署，2026-10-19 已上线，见上一节。
- **结论**：自动化检查、产物抓取和 AC-13 比对全部通过；内容上还有 9 页作者待补和后记联系渠道待补，不阻塞功能，但上线前要作者决定是否接受。

### 回归与构建

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型、单元、构建级、构建 | `npm run check` | 通过：astro check 0 错误 0 警告；单元测试 464 通过、2 跳过（`build-logo.test.ts` 需要不入库的字体，在开发目录补跑 2 个通过）；构建级用例 16 个；构建 59 页 |
| e2e | `playwright test`（4321 端口被本机的 `astro dev` 占着，用只改端口为 4331/4332 的临时配置，跑完删除） | 1163 通过，2 跳过（`ac-15` 根路径检查只在 `desktop-1280` 跑），约 2.6 分钟 |
| 内容未改 | `node scripts/import-rewrite.mjs` | 写入 0 个文件，96 个没有变化 |
| AC-13 比对 | `npm run build` 后 `node scripts/compare-migration.mjs` | 退出码 2：命令、链接、截图差异都是 0，只剩登记的作者待补 9 页。干净克隆和开发目录各跑一次，结果相同 |

AC-13 比对脚本这次先报了 37 条差异，逐条查过都是脚本落后于后来的改动，内容本身没有差异。已修脚本，并在克隆的产物里篡改一个代码块的语言、一张说明图的标题和一个裸地址链接，确认三处都会报出来：

| 报出的差异 | 原因 | 修正 |
| --- | --- | --- |
| 30 条命令差异：代码块文字一致，语言标记对不上 | v2.2 关掉了 Shiki（`02da21c`），语言标记从 `<pre data-language>` 变成 `<code class="language-…">` | 按新写法读语言，没写语言的按 `plaintext`；登记 `code-lang` 的说明改成现状 |
| 4 条 TODO 登记数对不上 | 方案一改版后 `plan1-make-node`、`plan1-panel` 的 TODO 已补完，`plan1-buy-isp` 剩 2 段，`faq/panel-login` 新增 1 段 | `PENDING.todos` 按重写稿现状登记（和构建提示的 9 页一致） |
| 4 条链接差异：`proxy.qsu.hk` 裸地址 | 正文里的裸地址按 GFM 渲染成链接（`2ee93a8` 同步进来的客服原话） | 新登记 `autolink`：链接文字等于地址、且重写稿里有这个裸地址时，按裸地址核对 |
| 3 条截图差异：说明图 | #39 起说明图内联成 `<svg data-diagram>`，不是 `<img>` | 新登记 `diagram-inline`：按 `<title>` 对回 `附件/` 的原稿（附件不入库，没有时用 `src/assets/diagrams/` 的导入副本），张数也要一致 |

### 产物验证

- 干净克隆里构建的 `dist/`（59 页，5.4 MB）用 `python3 -m http.server`、`dist-sub/` 用 `tests/e2e/static-server.mjs` 挂在 `/sub/`，从首页广度抓取全部站内 `href`、`src`、`srcset` 和 CSS `url()`：两份各 149 个地址，失败 0，子路径产物没有跳出 `/sub/` 的链接；`/sub/` 下不存在的地址返回 404。
- 产物里没有外部的脚本、样式表、图片或 iframe，没有统计脚本和网页字体。
- 扫描全部提交历史：出现的 IP 只有示例和公共 DNS（`8.8.8.8`、`1.1.1.1`、`127.0.0.1`，截图核对记录里的 Google、Cloudflare DNS 出口），没有 `vless://` 节点链接、密码或密钥。

### 验收矩阵（需求 §8）

| 编号 | 场景 | 方式 | 结果 |
| --- | --- | --- | --- |
| AC-01 | 首页：logo、五章目录、“从第 00 章开始” | `ac-01-home.spec.ts` | 通过 |
| AC-02 | 6 种组合 × 两种视图走到后记 | `ac-02-walk.spec.ts`、`ac-02-static-walk.spec.ts`（关 JS）、`ac-02-chapter-card.spec.ts` | 通过 |
| AC-03 | 选方案三、汇合、上一步回方案三 | `ac-03-choice-blocks.spec.ts` | 通过 |
| AC-04 | 目录里改方案后导航按新路线 | `ac-04-change-route.spec.ts` | 通过 |
| AC-05 | 五、打开面板的跳过 | `ac-05-skip.spec.ts` | 通过 |
| AC-06 | 原理/操作整页切换，跨页保持 | `ac-06-view-toggle.spec.ts` | 通过 |
| AC-07 | 视频区域 | `ac-07-video.spec.ts`（没有视频时没有视频区域、不请求视频平台）；有视频时的门面由 `VideoFacade.test.ts` 覆盖 | 部分：现有内容没有带视频的步骤，真实播放不适用 |
| AC-08、AC-09 | 无痕窗口直接打开；节点方案没选时按默认的方案二走（2026-10-20 起），手机系统没选时指向选择页 | `ac-08-direct-url.spec.ts`、`ac-09-unchosen.spec.ts` | 通过 |
| AC-10 | 没有“默认”、已读标记和进度 | `ac-10-no-default.spec.ts`、`ac-10-no-progress.spec.ts` | 通过 |
| AC-11 | 参考页“返回刚才的步骤” | `ac-11-reference-return.spec.ts` | 通过 |
| AC-12 | TODO 显示“作者待补”，构建列出 | `ac-12-author-todo.spec.ts` + 构建输出 | 通过 |
| AC-13 | 比对脚本对照重写稿 | `compare-migration.mjs` | 通过：差异 0，只剩登记的作者待补 |
| AC-14 | 坏内容让构建失败并报文件 | `tests/build/ac-14-build-fail.test.ts`（16 个用例） | 通过 |
| AC-15 | 根路径、子路径 | `ac-15-base-path.spec.ts` + 本次产物抓取 | 通过 |
| AC-16 | 360/768/1280 无页面级横向滚动 | `ac-16-responsive.spec.ts` | 通过 |
| AC-17 | 屏蔽 Google、YouTube | `ac-17-blocked-domains.spec.ts` | 通过 |
| AC-18 | 找不到页；禁用存储走完一条路线 | `ac-18-not-found.spec.ts`、`ac-18-storage-disabled.spec.ts` | 通过 |
| AC-19 | 旁支页“回到”，主路线不经过 | `ac-19-side-page.spec.ts` | 通过 |
| AC-20 | logo 风格作者确认 | 沿用 #24 的作者确认；favicon、深浅配色由 e2e 和 v2.1 视觉验收覆盖 | 通过（沿用） |
| AC-21 | 对比度、axe、键盘 | `a11y.spec.ts`、`src/styles/tokens.test.ts` | 通过 |
| AC-22、AC-23 | 附录；常见问题一问一页 | `ac-22-appendix.spec.ts`、`ac-23-faq-pages.spec.ts` | 通过 |
| NFR-05 | Safari、Firefox、真机 | — | **未执行**：自动化只覆盖 Chromium |

视觉部分沿用今天的 [v2.2 改版验收](#2026-10-19-v22-改版验收)（54 张截图人工核对），这次没有新的页面改动，没有重截。

### 未解决项

| 项 | 影响 | 去向 |
| --- | --- | --- |
| 9 页作者待补：防泄漏、三、购买 ISP 代理、iPhone：导入代理软件、iPhone：把 App Store 改到奥地利、被封了：申诉解封、安卓：订阅、面板的用户名密码安全吗、实测：QSU 住宅服务器、实测：Decodo ISP | 这些地方显示“作者待补” | 作者改重写稿再导入；不阻塞上线，作者决定是否接受 |
| 后记没有联系渠道 | 后记写了“可以来找我”，没写去哪找 | 需求 Q-07，作者提供 |
| Safari、Firefox、真机；编号字形跨设备对比 | NFR-05、design §7 无证据 | 上线前由作者在真机抽查首页、一条分支路线、目录和看大图 |
| 没有步骤视频 | 不显示视频区域 | 作者有视频后写进 frontmatter |

上一节 v2.2 验收列的“原理版《测 IP 质量》第 13 行”已由 `de81d57` 改为指向“四、把服务器变成节点”，已解决。

## 2026-10-19 v2.2 改版验收

[v2.2 改版计划](v2.2-plan.md) §8 的全量验证（需求 v0.4：FR-16 常驻侧边栏、附录、常见问题一问一页；AC-22、AC-23）。

- **基线**：分支 `v2.2-redesign`，验收时 HEAD `27ee937`；起点 `main` @ `0457de2`。
- **环境**：Linux，Node 24，Playwright Chromium。
- **结论**：自动化检查全部通过；人工核对发现 4 处问题，已在 `27ee937` 修正（见下）。

| 检查 | 方式 | 结果 |
| --- | --- | --- |
| `npm run check` | astro check、464 个单元测试、16 个构建级用例（含 5 个常见问题坏内容用例）、构建 | 通过 |
| e2e | `astro build` 后跑全套 Playwright：360、768、1280 三个项目 + `BASE_PATH=/sub/` 的子路径项目 | 1163 通过、2 跳过（ac-15 在 360、768 下按设计跳过）。4321 端口当时被另一个 `astro dev`（本仓库 `.claude/launch.json` 的 dev 配置，不是本次启动的）占着，没有停它，改用同一份配置换成 4331/4332 端口跑 |
| 内容未改 | 重新运行 `node scripts/import-rewrite.mjs` | 写入 0 个文件，`src/content/**/*.md` 和重写稿一致；`docs/rewrite/` 没有改动 |
| 视觉核对 | 内置浏览器 + Playwright 截图：首页、`/choose-plan/`、`/plan1-buy-server/`、`/google-appeal/`、`/appendix/`、`/faq/`、`/faq/ssh-permission-denied/`、`/ip-tests/decodo/`、找不到页，360×800、768×1024、1280×800，浅色和深色共 54 张（临时产物，不提交） | 见下表 |

| §8 第 4 条 | 结果 |
| --- | --- |
| 1280 下左侧目录常驻，当前页高亮，侧边栏独立滚动 | 通过：侧边栏只在 ≥1100px 显示，首次加载滚到当前项；滚动侧边栏时页面不动 |
| 步骤页没有补零的“0X”编号 | 通过：眉题写“第 1 章 · 准备节点和住宅 IP · 第 2 步，共 9 步”；补零的 00–04 只在首页和目录 |
| 选项是编号行，不是大框 | 通过 |
| 翻页是“文字链接 + 一个黑色主按钮” | 通过 |
| 后记的下一步进入附录 | 通过（AC-22）：附录的下一步是“回到首页”；附录页眉题只写“附录”，不写步数（2026-10-19 修正，原先写“第 1 步，共 1 步”） |
| 常见问题一条一页，步骤里的链接直达对应条目 | 通过（AC-23）：7 条，`/faq/<id>/?from=<来源页>` |
| 橙色只出现在小形象上 | 通过：页面上除小形象外没有元素用 `--mascot` |
| 每页页脚都有非官方声明 | 通过：54 张截图对应的页面都有 |
| 没有页面级横向滚动 | 通过：三种宽度全部为 0 |

人工核对发现并已修正（`27ee937`）：

1. 眉题和侧边栏的章号从 1 起（“第 2 章 · 准备节点和住宅 IP”），和首页、目录的 `01`、章首页的 `CHAPTER 01` 对不上 → 改为从 0 起、不补零。
2. 章首页的眉题被页面脚本改回带章的写法（页面漏了 `data-chapter-start`）→ 补回，章首页只写“第 1 步，共 n 步”或“选择”。
3. “下一步”按钮只写标题 → 按 W4b 写“下一步：<标题> →”（手机底栏只写标题）；“← 上一步”箭头后空一格。
4. 平板上页脚的声明比正文缩进一截（宽度按小字号算了 38em）→ 对齐正文。

未解决或没验证：

| 项 | 说明 |
| --- | --- |
| 原理版《测 IP 质量》第 13 行 | 写着“方案一还要先做完 [[三、购买 ISP 代理]]，把 ISP 配到节点上”，按新流程配 ISP 的是“四、把服务器变成节点”，要作者改重写稿再导入 |
| 编号字形跨设备对比、Safari/Firefox | 沿用 v2.1 的待补项 |
| 小形象 | 作者坚持使用官方形象，Agent 不推荐（design §8 保留的分歧） |

## 2026-10-17 v2.1 视觉验收（#40）

2.0.0 整体验收的视觉部分（design §7；AC-16、AC-21；AC-20 的 logo 部分沿用 #24 的结论）。

- **基线**：`origin/main` @ `3913376`（合并 #39 之后），分支 `issue-40-visual-acceptance`。
- **环境**：Linux，Playwright Chromium（`@playwright/test` ~1.64）。
- **结论**：自动化检查全部通过；人工对照发现两处问题，已修正（见下）。编号字形的跨设备对比要用作者的设备，还没做。

| 检查 | 方式 | 结果 |
| --- | --- | --- |
| 通用 | `npm run check` | 通过：astro check 0 错误，单元测试 439 个，构建级用例 9 个，构建成功 |
| 三种宽度 | `npm run test:e2e`，`playwright.config.ts` 新增 `tablet-768`（768×1024）项目，和 `mobile-360`、`desktop-1280` 跑同一套用例；原先在用例里单独设 768 宽的块已并入 | 998 通过，2 跳过（`ac-15` 根路径检查只在 `desktop-1280` 跑一次）：360 宽 331、768 宽 331、1280 宽 332、子路径 4；整套约 1.7 分钟（含两次构建） |
| axe | `a11y.spec.ts`，三种宽度 × 深浅两色，逐页扫描，两版正文的页面再扫原理视图 | 没有 serious 及以上问题 |
| 键盘 | `a11y.spec.ts`：只用 Tab 和回车从前言走到方案一的第一步（AC-02 路线的前五页），焦点环 2px | 三种宽度都通过 |
| 截图对照 | 360×800、768×1024、1280×800 × 浅色、深色，截首页、步骤页（操作、原理）、章首页（两种视图）、原理版说明图、选择页（未选、已选）、旁支页、目录抽屉、常见问题、实测、找不到页，逐条对照 §4、§6 | 发现两处问题，已修正后重截确认；截图是临时产物，没有提交 |
| 编号字形跨设备 | iPhone、安卓、Windows 截图对比 | **未做**：需要作者的设备 |

人工对照的结论：

- **每屏一个大块紫色**：首页首屏是主按钮，步骤页、旁支页、找不到页是主按钮，章首页第一屏是章节号（修正后，见下；四个章首页在 768、1280 宽下逐个量过“下一步”的位置）；正文链接、色带、选择页“当前选择”标签是细的紫。视图切换按下的一段是墨色。
- **编号在同一条竖线上**：桌面上章节号、步骤编号、“选择”“旁支”二字和截图编号都右对齐到页边栏右缘（`ac-02-chapter-card`、`ac-06-view-toggle`、`nfr-02-copy-zoom` 实测）；平板和手机编号在 h1 前、截图编号在截图下方。
- **拒绝清单（§6）**：没有渐变、阴影块、卡片网格、居中标题、emoji、“默认”标记或已读标记；全站只有 1px 实线；页面不加载网页字体。

发现并修正的问题（已写进 design §8 第 9、10 条）：

| 问题 | 修正 | 用例 |
| --- | --- | --- |
| 章首页的第一屏同时有章节号和紫色“下一步”，两个大块紫（违反 §3.1）：手机上底栏吸底；致谢页正文短，768、1280 宽下也同屏 | 章首页的“下一步”在所有宽度都改用墨色 | `ac-02-chapter-card.spec.ts`“章首页的‘下一步’是墨色” |
| 360 宽时实测合集的表格列被挤成一字一行，第一列没有粘性固定（§4.7） | 全站正文表格：表头不折行，窄屏上整张表在容器里横向滚动；第一列粘性固定 | `ac-16-responsive.spec.ts`“实测合集的表格”（含滚动后第一列不动） |

待补：编号字形在 iPhone、安卓、Windows 上的截图对比（design §7），由作者在真机上做；Safari、Firefox 的实测沿用下面首期的待补项，另加一条：表格第一列粘性固定和合并边框一起用，这两个浏览器横向滚动时第一列的竖线可能错位。

## 2026-10-15 首期整体验收

- **基线**：`main` @ `6145899`（合并 #22 之后），与 `origin/main` 一致。验收时版本号 0.1.0；验收通过后按作者决定定为 **1.0.0**（`package.json`、`package-lock.json`），已打附注标签 `v1.0.0`（指向 `d6072b1`）并推送；尚未创建 GitHub Release，也未部署。
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
