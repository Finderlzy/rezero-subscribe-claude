> 引导站：https://re0claude.us.ci/maintenance/
> 本文件由 `npm run skill` 从 `docs/v3-rewrite/09-日常维护、风控应对与常见故障.md` 生成，不要手改。

# 日常维护、风控与常见问题
---

订阅成功不等于一劳永逸。前面做的所有事，都是为了让 Claude 觉得你是一个普通的海外用户；订阅之后，你也要继续像一个普通用户那样使用。

这一章讲日常使用的注意事项、账号受限后的处理，以及账号、IP、额度这些最常被问到的问题。技术故障的排查，放到对应章节末尾的「常见问题」里。

## 订阅之后，继续像普通人一样用

> 引导站小节：https://re0claude.us.ci/maintenance/#订阅之后继续像普通人一样用

---

风控最敏感的是“不像人”的行为。下面几件事，最好一直注意。

### 不要刚订阅就猛用

> 引导站小节：https://re0claude.us.ci/maintenance/#不要刚订阅就猛用

新付费的账号，前几天属于观察期。不要第一天就连续十几个小时高并发使用、一下子把额度刷满。像一个正常上班、学习的人那样，由浅入深地增加使用量。

### 保持出口 IP 稳定

> 引导站小节：https://re0claude.us.ci/maintenance/#保持出口-ip-稳定

不要今天用美国住宅、明天切到日本节点、后天又在没开代理的情况下裸连。短时间内跨大洲的 IP 漂移，在安全系统眼里很像“账号被盗”或“多人在异地共享”。

只要你用 Claude，就固定用自己搭的那一条住宅出口。主节点和备用节点之间切换没关系，它们的出口是同一个。

### 控制登录设备

> 引导站小节：https://re0claude.us.ci/maintenance/#控制登录设备

不要把账号分给多个朋友，也不要在四五台设备上同时保持长连接。同一时间保持一两台主力设备在线就够了，比如自己的电脑和手机。

在陌生设备上登录之前，先确认那台设备的代理已经打开，DNS、WebRTC 没有泄漏。

### 不要拿网页版账号做反代或 API

> 引导站小节：https://re0claude.us.ci/maintenance/#不要拿网页版账号做反代或-api

市面上有些工具声称可以把网页版 Claude 账号转成 API，供第三方软件调用。**这是官方打击力度最高的行为之一。** 网页版 Pro 账号只供人在官方网页和 App 里使用；机器爬虫的特征很容易被识别。

即使只有你一个人用，也不要这么做。

## 续费

> 引导站小节：https://re0claude.us.ci/maintenance/#续费

---

**iOS 订阅**：苹果会在到期前 24 小时自动尝试扣款。提前一两天用支付宝买礼品卡，充值到美区 Apple ID，保证余额足够支付订阅价和可能的销售税，系统就会自动续期。

**安卓订阅**：Google Play 会在到期前 24 小时自动扣款。保持绑定的卡里有足够的余额；Google Play → 右上角头像 → **付款方式** 里的**备用支付方式**打开，主卡扣不动时会自动走备用。想换卡或取消，在 Google Play → 右上角头像 → **订阅** 里改。

## 账号受限之后

> 引导站小节：https://re0claude.us.ci/maintenance/#账号受限之后

---

### Google 账号被停用

> 引导站小节：https://re0claude.us.ci/maintenance/#google-账号被停用

Google 账号被封，不一定是你做错了什么。新注册的号本来就容易被风控误伤。Google 给了申诉机会，一般很快能通过。

1. 登录被封的账号时，页面会提示账号已停用。点页面上的申诉按钮（“申请恢复”或类似字样）。
2. 按提示填写辅助验证手机号，申诉理由简单说明这是你自己在正常使用的账号即可，比如：

   ```text
   This is my personal account for daily study and communication.
   I follow all Google Terms of Service. Please help restore it.
   ```

