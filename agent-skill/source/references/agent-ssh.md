# 连服务器、跑一键脚本、开面板隧道

本文件是 Agent 方法文件（FR-104、FR-106、FR-108，架构 §16.6）。写给 Agent 看，读者不需要读它。

## 什么时候用

读者买好服务器（方案一还要买好住宅 ISP 代理）之后，下面这些由 Agent 代办：SSH 连服务器、用只读命令查环境、运行一键脚本、确认自测、取节点链接、检查 443、按需开面板隧道。

**教程内容不写在这里。** 答法、命令原文、检查标准都在参考文件里：

- 方案一：`references/plan1.md`（重点看「购买静态住宅 ISP 代理」「SSH 连接服务器」「运行一键脚本」「端口和防火墙」「打开面板」）
- 方案二：`references/plan2-residential-server.md`（重点看「先测服务器 IP」「SSH 连接服务器」「运行一键脚本」「打开面板」）

每一步开始前先读对应参考文件，不凭记忆讲。

## 临时目录

每次代办开始时建一个，整个代办期间所有必须落盘的东西都只放这里：

```bash
WORK=$(mktemp -d "${TMPDIR:-/tmp}/rezero-skill-XXXXXX")
chmod 700 "$WORK"
TAG=$(basename "$WORK" | sed 's/^rezero-skill-//')
```

Windows（PowerShell，用系统临时目录）：

```powershell
$TAG = [guid]::NewGuid().ToString("N").Substring(0, 8)
$WORK = Join-Path $env:TEMP ("rezero-skill-" + $TAG)
New-Item -ItemType Directory -Path $WORK | Out-Null
icacls $WORK /inheritance:r /grant:r "$env:USERNAME:(OI)(CI)F" | Out-Null
```

这里的文件权限一律 600（`chmod 600`；Windows 用 `icacls` 只给当前用户）。放这些：

- `askpass` 小脚本和密码文件；
- 一键脚本的答案文件；
- 临时密钥（私钥）；
- `known_hosts`；
- 隧道进程号。

**不要**写到 `~/.ssh/`、仓库、Skill 目录或进度文件里。收尾清理时整个删掉（`references/agent-cleanup.md`）。

## 登录：首选 askpass

先看本机 OpenSSH 版本：

```bash
ssh -V
```

macOS 和 Linux 上 `OpenSSH_8.4` 及以上支持 `SSH_ASKPASS_REQUIRE=force`，用这个做法：askpass 是一个只输出密码的小脚本，密码本身放在临时目录的另一个文件里（权限 600）。

```bash
printf '#!/bin/sh\ncat %s\n' "$WORK/password" > "$WORK/askpass"
chmod 700 "$WORK/askpass"
printf '%s' '<读者给的 root 密码>' > "$WORK/password"
chmod 600 "$WORK/password"
```

后面每次 ssh 都用下面这个包装，**每次**都带三个 `-o`：`known_hosts` 指到临时目录，就不会在读者的 `~/.ssh/known_hosts` 里留下服务器 IP：

```bash
rssh() {
  SSH_ASKPASS="$WORK/askpass" SSH_ASKPASS_REQUIRE=force \
    ssh -o StrictHostKeyChecking=accept-new \
        -o UserKnownHostsFile="$WORK/known_hosts" \
        -o ConnectTimeout=15 "$@"
}
```

用法（端口默认 22 时不加 `-p`，商家后台给了别的端口才加）：

```bash
rssh root@203.0.113.10 "cat /etc/os-release"
rssh -p 38221 root@203.0.113.10 "cat /etc/os-release"
```

注意：

- 非交互环境里没有终端，`ssh` 不会显示 `password:`；askpass 没生效时会直接报 `Permission denied` 或卡住，这时改用下面的退路。
- 账号只有 root；不要尝试 `sudo -S`，也不要把密码塞进命令行参数或环境变量再打印出来。
- 密码只在执行命令时用，回复里回显要打码，不要复述读者贴来的密码。

