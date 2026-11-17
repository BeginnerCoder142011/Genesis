# Make the site live — 5 files, 2 minutes

Your repo already deploys Pages successfully (the workflow `.github/workflows/static.yml`
ran green), but the deploy is **empty of HTML**: the repo root has CSS/JS and no `index.html`,
so Pages serves its 404 page.

## The minimal fix

Put these **5 files at the repository root** (same level as `styles.css`):

```
index.html
download.html
docs.html
beta.html
preview.js
```

GitHub web UI: **Add file → Upload files**, drag those five, **Commit changes** to `main`.
The existing Pages workflow redeploys automatically and the site appears in ~1 minute.

## Then tidy up

Delete these from the root — they're leftovers from earlier uploads:

```
pages.yml            (belongs in .github/workflows/pages.yml)
publish-release.sh   (belongs in scripts/publish-release.sh)
styles (1).css
styles (2).css
README (1).md
```

Keep `pulse.gmd` — that's your level file, unrelated to the site (it will be downloadable
from the site root, which is probably not what you want; move it to a `levels/` folder if so).

## Verify

| URL | Expected |
|---|---|
| `https://beginnercoder142011.github.io/Genesis/` | landing page |
| `https://beginnercoder142011.github.io/Genesis/download.html` | platform picker + stable v1.0.0 |
| `https://beginnercoder142011.github.io/Genesis/docs.html` | prompt guide |
| `https://beginnercoder142011.github.io/Genesis/beta.html` | tester briefing |

`download.html` **without** `?channel=beta` must show no Beta toggle — that's the link-only rule.

## If the root already has files from this zip

This archive is complete: every file at its correct path. Uploading it over the existing repo
(replacing files) is safe. Delete the duplicate `(1)` / `(2)` copies afterwards.

## Releases

`releases.js` still marks both releases `pending: true`, so download buttons open the releases
page instead of a missing asset. After you build and attach the five `.geode` files, set
`pending: false` — see `README.md` §2–3.
