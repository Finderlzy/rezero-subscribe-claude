# 方案二：住宅 IP 服务器

**1. 购买住宅服务器**

在下面任选一家买一台**住宅服务器**：

- [VoyraCloud](https://www.voyracloud.com/?ref_code=HYEWZ46M)（我买过一台它家的美国住宅服务器，测出来是机房 IP，见 [[实测：VoyraCloud 住宅服务器|它的实测]]。）
- [QSU](https://qsu.hk/aff/GAZUQBSL)（主站的住宅服务器**我没有使用过**，有朋友说质量不错，见 [[实测：QSU 住宅服务器|它的实测]]。）
- [丽萨主机](https://lisahost.com/aff.php?aff=15037)（我买过一台它家的美国 9929 双 ISP 住宅 IP VPS，测出来是 ISP 类型，Scamalytics 5 分，见 [[实测：丽萨住宅服务器|它的实测]]。）

按下表选：

| 选项   | 怎么选                                |
| ---- | ---------------------------------- |
| 系统   | **Ubuntu 22.04 / 24.04** 或 **Debian 12** |
| 配置   | 1 核 CPU、1 GB 内存就够                  |
| 流量   | 每月几百 GB 足够                         |

买完在商家控制台记下**服务器 IP** 和 **root 密码**。

**商家说是住宅服务器，分到你手上的不一定真是住宅 IP。** 买到之后一定要按 [[测 IP 质量]] 测一下，不是住宅 IP 的话，找商家退款或者换 IP。

**2. 连上服务器**

1. 打开命令行：Windows 按 `Win + R` 输入 `cmd`；Mac 打开“终端”。
2. 输入下面的命令，`你的服务器IP` 换成真实 IP。问 `Are you sure...` 时输入 `yes`；出现 `password:` 时输入 root 密码（**屏幕不显示，正常**），回车。开头变成 `root@...:~#` 就连上了。

```bash
ssh root@你的服务器IP
```

**3. 把服务器变成节点**

TODO：下面的命令用的是还没发布的 v1.3.0，发版后才能用。

1. 粘贴这行命令，回车：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Finderlzy/reality-setup/v1.3.0/install-xray.sh)
```

2. 问服务器 IP 对不对时，和你的一样就回车。
3. 等几分钟（弹出紫色/蓝色对话框就回车），看到 `节点自测 Reality：成功` 和 `节点自测 Hysteria2：成功`。
4. 最后会打印两个节点，**通过剪贴板**或扫二维码导入代理软件，**不要发给别人**：
   - **主节点**：`vless://` 开头，平时用这个。忘了就运行 `cat /root/vless.txt`。
   - **备用节点**：`hysteria2://` 开头，主节点连不上或很慢时换它。忘了就运行 `cat /root/hy2.txt`。
5. 商家后台有防火墙/安全组的话，放行 **TCP 443 和 UDP 443**。

脚本内容公开在 [reality-setup](https://github.com/Finderlzy/reality-setup)，运行前可以先看一眼。

方案二不用再套 ISP 代理，节点到这里就弄好了。

---

上一步：[[选择方案]] ｜ 下一步：[[导入代理软件]]
