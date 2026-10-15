# 实测：丽萨住宅服务器

- 商家：[丽萨主机](https://lisahost.com/aff.php?aff=15037)，美国 9929 精品网络双 ISP 住宅 IP VPS（精简版），68 元/月
- 对应：[[方案二：住宅 IP 服务器]]

![[IP实测-丽萨-套餐.png|300]]

## 我的

我买的是洛杉矶的精简版：1 核 CPU、1 GB 内存、10 GB 硬盘，带宽 50 Mbps，每月 1000 GB 流量。

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | AS174，Cogent Communications |
| ipinfo：Company | NetLab |
| ipinfo：AS Type | ISP |
| ipinfo：Privacy | false |
| ipinfo：Hosted domains | 0 |
| IPPure：IP 来源 | 原生 IP |
| IPPure：IP 属性 | 住宅 IP |
| IPPure 系数 | 22%，纯净 |
| IPPure：人机流量比 | human 53.04%，bot 46.96% |
| Scamalytics | 5 分，Low Risk |

丽萨的产品页面虽然很丑，但是质量还不错。ipinfo 是 ISP 类型、Privacy 是 false，IPPure 认成了原生住宅 IP，Scamalytics 只有 5 分，几个网站的结论都不错。和我买的 VoyraCloud 住宅服务器比，这一台分到的确实是住宅/ISP 类型的 IP。

和我白嫖的那个 ISP 一样，它也登记在 Cogent 名下、实际使用者是 NetLab，Scamalytics 的说明里同样写了它不是普通家庭网络。所以严格说它也是“ISP IP”，不是真正的家庭宽带。

截图（IP 已遮盖）：

IPinfo：

![[IP实测-丽萨-ipinfo.png|600]]

IPPure：

![[IP实测-丽萨-ippure.png|600]]

Scamalytics：

![[IP实测-丽萨-scamalytics.png|600]]

---

回到：[[IP 质量实测合集]]
