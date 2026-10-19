# 四、把服务器变成节点

**用 SSH 连上服务器**

1. 打开命令行：Windows 按 `Win + R` 输入 `cmd`；Mac 打开“终端”。
2. 输入下面的命令，`你的服务器IP` 换成真实 IP。问 `Are you sure...` 时输入 `yes`；出现 `password:` 时输入 root 密码（**屏幕不显示，正常**），回车。开头变成 `root@...:~#` 就连上了。

```bash
ssh root@你的服务器IP
```

提示 `ssh: connect to host 你的服务器IP port 22: Connection refused`，见 [[SSH 端口不是 22？]]。

提示 `Permission denied, please try again.`，见 [[SSH 提示 Permission denied？]]。

**运行脚本**

1. 粘贴这行命令，回车：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Finderlzy/reality-setup/v2.0.0/setup.sh)
```

2. 回答问题：

| 问题 | 怎么填 |
| --- | --- |
| 服务器 IP 是 xxx 吗？ | 和你的服务器 IP 一样就回车，不一样就输入正确的 |
| 住宅代理 IP、端口、用户名、密码 | 第一步白嫖的（或上一步买的）ISP。住宅代理 IP 是一串域名也直接填 |

3. 等几分钟（弹出紫色/蓝色对话框就回车；Debian 11 的服务器会先自动升级到 Debian 12，要多等 5～15 分钟），看到 `节点自测 Reality：成功` 和 `节点自测 Hysteria2：成功`。
4. 最后会打印两个节点，**通过剪贴板**或扫二维码导入代理软件，**不要发给别人**：
   - **主节点**：`vless://` 开头，平时用这个。忘了就运行 `cat /root/vless.txt`。
   - **备用节点**：`hysteria2://` 开头，主节点连不上或很慢时换它。忘了就运行 `cat /root/hy2.txt`。
5. 最后打印的“面板”几行**截图保存**，[[五、打开面板]] 要用。
6. 商家后台有防火墙/安全组的话，放行 **TCP 443 和 UDP 443**。
7. 升级过系统的（Debian 11 升到 12），最后会提示重启：找个方便的时候运行 `reboot`，节点会自动起来。

提示“住宅代理连不上”：去商家后台检查端口、账号密码、IP 白名单（把服务器 IP 加进去）、套餐是否生效，再运行一次命令。脚本只支持 **SOCKS5** 协议的代理。

以后想换一个 ISP，要重新运行同一行命令重装，重装后节点链接会变，代理软件里要重新导入。

脚本内容公开在 [reality-setup](https://github.com/Finderlzy/reality-setup)，运行前可以先看一眼。

想重装的，见 [[装过了，想重装？]]。

走 [[方案二：住宅 IP 服务器|方案二]] 的，问住宅代理 IP 时直接回车跳过。服务器本身就是住宅 IP，做完这一步直接去 [[导入代理软件]]，不用看下一步。

---

上一步：[[三、购买 ISP 代理]] ｜ 下一步：[[五、打开面板]]
