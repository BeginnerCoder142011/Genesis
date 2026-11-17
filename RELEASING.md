# Building and publishing the five `.geode` assets

The site expects **one release per channel**, with these exact asset filenames. Renaming the
archive is safe — Geode reads the mod id from the `mod.json` inside the package, not from the
filename.

| Platform | Asset filename | `geode build` target |
|---|---|---|
| Windows | `genesis-windows-x64.geode` | `-p win` (Win64) |
| macOS | `genesis-macos-universal.geode` | `-p mac` (MacOS, arm64 + x86_64) |
| Android 64 | `genesis-android64.geode` | `-p android64` |
| Android 32 | `genesis-android32.geode` | `-p android32` |
| iOS | `genesis-ios.geode` | iOS target (macOS host only) |

Beta assets use the version prefix: `genesis-1.1.0-beta.1-windows-x64.geode`, and so on.

---

## 0. Prerequisites

```bash
# Geode CLI
#   Windows: download the installer from geode-sdk.org, it ships the CLI
#   macOS/Linux:
brew install geode-sdk/tap/geode     # or grab the release binary
geode --version

# SDK binaries for each platform you are building
geode sdk install-binaries -p win
geode sdk install-binaries -p mac
geode sdk install-binaries -p android64
geode sdk install-binaries -p android32
```

- **Android** additionally needs the Android NDK (`ANDROID_NDK_ROOT` set) and CMake/Ninja.
- **macOS + iOS** must be built on macOS with Xcode command line tools.
- **iOS** is experimental across the ecosystem; if `geode sdk install-binaries -p ios` isn't
  offered by your CLI version, build it through CMake with `-DGEODE_TARGET_PLATFORM=iOS`.
  Run `geode build --help` to see the platform ids your CLI actually accepts.

## 1. Check `mod.json` before building

The loader refuses builds whose `gd` target doesn't match the game. Stable line:

```json
{
  "geode": "v5.0.0",
  "gd": { "win": "2.2081", "mac": "2.2081", "android": "2.2081", "ios": "2.2081" },
  "id": "beginnercoder142011.genesis",
  "version": "v1.0.0"
}
```

For the beta, change `geode` to `v6.0.0-alpha.x`, every `gd` value to `2.2091`, and
`version` to `v1.1.0-beta.1`. Bump `version` **before** building — it's baked into the package.

## 2. Build

```bash
# from the mod source root (where mod.json lives)
geode build -p win          # -> build-win/beginnercoder142011.genesis.geode
geode build -p mac          # -> build-mac/...
geode build -p android64    # -> build-android64/...
geode build -p android32    # -> build-android32/...
geode build -p ios          # -> build-ios/...   (macOS host only)
```

Use `geode build --ninja` if your setup requires Ninja. Add `-c RelWithDebInfo` for a release
config if your project defaults to Debug.

Collect and rename:

```bash
cp build-win/beginnercoder142011.genesis.geode        genesis-windows-x64.geode
cp build-mac/beginnercoder142011.genesis.geode        genesis-macos-universal.geode
cp build-android64/beginnercoder142011.genesis.geode  genesis-android64.geode
cp build-android32/beginnercoder142011.genesis.geode  genesis-android32.geode
cp build-ios/beginnercoder142011.genesis.geode        genesis-ios.geode
```

## 3. Smoke-test before publishing

Install one build by hand (Geode → Install from file), open the editor, and confirm the
Generate button appears and one generation completes. Publishing a broken zip means every
download button on the site serves a broken zip.

## 4. Publish stable v1.0.0

```bash
gh release create v1.0.0 \
  genesis-windows-x64.geode \
  genesis-macos-universal.geode \
  genesis-android64.geode \
  genesis-android32.geode \
  genesis-ios.geode \
  --title "GENESIS v1.0.0" \
  --notes-file CHANGELOG.md
```

Or run the helper, which checks all five files exist first:

```bash
bash scripts/publish-release.sh 1.0.0
```

## 5. Publish the beta as a prerelease

```bash
SKIP_IOS=1 bash scripts/publish-release.sh 1.1.0-beta.1
```

The script detects the `-` in the version, expects the `genesis-1.1.0-beta.1-*` filenames and
passes `--prerelease`. There is no iOS build for 2.2091, hence `SKIP_IOS=1`.

## 6. The site picks it up on its own

`releases.js` already has `pending: false` on both entries. `download.html` queries the GitHub
releases API on load (cached per session) and only downloads directly when the tag exists — if it
doesn't, the button routes to the releases page instead of a 404.

So the moment the release is published:

- `download.html` → real download buttons for the platform you pick
- `download.html?channel=beta` → the beta card
- no code change, no redeploy needed (`releases.js` is served as-is)

Changing sizes/dates afterwards is a one-line edit in `releases.js`.

---

## Fastest path: let CI build all five

No local toolchain needed. `ci/build.yml` in this repo builds every platform on GitHub runners and
publishes the release for you.

1. Upload `ci/build.yml` as `.github/workflows/build.yml`
   (drag-and-drop in the GitHub web UI, or `git mv` locally — the API token used to automate this repo
   doesn't have the Workflows permission, so it can't be done from here).
2. Push it to `main`.
3. Tag and push:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. Actions → **Build and publish GENESIS** builds `Win64 / MacOS / Android64 / Android32 / iOS`, renames
   each artefact to the site's asset names, and creates the `v1.0.0` release with all of them attached.

Tags containing a `-` (e.g. `v1.1.0-beta.1`) publish as **prereleases**, which is exactly the beta
channel the download page expects.

The iOS leg is marked `experimental` — if the runner lacks the iOS SDK the other four still publish.

Once the release exists, `download.html` flips its buttons to live on its own (it checks the releases
API and only serves direct links for tags that exist).

---

## 7. Local builds (if you'd rather not use CI)

Add `geode-sdk/build-geode-mod@main` to the **mod source** repo with a matrix of
`Win64 / MacOS / Android32 / Android64` (+ iOS on a macOS runner), upload the artefacts, then
attach them to a release in this repo with the names above.
