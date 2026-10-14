---
title: 买住宅 IP 服务器并测 IP
---
直接买一台**自带住宅 IP 的服务器**，服务器本身的出口就是住宅 IP，只要在上面建节点，不用再套一层。就是方案一**去掉“[[plan1-free-residential-ip|白嫖住宅 IP]]”这一步**。

推荐的购买地址：
- [VoyraCloud](https://www.voyracloud.com/?ref_code=HYEWZ46M)（我用的是它家的云 VPS，也买过一台它家的住宅服务器，实测结果见下方。）
- [QSU](https://qsu.hk/aff/GAZUQBSL)（我用的是它家子站 proxy.qsu.hk 的住宅代理，主站的住宅服务器**我没有使用过**。）

> [!note] 我买 VoyraCloud 住宅服务器的实测
> 我买了一台 VoyraCloud 的美国住宅服务器，测出来：ipinfo.io 显示 ASN 属于 Bunny Communications，类型是 **Hosting（机房）**，Privacy 为 true；Scamalytics 分数 16，属于低风险，但也识别出在用 VPN/代理。也就是说，**我这一台风险分数不高，但分到的是机房 IP，不是住宅 IP**。
>
> 这只是我一次购买的结果，不代表每次都这样。买到后按下面第 1 步测一下，确认是住宅/ISP 类型再用；不是的话，商家支持退款。
>
> 实测截图（IP 已遮盖）：
>
> ![[VoyraCloud住宅服务器实测-ipinfo.png|600]]
>
> ![[VoyraCloud住宅服务器实测-scamalytics.png|600]]

1. 买之前先测服务器 IP，确认是“住宅/ISP”类型、风险分数低。系统选择同[[plan1-buy-vps|方案一]]。
2. 接着做[[ssh-connect]]和[[run-script]]，**问到住宅代理 IP 时直接回车跳过**。
