# GENESIS preflight — validate mod.json and the local Geode toolchain
# Windows PowerShell 5.1 compatible.
#
#   powershell -ExecutionPolicy Bypass -File tools\preflight.ps1
#   powershell -ExecutionPolicy Bypass -File tools\preflight.ps1 -ProjectPath C:\code\genesis-mod
#
# Exit codes: 0 = ready to build, 1 = blocking problem, 2 = warnings only

[CmdletBinding()]
param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$GamePath = "",
    [switch]$JsonOnly
)

$ErrorActionPreference = "Stop"
$script:fail = 0
$script:warn = 0

function Ok   ($m) { Write-Host "  [ ok ]  $m" -ForegroundColor Green }
function Note ($m) { Write-Host "  [info]  $m" -ForegroundColor DarkGray }
function Warn ($m) { Write-Host "  [warn]  $m" -ForegroundColor Yellow; $script:warn++ }
function Bad  ($m) { Write-Host "  [FAIL]  $m" -ForegroundColor Red;    $script:fail++ }

function Parse-Version([string]$v) {
    if (-not $v) { return $null }
    $clean = ($v -replace '^v', '') -replace '[-+].*$', ''
    $parts = $clean.Split('.')
    if ($parts.Length -lt 3) { return $null }
    $nums = @()
    foreach ($p in $parts[0..2]) {
        $n = 0
        if (-not [int]::TryParse($p, [ref]$n)) { return $null }
        $nums += $n
    }
    return $nums
}

function Compare-Ver($a, $b) {
    for ($i = 0; $i -lt 3; $i++) {
        if ($a[$i] -gt $b[$i]) { return 1 }
        if ($a[$i] -lt $b[$i]) { return -1 }
    }
    return 0
}

Write-Host ""
Write-Host "GENESIS preflight" -ForegroundColor Cyan
Write-Host ("project : {0}" -f $ProjectPath)
Write-Host ""

# ---------------------------------------------------------------- mod.json
Write-Host "mod.json" -ForegroundColor White
$modPath = Join-Path $ProjectPath "mod.json"
if (-not (Test-Path -LiteralPath $modPath)) {
    Bad "no mod.json in $ProjectPath — run this from the mod project, not the site repo"
    Write-Host ""
    Write-Host "Blocking issues: $($script:fail)" -ForegroundColor Red
    exit 1
}

$raw = Get-Content -LiteralPath $modPath -Raw
try {
    $mod = $raw | ConvertFrom-Json
    Ok "parses as JSON"
} catch {
    Bad "mod.json is not valid JSON: $($_.Exception.Message)"
    exit 1
}

$required = @('geode', 'gd', 'id', 'name', 'version')
foreach ($k in $required) {
    $has = $mod.PSObject.Properties.Name -contains $k
    if (-not $has) { Bad "missing required key: $k" }
}
if (-not (($mod.PSObject.Properties.Name -contains 'developer') -or ($mod.PSObject.Properties.Name -contains 'developers'))) {
    Bad "missing required key: developer (or developers)"
}

if ($mod.id) {
    if ($mod.id -cmatch '^[a-z0-9._-]+$') { Ok "id '$($mod.id)' is valid" }
    else { Bad "id '$($mod.id)' must be lowercase a-z 0-9 . _ - only" }
    if ($mod.id -notmatch '\.') { Warn "id has no dot — convention is developer.mod-name" }
    if ($mod.id -ne 'beginnercoder142011.genesis') { Note "site expects id beginnercoder142011.genesis" }
}

if ($mod.version) {
    if ($mod.version -match '^v?\d+\.\d+\.\d+') { Ok "version $($mod.version)" }
    else { Bad "version '$($mod.version)' is not semver (want v1.0.0)" }
    if ($mod.version -notmatch '^v') { Warn "version has no 'v' prefix — site and releases use v1.0.0" }
    if ($mod.version -match '^\D*1\.0\.0') { Ok "matches the v1.0.0 stable release" }
    else { Warn "not v1.0.0 — this build won't match the stable release entry" }
}

$gdOk = $true
if ($mod.gd) {
    $plats = $mod.gd.PSObject.Properties.Name
    foreach ($p in @('win','mac','android','ios')) {
        if ($plats -notcontains $p) { Warn "gd has no '$p' entry" }
    }
    $winVal = $mod.gd.win
    if ($winVal) {
        if ($winVal -eq '2.2081') { Ok "gd.win = 2.2081 (current stable Geode target)" }
        elseif ($winVal -eq '*') { Warn "gd.win is '*' — any game version, including ones you never tested" }
        else { Warn "gd.win = $winVal — site and stable releases assume 2.2081" }
    }
} else {
    Bad "gd key missing — the loader cannot pick a target"
    $gdOk = $false
}

