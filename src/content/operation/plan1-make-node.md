# 三、把服务器变成节点

**用 SSH 连上服务器**

1. 打开命令行：Windows 按 `Win + R` 输入 `cmd`；Mac 打开“终端”。
2. 输入下面的命令，`你的服务器IP` 换成真实 IP。问 `Are you sure...` 时输入 `yes`；出现 `password:` 时输入 root 密码（**屏幕不显示，正常**），回车。开头变成 `root@...:~#` 就连上了。

```bash
ssh root@你的服务器IP
```

**运行脚本**

TODO：下面的命令用的是还没发布的 v1.3.0。脚本在 reality-setup 的 split-scripts 分支上，还没在真实服务器上跑过；发版并打上 v1.3.0 标签后，这条命令才能用。

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

想重装的，见 [[常见问题#装过了，想重装？|装过了，想重装？]]。

---

上一步：[[二、购买服务器]] ｜ 下一步：[[四、购买 ISP 代理]]
