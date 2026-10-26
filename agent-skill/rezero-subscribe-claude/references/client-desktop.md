> 引导站：https://re0claude.us.ci/client-desktop/
> 本文件由 `npm run skill` 从 `docs/v3-rewrite/04-客户端配置与环境验证-电脑端.md` 生成，不要手改。

# 客户端配置与环境验证：电脑端
---

节点和节点链接都准备好了。这一章把链接装进电脑的代理软件，并处理三处容易漏掉的地方：DNS、WebRTC、IPv6，最后把系统时区改到 Claude 支持的地区。

做完之后，电脑上的环境才算准备好，可以开始注册账号。

### 先看一眼整条链路

> 引导站小节：https://re0claude.us.ci/client-desktop/#先看一眼整条链路

以方案一为例，你在电脑上打开 `claude.ai` 的时候，请求大概是这样走的：

看图：https://re0claude.us.ci/client-desktop/#先看一眼整条链路

代理软件负责把请求加密、伪装，送出国内网络；服务器负责把它转到 Claude；ISP 负责让 Claude 看到的最后一跳是住宅 IP。方案二少了 ISP 那一层，服务器自己就是住宅出口。

这一章要做的，就是让这条路上的每一段都接上，并且不让请求从旁边的小缝里漏出去。

### 为什么用 Tun 模式

> 引导站小节：https://re0claude.us.ci/client-desktop/#为什么用-tun-模式

代理软件一般有两种接管流量的方式。

**系统代理**是在系统设置里登记一句“上网请先找代理软件”。会读这条设置的软件，就会自己把请求交给代理软件。问题在于“自己交”：

- 软件是主动走代理的，所以它知道自己在走代理。像 Claude Code 这样的工具，能看出这一点。
- 不读这条设置的软件、系统自己发出的 DNS 请求，可能直接绕过代理，用国内网络连出去。

**Tun 模式**是在系统里虚拟出一张网卡，让整台电脑的流量都从这张网卡过，再送进节点。软件还是像平常一样上网，根本不知道自己走了代理；不管它读不读系统代理的设置，都逃不掉。

所以结论很简单：**用代理软件时打开 Tun 模式，不要用“自动配置系统代理”之类的选项。**

## 安装代理软件

> 引导站小节：https://re0claude.us.ci/client-desktop/#安装代理软件

---

Windows 推荐 v2rayN；Windows 和 Mac 都可以用 Clash Verge Rev。选一个就行。

### v2rayN

> 引导站小节：https://re0claude.us.ci/client-desktop/#v2rayn