$modVer = Parse-Version $mod.geode
if ($mod.geode) {
    if ($modVer) { Ok "targets Geode $($mod.geode)" }
    else { Bad "geode '$($mod.geode)' is not a version like v5.0.0" }
}

if ($mod.description) {
    $len = $mod.description.Length
    if ($len -gt 140) { Warn "description is $len chars — index shows a single line" }
}
if ($mod.tags) {
    $tc = @($mod.tags).Count
    if ($tc -lt 1 -or $tc -gt 4) { Warn "$tc tags — 1 to 4 is recommended" }
    if (@($mod.tags) -notcontains 'editor') { Warn "no 'editor' tag, though the mod lives in the editor" }
}

# project shape
if (Test-Path -LiteralPath (Join-Path $ProjectPath "CMakeLists.txt")) { Ok "CMakeLists.txt found" }
else { Bad "no CMakeLists.txt — this is not a Geode mod project (run geode new)" }

if (-not $JsonOnly) {

    # ------------------------------------------------------------ CLI
    Write-Host ""
    Write-Host "Geode CLI" -ForegroundColor White
    $geode = Get-Command geode -ErrorAction SilentlyContinue
    if (-not $geode) {
        Bad "geode not on PATH — install Geode (the installer ships the CLI), then reopen the shell"
    } else {
        $cliRaw = (& geode --version 2>&1 | Out-String).Trim()
        $cliVer = [regex]::Match($cliRaw, '\d+\.\d+\.\d+').Value
        if ($cliVer) {
            Ok "geode $cliVer"
            if ($modVer) {
                $cv = Parse-Version $cliVer
                if ($cv) {
                    $cmp = Compare-Ver $cv $modVer
                    if ($cmp -lt 0) { Bad "installed CLI $cliVer is older than mod.json target $($mod.geode)" }
                    elseif ($cmp -gt 0) { Note "CLI newer than target — fine, it builds for the older ABI" }
                    else { Ok "CLI matches the target exactly" }
                }
            }
        } else {
            Warn "could not read 'geode --version' output: $cliRaw"
        }
    }

    # ------------------------------------------------------------ game
    Write-Host ""
    Write-Host "Geometry Dash install" -ForegroundColor White
    if (-not $GamePath) {
        $GamePath = "C:\Program Files (x86)\Steam\steamapps\common\Geometry Dash"
    }
    if (Test-Path -LiteralPath $GamePath) {
        Ok "found $GamePath"
        $geodeDir = Join-Path $GamePath "geode"
        $modsDir = Join-Path $geodeDir "mods"
        if (Test-Path -LiteralPath $geodeDir) { Ok "geode\ exists (loader installed)" }
        else { Bad "no geode\ folder — install Geode into this game copy first" }
        if (Test-Path -LiteralPath $modsDir) { Ok "geode\mods\ exists" }
        else { Warn "geode\mods\ missing — it is created on first launch of a Geode install" }
        if (Test-Path -LiteralPath (Join-Path $GamePath "Geode.dll")) { Ok "Geode.dll present" }
        elseif (Test-Path -LiteralPath (Join-Path $GamePath "xinput1_4.dll")) { Note "Geode loads through xinput1_4.dll" }
        else { Warn "no Geode.dll or xinput1_4.dll — is this the game folder?" }
    } else {
        Warn "game folder not found at $GamePath (pass -GamePath 'D:\...' if it lives elsewhere)"
    }

    # ------------------------------------------------------------ profile
    Write-Host ""
    Write-Host "Build profile (optional)" -ForegroundColor White
    if (Get-Command geode -ErrorAction SilentlyContinue) {
        $prof = (& geode profile list 2>&1 | Out-String)
        if ($prof -match '(?i)active|current|\*') { Ok "a profile is configured — builds install themselves" }
        else { Warn "no active profile — run 'geode profile add' or install the .geode by hand" }
    }
}

Write-Host ""
if ($script:fail -gt 0) {
    Write-Host ("BLOCKED — {0} problem(s), {1} warning(s). Fix the red lines above." -f $script:fail, $script:warn) -ForegroundColor Red
    exit 1
}
if ($script:warn -gt 0) {
    Write-Host ("Ready with {0} warning(s). Next: powershell -File tools\build-windows.ps1" -f $script:warn) -ForegroundColor Yellow
    exit 2
}
Write-Host "Ready. Next: powershell -File tools\build-windows.ps1" -ForegroundColor Green
exit 0