3. 等 Google 回复邮件。审核期间保持代理开启，网络环境不要变。
4. 申诉通过后，回到[iOS 端](https://re0claude.us.ci/iphone-subscription/#先用两天)或[安卓端](https://re0claude.us.ci/android-subscription/#先用两天)的“先用两天”那一节，继续用两天，没问题再往下走。

### Claude 账号被停用

> 引导站小节：https://re0claude.us.ci/maintenance/#claude-账号被停用

先访问 Anthropic 官方支持中心，通过官方渠道提交复核申请。

申诉时注意：

- 态度诚恳，说明自己是真实的个人用户，平时用来学习、写代码或做研究；
- 说明账号只由你一个人使用，没有共享，也没有接自动化脚本；
- 可以提一句“可能是网络环境波动导致的自动误判”，但不必展开网络配置的细节；
- 不要提交伪造的材料。

下面是一段可以参考的英文模板：

```text
Subject: Request for Account Review - [你的注册邮箱]

Dear Anthropic Support Team,

I am writing to request a review of my Claude account ([你的注册邮箱]),
which was recently suspended.

I am an individual user and I rely on Claude for my daily study and
programming work. I have always followed the Anthropic Terms of Service
and Acceptable Use Policy. This account is used only by me, for personal
purposes, with no automated scraping or shared access.

I suspect this may be an automated false positive. I would appreciate it
if you could take a manual look at my case and let me know if there is
anything I need to correct.

Thank you for your time.

Sincerely,
[你的姓名或拼音]
```

## 常见问题

> 引导站小节：https://re0claude.us.ci/maintenance/#常见问题

---

### 这样搞到底会不会被封

> 引导站小节：https://re0claude.us.ci/maintenance/#这样搞到底会不会被封

我没法保证。能做的都做到之后，风险会小很多，但不是零：干净的住宅出口、不频繁换 IP、不同时挂太多设备、不猛刷额度、不拿账号做反代。任何说“包不封”的方法都别信。

### 被封了怎么申诉，要等多久

> 引导站小节：https://re0claude.us.ci/maintenance/#被封了怎么申诉要等多久

到 Anthropic 官方支持中心提交复核申请，写清你是个人用户、账号只有自己在用、没有共享也没有接脚本（上面有模板）。回复时间没有准数，快的一两天，慢的一周多；不用一直重复提交，隔几天补一封说明就行。申诉期间保持同一个干净的出口，别急着换环境。

### 免费号、方案一还能不能白嫖

> 引导站小节：https://re0claude.us.ci/maintenance/#免费号方案一还能不能白嫖

不太划算了。免费得来的住宅线路随时可能断，教程开头那次就是这么断的；住宅 IP 的价格也已经接近住宅服务器。想长期用，方案二一台机器跑一次脚本更省事。免费额度可以先用着，把整套流程走通，再决定要不要订阅。

### 新号要养几天，能不能注册完马上订阅

> 引导站小节：https://re0claude.us.ci/maintenance/#新号要养几天能不能注册完马上订阅

先像普通人一样用两三天，把免费额度用完，等它主动弹出升级提示再订阅。秒充很容易撞风控，轻则弹 KYC，重则直接封。Google 账号也一样，先用两天（见[iOS 端](https://re0claude.us.ci/iphone-subscription/#先用两天)和[安卓端](https://re0claude.us.ci/android-subscription/#先用两天)的“先用两天”）。

### 换 IP、换服务器或换商家，旧账号受影响吗

> 引导站小节：https://re0claude.us.ci/maintenance/#换-ip换服务器或换商家旧账号受影响吗

能不动就别动。已经稳定用了两周以上的，到期直接续费，别手痒换机。非换不可：新 IP 先按第 2 章的标准测一遍，退出登录，隔一会儿再从新出口登录，别在新旧两个 IP 之间来回切。任务跑到一半断线也是一样，恢复之后保持同一个出口继续。

### 任务跑到一半断网或切了节点，会出事吗

> 引导站小节：https://re0claude.us.ci/maintenance/#任务跑到一半断网或切了节点会出事吗

分流规则正常时，节点断了只会超时打不开，不会自动切回本地直连；恢复代理、保持同一个出口继续就行，不会因为一次断线就出事。真正危险的是断网之后没开代理还去访问 Claude。

### 一个 IP 能登几个号，和朋友合租行不行

> 引导站小节：https://re0claude.us.ci/maintenance/#一个-ip-能登几个号和朋友合租行不行

教程没写合租，也不建议：一个 IP 最好只有一个主力账号，同一时间一两台设备。多人共用一个出口，等于把别人的操作风险绑在你的账号上；真出问题，申诉时也很难说清。

### 额度怎么算，周额度什么时候刷新

> 引导站小节：https://re0claude.us.ci/maintenance/#额度怎么算周额度什么时候刷新

有两层限制：5 小时内的额度和一周的总额度。周额度固定周一刷新，和你哪天订阅无关；用量在 Claude 的 usage 页面能看。别把周额度当成可以随便刷，也别指望重置卡之类的东西。

### Opus 额度掉得太快怎么办

> 引导站小节：https://re0claude.us.ci/maintenance/#opus-额度掉得太快怎么办

可以把活分出去：让 Opus 出计划、写提示词，便宜的模型干活，最后再让 Opus 审一遍。Pro 全用 Opus 确实不太够；还不够再考虑 Max，但它贵得多，新号一上来就上大额度，也更容易被风控盯上。

### 能不能把网页版账号接第三方 API 或反代

> 引导站小节：https://re0claude.us.ci/maintenance/#能不能把网页版账号接第三方-api-或反代

不要。这是官方打击力度最高的行为之一，网页版 Pro 只供你在官方网页和 App 里自己用。

### 用中文界面、用中文聊会不会被风控

> 引导站小节：https://re0claude.us.ci/maintenance/#用中文界面用中文聊会不会被风控

不会。Claude 支持中文，界面和回复都能用中文；会露馅的是 IP、DNS、时区、账号这些，不是语言。
