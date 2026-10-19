# 实测：VoyraCloud 住宅服务器

- 商家：[VoyraCloud](https://www.voyracloud.com/?ref_code=HYEWZ46M)，美国住宅服务器
- 对应：[[方案二：住宅 IP 服务器]]

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

## 我的第二台（现在用的）

后来我又在 VoyraCloud 买了一台住宅服务器，测出来是 **ISP 类型**，现在用的就是这一台。

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

---

回到：[[IP 质量实测合集]]
