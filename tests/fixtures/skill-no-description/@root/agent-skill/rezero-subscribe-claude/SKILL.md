---
name: rezero-subscribe-claude
license: MIT
compatibility: 需要能执行本机命令和 ssh 的 Agent，需要联网；只能聊天的 Agent 只能用引导部分
metadata:
  version: "3.1.3"
  rewrite: "73a22dabd757"
  site: "https://re0claude.us.ci"
---

# Re:从零开始订阅 claude

教程原文在 `references/` 下，每个参考文件开头写着对应的引导站网址（https://re0claude.us.ci），每个小标题下面写着小节网址。

## 路线

| 章 | 页面标识 | 标题 | 参考文件 | 引导站 | 分叉 |
| --- | --- | --- | --- | --- | --- |
| 开始 | `preface` | 前言 | `references/preface.md` | https://re0claude.us.ci/preface/ | — |
| 准备节点和住宅 IP | `overview` | 整体思路与方案选型 | `references/overview.md` | https://re0claude.us.ci/overview/ | 选择页：分叉点 `node-plan`，选项 `plan-1`（方案一） / `plan-2`（方案二），推荐 `plan-2` |
| 准备节点和住宅 IP | `plan1` | 方案一：搭建专属住宅代理节点 | `references/plan1.md` | https://re0claude.us.ci/plan1/ | 分叉点 `node-plan` 选 `plan-1`（方案一）时走 |
| 准备节点和住宅 IP | `plan2-residential-server` | 方案二：配置住宅 IP 服务器 | `references/plan2-residential-server.md` | https://re0claude.us.ci/plan2-residential-server/ | 分叉点 `node-plan` 选 `plan-2`（方案二）时走 |
| 客户端配置与订阅 | `client-desktop` | 客户端配置与环境验证：电脑端 | `references/client-desktop.md` | https://re0claude.us.ci/client-desktop/ | 选择页：分叉点 `phone`，选项 `iphone`（iPhone / iPad） / `android`（安卓） |
| 客户端配置与订阅 | `iphone-prepare` | 客户端配置与环境验证：iOS 端 | `references/iphone-prepare.md` | https://re0claude.us.ci/iphone-prepare/ | 分叉点 `phone` 选 `iphone`（iPhone / iPad）时走 |
| 客户端配置与订阅 | `iphone-subscription` | 账号注册与订阅全流程：iOS 端 | `references/iphone-subscription.md` | https://re0claude.us.ci/iphone-subscription/ | 分叉点 `phone` 选 `iphone`（iPhone / iPad）时走 |
| 客户端配置与订阅 | `android-prepare` | 客户端配置与环境验证：安卓端 | `references/android-prepare.md` | https://re0claude.us.ci/android-prepare/ | 分叉点 `phone` 选 `android`（安卓）时走 |
| 客户端配置与订阅 | `android-subscription` | 账号注册与订阅全流程：安卓端 | `references/android-subscription.md` | https://re0claude.us.ci/android-subscription/ | 分叉点 `phone` 选 `android`（安卓）时走 |
| 日常维护 | `maintenance` | 日常维护、风控应对与常见故障 | `references/maintenance.md` | https://re0claude.us.ci/maintenance/ | — |
| 结尾 | `afterword` | 后记与致谢 | `references/afterword.md` | https://re0claude.us.ci/afterword/ | — |

不在路线里、需要时再读的参考页：

- IP 质量实测合集：`references/ip-tests.md`，引导站 https://re0claude.us.ci/ip-tests/
