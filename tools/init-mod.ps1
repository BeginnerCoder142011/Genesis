# GENESIS init-mod — create a real Geode project and drop the scaffold into it
# Windows PowerShell 5.1 compatible.
#
#   powershell -ExecutionPolicy Bypass -File tools\init-mod.ps1
#   powershell -ExecutionPolicy Bypass -File tools\init-mod.ps1 -Path D:\code\genesis-mod
#
# `geode new` is interactive, so this script tells you the exact answers to type,
# then copies mod\mod.json and mod\src\main.cpp over the generated ones.

[CmdletBinding()]
param(
    [string]$Path = (Join-Path $HOME "genesis-mod")
)

$ErrorActionPreference = "Stop"

function Step($n, $t) { Write-Host ""; Write-Host ("{0}. {1}" -f $n, $t) -ForegroundColor Cyan }

function Find-Scaffold {
    # mod\ next to this script's repo root
    $candidates = @(
        (Join-Path $PSScriptRoot "..\mod"),
        (Join-Path $PSScriptRoot "mod")
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath (Join-Path $c "mod.json")) { return (Resolve-Path $c).Path }
    }
    return $null
}

function Copy-Scaffold([string]$Dest) {
    $src = Find-Scaffold
    if (-not $src) {
        Write-Host "  scaffold not found (expected a mod\ folder with mod.json next to tools\)." -ForegroundColor Red
        return $false
    }

    Copy-Item -LiteralPath (Join-Path $src "mod.json") -Destination (Join-Path $Dest "mod.json") -Force
    Write-Host "  ok  mod.json" -ForegroundColor Green

    $destSrc = Join-Path $Dest "src"
    if (-not (Test-Path -LiteralPath $destSrc)) { New-Item -ItemType Directory -Path $destSrc | Out-Null }

    # keep the generated main.cpp as a reference the first time
    $existing = Join-Path $destSrc "main.cpp"
    if (Test-Path -LiteralPath $existing) {
        Copy-Item -LiteralPath $existing -Destination (Join-Path $destSrc "main.generated.cpp.bak") -Force
        Write-Host "  note: previous src\main.cpp saved as main.generated.cpp.bak" -ForegroundColor DarkGray
    }

    Copy-Item -LiteralPath (Join-Path $src "src\main.cpp") -Destination $existing -Force
    Write-Host "  ok  src\main.cpp" -ForegroundColor Green
    return $true
}

Write-Host ""
Write-Host "GENESIS mod project setup" -ForegroundColor White
Write-Host ("target: {0}" -f $Path)

# ---------------------------------------------------------------- 0. CLI
Step 0 "checking the Geode CLI"
if (-not (Get-Command geode -ErrorAction SilentlyContinue)) {
    Write-Host "  geode is not on PATH." -ForegroundColor Red
    Write-Host "  Install Geode (its installer ships the CLI), reopen the shell, run this again."
    exit 1
}
$ver = (& geode --version 2>&1 | Out-String).Trim()
Write-Host ("  ok  {0}" -f $ver) -ForegroundColor Green

# ---------------------------------------------------------------- 1. folder
Step 1 "preparing the folder"
$alreadyProject = $false
if (Test-Path -LiteralPath $Path) {
    if (Test-Path -LiteralPath (Join-Path $Path "mod.json")) { $alreadyProject = $true }
} else {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
    Write-Host "  created" -ForegroundColor Green
}

if ($alreadyProject) {
    Write-Host "  a project is already there (mod.json found)." -ForegroundColor Yellow
    $answer = Read-Host "  overwrite mod.json + src\main.cpp with the scaffold? (y/N)"
    if ($answer -ne "y") { Write-Host "  stopped, nothing changed."; exit 0 }
    if (Copy-Scaffold -Dest $Path) {
        Write-Host ""
        Write-Host ("Scaffold copied into {0}" -f $Path) -ForegroundColor Green
        Write-Host "Next: powershell -ExecutionPolicy Bypass -File tools\build-windows.ps1 -ProjectPath ."
    }
    exit 0
}

# ---------------------------------------------------------------- 2. geode new
Step 2 "running 'geode new' — answer with these values"
Write-Host "    name       : GENESIS"
Write-Host "    id         : beginnercoder142011.genesis"
Write-Host "    developer  : BeginnerCoder142011"
Write-Host "    path       : .        (a dot, to create it in the current folder)"
Write-Host ""
Push-Location $Path
try { & geode new } finally { Pop-Location }

# ---------------------------------------------------------------- 3. scaffold
Step 3 "copying the scaffold over the generated files"
$dest = $null
if (Test-Path -LiteralPath (Join-Path $Path "mod.json")) {
    $dest = $Path
} else {
    $child = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue |
             Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "mod.json") } |
             Select-Object -First 1
    if ($child) { $dest = $child.FullName }
}

if (-not $dest) {
    Write-Host "  no mod.json found after 'geode new'." -ForegroundColor Red
    Write-Host "  Run 'geode new' manually inside $Path, then re-run this script." -ForegroundColor Red
    exit 1
}

if (-not (Copy-Scaffold -Dest $dest)) { exit 1 }

Write-Host ""
Write-Host ("Project ready: {0}" -f $dest) -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host ("  cd `"{0}`"" -f $dest)
Write-Host "  powershell -ExecutionPolicy Bypass -File tools\build-windows.ps1 -ProjectPath ."
Write-Host ""
Write-Host "Then install and run the ten smoke checks in MOD-SETUP.md."