## 退路：临时密钥（三个系统都能用）

这些情况用退路：askpass 失败；Windows 上 askpass 还没验证过（Q-26）；读者不想把密码贴给 Agent。

先说明这会**改服务器**（往 `~/.ssh/authorized_keys` 加一行公钥），读者同意后再做（FR-106）。

```bash
KEY_TAG="rezero-skill-$TAG"
ssh-keygen -t ed25519 -N '' -C "$KEY_TAG" -f "$WORK/id_ed25519"
cat "$WORK/id_ed25519.pub"
```

把公钥内容原样给读者，让他在**自己的终端**里运行一条命令、自己输一次密码：

macOS / Linux：

```bash
printf '%s\n' '<公钥内容>' | ssh -p <端口> root@<服务器地址> 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

Windows（PowerShell）：

```powershell
'<公钥内容>' | ssh -p <端口> root@<服务器地址> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

读者做完后 Agent 用私钥登录：

```bash
ssh -i "$WORK/id_ed25519" -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$WORK/known_hosts" -o ConnectTimeout=15 \
    -p <端口> root@203.0.113.10 "命令"
```

收尾时从服务器删掉这一行（靠 `KEY_TAG` 注释精确匹配，别删读者的其他公钥）：

```bash
ssh -i "$WORK/id_ed25519" ... root@203.0.113.10 "sed -i '/$KEY_TAG/d' ~/.ssh/authorized_keys"
```

## 一键脚本

### 先做只读检查

```bash
rssh root@203.0.113.10 "cat /etc/os-release; ls -d /etc/x-ui 2>/dev/null; cat /etc/reality-setup/version 2>/dev/null; ls -l /root/vless.txt /root/hy2.txt 2>/dev/null"
```

按结果决定：

- 不是 Debian：**不运行脚本**。让读者去商家后台把系统重装成 Debian（图形界面操作，只引导），并说明脚本只支持 Debian。
- `/etc/x-ui` 存在、读者也没说要重装：**不运行脚本**。告诉读者这台服务器已经装过，问他现在想做什么（只排查？只取链接？还是要重装）。
- 其他情况：往下走。

### 答案顺序

一键脚本的提问全在安装开始前，从标准输入读，顺序固定。**`read -p` 的提问在非终端下不显示，但答案照常读入，所以顺序不能错、每行一个答案**：

1. 「删掉旧的重新装吗？」——**只有 `/etc/x-ui` 存在时才有这一问**。默认不重装：读者没明确说要重装就不要运行脚本。读者明确要重装才答 `y`，答之前先提醒「旧节点链接会失效，客户端要重新导入」。
2. 「服务器 IP 是 xxx 吗？」——对就直接回车（空行），不对就填读者 SSH 用的 IP。
3. 「住宅代理 IP」——方案二直接回车跳过；方案一填参考文件表格里的 ISP 地址。
4. 住宅代理端口、用户名、密码——**只有第 3 项非空才问**，依次填参考文件里读者记下的值。

具体每个方案填什么，照着 `references/plan1.md` 或 `references/plan2-residential-server.md` 的「运行一键脚本」表格抄，不要自己编。

### 答案文件

```bash
cat > "$WORK/answers" <<'EOF'
<第 1 行答案>
<第 2 行答案>
<第 3 行答案>
EOF
chmod 600 "$WORK/answers"
```

用带引号的 `'EOF'`，密码里有 `$`、反引号也不会被展开。每一行对应一个问题，跳过的问题写空行。

传到服务器一个权限 600 的临时文件：

```bash
rssh root@203.0.113.10 "umask 077; cat > /root/.rezero-answers-$TAG" < "$WORK/answers"
```

### 在服务器后台运行

**命令从参考文件原样复制，不要改地址和版本号**，只在标准输入和输出上做文章：

