# GENESIS — website &amp; releases

The marketing site, download page and docs for **GENESIS**, a Geode mod that adds a
`Generate` button to the Geometry Dash level editor.

- **Repo:** https://github.com/BeginnerCoder142011/Genesis
- **Live site:** https://beginnercoder142011.github.io/Genesis/ *(after Pages is enabled)*
- **Target:** Geometry Dash **2.2081** on **Geode v5.0.0+** (tested against v5.11.2)

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Landing page — hero, features, live canvas level preview, configurator, compatibility |
| `download.html` | Download page — platform picker, ABI toggle, changelog, version history |
| `docs.html` | Documentation — prompt guide, worked examples, object versions, troubleshooting, publishing |
| `styles.css` | All styling for the three pages (shared) |
| `releases.js` | **The only file you edit to update releases.** Repo config + every release entry |
| `preview.js` | Canvas engine for the live level preview |
| `scripts/publish-release.sh` | One-command GitHub release with the five platform assets |
| `.github/workflows/pages.yml` | Deploys the site to GitHub Pages on every push to `main` |

No build step, no dependencies, no framework. Plain HTML/CSS/JS.

---

## 0. Push the files

The repo currently exists but is empty. From this folder:

```bash
git init
git remote add origin https://github.com/BeginnerCoder142011/Genesis.git
git add .
git commit -m "GENESIS site: landing, download, docs"
git branch -M main
git push -u origin main
```

---

## 1. Turn on GitHub Pages

1. Push these files to the repo root on `main`.
2. Repo → **Settings → Pages** → **Source: GitHub Actions**.
3. Push again (or Actions → *Deploy GENESIS site* → **Run workflow**).

The site goes live at `https://beginnercoder142011.github.io/Genesis/`.
All internal links are relative, so they work from the project subpath.

---

## 2. Publish the first release

The download buttons build URLs in this shape:

```
https://github.com/BeginnerCoder142011/Genesis/releases/download/<tag>/<asset>
```

So the release **tag** and the **asset filenames** have to match exactly:

| Platform | Asset filename | Geode build target |
|---|---|---|
| Windows | `genesis-windows-x64.geode` | Win64 |
| macOS | `genesis-macos-universal.geode` | MacOS (arm64 + x86_64) |
| Android 64-bit | `genesis-android64.geode` | Android64 |
| Android 32-bit | `genesis-android32.geode` | Android32 |
| iOS (experimental) | `genesis-ios.geode` | iOS |

Build them, then either run:

```bash
bash scripts/publish-release.sh 1.0.0
```

or do it by hand:

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

**Then clear the `pending` flag** in `releases.js` for that release. While `pending: true`,
the download buttons route to the GitHub releases page instead of a 404.

---

## 3. Adding a release

Copy an entry in `GENESIS_RELEASES` (top of `releases.js`), bump `version`, `tag` and `date`,
write the `changes` list, and put it at the **top** of the array. Set `latest: true` on the
newest one and `pending: false` once its assets are uploaded.

Each release becomes: the hero version pill, the big download card, a changelog entry, and a
row in the version history table. Nothing else needs editing.

Per-`changes` bullet, `k` is the glyph:

- `+` added · `~` changed · `!` fixed

Setting `GENESIS_BETA` to a release object (instead of `null`) shows the **Stable / Beta**
toggle on the download page.

---

## 3b. Unlisted beta (GD 2.2091 / Geode 6)

`GENESIS_BETA` in `releases.js` holds an **unlisted** release: it is reachable from the
**Stable / Beta** toggle on the download page and from a direct link, but it never appears in the
public changelog or version history (`unlisted: true` filters it out).

**Beta link for testers** (no nav entry anywhere on the site):

- `https://beginnercoder142011.github.io/Genesis/beta.html` — the tester briefing: per-platform
  Geode 6 install steps, the what-to-test checklist (persisted locally), bug-report instructions and
  rollback steps
- `https://beginnercoder142011.github.io/Genesis/download.html?channel=beta` — jumps straight to the
  beta card

The **Stable / Beta toggle on `download.html` is link-only**: it renders only when the page is opened
with `?channel=beta`, and any other visit forces the stable channel. `robots.txt` disallows
`beta.html` as well.

Prerelease assets are version-prefixed so they can't collide with stable files:

```
genesis-1.1.0-beta.1-windows-x64.geode
genesis-1.1.0-beta.1-macos-universal.geode
genesis-1.1.0-beta.1-android64.geode
genesis-1.1.0-beta.1-android32.geode
```

There is no iOS beta (the 2.2091 loader isn't available yet), so publish with:

```bash
SKIP_IOS=1 bash scripts/publish-release.sh 1.1.0-beta.1
```

The script auto-detects the `-` in the version, expects the prefixed filenames and passes
`--prerelease` to `gh release create`. Afterwards set `pending: false` on `GENESIS_BETA`.

---

## 4. Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ — a server is needed because the pages load `releases.js`
via a `<script>` tag rather than inlining it.

---

## Accuracy notes

The technical claims on the site were checked against the official Geode releases and docs:

- Stable **Geode v5.11.2** is the current line for **GD 2.2081** (Geode v5.0.0 shipped February 2026).
- **GD 2.2091** only runs the **Geode 6.0.0-alpha** line — if you ship a build for it, publish it
  through the beta channel rather than claiming 2.2081 assets work there.
- `mod.json` fields used in `docs.html` follow the current Geode schema
  (`geode`, `gd: {win, mac, android, ios}`, `id`, `name`, `version`, `developer`, `tags`,
  `links`, `issues`, `dependencies`, `settings`).
- Mods paths per platform match the loader's real directories (`geode/mods` inside the game;
  `com.geode.launcher` on Android; the Geode sandbox on iOS).

Not affiliated with RobTop Games or the Geode SDK team. Geometry Dash is a trademark of
RobTop Games AB.
