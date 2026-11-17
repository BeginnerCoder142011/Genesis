# GENESIS — mod project scaffold

A **real, buildable starting point** for the mod, not a finished generator. It exists so
`geode build` produces a `.geode` you can install and smoke-test today.

## What it does right now

- Adds a **Generate** button to the level editor (bottom-right).
- Opens a panel with a **free-form prompt box** and the option row: version (1.0 → 2.2, all
  thirteen, in order), difficulty (Easy → Extreme, including Harder), and Orbs / Pads / Portals toggles.
- On Generate it places a short deterministic block/spike pattern ahead of the level start, adds orbs
  and pads when those toggles are on, logs the prompt + settings, and shows a notification with the
  object count.

## What is deliberately stubbed

| Area | State |
|---|---|
| Placement | Fixed start at `x = 300` — not yet camera-relative |
| Prompt | Logged and echoed, **not parsed** — no NLP yet |
| Version filter | Cycles in the UI, does not yet restrict the object pool |
| Difficulty | Changes spacing only |
| Portals | Toggle exists, nothing placed |
| Song sync / BPM | Not implemented |
| Decoration pass | Not implemented |

These are marked `TODO` in `src/main.cpp`. The scaffold is the shell the real generator drops into.

## Quick start

```powershell
# 1. create a proper Geode project (generates CMakeLists.txt, resources, about.md)
powershell -ExecutionPolicy Bypass -File tools\init-mod.ps1

# 2. build
cd $HOME\genesis-mod
powershell -ExecutionPolicy Bypass -File ..\..\tools\build-windows.ps1 -ProjectPath .

# 3. install + smoke test (the build script prints the ten checks)
```

Manual equivalent if you prefer:

```bat
geode new
:: name: GENESIS   id: beginnercoder142011.genesis   developer: BeginnerCoder142011
:: then copy mod\mod.json  -> <project>\mod.json
::      copy mod\src\main.cpp -> <project>\src\main.cpp
```

## Files

| File | Notes |
|---|---|
| `mod.json` | v1.0.0 metadata, matches `tools/mod.json.reference`; adds a `ground-y` calibration setting |
| `src/main.cpp` | Editor hook, panel UI, stub generator |

## First-run calibration

If the pattern lands above/below the floor, or floats mid-screen, adjust **Geode → Settings → GENESIS →
Ground Y**. It defaults to `105`, which is the usual ground line in editor coordinates. Everything is
placed relative to that value, so one number fixes the whole pattern.

`x = 300` is a placeholder until camera-relative placement lands — the pattern will always appear at the
start of the level for now.

## Smoke test

The ten checks in `MOD-SETUP.md` all apply. The one that matters most here: does the **Generate** button
appear, does the panel open, and do objects appear when you press Generate. If the button never appears,
check `Geode.log` for `GENESIS:` lines — the hook logs on every editor entry.

## If it doesn't compile

This scaffold is written against the Geode v5 API (`EditorUI::init(LevelEditorLayer*)`,
`LevelEditorLayer::createObject(int, CCPoint, bool)`, `geode::TextInput`). It has **not** been compiled —
no toolchain was available where it was written. Paste the first error and it gets fixed; expect mostly
small signature differences (`TextInput` header path, `ButtonSprite` overload, `CCScale9Sprite` include).

Common quick fixes:

| Error | Fix |
|---|---|
| `Geode/ui/TextInput.hpp` not found | swap to `#include <Geode/ui/TextInput.hpp>` → `#include <Geode/Geode.hpp>` and rely on prelude |
| `CCScale9Sprite` unknown | `#include <cocos2d/extensions/CCScale9Sprite.hpp>` |
| `menu_selector` mismatch | the handler must be `void Name(CCObject*)` on the same class |
| `createObject` not found | include `Geode/binding/LevelEditorLayer.hpp` |
| `fmt::format` unknown | `#include <Geode/utils/string.hpp>` or use string concatenation |
