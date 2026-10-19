# 实测：proxy.qsu.hk 白嫖 ISP

- 商家：[proxy.qsu.hk](https://proxy.qsu.hk/)，填优惠码 `qiansu998` 免费拿到的 SOCKS5 住宅 IP 端口
- 对应：方案一的 ISP 代理（[[二、购买 ISP 代理]]）。这个免费 ISP 2026-10-17 断连之后，教程已经不再推荐它，这里只保留实测记录。之前用它的，换 IP 的过程见[[04技术/方案一断连后：给账号更换 IP|方案一断连后：给账号更换 IP]]

这里有两份实测：一份是我自己的，一份是一位读者的。两个人白嫖到的是不同的 IP，结果差得挺多，正好说明**白嫖的质量看运气**。

## 我的

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | AS174，Cogent Communications |
| ipinfo：Company | NetLab |
| ipinfo：AS Type | Isp |
| ipinfo：Privacy | false |
| ipinfo：Hosted domains | 0 |
| Scamalytics | 0 分 |

ipinfo 这一关算过了，Scamalytics 也是最好的 0 分。但严格说它不是家庭宽带：Cogent 是美国的骨干网运营商，主要做企业和机房线路，不是 Comcast、AT&T、Spectrum 这类家庭宽带运营商，Scamalytics 的说明里也写了它不是普通家庭网络。这种 IP 一般叫“ISP IP”或“静态住宅”。目前我用它订阅和使用 claude 都正常，对我来说够用。

![[住宅IP实测-ipinfo-作者的白嫖IP.png|600]]

![[住宅IP实测-scamalytics-作者的白嫖IP.png|600]]

## 一位读者的

读者 [@xiaobeizz](https://github.com/xiaobeizz) 测的，截图里的 IP 已经遮住，换成了“方案一”。测试时只有 claude 相关的域名和 ipinfo 走住宅 IP。

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | AS2914，NTT America, Inc. |
| ipinfo 显示的位置 | 美国洛杉矶 |
| ip.net.coffee 信任评分 | 100，极度纯净 |
| ip.net.coffee：claude.ai 延迟 | 273 ms |
| ip.net.coffee：anthropic.com 延迟 | 635 ms |
| IPKK：IP 属性 | 机房 IP（Hosting） |
| IPKK：claude.ai 延迟 | 239 ms |
| IPKK：anthropic.com 延迟 | 235 ms |
| IPOK 风险值（越低越好） | 35，安全 |
| Scamalytics（越低越好） | 100，Very high Risk |

ipinfo 把它标成 ISP 类型，但 IPKK 认为它是机房 IP，Scamalytics 也给了 100 分。这个 IP 的质量只能算一般。好处是延迟低，访问 claude 很快。

ip.net.coffee：

![[住宅IP实测-ip.net.coffee-方案一.png|600]]

IPinfo：

![[住宅IP实测-ipinfo-方案一.png|600]]

IPKK：

![[住宅IP实测-ipkk-方案一.png|600]]

IPOK：

![[住宅IP实测-ipok-方案一.png|600]]

Scamalytics：

![[住宅IP实测-scamalytics-方案一.png|600]]

---

回到：[[IP 质量实测合集]]
