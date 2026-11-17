# Build kit — GENESIS v1.0.0 assets

This repo holds the **site** plus these helper scripts. The mod itself builds on your machine:
`.geode` files are native binaries (MSVC on Windows, Xcode on macOS, NDK on Android) and cannot be
produced from a browser or a hosted shell without your game install and toolchain.

| File | What it does |
|---|---|
| `tools/mod.json.reference` | Canonical v1.0.0 metadata to compare yours against |
| `tools/preflight.ps1` | Validates `mod.json`, the Geode CLI, the game folder and the profile |
| `tools/build-windows.ps1` | Runs preflight → `geode build` → copies the result to `dist\genesis-windows-x64.geode` → prints the smoke test |
| `scripts/publish-release.sh` | Creates the GitHub release with the five assets |
| `RELEASING.md` | The full five-platform + publishing walkthrough |

Everything below is run **in your mod project**, not in this repo. Copy `tools\` into it, or call
the scripts with `-ProjectPath`.

---

## Step 0 — find (or create) the mod project

A Geode mod project is the folder with **`mod.json` and `CMakeLists.txt`**. That's it, that's the test.

```bat
cd C:\path\to\your\mod
dir /b mod.json CMakeLists.txt
```

If those two files are missing, you don't have a project yet — scaffold one:

```bat
geode new
:: prompts for: mod name, id, developer, path
:: then: cd into the created folder
```

Then replace its generated `mod.json` with `tools\mod.json.reference`, changing nothing but
`developer` if you like. The values that matter:

```json
"geode": "v5.0.0",
"gd": { "win": "2.2081", "mac": "2.2081", "android": "2.2081", "ios": "2.2081" },
"id": "beginnercoder142011.genesis",
"version": "v1.0.0"
```

`geode` is the SDK version you build against — if your CLI is 5.11.2, `v5.0.0` still loads, but don't
put a number above your installed SDK.

---

## Step 1 — preflight (the mod.json check)

```bat
powershell -ExecutionPolicy Bypass -File tools\preflight.ps1
```

What it verifies, in order:

| Check | Fails when |
|---|---|
| `mod.json` parses | trailing comma, comment, smart quote |
| required keys | `geode`, `gd`, `id`, `name`, `version`, `developer` |
| `id` format | uppercase, spaces, no dot separator |
| `version` semver | `1.0`, `v1.0`, `1.0.0` (no v) — warns |
| `gd` map | missing platform entries, or a value that isn't `2.2081` |
| project shape | no `CMakeLists.txt` |
| CLI | `geode` not on PATH, or CLI older than the target |
| game folder | no `geode\`, no `mods\`, no loader DLL |
| profile | no active profile (builds won't auto-install) |

Expected tail on a healthy setup:

```
  [ ok ]  version v1.0.0
  [ ok ]  matches the v1.0.0 stable release
  [ ok ]  gd.win = 2.2081 (current stable Geode target)
  [ ok ]  targets Geode v5.0.0
  [ ok ]  CMakeLists.txt found
  [ ok ]  geode 5.11.2
  [ ok ]  CLI newer than target — fine, it builds for the older ABI
  [ ok ]  found C:\Program Files (x86)\Steam\steamapps\common\Geometry Dash
Ready. Next: powershell -File tools\build-windows.ps1
```

`[ok]` green · `[info]` grey (FYI) · `[warn]` yellow (build anyway) · `[FAIL]` red (blocking).

Exit codes: `0` clean, `1` blocked, `2` warnings only — so you can chain it in CI later.

---

## Step 2 — the single Windows build

```bat
powershell -ExecutionPolicy Bypass -File tools\build-windows.ps1
```

It runs preflight again, then `geode build` (Win64 is the default target on Windows), finds the
freshest `.geode` in the project, and copies it to:

```
dist\genesis-windows-x64.geode
```

That filename is what the release needs — the site builds the URL from it directly.

Add flags straight through if your setup needs them:

```bat
powershell -File tools\build-windows.ps1 -ExtraArgs --ninja
powershell -File tools\build-windows.ps1 -GamePath "D:\SteamLibrary\steamapps\common\Geometry Dash"
```

If the build fails, the script prints the three usual causes: missing SDK binaries
(`geode sdk install-binaries -p win`), a stale `build\` tree, or a toolchain that isn't in a
Developer PowerShell.

---

## Step 3 — smoke test in the editor

If a profile is active the build installed itself. Otherwise:
**Geode → Mods → Install from file → `dist\genesis-windows-x64.geode`**.

Ten checks, all of them:

1. **Installed** lists GENESIS `v1.0.0`, no version warning
2. No crash on the main menu with it enabled
3. Create Level → the **Generate** button is in the toolbar
4. Click it: panel opens with source, version, gadgets, mode, difficulty, seed
5. Set version `2.2`, mode `Layout`, difficulty `Normal`
6. **Type any idea into PROMPT** — e.g. `a chill cube intro with pads only, 20 seconds, no orbs`
7. **Generate** → objects appear from the cursor forward
8. **Playtest** → the section is completable
9. **Ctrl+Z once** → the whole pass disappears as one undo entry
10. Save → exit to menu → reopen: objects persist, and the level still opens in vanilla GD

Then open **Geode → Settings → GENESIS** and confirm the settings render — a broken settings schema
compiles fine and only fails here.

Log check:

```bat
findstr /i "genesis error" "%ProgramFiles(x86)%\Steam\steamapps\common\Geometry Dash\geode\logs\Geode.log"
```

No output is the pass. If something is there, keep the whole log for the release notes / issue.

---

## Step 4 — the other four assets

Only after all ten checks pass, and only on the right host:

| Asset | Host | Command |
|---|---|---|
| `genesis-windows-x64.geode` | Windows | `geode build` (done) |
| `genesis-macos-universal.geode` | macOS | `geode build -p mac` |
| `genesis-android64.geode` | any + NDK | `geode build -p android64` |
| `genesis-android32.geode` | any + NDK | `geode build -p android32` |
| `genesis-ios.geode` | macOS + Xcode CLT | iOS target |

Android needs `ANDROID_NDK_ROOT` set and `geode sdk install-binaries -p android64` /
`-p android32` first. iOS is the one that most often compiles but won't load — verify on a device
before publishing.

Then publish: `bash scripts/publish-release.sh 1.0.0` (or the `gh release create` in `RELEASING.md`),
and the site's download buttons go live on their own — `download.html` checks the GitHub releases API
and only serves a direct link when the tag actually exists.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `geode : not recognized` | Reopen the shell after installing; or use the full path to `geode.exe` |
| `Could not find Geode SDK` | `geode sdk install` then `geode sdk install-binaries -p win` |
| `requires Geode v5.x` at launch | `geode` field is newer than your loader — lower it or update Geode |
| mod greyed out / unsupported | `gd.win` doesn't match your game build (2.2081 stable) |
| builds but no button in editor | mod disabled in Geode → Installed, or a load error in `Geode.log` |
| settings page blank | a `settings` entry has an invalid `type` |
| preflight says CLI older than target | lower `geode` in mod.json to your CLI version |
