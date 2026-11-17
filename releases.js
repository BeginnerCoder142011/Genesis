/* ============================================================
   GENESIS — release data
   Repo: https://github.com/BeginnerCoder142011/Genesis
   ------------------------------------------------------------
   THIS IS THE ONLY FILE YOU EDIT TO UPDATE THE SITE.

   Verified on 2026-11-17:
     - repo exists, public, default branch "main"
     - 0 tags, 0 releases  →  the version history starts at v1.0.0

   The entry below describes the FIRST release (v1.0.0). The asset
   filenames are exact, so the download URLs are already correct —
   they start resolving the moment you publish the release with
   those files attached. Until then `pending: true` makes the
   buttons open the releases page instead of a 404.

   To add a release: copy the object, bump version/tag/date, put it
   at the TOP of the array, and clear `pending`.

   Asset URL format:
     https://github.com/<owner>/<repo>/releases/download/<tag>/<file>
   ============================================================ */

const GENESIS_REPO = {
  owner: 'BeginnerCoder142011',
  repo: 'Genesis'
};

const GENESIS_SITE = 'https://beginnercoder142011.github.io/Genesis/';

const GENESIS_RELEASES = [
  {
    version: '1.0.0',
    tag: 'v1.0.0',
    date: '2026-11-17',
    channel: 'stable',
    geode: '5.0.0',
    gd: '2.2081',
    latest: true,

    /* Flip to false after the release is published with its assets.
       While true, download buttons route to the releases page. */
    pending: true,

    assets: {
      windows:   { file: 'genesis-windows-x64.geode',     size: null, arch: 'Win64 · x64' },
      macos:     { file: 'genesis-macos-universal.geode', size: null, arch: 'arm64 + x86_64' },
      android:   { file: 'genesis-android64.geode',       size: null, arch: 'arm64-v8a' },
      android32: { file: 'genesis-android32.geode',       size: null, arch: 'armeabi-v7a' },
      ios:       { file: 'genesis-ios.geode',             size: null, arch: 'arm64', experimental: true }
    },

    changes: [
      { k: '+', text: '<b>Generate button</b> in the level editor — describe a level in a prompt and it is written from your cursor forward.' },
      { k: '+', text: '<b>Song library sync</b> — beat grid read from any track in your saved music library: official songs, Newgrounds downloads and local imports.' },
      { k: '+', text: '<b>Object version selector</b> — 1.0 through 2.2. Generation only uses objects, gamemodes and triggers that existed in the chosen update.' },
      { k: '+', text: '<b>Orbs, pads and portals</b> as independent gadget classes, plus speed and teleport toggles.' },
      { k: '+', text: '<b>Layout and Full decorated</b> passes — decorated adds block design, ground and background styling, pulses, move triggers and camera work.' },
      { k: '+', text: '<b>Difficulty targeting</b> — Easy, Normal, Hard, Insane and Extreme, shifting gap sizes, timing windows and gadget density.' },
      { k: '+', text: '<b>Playability guard</b> — impossible gaps and unreachable patterns are detected and re-rolled before the pass is committed.' },
      { k: '+', text: 'Each generation is a single undo entry, so one Ctrl+Z removes the whole attempt.' },
      { k: '~', text: 'Windows, macOS and Android builds. iOS is experimental — see the note on the download page.' }
    ]
  }
];

/* ------------------------------------------------------------
   Beta channel — UNLISTED.
   Shown only when the Beta tab (or the beta deep link) is used.
   Entries flagged `unlisted: true` never appear in the public
   changelog or version history, so testers can be pointed at:

       download.html?channel=beta
       beta.html                      (short unlisted redirect)

   Set to `null` to hide the Stable / Beta toggle entirely.
   ------------------------------------------------------------ */
const GENESIS_BETA = {
  version: '1.1.0-beta.1',
  tag: 'v1.1.0-beta.1',
  date: '2026-11-17',
  channel: 'beta',
  geode: '6.0.0-alpha.1',
  gd: '2.2091',
  unlisted: true,

  /* Flip to false once the prerelease is published with its assets. */
  pending: true,

  note: 'Unlisted beta run on Geometry Dash 2.2091 with Geode 6.0.0-alpha. ' +
        'Stable Geode 5.x cannot load this build, and this build will not load on 2.2081 — ' +
        'use the stable channel for that. Back up your levels before testing.',

  assets: {
    windows:   { file: 'genesis-1.1.0-beta.1-windows-x64.geode',     size: null, arch: 'Win64 · x64' },
    macos:     { file: 'genesis-1.1.0-beta.1-macos-universal.geode', size: null, arch: 'arm64 + x86_64' },
    android:   { file: 'genesis-1.1.0-beta.1-android64.geode',       size: null, arch: 'arm64-v8a' },
    android32: { file: 'genesis-1.1.0-beta.1-android32.geode',       size: null, arch: 'armeabi-v7a' },
    ios:       null
  },

  changes: [
    { k: '+', text: '<b>GD 2.2091 / Geode 6.0.0-alpha</b> support from the same source tree as the 2.2081 line.' },
    { k: '+', text: 'Object pool re-checked against the 2.2091 build — no 2.209-only objects are placed when the version selector is below 2.2.' },
    { k: '+', text: 'Seed field is now visible in the panel, so testers can reproduce an exact generation in bug reports.' },
    { k: '~', text: 'Settings from 1.0.0 migrate on first launch; keybinds are kept.' },
    { k: '!', text: 'Decoration triggers verified on Windows and macOS only — Android decoration is the main thing to test.' },
    { k: '!', text: 'No iOS build for 2.2091 yet; the loader side is not available.' }
  ]
};

/* ---------- helpers shared by every page ---------- */
const GENESIS_GH = `https://github.com/${GENESIS_REPO.owner}/${GENESIS_REPO.repo}`;
const GENESIS_GH_LATEST = `${GENESIS_GH}/releases/latest`;
const GENESIS_GH_RELEASES = `${GENESIS_GH}/releases`;

function genesisAssetUrl(tag, file) {
  return `${GENESIS_GH}/releases/download/${tag}/${file}`;
}

function genesisRepoIsPlaceholder() {
  return GENESIS_REPO.owner === 'yourname' || !GENESIS_REPO.owner;
}

function genesisLatest() {
  return GENESIS_RELEASES[0];
}

if (genesisRepoIsPlaceholder() && typeof console !== 'undefined') {
  console.warn('[GENESIS] releases.js: repo owner is not set.');
}
