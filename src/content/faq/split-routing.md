---
title: 分流规则具体怎么写？
---
意思是只让 claude 相关的网站走住宅节点，其他网站照旧走原来的节点。方案一、二的脚本已经在服务器上做好了分流，不用管这一条；这里说的是方案三“已经有节点”的情况。

至少要包含这几个域名：`claude.ai`、`claude.com`、`anthropic.com`，再加上用来检测的 `ipinfo.io`。

**Clash Verge（mihomo 内核）**：在规则里加上下面几行，`住宅节点` 换成你的节点或策略组名字，并且放在其他规则前面：

```
- DOMAIN-SUFFIX,claude.ai,住宅节点
- DOMAIN-SUFFIX,claude.com,住宅节点
- DOMAIN-SUFFIX,anthropic.com,住宅节点
- DOMAIN-SUFFIX,ipinfo.io,住宅节点
```

**Shadowrocket**：在“配置”→“规则”里新增 `DOMAIN-SUFFIX` 类型的规则，域名同上，策略选住宅节点。

**v2rayN**：它的路由规则一般只能选“代理 / 直连 / 阻断”，不方便指定某一个节点。用 v2rayN 的话，最简单的办法是用 claude 时直接切到住宅节点。

看不懂也没关系：不分流，用 claude 时直接全局走住宅节点，最不容易出错。
