---
question: 你想用哪种方式准备住宅 IP？
options:
  plan-1:
    title: 方案一：普通服务器 + 白嫖住宅 IP（我用的）
    path: 电脑 → VPS → 住宅 IP → claude.ai
    effort: 中
    audience: 愿意跟着视频敲几行命令
  plan-2:
    title: 方案二：住宅 IP 服务器
    path: 电脑 → 住宅 IP 服务器 → claude.ai
    effort: 中
    audience: 想自建，但不想再套一层
  plan-3:
    title: 方案三：直接买住宅节点
    path: 电脑 → 住宅节点 → claude.ai
    effort: 低
    audience: 不想碰服务器，导入就能用
---
这一块是最重要的，千万不要用万人蹬的机场节点。我们要的效果是：**anthropic 看到的是一个家庭宽带的 IP，而且只有你自己在用。**

下面三种方案都能达到这个效果，区别在于花多少钱、折腾多少。

不管选哪种，买之前都先找商家要 IP，用 [ipinfo.io](https://ipinfo.io/what-is-my-ip)、[scamalytics.com](https://scamalytics.com/) 交叉测一下：IP 类型是“住宅/ISP”，风险分数低。不要用 ping0.cc。

拿不定主意的话，可以先看一位读者的实测：[方案一和方案三的住宅 IP 对比](https://finderlzy.github.io/Writing/tech/residential-ip-test/)。他用五个检测网站对比了两个方案的延迟和风险评分。

> [!why] 机场 IP、机房 IP 和住宅 IP
> 机场的 IP 是成百上千人在共用，很可能早就被 anthropic 标记过了。
>
> 每个 IP 都登记在某个组织名下，网站一查就知道。VPS 放在机房里，IP 登记在云服务商名下，就是**机房 IP**，普通人不会从机房上网，所以容易被当成代理。**住宅 IP** 登记在电信运营商名下，是分给家庭宽带用的，看起来就是普通人在上网。检测网站上的 **ISP** 类型，指的是运营商的 IP 放在机房里长期固定使用，也算这一类。
>
> 不用 ping0.cc，是因为它会暴露你国内的真实 IP。
