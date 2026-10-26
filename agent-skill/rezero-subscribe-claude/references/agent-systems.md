# 三个系统的差别和命令

本文件是 Agent 方法文件（FR-107，架构 §16.5）。写给 Agent 看，读者不需要读它。

三个系统的操作思路一样，差别在命令和权限。**具体要填什么值、验收看什么，去参考文件里读**（`references/client-desktop.md` 的「防泄漏」「改时区」「验收清单」等小节）；本文件只写「在哪执行、要不要提权、命令长什么样」。

## 先识别系统

macOS / Linux：

```bash
uname -s
```

`Darwin` 是 macOS，`Linux` 是 Linux；`MINGW`、`MSYS`、`CYGWIN` 开头说明是 Windows 上的兼容层，按 Windows 处理。

Windows（PowerShell）：

```powershell
$env:OS
```

输出 `Windows_NT` 就是 Windows。拿不准时两个都看。

识别结果写进进度文件的「电脑系统」那一行，后面不用再问。

## 谁需要管理员或 sudo

- **改时区、关 IPv6**：三个系统都要提权。Windows 要「以管理员身份运行」的 PowerShell；macOS 和 Linux 要 `sudo`。
- **sudo 密码由读者自己输入，Agent 不经手**：把命令原样交给读者，让他在自己的终端里运行并输入密码。不要向读者要 sudo 密码，不要把它写进文件或命令，也不要代输。
- **只读检查**（看当前时区、查 IPv6、看系统版本）不需要提权，Agent 直接执行。
- Windows 上「以管理员身份运行」只能由读者自己操作：Agent 不弹 UAC，也不替读者点确认。

## 改时区

要改成哪个时区，按 `references/client-desktop.md` 的「改时区」小节选，不要自己发挥。改之前先说明会改什么、读者同意后再动（FR-106）。

macOS：

```bash
sudo systemsetup -gettimezone
sudo systemsetup -settimezone Asia/Taipei
```

`systemsetup` 需要管理员权限，让读者自己运行、自己输密码。新版 macOS 也可能拒绝改动，这时按参考文件的图形界面步骤引导读者去「系统设置 → 通用 → 日期与时间」手动改，Agent 只说要选哪个值，不去点界面。

Linux：

```bash
timedatectl
sudo timedatectl set-timezone Asia/Taipei
```

同样把带 `sudo` 的那条交给读者在自己的终端运行。

Windows（管理员 PowerShell）：

```powershell
Get-TimeZone
Set-TimeZone -Id "Taipei Standard Time"
```

Windows 的时区标识是英文 ID，不是 `Asia/Taipei` 这种写法；不确定 ID 时先用 `Get-TimeZone -ListAvailable` 让读者自己看列表，或按参考文件在「设置 → 时间和语言 → 日期和时间」里手动选。

改完让读者用浏览器确认（浏览器报告的时区属于只能引导的检查，见 `SKILL.md` 的「代办和引导的分界」）。

## 查有没有国内 IPv6

先查，再决定要不要关。国内运营商常见的公网 IPv6 前缀是 `240e`（电信）、`2408`（联通）、`2409`（移动）；`fe80` 开头的链路本地地址和 `::1` 不算。

macOS：

```bash
ifconfig | grep inet6 | grep -v fe80
```

Linux：

```bash
ip -6 addr show scope global
```

Windows（PowerShell）：

```powershell
Get-NetIPAddress -AddressFamily IPv6 | Format-Table IPAddress, InterfaceAlias
```

有国内公网的 IPv6 才需要关；没有就跳过，别为了做而做。

## 关 IPv6

会改变系统设置，先说明、等读者同意（FR-106）。参考文件里的写法是图形界面，能引导就引导；下面是命令做法，需要提权的交给读者自己运行。

Windows（管理员 PowerShell，`Get-NetAdapter` 查适配器名称）：

```powershell
Disable-NetAdapterBinding -Name "<适配器名称>" -ComponentID ms_tcpip6
```

要恢复时把 `Disable-` 换成 `Enable-`。

macOS（`networksetup -listallnetworkservices` 查服务名，通常是 `Wi-Fi`）：

```bash
sudo networksetup -setv6off "Wi-Fi"
```

恢复用 `-setv6automatic`。新版 macOS 对 Wi-Fi 可能改了也不生效，遇到这种情况按参考文件引导读者手动改，并如实告诉读者命令没起作用。

Linux：

```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
```

这样重启会失效；需要保留时写 `/etc/sysctl.d/99-rezero-ipv6.conf`（内容就上面两行不带 `-w`），再 `sudo sysctl --system`。恢复时删掉这个文件并把两项设回 `0`。

## 作者给的两条差别

- **Windows：代理软件要以管理员身份运行。** 开 Tun 模式要虚拟网卡，普通权限不够。提醒读者右键程序选「以管理员身份运行」，这是读者自己在图形界面上做的，Agent 不代劳。
- **Linux：每次打开 Tun，系统都会要求输入密码。** 由读者自己在弹窗里输入，Agent 不索取、不代输。

## 正文没写 Linux 做法的地方

参考文件是按 Windows 和 macOS 写的；遇到只有这两个系统写法的步骤（时区、IPv6、代理软件的图形界面等），按同样的思路现场处理，并明确告诉读者：

> 这一步教程没写 Linux 的做法，我按同样的思路给你处理，做完我们再看结果。

不要假装参考文件里写了；也不要因为没写就跳过。