```bash
rssh root@203.0.113.10 "nohup bash -c 'trap \"rm -f /root/.rezero-answers-$TAG\" EXIT; bash <(curl -fsSL <参考文件里的地址>) < /root/.rezero-answers-$TAG' > /root/.rezero-setup-$TAG.log 2>&1 & echo \$!"
```

这样 Debian 11 升级的 5～15 分钟不会撞上 Agent 的命令超时，答案文件也会在脚本结束时被 `trap` 删掉。

启动后等十几到几十秒，日志里出现后续输出（Debian 11 的升级提示、apt 输出等）就说明问题已经问完，马上再删一次答案文件：

```bash
rssh root@203.0.113.10 "rm -f /root/.rezero-answers-$TAG"
```

### 隔一会儿看一次日志

```bash
rssh root@203.0.113.10 "tail -n 40 /root/.rezero-setup-$TAG.log"
```

每 30～60 秒看一次，**不要用一条命令等到结束**。直到日志里同时出现：

```text
节点自测 Reality：成功
节点自测 Hysteria2：成功
```

两项都成功才算装好（AC-44）。有失败就按参考文件的「常见故障」「如果提示住宅代理连不上」排查；还是不行按 `SKILL.md` 的「遇到问题」处理。

### 取节点链接交给读者

```bash
rssh root@203.0.113.10 "cat /root/vless.txt; echo; cat /root/hy2.txt"
```

把主节点（`vless` 开头）和备用节点（`hysteria2` 开头）交给读者导入，**只完整给一次**；之后回复里不再完整打出，需要提及时说「主节点链接」或只留首尾几位。读者用 Clash 的话，按参考文件里 `cat /root/clash.yaml` 的做法给他配置内容。

## 面板

面板只监听服务器本机，要开 SSH 隧道。先告诉读者面板登录信息在哪（`/etc/x-ui/install-result.env` 里的访问路径、用户名、密码，参考文件「打开面板」小节），**这是凭据，不要完整回显**；让读者自己看，或打码后只说他去哪找。

在自己电脑上开隧道并放到后台，进程号记进临时目录：

```bash
nohup env SSH_ASKPASS="$WORK/askpass" SSH_ASKPASS_REQUIRE=force \
  ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$WORK/known_hosts" -o ConnectTimeout=15 \
  -p <端口> -N -L 8080:127.0.0.1:8080 root@203.0.113.10 > "$WORK/tunnel.log" 2>&1 &
echo $! > "$WORK/tunnel.pid"
```

然后让读者用浏览器打开 `http://127.0.0.1:8080/<访问路径>`。读完、排查完就结束隧道（收尾清理会做，也可以现在做）。

## 检查

只读的检查直接做：

```bash
rssh root@203.0.113.10 "ss -lntp | grep ':443'; ss -lnup | grep ':443'"
rssh root@203.0.113.10 "command -v ufw >/dev/null && ufw status || echo no-ufw"
```

服务器上能看到 443 在监听，不代表商家后台的安全组放行了；后者只能在商家后台看，属于引导，要读者自己确认。

出口 IP 和 AS Type 用**参考文件里给的那条命令**查，参数换成读者的：方案一在「购买静态住宅 ISP 代理」小节的 `curl -x socks5h://…`，方案二在「先测服务器 IP」小节。**不要自己另找检查网站**，也不要用参考文件里没写的测 IP 网站（有的会暴露读者国内的真实 IP）。

## 连不上时

先对照 `references/maintenance.md` 的「SSH 端口不是 22」「SSH 提示 Permission denied」处理：

- `Connection refused`：多半是端口不对，看商家后台的端口，加 `-p`。
- `Permission denied`：密码不对，按参考文件重置密码、重试；还不行改用商家后台的控制台/VNC（引导）。
- `Connection closed by ...`：读者电脑上开着代理/TUN，让他关掉再连。

重装或删旧节点前，也要提醒读者先关代理，否则 SSH 会断。
