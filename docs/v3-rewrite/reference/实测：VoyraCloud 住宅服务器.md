# 实测：VoyraCloud 住宅服务器

- 商家：[VoyraCloud](https://www.voyracloud.com/?ref_code=HYEWZ46M)，美国住宅服务器
- 对应：[[方案二：配置住宅 IP 服务器]]

## 我的第一台

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | Bunny Communications |
| ipinfo：AS Type | **Hosting（机房）** |
| ipinfo：Privacy | true |
| Scamalytics | 16 分，低风险，但也识别出在用 VPN/代理 |

也就是说，我这一台风险分数不高，但分到的是**机房 IP，不是住宅 IP**。这只是我一次购买的结果，不代表每次都这样。买到后一定要测，不是住宅/ISP 类型的话，商家支持退款。

截图（IP 已遮盖）：

![[VoyraCloud住宅服务器实测-ipinfo.png|600]]

![[VoyraCloud住宅服务器实测-scamalytics.png|600]]

## 我的第二台

后来我又在 VoyraCloud 买了一台住宅服务器，测出来是 **ISP 类型**，之前在用的就是这一台。

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | AS174 Cogent Communications |
| ipinfo：AS Type | **ISP** |
| ipinfo：Privacy | false |
| Scamalytics | 3 分，低风险 |

ipinfo 这一关算过了，Privacy 也是 false，没被识别成代理。不过 Scamalytics 的说明里写了它不是普通家庭网络，而是一台商用服务器。Cogent 是美国的骨干网运营商，主要做企业和机房线路，所以严格说它不是家庭宽带，一般叫“ISP IP”或“静态住宅”。

截图（IP 已遮盖）：

![[VoyraCloud住宅服务器实测2-ipinfo.png|600]]

![[VoyraCloud住宅服务器实测2-scamalytics.png|600]]

## 我的第三台（现在用的）

很多读者反馈，洛杉矶的住宅服务器有时候质量很差：同样的配置，用一段时间就连不上 Claude，或者访问速度忽快忽慢。所以我后来又测了一台**华盛顿**的住宅服务器。

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | AS48529 Quantumbeam Communications Limited |
| ipinfo：AS Type | **ISP** |
| ipinfo：Privacy | false |
| ipinfo：位置 | Washington, District of Columbia, US |
| IPPure：IP 来源 | 原生 IP |
| IPPure：IP 属性 | 住宅 IP |
| IPPure 系数 | 10%，极度纯净 |
| IPPure：人机流量比 | human 43.93%，bot 56.07% |
| Scamalytics | 0 分，Low Risk |

这一台质量不错，现在用的就是它。ipinfo 是 ISP 类型、Privacy 为 false，IPPure 认成了原生住宅 IP、系数只有 10%，Scamalytics 是 0 分，几个网站的结论都很干净。

几点要注意：

- 这台在华盛顿。IPPure 里有几个数据库给的是纽约，但 ipinfo 和 MaxMind 都显示华盛顿，以这两个为准。
- ipinfo 和 IPPure 都显示这台机器的 ASN 属于 Quantumbeam，Scamalytics 的说明里写的是 Bunny Communications。两家对同一个 IP 的归属判断不一样，以 ipinfo 为准，不影响使用。
- 和另外两台一样，严格说它是“ISP IP”，不是家庭宽带。
- 换 IP 之后，账号上该做的检查还是要做一遍（见 [[日常维护、风控应对与常见故障]]），不要以为换了 IP 就没事了。

截图（IP 已遮盖）：

![[voyra-washington-ipinfo.png|600]]

![[voyra-washington-scamalytics.png|600]]

![[voyra-washington-ippure.png|600]]

---

回到：[[IP 质量实测合集]]
