<#
.SYNOPSIS
    防作弊 Diff 审查：扫描待提交差异中压低质量门槛的改动。
.DESCRIPTION
    扫描范围：默认为工作区相对 HEAD 的全部改动（已暂存 + 未暂存）加未跟踪文件；
    指定 -Base 时改为相对 merge-base(Base, HEAD) 的改动，适合评审整个任务分支。
    检查类别：
      silenced-checker   新增的报错/检查压制
      test-made-easier   新增的跳过、聚焦或忽略用例
      test-deleted       删除了测试文件
      assertion-removed  从仍存在的测试文件中删除了断言
      unfinished-work    未实现桩、空 catch
      debug-leftover     调试残留
    命中不一定是作弊（例如设计明确要求的压制），由调用方逐项裁决。
    退出码：0 未命中；1 有命中需裁决；2 无法运行（不是 Git 仓库、基线无效等），不能当作 0。
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\diff-audit.ps1
    powershell -ExecutionPolicy Bypass -File scripts\diff-audit.ps1 -Path src,tests
    powershell -ExecutionPolicy Bypass -File scripts\diff-audit.ps1 -Base origin/main
#>
[CmdletBinding()]
param(
    [string[]]$Path = @(),
    [string]$Base = "",
    [string[]]$Exclude = @("*.md", "*.txt", "*.lock", "*package-lock.json", ".claude/skills/*", ".agents/skills/*")
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8

function Invoke-Git([string[]]$GitArgs) {
    # 5.1 在 Stop 模式下会把原生命令的 stderr 变成终止错误，这里只看退出码。
    $ErrorActionPreference = "Continue"
    $out = & git -c core.quotepath=false @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ,@($out)
}

function Stop-CannotRun([string]$msg) {
    Write-Host "diff-audit: $msg" -ForegroundColor Red
    exit 2
}

if ($null -eq (Invoke-Git @("rev-parse", "--show-toplevel"))) { Stop-CannotRun "当前目录不是 Git 仓库" }
$top = (Invoke-Git @("rev-parse", "--show-toplevel"))[0]
Set-Location -LiteralPath $top

$pathspec = @("--") + $Path
$hasHead = $null -ne (Invoke-Git @("rev-parse", "--verify", "-q", "HEAD"))

if ($Base) {
    $mb = Invoke-Git @("merge-base", $Base, "HEAD")
    if ($null -eq $mb) { Stop-CannotRun "找不到 $Base 与 HEAD 的 merge-base" }
    $diffArgs = @("diff", "--unified=0", "--no-color", "--no-ext-diff", $mb[0]) + $pathspec
} elseif ($hasHead) {
    $diffArgs = @("diff", "--unified=0", "--no-color", "--no-ext-diff", "HEAD") + $pathspec
} else {
    # 尚无提交的仓库：只能看到已暂存内容（相对空树）。
    $diffArgs = @("diff", "--cached", "--unified=0", "--no-color", "--no-ext-diff") + $pathspec
}
$diffLines = Invoke-Git $diffArgs
if ($null -eq $diffLines) { Stop-CannotRun "git diff 执行失败" }

$testFile   = '(^|/)(tests?|__tests__|spec)/|\.(test|spec)\.[^/]+$|_test\.[^/]+$|(^|/)test_[^/]+$'
$rules = [ordered]@{
    'silenced-checker' = '@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|biome-ignore|#\s*noqa|#\s*type:\s*ignore|#\s*pyright:\s*ignore|//\s*nolint|istanbul ignore|c8 ignore|#\[allow\(|@SuppressWarnings|#pragma warning disable|NOSONAR|nosemgrep'
    'test-made-easier' = '\.(skip|only|todo)\s*\(|\bx(it|describe|test)\s*\(|@pytest\.mark\.(skip|xfail)|pytest\.skip\(|unittest\.skip|\bt\.Skip\(|@(Disabled|Ignore)\b|#\[ignore\]|Skip\s*=\s*"'
    'unfinished-work'  = '[Nn]ot [Ii]mplemented|NotImplementedError|unimplemented!\(|todo!\(|catch\s*(\([^)]*\))?\s*\{\s*\}|except[^:]*:\s*pass\s*$'
    'debug-leftover'   = '^\s*debugger\s*;?\s*$|console\.(log|debug)\(|\bbreakpoint\(\)|pdb\.set_trace\(|\bdbg!\(|var_dump\(|System\.out\.println\('
}
$assertion = '\b(expect|assert\w*|should)\b|\bt\.(Error|Fatal)f?\('

function Test-Excluded([string]$file) {
    foreach ($p in $Exclude) { if ($file -like $p) { return $true } }
    return $false
}

$findings = New-Object System.Collections.Generic.List[object]
function Add-Finding([string]$rule, [string]$file, $line, [string]$text) {
    $t = $text.Trim()
    if ($t.Length -gt 120) { $t = $t.Substring(0, 120) + "..." }
    $findings.Add([pscustomobject]@{ Rule = $rule; File = $file; Line = $line; Text = $t })
}

# 解析统一 diff，收集新增行（带新行号）、删除行和被删除的文件。
$added = New-Object System.Collections.Generic.List[object]
$removed = New-Object System.Collections.Generic.List[object]
$file = ""; $newLine = 0; $deleted = $false
foreach ($l in $diffLines) {
    if ($l -match '^diff --git a/.* b/(.*)$') { $file = $Matches[1]; $deleted = $false; continue }
    if ($l -match '^deleted file mode') { $deleted = $true; if ($file -match $testFile) { Add-Finding 'test-deleted' $file $null "(删除了测试文件)" }; continue }
    if ($l -match '^(\+\+\+|---) ') { continue }
    if ($l -match '^@@ -\d+(,\d+)? \+(\d+)') { $newLine = [int]$Matches[2]; continue }
    if ($l.StartsWith('+')) { $added.Add([pscustomobject]@{ File = $file; Line = $newLine; Text = $l.Substring(1) }); $newLine++; continue }
    if ($l.StartsWith('-') -and -not $deleted) { $removed.Add([pscustomobject]@{ File = $file; Text = $l.Substring(1) }) }
}

# 未跟踪文件整份视为新增（git diff 看不到它们）。
$untracked = Invoke-Git (@("ls-files", "--others", "--exclude-standard") + $pathspec)
foreach ($u in @($untracked)) {
    if (-not $u -or -not (Test-Path -LiteralPath $u -PathType Leaf)) { continue }
    $info = Get-Item -LiteralPath $u
    if ($info.Length -gt 1MB) { continue }
    $bytes = [IO.File]::ReadAllBytes($info.FullName)
    if ([Array]::IndexOf($bytes, [byte]0) -ge 0) { continue }   # 二进制
    $n = 1
    foreach ($t in [Text.Encoding]::UTF8.GetString($bytes) -split "\r?\n") {
        $added.Add([pscustomobject]@{ File = $u; Line = $n; Text = $t }); $n++
    }
}

foreach ($a in $added) {
    if (Test-Excluded $a.File) { continue }
    foreach ($r in $rules.Keys) {
        if ($a.Text -match $rules[$r]) { Add-Finding $r $a.File $a.Line $a.Text }
    }
}

# 测试文件中被删除的断言；同一文件里原样新增回来的行视为移动，不算删除。
foreach ($r in $removed) {
    if ($r.File -notmatch $testFile -or $r.Text -notmatch $assertion) { continue }
    $moved = $added | Where-Object { $_.File -eq $r.File -and $_.Text.Trim() -eq $r.Text.Trim() } | Select-Object -First 1
    if (-not $moved) { Add-Finding 'assertion-removed' $r.File $null $r.Text }
}

$scope = if ($Base) { "merge-base($Base, HEAD) 以来" } elseif ($hasHead) { "相对 HEAD " } else { "已暂存（仓库尚无提交）" }
if ($findings.Count -eq 0) {
    Write-Host "diff-audit: 未发现命中（范围：$($scope)的改动 + 未跟踪文件）。" -ForegroundColor Green
    exit 0
}
Write-Host "diff-audit: $($findings.Count) 处命中需要裁决（范围：$($scope)的改动 + 未跟踪文件）：" -ForegroundColor Yellow
foreach ($g in ($findings | Group-Object Rule)) {
    Write-Host "[$($g.Name)]"
    foreach ($f in $g.Group) {
        $loc = if ($f.Line) { "$($f.File):$($f.Line)" } else { $f.File }
        Write-Host "  $loc  $($f.Text)"
    }
}
exit 1
