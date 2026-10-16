# 测 IP 质量

测之前先打开代理软件，见 [[导入代理软件]]。方案一还要先做完 [[四、购买 ISP 代理]]。

用方案一的注意：只有 claude 和 ipinfo.io 走 ISP，所以**出口 IP 只能在 ipinfo.io 上看**，别的测 IP 网站显示的是服务器的机房 IP。各个网站测出来的 IP 不一样，见 [[常见问题#测出来好几个不同的 IP？|测出来好几个不同的 IP？]]。

**1. 在 ipinfo.io 上看 IP 类型**

开着代理打开 [ipinfo.io](https://ipinfo.io/what-is-my-ip)，页面最上面显示的就是你的出口 IP，**先把它复制下来**，下一步要用。然后往下拉到 Summary，看下面几行：

![[住宅IP实测-ipinfo-作者的白嫖IP.png|600]]

| 字段 | 我的结果 | 怎么看 |
| --- | --- | --- |
| AS Type | Isp | **最关键的一项。** `isp` 可以用；`hosting` 是机房 IP，建议直接换；`business` 是企业网络，介于两者之间。 |
| Privacy | false | `false` 才对，`true` 基本就不能用了。 |
| Hosted domains | 0 | 0 比较好。 |

AS Type 是 `isp`、Privacy 是 `false`，这一关就算过了。不满足的话就别用了，直接换。

ASN 后面那个 `#6` 是 IPinfo 给这个网络的排名，不用管。

**2. 在 Scamalytics 上查风险分**

把刚才复制的 IP 粘贴到 [scamalytics.com](https://scamalytics.com/) 查风险分，越低越好。我这个是 0 分，但不一定都能做到 0，分数低就可以。**不要用 ping0.cc**，它会暴露你国内的真实 IP。

![[住宅IP实测-scamalytics-作者的白嫖IP.png|600]]

**3. 测出来质量不好**

赶紧找商家客服反馈，换一个 IP，换完再测一次；也可以回到 [[选择方案]]，换别的方案。

---

上一步：[[导入代理软件]] ｜ 下一步：[[防泄漏]]
