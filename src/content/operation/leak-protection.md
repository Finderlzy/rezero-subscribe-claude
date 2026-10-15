# 防泄漏

要堵三个地方：DNS、WebRTC、IPv6。下面以 v2rayN 为例，用 Clash Verge 的看最后。设置完都要测一下，检测网站用 [browserleaks.com](https://browserleaks.com)，它把 IP、DNS、WebRTC 分开测；也可以用 [ipleak.net](https://ipleak.net/)，一个页面全测完。

**防 DNS 泄漏**

1. 确认代理软件开了 tun 模式（见 [[导入代理软件]]）。
2. v2rayN → DNS 设置：国外域名用远程 DNS（`1.1.1.1` 或 `8.8.8.8`），并且通过代理查询。
3. v2rayN → 路由设置：“域名解析策略”选 `AsIs`。
4. 关掉浏览器的“安全 DNS”，或者把它也改成国外的 DNS 服务商：
   - Chrome：设置 → 隐私和安全 → 安全 → 关闭“使用安全 DNS”。
   - Edge：设置 → 隐私、搜索和服务 → 关闭“使用安全 DNS”。

**检测**：打开 [browserleaks.com/dns](https://browserleaks.com/dns)，结果里不能有国内的 DNS（比如 China Telecom、China Unicom）。

**防 WebRTC 泄漏**

- Chrome / Edge：装插件“WebRTC Control”；或者在 uBlock Origin 设置里勾选“防止 WebRTC 泄露本地 IP 地址”。
- Firefox：地址栏输入 `about:config`，把 `media.peerconnection.enabled` 改为 `false`。

**检测**：打开 [browserleaks.com/webrtc](https://browserleaks.com/webrtc)，“Public IP”里不能出现你国内的 IP。用方案一的，这里显示的是服务器的 IP，这是正常的。

**防 IPv6 泄漏**

1. 先打开 [ipleak.net](https://ipleak.net/) 看一下，没有出现 IPv6 地址，或者出现的不是国内的，就不用管。
2. 出现了国内的 IPv6 地址，就在电脑上关掉 IPv6：
   - Windows：控制面板 → 网络和 Internet → 网络和共享中心 → 更改适配器设置 → 右键你正在用的网络（Wi-Fi 或以太网）→ 属性 → 取消勾选“Internet 协议版本 6 (TCP/IPv6)” → 确定。
   - Mac：系统设置 → 网络 → 你正在用的网络（Wi-Fi 或以太网）→ 详细信息 → TCP/IP → “配置 IPv6”选“仅本地链接” → 好。
3. 关掉之后再打开 ipleak.net 测一次，确认国内的 IPv6 不见了。

**用 Clash Verge 的**

1. 确认已经打开“虚拟网卡模式”（tun 模式），见 [[导入代理软件]]。
2. 设置 → Clash 设置：打开“DNS 覆写”，增强模式选 `fake-ip`。
3. 浏览器的“安全 DNS”、WebRTC、IPv6，和上面一样处理。
4. 检测方法也和上面一样。

TODO：Clash Verge 的菜单名称我没有在最新版上逐个核对过，写操作时要截图确认一遍。

---

上一步：[[测 IP 质量]] ｜ 下一步：[[改时区]]
