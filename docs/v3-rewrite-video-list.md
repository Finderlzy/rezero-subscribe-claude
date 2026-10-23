# v3 视频清单（制作辅助，不是正文）

文章里的视频位用加粗行标记，搜索 `**视频` 就能定位。平台还没定，所以下面只写编号和要录的内容；录好后把对应占位行换成实际视频嵌入，并在视频上方加一句“下面的视频演示……”。

| 编号 | 所在文章 | 录什么 | 备注 |
| --- | --- | --- | --- |
| 01-1 | 01 整体思路 | claude.ai → 头像 → Settings → Account → Log out of all devices；Claude Code 缓存清理；手机 App 退出登录 |  |
| 02-1 | 02 方案一 | 选 Debian 12、1 核 1 GB、机房地区 → 付款 → 记下服务器 IP 和 root 密码 |  |
| 02-2 | 02 方案一 | 选 SOCKS5 → 付款 → 复制代理地址、端口、用户名、密码 |  |
| 02-3 | 02 方案一 | 关本地代理 → curl 测出口 → ipinfo 看 AS Type / Privacy → Scamalytics 查分 |  |
| 02-4 | 02 方案一 | SSH 连接服务器：ssh 命令 → yes → 密码 → `root@...:~#` | 与 03-3 共用 |
| 02-5 | 02 方案一 | 运行脚本：确认 IP → 填 ISP 参数 → 等完成 → 保存节点和面板信息 |  |
| 02-6 | 02 方案一 | SSH 隧道 → 浏览器打开面板 → 登录 | 与 03-5 共用 |
| 03-1 | 03 方案二 | 选住宅服务器套餐 → 确认 Debian 12 / 1 核 1 GB / 住宅 IP → 付款 → 记 IP、SSH 端口、root 密码 |  |
| 03-2 | 03 方案二 | ipinfo 查服务器 IP → Scamalytics 查分 |  |
| 03-3 | 03 方案二 | SSH 连接 | 与 02-4 共用，不用重录 |
| 03-4 | 03 方案二 | 运行脚本：“住宅代理 IP”直接回车跳过 → 等完成 → 保存节点和面板信息 |  |
| 03-5 | 03 方案二 | 打开面板 | 与 02-6 共用，不用重录 |
| 04-1 | 04 电脑端 | v2rayN 下载解压 → 管理员运行 → 从剪贴板导入 → 选主节点 → 清除系统代理 → 启用 Tun |  |
| 04-2 | 04 电脑端 | 规则集 V4-绕过大陆(Whitelist) → 域名解析策略 AsIs → DNS 基础设置按表填 → 检查规则顺序 | 已录（2026-10-23）：规则部分拆成两段，`v2rayn-rules.mp4`（进入路由设置、加两条 Claude 规则）和 `v2rayn-rules-order.mp4`（拖动检查顺序）；DNS 部分待录 |
| 04-3 | 04 电脑端 | browserleaks WebRTC → 关 WebRTC → ipleak 看 IPv6 → 关 IPv6 → 复测 |  |
| 04-4 | 04 电脑端 | 关闭自动时区 → 手动选台湾/新加坡/住宅 IP 城市 → browserleaks 确认 |  |
| 05-1 | 05 iOS 端 | App Store 头像 → 账户名 → 国家/地区 → 奥地利 → 继续 → 同意 → EPS / Bank Austria → PLZ 1010 → 保存 |  |
| 05-2 | 05 iOS 端 | V2Box 快速设置选 China → 配置 → + → 从剪贴板导入 → 选中 → 滑动连接 → 允许 VPN |  |
| 05-3 | 05 iOS 端 | 定位服务 → 系统服务 → 关闭“设定时区”；通用 → 日期与时间 → 关闭自动设置 → 选城市 |  |
| 06-1 | 06 安卓端 | v2rayNG 安装 → + → 从剪贴板导入 → 选中 → 启动 → 允许 VPN |  |
| 06-2 | 06 安卓端 | Google 基础服务 → 自带商店/浏览器装 Google Play → 登录账号 |  |
| 06-3 | 06 安卓端 | 关闭自动设置时区 → 手动选地区 |  |
| 07-1 | 07 iOS 注册订阅 | Gmail 注册：代理 → 创建账号 → 姓名/生日 → +86 验证（如果出现）→ 密码 | 与 08 共用 |
| 07-2 | 07 iOS 注册订阅 | Chrome 登录 → myaccount 补资料 | 与 08 共用 |
| 07-3 | 07 iOS 注册订阅 | policies.google.com/terms → 看地区版本 → 申请更改 | 可选；与 08 共用 |
| 07-4 | 07 iOS 注册订阅 | claude.ai → Continue with Google → 选 Gmail → 授权 → 完成注册 | 与 08 共用 |
| 07-5 | 07 iOS 注册订阅 | appleid.apple.com → 创建账户 → 国家美国 → 填资料 → 邮箱/手机验证 |  |
| 07-6 | 07 iOS 注册订阅 | App Store 退出原账号 → 登录美区号 → 检查/同意条款 → 付款方式“无” → 免税州账单地址 → 下载 Claude → 允许 App 内购买 |  |
| 07-7 | 07 iOS 注册订阅 | Pockyt Shop → 游客 → 支付宝 → 美国 / App Store & iTunes → 买 2 美元 → 订单复制号码 → App Store 兑换 |  |
| 07-8 | 07 iOS 注册订阅 | Claude App → Google 登录 → 升级 → 选方案 → 确认余额 → Face ID → 成功 |  |
| 08-1 | 08 安卓注册订阅 | Google Play 搜 Claude → 认准 Anthropic → 安装 → Google 登录 |  |

