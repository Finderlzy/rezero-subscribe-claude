---
title: 检查 IP 质量
---
1. 开着代理打开 [ipinfo.io](https://ipinfo.io/what-is-my-ip)，页面最上面显示的就是你现在的出口 IP。它是住宅 IP、类型是“住宅/ISP”，就说明成功了。**把这个 IP 复制下来。**
2. 把复制的 IP 粘贴到 [scamalytics.com](https://scamalytics.com/) 等检测网站里查，风险分数低就可以用。不要用 ping0.cc。具体怎么看，见[怎么看 IP 质量](https://finderlzy.github.io/Writing/tech/residential-ip-test/#ip_1)。

**记住这个 IP 所在的地区**，后面选时区、改 Google 账号地区时都会用到。

> [!note] 测出来不是住宅 IP？
> - 方案一、二：脚本已经让 ipinfo.io 走住宅 IP，测出来是 VPS 的 IP 的话，说明住宅出站没生效，看常见问题“打开面板排查”。
> - 方案三用了分流的：要把 `ipinfo.io` 也加进分流规则，否则测出来的是原来节点的 IP。
