---
title: 运行脚本
---
1. 粘贴这行命令，回车：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Finderlzy/reality-setup/v1.2.1/setup.sh)
```

2. 回答问题：

| 问题 | 怎么填 |
| --- | --- |
| 服务器 IP 是 xxx 吗？ | 和你的服务器 IP 一样就回车，不一样就输入正确的 |
| 住宅代理 IP、端口、用户名、密码 | [[plan1-free-residential-ip\|白嫖住宅 IP]]里记下的 |

**方案二：**问到住宅代理 IP 时直接回车跳过。

3. 等几分钟（弹出紫色/蓝色对话框就回车），看到 `节点自测 Reality：成功` 和 `节点自测 Hysteria2：成功`。
4. 最后会打印两个节点，**通过剪贴板**或扫二维码导入代理软件，**不要发给别人**：
   - **主节点**：`vless://` 开头的链接，平时用这个。忘了就运行 `cat /root/vless.txt`。
   - **备用节点**：`hysteria2://` 开头的链接，主节点连不上或很慢时换它。忘了就运行 `cat /root/hy2.txt`。
   - v2rayN：配置项 → 从剪贴板导入；手机 Shadowrocket 也是从剪贴板导入。用 Clash Verge 的看[[clash-verge-import]]。
5. 最后打印的“面板”几行**截图保存**，排查问题时要用。
6. 商家后台有防火墙/安全组的话，放行 **TCP 443 和 UDP 443**。

> [!note] 视频和截图里是旧版脚本
> 视频和截图录制时，脚本只有一个节点，端口是 8555。现在脚本改成了 443 端口，并多了一个备用节点，以本文为准。

提示“住宅代理连不上”：去商家后台检查端口、账号密码、IP 白名单（把服务器 IP 加进去）、套餐是否生效，再运行一次命令。其他问题看常见问题[[faq/open-panel|打开面板排查]]。

**想重装**：先**关掉电脑上的代理软件**，再 SSH 连服务器，运行同一行命令，问到删不删旧的时回答 `y`。重装后要重新导入节点。不关代理的话 SSH 可能会断开、之后连不上，原因见常见问题[[faq/reinstall|装过了，想重装？]]。

脚本内容公开在 [reality-setup](https://github.com/Finderlzy/reality-setup)，运行前可以先看一眼。

> [!why] 脚本帮你做了什么
> 自建节点的好处是只有你自己在用，IP 不会被别人用脏。但普通云 VPS 的 IP 是机房 IP，anthropic 能识别出来，所以还要再套一层住宅 IP。
>
> 脚本把原来要手动做的事一次做完：装 3x-ui 面板 → 建一个 VLESS + Reality 主节点（TCP 443）→ 建一个 Hysteria2 备用节点（UDP 443）→ 添加住宅 IP 出站，**只让 anthropic 相关的域名和 ipinfo.io 走住宅 IP**，其他网站照旧从 VPS 出去。这样住宅流量只花在刀刃上，也方便你用 ipinfo.io 检查出口。另外还开了防火墙、SSH 防爆破、BBR 和自动更新。
>
> 两个节点访问 claude 时，出口都是同一个住宅 IP，所以换备用节点不算“换节点”。
>
> 想自己动手、弄懂每一步的，看这两篇：[自建梯子：VPS + 3x-ui + VLESS Reality](https://finderlzy.github.io/Writing/tech/vless-reality/)、[给 VPS 节点套上住宅 IP](https://finderlzy.github.io/Writing/tech/vps-residential-ip/)。
