---
title: 防 WebRTC 泄漏
---
- Chrome / Edge：装插件“WebRTC Control”；或者在 uBlock Origin 设置里勾选“防止 WebRTC 泄露本地 IP 地址”。
- Firefox：地址栏输入 `about:config`，把 `media.peerconnection.enabled` 改为 `false`。

**检测**：打开 [browserleaks.com/webrtc](https://browserleaks.com/webrtc)，“Public IP”只能是你的住宅 IP。

> [!why] WebRTC 泄漏
> WebRTC 是浏览器用来做语音、视频通话的技术。它为了建立连接，可能绕过代理，直接把你的真实 IP 暴露给网页。
