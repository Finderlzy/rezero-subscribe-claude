> 引导站：https://re0claude.us.ci/android-subscription/
> 本文件由 `npm run skill` 从 `docs/v3-rewrite/08-账号注册与订阅全流程-安卓端.md` 生成，不要手改。

# 账号注册与订阅全流程：安卓端
---

如果你用的是安卓手机，这一章带你完成从注册 Gmail 到订阅 Claude 的全过程。

需要先说清楚：**我自己的订阅走的是 iOS 路线，安卓支付的步骤是一位群友走通之后分享的**，下面按他的操作写；我本人没有在安卓上付过款，用到这一步时请自己判断。

```text
注册 Gmail
   ↓
在 Chrome 登录，完善资料
   ↓
正常用两天
   ↓（可选）修改 Google 账号地区
注册 Claude
   ↓
在 Google Play 安装 Claude
   ↓
在 Google Play 添加付款方式
   ↓
在 Claude App 内订阅
```

## 注册 Gmail

> 引导站小节：https://re0claude.us.ci/android-subscription/#注册-gmail

---

确认手机的 v2rayNG 已经连接，出口是你的住宅 IP。打开 Gmail App；如果还没装，用浏览器打开 [google.com](https://google.com) 也可以。在“设置电子邮件”里选择 **Google**，点 **创建账号**，跟着指引走。

姓名没有英文名就用拼音，出生日期要满 18 岁。如果要求手机号验证，可以用国内的 `+86` 手机号，这个验证是随机触发的，遇到就填，收短信即可；最后设置可靠的密码，记好辅助邮箱。

**视频：注册 Gmail，与 07-1 共用**

## 登录 Chrome，完善资料

> 引导站小节：https://re0claude.us.ci/android-subscription/#登录-chrome完善资料

---

确认电脑的代理已经打开，安装并打开 [Chrome](https://www.google.com/chrome/)。点右上角头像 → 登录，用刚注册的 Gmail 登录；再打开 [myaccount.google.com](https://myaccount.google.com/)，在“个人信息”里补上名字、头像、生日。

**视频：登录 Chrome、完善资料，与 07-2 共用**

“付款和订阅”里什么都不要填。绑一张国内的卡，等于直接告诉对方你在哪里。

### 先用两天

> 引导站小节：https://re0claude.us.ci/android-subscription/#先用两天

新注册的 Google 账号很脆弱，不要马上拿去注册 Claude 或绑定支付。先像普通人一样用两天：

- 注册 X、Instagram，刷刷 YouTube，逛逛外网；
- 保持代理开着，让账号一直在你的住宅 IP 下活动；
- 不要高频请求。

如果这两天账号被封了，去 [日常维护那章的申诉部分](https://re0claude.us.ci/maintenance/#账号受限之后)看怎么处理。一直没事，就继续往下走。

## 修改 Google 账号地区（可选）

> 引导站小节：https://re0claude.us.ci/android-subscription/#修改-google-账号地区可选

---

这一步不是硬性要求，只是我个人的经验，网上没有明确依据。想让账号的地区和住宅 IP 对上，可以改；不想改就跳过。

保持代理开启，打开 [policies.google.com/terms](https://policies.google.com/terms)，看页面上写的“国家/地区版本”。如果显示中国大陆或香港，可以在同一页面申请更改到住宅 IP 所在的地区。Google 会审核，可能要等一段时间；审核期间最好一直在住宅 IP 下。

**视频：修改 Google 账号地区，与 07-3 共用（可选）**

## 注册 Claude

> 引导站小节：https://re0claude.us.ci/android-subscription/#注册-claude

---

前面所有步骤都做完、检测都通过，再去注册，不要边注册边调。打开 [claude.ai](https://claude.ai)，点 **Continue with Google**，选择刚注册的 Gmail，按提示授权并完成注册；中途可能需要验证邮箱或手机号。

**视频：注册 Claude，与 07-4 共用**

**一个 IP 不要注册好几个账号。** 注册后先正常用几天，最好把免费额度用完，等它主动弹出升级提示，再考虑订阅。

## 安装 Claude

> 引导站小节：https://re0claude.us.ci/android-subscription/#安装-claude

---

确认 v2rayNG 已经连接，并且 Google Play 已经登录你的 Google 账号。在 Google Play 里搜索 **Claude**，认准开发者是 Anthropic，安装；打开 App，用 Google 账号登录，确认能正常进入。

Google Play 会根据 IP 和账号地区显示不同的应用。如果搜不到 Claude，先检查代理是否连上、节点出口是不是 Claude 支持的地区，再确认 Google Play 登录的是哪个账号。

**视频 08-1：在 Google Play 安装 Claude**

## 支付

> 引导站小节：https://re0claude.us.ci/android-subscription/#支付

---

安卓的付款走的是 Google Play：先在 Google Play 里绑好能用的付款方式，再到 Claude App 里选套餐，最后在弹出的 Google Play 窗口里确认付款。钱由 Google Play 收，Claude 那边只认你登录的账号。

下面这组截图是一位群友走通之后提供的，他允许我写进教程。他已经订阅了 Pro，所以截图里的套餐页面用 Max 演示，操作流程和 Pro 一样。

### 在 Google Play 添加付款方式

> 引导站小节：https://re0claude.us.ci/android-subscription/#在-google-play-添加付款方式

打开 Google Play，点右上角头像 → **付款和订阅** → **付款方式**，添加一张你手里能用的卡。这位群友用的是国内发行的万事达卡，绑上去就能用；听说国内发行的卡有被封的风险，他目前暂时先用着，能不能长期用我也没有把握。

看图：https://re0claude.us.ci/android-subscription/#在-google-play-添加付款方式

注意看截图里的两行：**Google Play 余额是 US$0.00**，真正扣款的是下面那张卡；**备用支付方式**默认是关的，打开之后这张卡扣款失败时会自动走备用方式。

### 在 Claude App 内选套餐

> 引导站小节：https://re0claude.us.ci/android-subscription/#在-claude-app-内选套餐

付款方式绑好以后，回到 Claude App，点升级，选择要订阅的套餐。以 Max 为例，同一个套餐有两种用量：**US$125.00** 是 Pro 用量的 5 倍，**US$250.00** 是 20 倍，都按月计费。Pro 的额度一般够用，价格以 App 里显示的为准。

看图：https://re0claude.us.ci/android-subscription/#在-claude-app-内选套餐

选好之后点 **获取 Max 套餐**（订阅 Pro 时按钮会写成 **获取 Pro 套餐**）。

### 在弹出的 Google Play 窗口里确认

> 引导站小节：https://re0claude.us.ci/android-subscription/#在弹出的-google-play-窗口里确认

点完按钮会弹出 Google Play 的付款窗口。这里先核对三件事：

- 订阅的是不是 `Claude Pro` 或 `Claude Max`，开发者是不是 Anthropic；
- **即将收取的费用**：今天扣多少、之后每月多少，这里写的都是“税费另计”，实际扣款会比显示的多一点，以结算页为准；
- 下面的付款方式是不是你在 Google Play 里绑好的那张卡。

看图：https://re0claude.us.ci/android-subscription/#在弹出的-google-play-窗口里确认

都对得上，点最下面的 **订阅**，按提示验证（密码、指纹或面容），这笔款就从卡里扣了。用礼品卡余额付款的，这一步能看到余额被扣减。

订阅成功后，随时可以在 Google Play → 右上角头像 → **订阅** 里管理或取消。以后回到安卓手机或电脑网页打开 Claude，订阅权益都跟着这个 Claude 账号走。

### 关于风险

> 引导站小节：https://re0claude.us.ci/android-subscription/#关于风险

用国内发行的卡在 Google Play 上付款，等于让 Google 和 Anthropic 看到一笔来自国内的支付，被风控的可能存在。我的建议是：可以用，但**不要在订阅成功之后反复改付款方式，也不要连续重试失败的订单**。如果之后想换成更稳妥的方式，可以看 [iOS 端那章的“注册美区 Apple ID”到“在 App 内订阅”](https://re0claude.us.ci/iphone-subscription/#注册美区-apple-id)，借一台 iPhone 用礼品卡订阅；Claude 账号是用 Google 账号注册的，和 Apple ID 无关，在哪边付款权益都跟着 Claude 账号。

如果你在安卓上走通了，或者遇到了我没写到的问题，欢迎把步骤和截图发给我，我把它补进这一章。
