---
title: 打开面板排查
---
方案一、二的节点出问题时，用 SSH 隧道打开 3x-ui 面板查看。面板只监听服务器本机，外网打不开，这是脚本故意设置的。

1. 在**自己电脑**的命令行运行（换成你的 IP），输入 root 密码，**窗口不要关**：

```bash
ssh -L 8080:127.0.0.1:8080 root@你的服务器IP
```

2. 浏览器打开 `http://127.0.0.1:8080/访问路径`，用截图里的用户名密码登录。
3. 忘了就在第 1 步的窗口里运行：

```bash
cat /etc/x-ui/install-result.env
```

`XUI_WEB_BASE_PATH` 是访问路径，`XUI_USERNAME`、`XUI_PASSWORD` 是用户名、密码。

在服务器上运行 `node-selftest` 可以随时重新自测两个节点。
