> 引导站：https://re0claude.us.ci/plan2-residential-server/
> 本文件由 `npm run skill` 从 `docs/v3-rewrite/03-方案二：配置住宅IP服务器.md` 生成，不要手改。

# 方案二：配置住宅 IP 服务器
---

如果你不想同时维护 VPS 和 ISP 两个服务商，方案二更直接：**买一台自带海外住宅 IP 的云服务器**。它的出口本身就是运营商的住宅 IP，所以不用再买 SOCKS5 代理，只要在服务器上跑一次脚本，把它变成节点。

```text
选购住宅 IP 服务器
   ↓
先测 IP 质量
   ↓
SSH 连接服务器，运行一键脚本
   ↓
跳过住宅代理，保存节点链接
```

### 原理：一台机器就是住宅

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#原理一台机器就是住宅

打开 `claude.ai` 的时候，你的设备向 Claude 的服务器发出请求，服务器把网页数据返回给你。服务器要知道把数据送回哪里，靠的是请求上带着的 **IP**。

IP 不只是一个地址，它还能看出两件事：

- **你在哪个国家。** Claude 不对中国用户提供服务，看到来自中国的 IP 就会拒绝。
- **你是什么人。** 每个 IP 都登记在某个组织名下。机房里的服务器，IP 登记在云服务商名下，叫**机房 IP**；家庭宽带用的 IP 登记在电信运营商名下，叫**住宅 IP**。普通人不会从机房上网，所以 Claude 看到机房 IP，就容易把你当成在用代理。

方案二买的是一台放在海外、自带住宅 IP 的服务器。请求先交给它，由它替你发给 Claude；Claude 看到的就是这台服务器的住宅 IP。返回的数据也由它转交给你，这台替你收发请求的服务器，就是**节点**。

## 购买住宅服务器

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#购买住宅服务器

---

在本章推荐的几家里选一家，买一台 Debian 12、1 核 CPU、1 GB 内存、带“住宅 / ISP”标签的服务器，记下**服务器 IP**、**SSH 端口**（大部分是 22，有些商家会给一个随机高位端口）和 **root 密码**。

**视频 03-1：购买住宅服务器**

下面几家是我自己买过，或者身边有人用过的；链接都是推广链接，介意的话直接搜商家名字。