## 录完后怎么替换

视频自托管在站点里，不放 B 站（2026-10-23 定）：分成很多条小录屏，一条对应一个小节，放外站反而难找。

1. 找到对应的 `**视频 XX-X：...**` 占位行。
2. 录好的视频转成 mp4（H.264）再放进仓库，文件名用小写英文和连字符，例如 `v2rayn-rules.mp4`：

   ```sh
   ffmpeg -err_detect ignore_err -i "录屏.webm" -an -vf "scale=1600:-2" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart public/videos/v2rayn-rules.mp4
   # 封面（可选）：挑一帧能看出在讲什么的画面，没有封面时播放器是黑底
   ffmpeg -ss 20 -i public/videos/v2rayn-rules.mp4 -frames:v 1 -vf scale=1200:-2 -q:v 4 public/videos/v2rayn-rules.jpg
   ```

   录屏默认是 webm（Obsidian 的录屏可能没正常收尾，解码报错时加 `-err_detect ignore_err`）；只提交转好的 mp4 和封面 jpg，源文件不进仓库。上面那条是 CPU 的兜底命令，有显卡用下面的脚本。

3. 把占位行换成“引导语 + `![[名字.mp4]]`”，嵌入单独占一行：

   ```text
   具体操作看下面的视频（以 v2rayN 为例）：

   ![[v2rayn-rules.mp4]]
   ```
4. 删掉该小节里已经不再需要的过渡文字（如果有），跑 `node scripts/import-rewrite.mjs` 导入、`npm run build` 确认页面里的视频能播。引用表里把这个占位行的状态改掉。

   有显卡就用 `node scripts/encode-video.mjs`，裁剪、GPU 缩放、编码和封面一条命令搞定：

   ```sh
   node scripts/encode-video.mjs ~/视频/"录屏 2026-10-23 13-45-41.webm" v2rayn-rules --poster 8
   # 一次转多条：清单里一行“源文件 输出名 [封面第几秒]”，默认同时跑 6 条
   node scripts/encode-video.mjs --batch 清单.txt
   ```

   整条链路都在显卡上（先 `hwupload_cuda`，用 `scale_cuda` 缩放），CPU 基本不干活；只在最后编码、前面用 CPU 的 `scale` 时，20 核会被占掉 90% 以上，编码器反而在等帧。并行默认 6 条：实测 4 条 NVENC 88%、6 条 94%（峰值 100%），再多不再涨。没有可用显卡时脚本自己退回 `libx264`。`--preset phone` 裁的是安卓竖屏录屏（状态栏和窗口边框），别的分辨率用 `--crop w:h:x:y` 自己指定；`--qp` 越大文件越小，34 左右文字仍然清楚。

5. **脱敏**（必做）：录屏里不要露出服务器 IP、节点名、项目名。开头和结尾露出节点列表或日志的，直接剪掉；漏在画面中间的，涂掉那几帧上的字符（不要只画一块灰，看起来太刻意）。做完再全片抽帧 OCR 一遍，确认搜不到 `66.`、IP 段、节点名和标签页里的项目名。