从 [v2rayN 的 Releases](https://github.com/2dust/v2rayN/releases) 下载对应系统的版本，解压；右键 `v2rayN.exe` → **以管理员身份运行**，Tun 模式要虚拟网卡，需要管理员权限。

复制节点链接，在 v2rayN 里点 **配置项** → **从剪贴板导入**：方案一、二导入脚本最后打印的主节点（`vless://` 开头），有别的节点也可以一起导入。选中主节点，设为当前使用的节点。

在界面底部把“系统代理”选 **清除系统代理**，再勾选 **启用 Tun**；第一次打开可能会提示下载内核，按提示确认。

导入后如果节点列表里显示“配置项无效”，通常是剪贴板里不是完整的 `vless://` 链接，重新复制一次再导入。导入成功时右下角会提示“成功从剪贴板导入 1 个配置”，底部状态栏也会显示当前选中的节点。

### Clash Verge Rev

> 引导站小节：https://re0claude.us.ci/client-desktop/#clash-verge-rev

从 [Clash Verge Rev 的 Releases](https://github.com/clash-verge-rev/clash-verge-rev/releases) 下载安装。

Clash Verge 不能直接导入 `vless://`、`hysteria2://` 这种分享链接，所以要用脚本生成的配置：SSH 连上服务器，运行 `cat /root/clash.yaml`，复制屏幕上打印的全部内容；在 Clash Verge 里点 **配置** → **新建**，类型选 **Local**，把内容粘贴进去，保存并应用。

打开 **设置** → **系统设置**，点“服务模式”旁边的 **安装**；重启软件后打开 **Tun 模式（虚拟网卡）**，“系统代理”保持关闭。

脚本生成的配置里两个节点都有，默认选中的是备用节点 Hysteria2，因为 Clash 的内核对 Reality 节点目前还有兼容问题，脚本作者还在排查。

### 主节点和备用节点

> 引导站小节：https://re0claude.us.ci/client-desktop/#主节点和备用节点

脚本给了你两个节点，它们不是两个不同的出口，而是同一台服务器上的两种协议：

- **主节点：VLESS + Reality。** 它伪装成访问一个真实存在的大网站，走 TCP，稳定，平时用它。
- **备用节点：Hysteria2。** 它走 UDP，网络不好、晚高峰的时候往往更快。但有些地方的网络会限制 UDP，所以只当备用。

两个节点的出口是同一台服务器；方案一访问 Claude 时，也都会转交给同一个 ISP。所以在两个节点之间切换，Claude 看到的 IP 是一样的，不算“换节点”。

但用 Claude 的时候，还是要**固定用这一个节点，不要今天美国、明天日本地换**。网络环境频繁变化本身就可疑。

## 分流：客户端和服务器各管一段

> 引导站小节：https://re0claude.us.ci/client-desktop/#分流客户端和服务器各管一段

---

分流有两层，别混在一起：

- **客户端**决定哪些请求先送到节点。Claude、Google 走代理，国内网站直连。
- **服务器**（方案一的脚本）决定请求到了服务器之后，哪些转给 ISP。只有 Anthropic 相关网站和 `ipinfo.io` 走 ISP。

所以客户端里仍然要保证 Claude 走代理；服务器上的分流不会替你把请求送到节点。

### 配置v2rayN 规则集

> 引导站小节：https://re0claude.us.ci/client-desktop/#配置v2rayn-规则集

打开 v2rayN，找到顶部菜单栏的“设置”，里面有一个“路由设置”，点击进去就可以看见当前存在的路由规则。“路由”是做什么的？简单来讲，就是代理软件会看到你要访问的网站，然后根据你所选择的路由模式，来匹配本次流量是走哪个出口（是用本机流量？还是走代理？）。

它是如何匹配的呢？根据路由模式中已有的规则。这些规则主要包含三个参数：
1.哪些网站是符合规则
2.流量走哪个出口
3.域名怎么解析

当访问一个网站时，代理软件就拿着你要前往的网站，一个一个匹配规则，匹配到了就按那个规则来执行，否则继续往下走。

由于我是希望在访问国内网站的时候不那么卡，同时又想确保 Claude 走的是代理，所以我选择在 **V4-绕过大陆(Whitelist)** 规则集中添加 Claude 规则，一共有两条规则。一条是让代理软件知道，当我打算访问 Claude 的时候，走代理。另一条是兜底，当我访问 Claude 的时候，如果失败了，依然不要换回本机流量，直接阻断。

规则顺序很重要（前面说过，规则是从上往下匹配的）：Claude 规则要放在“绕过中国”的 direct 规则前面。放到后面，就会被直连规则先命中。阻断的规则要放在 Claude 规则的后面，否则就一直打不开。

加完以后，把规则列表上下拖一遍，检查顺序对不对。

Clash 同理即可。

## 防泄漏

> 引导站小节：https://re0claude.us.ci/client-desktop/#防泄漏

---

IP 换好了，还有三个地方可能把真实位置漏出去。

### DNS 泄漏

> 引导站小节：https://re0claude.us.ci/client-desktop/#dns-泄漏

你在浏览器里输入的是 `claude.ai` 这样的域名，但网络实际要靠 IP 找到服务器。把域名翻译成 IP 的这项工作，叫 **DNS**。可以把它想成一本电话簿：你报名字，它给你号码。

查电话簿本身也是一次请求。如果这次请求没走代理，而是直接问了国内运营商的 DNS 服务器，对方立刻就知道：你在国内，而且你要访问 `claude.ai`。这就是 **DNS 泄漏**。

换成国外的 DNS，比如 `1.1.1.1`、`8.8.8.8`，是不是就没事了？不一定。如果你用国内网络直接去问 `8.8.8.8`，它看到的提问者还是你国内的 IP。**关键不在 DNS 服务器是不是国外的，而在查电话簿的请求有没有走代理。** 代理软件里说的“远程 DNS”，指的就是通过代理去查。

先确认代理软件已经打开 Tun 模式。Tun 会接管系统发出的 DNS 请求，这是最主要的一步。

打开 v2rayN 的 **DNS 设置** → **DNS 基础设置**，按下面这组值填。这就是我自己的配置：

| 项 | 我的值 | 作用 |
| --- | --- | --- |
| 直连 DNS | `119.29.29.29` | 路由阶段用它解析直连目标；实际直连解析由下面的 `AsIs` 交给系统 DNS |
| 远程 DNS | `https://cloudflare-dns.com/dns-query` | 路由阶段用它解析代理目标；查询由远程服务器发出，服务器要能访问它 |
| Bootstrap DNS | `119.29.29.29` | 只用来把 `cloudflare-dns.com` 解析成 IP，必须填 IP |
| 直连目标解析策略 | `AsIs` | 直连目标用系统 DNS 解析 |
| 代理目标解析策略 | `AsIs` | 代理目标由远程服务器解析，不在本地查 |
| 连接代理解析策略 | 留空 | 不要用代理去解析代理服务器地址，避免回环 |
| 并行查询 | Off | 保持行为可预测 |
| 乐观缓存 | Off | 同上 |
| 启用 Happy Eyeballs | Off | 它会让软件同时尝试 IPv4 和 IPv6；保持 Off，行为更可控 |

**视频 04-2：配置 v2rayN 规则集和 DNS**

规则集里的 **域名解析策略** 也选 `AsIs`（在规则集设置页顶部）。最后关掉浏览器的“安全 DNS”，或者把它改成国外的 DNS 服务商：Chrome 在 设置 → 隐私和安全 → 安全 → 关闭“使用安全 DNS”；Edge 在 设置 → 隐私、搜索和服务 → 关闭“使用安全 DNS”。

这组值的关键是两个目标解析策略都选 `AsIs`：直连目标交给系统 DNS，代理目标交给远程服务器解析，代理域名不会在本地被查一次。直连 DNS 和远程 DNS 主要参与路由阶段的判断；远程 DNS 的查询由服务器发出，所以服务器要能访问 Cloudflare DoH。Bootstrap 只负责把 `cloudflare-dns.com` 解析成 IP。连接代理解析策略留空，避免回环。

如果你不想记这么多项，至少确认两件事：**Tun 已经打开**，**代理目标解析策略是 `AsIs`**。其余保持默认也能用，只是不如上面这组干净。

用 Clash Verge 的话：确认已经打开 Tun 模式，进入 **设置** → **Clash 设置**，打开 **DNS 覆写**，点旁边的齿轮，把 **增强模式** 选成 `fake-ip`。这样软件拿到的是一个假地址，真正的查询交给节点去做，不会在本地问国内的 DNS。DNS 覆写是按配置分开保存的，换了配置要重新打开。

**检测**：打开 [browserleaks.com/dns](https://browserleaks.com/dns)，结果里不能出现国内 DNS，比如 China Telecom、China Unicom、DNSPod、阿里 DNS。出现 DNSPod 尤其要注意，因为我们的直连 DNS 就是 `119.29.29.29`；它只该服务国内直连，不该出现在海外网站的查询结果里。

### WebRTC 泄漏

> 引导站小节：https://re0claude.us.ci/client-desktop/#webrtc-泄漏

WebRTC 是浏览器自带的技术，网页上直接打语音、视频电话会用到它。为了接通电话，WebRTC 需要知道你的 IP，有时还会绕过代理，把你真实的 IP 交给网页。这就是 **WebRTC 泄漏**。

处理方式：

- Chrome / Edge：装扩展 **WebRTC Control**，把 WebRTC 关掉；或者在 uBlock Origin 的设置里勾选“防止 WebRTC 泄露本地 IP 地址”。
- Firefox：地址栏输入 `about:config`，把 `media.peerconnection.enabled` 改成 `false`。

**检测**：打开 [browserleaks.com/webrtc](https://browserleaks.com/webrtc)，`Public IP` 里不能出现你国内的 IP。

用方案一的话，这里显示服务器的 IP 是正常的：只有 Claude 和 `ipinfo.io` 走 ISP，其他请求从服务器自己的出口出去。方案二显示服务器的住宅 IP 也正常。

### IPv6 泄漏

> 引导站小节：https://re0claude.us.ci/client-desktop/#ipv6-泄漏

IP 有两种。前面说的大多是 **IPv4**，比如 `1.2.3.4`；还有一种是 **IPv6**，长得像 `240e:3b5:...` 这样一大串。

国内很多家庭宽带同时有 IPv4 和 IPv6。问题是，代理不一定接管了 IPv6。如果你访问的网站支持 IPv6，电脑可能直接用 IPv6 连过去，不经过代理，网站看到的就是你国内的 IPv6 地址。这就是 **IPv6 泄漏**。

最简单的办法是在电脑上关掉 IPv6。

先打开 [ipleak.net](https://ipleak.net/) 看一下：没有出现 IPv6 地址，或者出现的不是国内的，就不用管；出现了国内的 IPv6 地址，再关：

- **Windows**：控制面板 → 网络和 Internet → 网络和共享中心 → 更改适配器设置 → 右键正在使用的网络（Wi-Fi 或以太网）→ 属性 → 取消勾选“Internet 协议版本 6 (TCP/IPv6)” → 确定。
- **Mac**：系统设置 → 网络 → 正在使用的网络 → 详细信息 → TCP/IP → “配置 IPv6”选“仅本地链接” → 好。

**视频 04-3：处理 WebRTC 和 IPv6 泄漏**

关掉后再打开 ipleak.net 测一次，确认国内的 IPv6 不见了。

## 改时区

> 引导站小节：https://re0claude.us.ci/client-desktop/#改时区

---

还有一处容易忽略：**时区**。

浏览器会把你电脑的时区告诉网页。Claude 一看：IP 在美国，时区却是中国，这就对不上了。

时区要改成 **Claude 支持的地区**。中国大陆和香港不在支持名单里，台湾在。不一定要和住宅 IP 所在地一致，但建议选一个和你的作息接近的地方。我选的是台湾，因为它和北京一样是 UTC+8，看时间不别扭。

你可能会想：既然时间一样，改不改有什么区别？区别在于，浏览器能读到的不只是时差，还有时区的**名字**。北京是 `Asia/Shanghai`，台北是 `Asia/Taipei`。名字对不上，一样会露馅。

- **Windows**：设置 → 时间和语言 → 日期和时间 → 关闭“自动设置时区” → 手动选时区。
- **Mac**：系统设置 → 通用 → 日期与时间 → 关闭“使用你的当前位置自动设定时区” → 手动选城市。

不确定选哪里，就选住宅 IP 所在城市的时区，比如洛杉矶的 IP 选 `America/Los_Angeles`。**中国大陆和香港不行。**

改完可以在 [browserleaks.com/javascript](https://browserleaks.com/javascript) 看一眼，确认浏览器报告的时区已经变了。

### 验收清单

> 引导站小节：https://re0claude.us.ci/client-desktop/#验收清单

在进入账号注册之前，逐项确认：

- [ ] 打开 [ipinfo.io](https://ipinfo.io/)，方案一显示的是 **ISP 的出口 IP**（不是服务器 IP），方案二显示的是住宅服务器 IP；**AS Type 是 `isp`**，**Privacy 是 `false`**。
- [ ] 打开 [browserleaks.com/dns](https://browserleaks.com/dns)，DNS 列表里没有国内 DNS（包括 DNSPod）。
- [ ] 打开 [browserleaks.com/webrtc](https://browserleaks.com/webrtc)，没有泄漏你国内的公网 IP。
- [ ] 打开 [ipleak.net](https://ipleak.net/)，没有出现国内的 IPv6。
- [ ] 浏览器报告的时区是 Claude 支持的地区。

如果几个网站测出来的 IP 不一样，先别慌，这很可能是正常的。方案一只让 Claude 和 `ipinfo.io` 走 ISP，所以别的网站看到的是服务器 IP。具体解释见[日常维护与故障处理](https://re0claude.us.ci/maintenance/#测出来好几个不同的-ip)的“测出来好几个不同的 IP”一节。
