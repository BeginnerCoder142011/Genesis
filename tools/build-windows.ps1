# GENESIS build-windows — one Windows build for the v1.0.0 smoke test
# Windows PowerShell 5.1 compatible.
#
#   powershell -ExecutionPolicy Bypass -File tools\build-windows.ps1
#   powershell -ExecutionPolicy Bypass -File tools\build-windows.ps1 -ProjectPath C:\code\genesis-mod
#
# Produces:  dist\genesis-windows-x64.geode

[CmdletBinding()]
param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$GamePath = "",
    [string]$AssetName = "genesis-windows-x64.geode",
    [string[]]$ExtraArgs = @()
)

$ErrorActionPreference = "Stop"

function Line($t) { Write-Host ""; Write-Host $t -ForegroundColor Cyan }

# ---------------------------------------------------------------- preflight
Line "1/3  preflight"
$preArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "preflight.ps1"), "-ProjectPath", $ProjectPath)
if ($GamePath) { $preArgs += @("-GamePath", $GamePath) }
& powershell @preArgs
$preExit = $LASTEXITCODE
if ($preExit -eq 1) {
    Write-Host ""
    Write-Host "Preflight is blocking. Nothing was built." -ForegroundColor Red
    exit 1
}
if ($preExit -eq 2) {
    Write-Host ""
    Write-Host "Continuing past warnings." -ForegroundColor Yellow
}

# ---------------------------------------------------------------- build
Line "2/3  geode build"
Push-Location $ProjectPath
try {
    $before = Get-Date
    # On Windows the default target is Win64, so plain `geode build` is the Windows build.
    $cmd = @("build") + $ExtraArgs
    Write-Host ("  > geode " + ($cmd -join " ")) -ForegroundColor DarkGray
    & geode @cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Build failed (exit $LASTEXITCODE). Common causes:" -ForegroundColor Red
        Write-Host "  - SDK binaries missing:  geode sdk install-binaries -p win"
        Write-Host "  - stale build tree:      remove build\ and retry"
        Write-Host "  - toolchain mismatch:    reopen from a Developer PowerShell"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------- collect
Line "3/3  collect"
$built = Get-ChildItem -Path $ProjectPath -Filter *.geode -Recurse -ErrorAction SilentlyContinue |
         Where-Object { $_.FullName -notmatch '\\dist\\' } |
         Sort-Object LastWriteTime -Descending |
         Select-Object -First 1

if (-not $built) {
    Write-Host "  No .geode produced — check the build output above." -ForegroundColor Red
    exit 1
}

$dist = Join-Path $ProjectPath "dist"
if (-not (Test-Path -LiteralPath $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }
$target = Join-Path $dist $AssetName
Copy-Item -LiteralPath $built.FullName -Destination $target -Force

$kb = [math]::Round((Get-Item -LiteralPath $target).Length / 1KB, 1)
Write-Host ("  built : {0}" -f $built.FullName)
Write-Host ("  asset : {0}  ({1} KB)" -f $target, $kb) -ForegroundColor Green

# ---------------------------------------------------------------- smoke test
Line "Smoke test — do all ten before building the other platforms"
@(
 "1.  Launch GD. Geode -> Installed lists GENESIS v1.0.0 with no version warning",
 "2.  No crash on the main menu with the mod enabled",
 "3.  Create Level -> editor: the Generate button is in the toolbar",
 "4.  Click it: panel opens with source, version, gadgets, mode, difficulty, seed",
 "5.  Set version 2.2, mode Layout, difficulty Normal",
 "6.  Type ANY idea into PROMPT, e.g. 'a chill cube intro with pads only, 20 seconds, no orbs'",
 "7.  Generate: objects appear from the cursor forward",
 "8.  Playtest: the section is completable",
 "9.  Ctrl+Z once: the whole pass disappears as one undo entry",
 "10. Save, exit to menu, reopen: objects persist",
 "",
 "Then: Geode -> Settings -> GENESIS settings render (a broken schema only fails here).",
 "Log check (expect no output):",
 "  Select-String -Path '$GamePath\geode\logs\Geode.log' -Pattern 'genesis','error' -SimpleMatch"
) | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "When all ten pass:" -ForegroundColor Cyan
Write-Host "  mac      : geode build -p mac       -> rename to genesis-macos-universal.geode"
Write-Host "  android64: geode build -p android64 -> rename to genesis-android64.geode"
Write-Host "  android32: geode build -p android32 -> rename to genesis-android32.geode"
Write-Host "  ios      : macOS host only          -> rename to genesis-ios.geode"
Write-Host "  publish  : bash scripts/publish-release.sh 1.0.0"
