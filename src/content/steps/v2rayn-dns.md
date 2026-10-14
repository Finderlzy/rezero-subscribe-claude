---
title: 防 DNS 泄漏
---
就算 IP 换好了，还有几个地方可能会把你的真实位置漏出去。检测网站用 [browserleaks.com](https://browserleaks.com)，它把 IP、DNS、WebRTC 分开测；也可以用 [ipleak.net](https://ipleak.net/)，一个页面全测完。

1. 开 tun 模式（[[v2rayn-tun|上一章]]已经做了）。
2. v2rayN → DNS 设置：国外域名用远程 DNS（`1.1.1.1` 或 `8.8.8.8`），并且通过代理查询。
3. v2rayN → 路由设置：“域名解析策略”选 `AsIs`。
4. 关掉浏览器的“安全 DNS”，或者把它也改成国外的 DNS 服务商：
   - Chrome：设置 → 隐私和安全 → 安全 → 关闭“使用安全 DNS”。
   - Edge：设置 → 隐私、搜索和服务 → 关闭“使用安全 DNS”。

**检测**：打开 [browserleaks.com/dns](https://browserleaks.com/dns)，结果里不能有国内的 DNS（比如 China Telecom、China Unicom）。

> [!why] DNS 泄漏和“远程 DNS”
> 访问一个网站之前，电脑要先问 DNS 服务器“这个域名对应哪个 IP”。如果这一步没走代理，而是问了国内运营商的 DNS，对方就知道你在国内，而且知道你在访问 `claude.ai`。
>
> tun 模式会把系统的 DNS 请求接管过来，这是最主要的一步。但浏览器自己的“安全 DNS”可能绕开代理软件自己去查，所以开了 tun 也要测。
>
> **远程 DNS**：`1.1.1.1` 是 Cloudflare 的 DNS 服务器，`8.8.8.8` 是 Google 的。“远程”指的是**通过代理**去问它们。重点在“通过代理”，而不在“国外”：用国内网络直接去问 `8.8.8.8`，对方看到的提问者还是你的国内 IP。所以**国外 DNS 不等于安全，查询也要走代理才行。**
>
> `AsIs` 让代理软件只按域名分流，不会为了判断走哪条线先在本地查一次 DNS。它是远程 DNS 的补充，不能代替上面的设置。
