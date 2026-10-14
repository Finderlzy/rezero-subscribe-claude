---
title: 防 DNS 泄漏
placeholder: true
---
就算 IP 换好了，还有几个地方可能会把你的真实位置漏出去。检测网站用 [browserleaks.com](https://browserleaks.com)，它把 IP、DNS、WebRTC 分开测；也可以用 [ipleak.net](https://ipleak.net/)，一个页面全测完。

1. 关掉浏览器的“安全 DNS”，或者把它也改成国外的 DNS 服务商：
   - Chrome：设置 → 隐私和安全 → 安全 → 关闭“使用安全 DNS”。
   - Edge：设置 → 隐私、搜索和服务 → 关闭“使用安全 DNS”。

**检测**：打开 [browserleaks.com/dns](https://browserleaks.com/dns)，结果里不能有国内的 DNS（比如 China Telecom、China Unicom）。
