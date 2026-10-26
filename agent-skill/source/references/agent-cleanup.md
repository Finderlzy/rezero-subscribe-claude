# 收尾清理：什么时候做、清什么、怎么报告

本文件是 Agent 方法文件（FR-109，架构 §16.6）。写给 Agent 看，读者不需要读它。

## 什么时候做

- 读者做完一段代办（跑完一键脚本、看完面板、做完电脑端检查和验收）之后；
- 读者说「结束」「不做了」「先到这」时；
- 读者要关掉会话之前，如果这次用过凭据或开过隧道。

每次做完一段就清一次，不要攒到整条路线走完。清理前先确认这次到底动过什么，只清这次产生的。

## 清理清单（按顺序做）

### 1. 先清 shell 历史，再删临时目录

删临时目录会带走密码文件，而清历史要用它做匹配，所以顺序不能反。

Agent 自己执行命令用的是非交互 shell，不写 shell 历史；但读者可能照着提示在自己的终端里敲过带密码的命令，所以要检查：

```bash
for f in ~/.bash_history ~/.zsh_history; do
  [ -f "$f" ] || continue
  grep -vF -f "$WORK/password" "$f" > "$WORK/history.tmp" || true
  mv "$WORK/history.tmp" "$f"
done
```

`grep -vF -f` 用密码文件做固定字符串匹配，不把密码打到屏幕上。macOS 默认是 zsh，`~/.zsh_history` 一定要查。

Windows（PowerShell）的历史文件是 `$env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`：

```powershell
$hist = Join-Path $env:APPDATA 'Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt'
if (Test-Path $hist) {
  $pw = (Get-Content -Raw "<临时目录里的密码文件>").Trim()
  Get-Content $hist | Where-Object { $_ -notmatch [regex]::Escape($pw) } | Set-Content $hist
}
```

不要把密码本身打印出来，也不要把密码写进命令行参数。

### 2. 结束本次打开的 SSH 隧道和后台连接

```bash
[ -f "$WORK/tunnel.pid" ] && kill "$(cat "$WORK/tunnel.pid")" 2>/dev/null || true
```

再确认没有残留：

```bash
ps -eo pid,args | grep '[s]sh ' | grep -E -- '-N|-L|rezero' || true
```

Windows：`Get-Process ssh -ErrorAction SilentlyContinue`，确认没有本次的隧道进程。

### 3. 如果用过临时密钥，从服务器删掉那一行

那次退路用 `ssh-keygen -C` 生成过一个带随机标记的公钥（标记形如 `rezero-skill-<随机>`）。连上服务器删掉这一行：

```bash
ssh -i "$WORK/id_ed25519" -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$WORK/known_hosts" -o ConnectTimeout=15 \
    root@203.0.113.10 "sed -i '/rezero-skill-<随机>/d' ~/.ssh/authorized_keys"
```

（端口、地址换成读者服务器真实的；命令形式见 `references/agent-ssh.md`。）没用过临时密钥就跳过这一步。

### 4. 删掉服务器上本次的答案文件和安装日志

```bash
ssh ... "rm -f /root/.rezero-answers-<随机> /root/.rezero-setup-<随机>.log"
```

**不要删**这些，读者以后还要用：

- `/root/vless.txt`（主节点链接）
- `/root/hy2.txt`（备用节点链接）
- `/root/clash.yaml`（Clash 配置）
- `/etc/x-ui/install-result.env` 和面板登录信息

### 5. 核对进度文件里没有凭据

```bash
grep -nE '([0-9]{1,3}\.){3}[0-9]{1,3}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|://' ~/rezero-subscribe-claude-progress.md
```

Windows 路径换成 `%USERPROFILE%\rezero-subscribe-claude-progress.md`。有命中就删掉那一行再查一遍；进度文件只该有系统、方案、状态、日期和「通过 / 没通过」。

### 6. 最后删临时目录

```bash
rm -rf "$WORK"
```

删之前确认 `$WORK` 确实是本次建的 `rezero-skill-<随机>` 目录，不要把别的目录带进去。Windows：

```powershell
Remove-Item -Recurse -Force $WORK
```

临时目录里有：askpass 小脚本、密码文件、一键脚本的答案、临时密钥、`known_hosts`、隧道进程号。都不该留下。

## 报告模板

清理完用几句话说清楚，不要只回一句「已清理」：

```markdown
清理完成。

已清理：
- 临时目录（密码文件、答案文件、临时密钥、known_hosts）
- 本次打开的 SSH 隧道和后台连接
- shell 历史里本次带密码的行（bash / zsh / PowerShell 都查过）
- 服务器上本次的答案文件和安装日志
- 进度文件核对过，没有密码、IP、节点链接、邮箱
[用过临时密钥时] 服务器 authorized_keys 里那行临时公钥

清不了：
- 这次对话的记录保存在你和 Agent 的服务商那里，Skill 删不掉。介意的话，在 Agent 里删掉这次会话。

没删（以后还要用）：
- 服务器上的 vless.txt、hy2.txt、clash.yaml 和面板登录信息
```

报告里不要把密码、IP、节点链接再打一遍。

## 不做什么

- **不主动建议改 root 密码。** 首期没有这一条（Q-25）；读者问起就说这是以后的事，不要擅自给建议。
- 不删读者的进度文件：那是读者自己的记录，删掉等于重新开始，只能由读者决定。
- 不动服务器上本次以外的文件和进程。
