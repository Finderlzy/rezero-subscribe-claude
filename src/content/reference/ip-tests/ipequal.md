# 实测：ipequal 住宅节点

- 商家：ipequal（[还没有节点](https://www.ipequal.com/?ref=6adabd0307)、[已经有节点](https://www.equaldcdn.com/?ref=6adabd0307)），VLESS Reality 节点，出口是美国静态住宅 IP
- 对应：[[方案三：直接买住宅节点]]

我自己**没用过**，因为一直买不到。下面是一位读者的实测。

## 一位读者的

读者 [@xiaobeizz](https://github.com/xiaobeizz) 测的，截图里的 IP 已经遮住，换成了“方案三”。

| 项目 | 结果 |
| --- | --- |
| ipinfo：ASN | AS26407，Carolina Digital Phone, Inc. |
| ipinfo 显示的位置 | 美国纽约 |
| ip.net.coffee 信任评分 | 100，极度纯净 |
| ip.net.coffee：claude.ai 延迟 | 920 ms |
| ip.net.coffee：anthropic.com 延迟 | 4118 ms |
| IPKK：IP 属性 | 住宅 IP（Residential） |
| IPKK：claude.ai 延迟 | 3682 ms |
| IPKK：anthropic.com 延迟 | 8728 ms |
| IPOK 风险值（越低越好） | 70，高风险 |
| Scamalytics（越低越好） | 20，Medium Risk |

IPKK 认成了住宅 IP，Scamalytics 也比读者白嫖的那个好。但 IPOK 给了 70 分（高风险），扣分是因为命中了垃圾邮件黑名单（DNSBL），页面也注明了“低置信，仅 DNSBL 一家给出直接证据”。

延迟明显偏高，有几项到了好几秒。不过测试时检测网站都显示 claude 服务处于“轻微故障”状态，延迟可能被拉高了；这个节点在纽约，离国内更远，本来也会慢一些。用这一家的，建议换个时间多测几次再下结论。

ip.net.coffee：

![[住宅IP实测-ip.net.coffee-方案三.png|600]]

IPinfo（标注里的“ASN 很差”指排名 `#20,676` 靠后。这个排名只反映网络规模，和 IP 质量无关）：

![[住宅IP实测-ipinfo-方案三.png|600]]

IPKK：

![[住宅IP实测-ipkk-方案三.png|600]]

IPOK：

![[住宅IP实测-ipok-方案三.png|600]]

Scamalytics：

![[住宅IP实测-scamalytics-方案三.png|600]]

---

回到：[[IP 质量实测合集]]