- [丽萨主机](https://lisahost.com/aff.php?aff=15037)：我买过一台“美国 9929 双 ISP 住宅 IP”的 VPS。产品页面确实不好看，但线路针对国内优化过，测出来是 ISP 类型，Scamalytics 5 分。
- [VoyraCloud](https://www.voyracloud.com/?ref_code=HYEWZ46M)：我现在用的就是它家的住宅服务器。第一台开出的是机房 IP，后来买的一台是 ISP 类型。由于他家要抽卡，所以我放在第二位了。
- [QSU](https://qsu.hk/aff/GAZUQBSL)：我用过它家子站 `proxy.qsu.hk` 的住宅代理；主站的住宅服务器我没有买过，有朋友说质量不错。

按下面的标准选：

| 配置项 | 推荐选择 | 说明 |
| --- | --- | --- |
| 操作系统 | **Debian 12** | 不要选 Ubuntu，原因和方案一相同。 |
| 硬件配置 | 1 核 CPU、1 GB 内存 | 个人订阅够用。 |
| 流量 | 每月几百 GB | 文字和代码交互消耗很少。 |
| IP 属性 | 双 ISP / 原生住宅 | 下单时确认套餐带“住宅 / ISP”标签。 |

系统还是只选 Debian。商家最高只给 Debian 11 的话，脚本会先升级到 Debian 12，多等 5～15 分钟。

### 住宅服务器也可能是机房 IP

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#住宅服务器也可能是机房-ip

这是方案二最需要注意的地方：商家说是“住宅服务器”，分到你手上的不一定真是住宅 IP。

我第一次买的 VoyraCloud 美国住宅服务器，测出来 ipinfo.io 显示 ASN 属于 Bunny Communications，类型是 **Hosting（机房）**，Privacy 为 `true`，Scamalytics 16 分。分数不算高，但它不是住宅 IP。

这只是我一次购买的结果，不代表每家、每次都会这样。我后来又在 VoyraCloud 买了一台，测出来是 ISP 类型，Scamalytics 3 分。所以买完之后第一件事是测 IP；如果开出的是机房 IP，找商家换一台，或者退款。

后来很多读者反馈，洛杉矶的住宅服务器有时候质量很差，所以我另外测了一台**华盛顿**的。ipinfo 是 ISP 类型、Privacy 为 false，IPPure 认成原生住宅 IP，Scamalytics 0 分，现在用的就是这一台。三台的完整数据在[实测：VoyraCloud 住宅服务器](https://re0claude.us.ci/ip-tests/voyracloud/)里。不过你拿到的 IP 和我的一定不同，还是要自己测。

## 先测服务器 IP

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#先测服务器-ip

---

在开始配置之前，先确认这台机器的 IP 合格。打开 [ipinfo.io](https://ipinfo.io/)，在查询框里输入你的服务器 IP：**AS Type 必须是 `isp`**，**Privacy 必须是 `false`**；再打开 [Scamalytics](https://scamalytics.com/)，输入同一个 IP 查风险分。0～20 属于低风险，20～40 需要留意，50 以上不建议使用；不要用 ping0.cc 查，它会暴露你国内的真实 IP。

**视频 03-2：测住宅服务器的 IP**

如果 AS Type 是 `hosting`，说明分到了机房段，不用往下做了，直接找客服换机。两项都合格再开始配置；不合格就先换 IP，换完重新测。

## SSH 连接服务器

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#ssh-连接服务器

---

打开命令行（Windows 按 `Win + R`，输入 `cmd`；Mac 打开“终端”），输入下面的命令：

```bash
ssh root@你的服务器IP
```

如果商家后台的 SSH 端口不是 22，比如是 38221，就加小写 `-p`：

```bash
ssh -p 38221 root@你的服务器IP
```

第一次连接输入 `yes` 回车；出现 `password:` 时输入 root 密码，屏幕上不会显示字符，输完直接回车。看到 `root@...:~#` 就说明连上了。

**视频 03-3：SSH 连接服务器（与 02-4 共用，录一次即可）**

如果提示 `Permission denied, please try again.`，先在商家后台重置一次 root 密码，新开一个命令行窗口重试；也可以用商家后台的“控制台 / VNC”登录。

## 运行一键脚本

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#运行一键脚本

---

复制下面这行命令，粘贴到终端，回车：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Finderlzy/reality-setup/v2.0.1/setup.sh)
```

脚本会安装 Xray 和管理面板，然后把服务器变成节点；安装过程中会问几个问题。

**视频 03-4：运行一键脚本（方案二）**

| 终端提问 | 方案二怎么填 |
| --- | --- |
| 是否删掉旧的重新装？ | 只有装过本脚本或 3x-ui 面板才会问。想重装输入 `y`，否则不要动。 |
| 服务器 IP 是 xxx 吗？ | 和你的服务器 IP 一样就直接回车；不一样就手动输入。 |
| 住宅代理 IP | **直接回车跳过。** 你的服务器本身就是住宅 IP，不需要再套一层。 |
| 住宅代理端口、用户名、密码 | 上一步跳过后，这三项不会再问。 |

> **说明**：为什么这里要跳过
> “住宅代理”那一项是给方案一的普通机房 VPS 用的。方案二的服务器已经是住宅出口，再套一层只会多一个故障点。

之后等 2～4 分钟。如果是 Debian 11，脚本会先升级系统，时间会更长；弹出紫色或蓝色配置窗口时，直接回车保持默认。

### 部署成功的标志

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#部署成功的标志

看到下面两行，说明节点已经装好：

```text
节点自测 Reality：成功
节点自测 Hysteria2：成功
```

请保存好：**主节点链接**以 `vless://` 开头，平时用这个，忘了可以运行 `cat /root/vless.txt` 查看；**备用节点链接**以 `hysteria2://` 开头，主节点连不上或很慢时换它，忘了就运行 `cat /root/hy2.txt`；还有安装完成时打印的**面板登录信息**。

如果商家后台有防火墙或安全组，确认放行了 **TCP 443** 和 **UDP 443**。升级过系统的，最后找时间运行 `reboot`，节点会随系统自动启动。

## 打开面板（可选）

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#打开面板可选

---

和方案一一样，面板只开在服务器本机，需要用 SSH 隧道。在本地命令行运行下面这行，保持窗口不关：

```bash
ssh -L 8080:127.0.0.1:8080 root@你的服务器IP
```

**视频 03-5：打开 3x-ui 面板（与 02-6 共用，录一次即可）**

浏览器打开 `http://127.0.0.1:8080/访问路径`，用安装完成时打印的用户名和密码登录。忘了就在服务器上运行：

```bash
cat /etc/x-ui/install-result.env
```

面板默认用户名、密码、端口大家都一样，但外网直接打不开，要进来必须先通过 SSH 隧道，而隧道需要服务器密码；不改也没关系。

在服务器上随时可以运行 `node-selftest`，重新自测两个节点。

### 常见问题

> 引导站小节：https://re0claude.us.ci/plan2-residential-server/#常见问题

#### 换了一台机器，节点链接会变吗

会。节点链接和服务器绑定，换机器要重新运行脚本，重新导入客户端。

#### 以后想换 IP 或换套餐

如果商家支持换 IP，先在后台换，再用新 IP 测一次；如果换了一台全新的服务器，就按本章从头做一遍。

#### 测出来是 `hosting`，但商家说这就是住宅

以检测结果为准。先找商家换一台，换完再测；如果连续几台都是 `hosting`，可以考虑退款，换一家，或者回到[选择方案](https://re0claude.us.ci/overview/)看看方案一。
