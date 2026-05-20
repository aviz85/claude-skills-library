---
name: x-bookmarks-fetcher
description: "Fetch X (Twitter) bookmarks via the official X API v2. Downloads recent bookmarks with text, images, and videos into a local folder. Use whenever user asks to grab/download/export their X bookmarks, save bookmarked tweets, or pull recent saved posts from X/Twitter. Uses OAuth 2.0 user-context auth (one-time browser consent, then refresh-token forever)."
---

# X Bookmarks Fetcher

Download X/Twitter bookmarks via the official X API v2 (no scraping, no Chrome session). Saves tweet text, metadata, images, and videos to a local folder.

## First-time setup

If `scripts/.env` does not yet exist, follow **SETUP.md** in this skill folder. It walks through:
1. Creating an X developer app with OAuth 2.0 enabled
2. Setting the callback URL to `http://127.0.0.1:8765/callback`
3. Copying client ID/secret into `.env`
4. Running `npm run auth` (one-time browser consent → saves refresh token)

Once `scripts/.env` and `scripts/.tokens.json` exist, fetching is pure API.

## Quick Start

```bash
cd ~/.claude/skills/x-bookmarks-fetcher/scripts

# One-time auth (opens browser for consent, saves tokens)
node auth.mjs

# Fetch bookmarks from the last 48 hours (default)
node fetch.mjs

# Custom hours window
node fetch.mjs --hours 24

# Custom output folder
node fetch.mjs --hours 48 --out /tmp/my-bookmarks

# Specific time range (ISO timestamps)
node fetch.mjs --since 2026-05-19T00:00:00Z
```

## Options for `fetch.mjs`

| Option | Default | Description |
|--------|---------|-------------|
| `--hours <N>` | `48` | Filter to tweets created within last N hours |
| `--since <iso>` | derived from `--hours` | Lower bound (ISO 8601 timestamp). Overrides `--hours` |
| `--out <dir>` | `/tmp/x-bookmarks-YYYYMMDD` | Output directory |
| `--max-pages <N>` | `20` | Stop after N API pages (100 bookmarks each) |
| `--no-media` | off | Skip downloading images/videos |

## What gets saved

```
<out>/
├── bookmarks-raw.json    # Full API response (incl. includes for users, media, referenced tweets)
├── index.json            # Parsed/flattened items
├── index.md              # Human-readable summary
├── <handle>_<id>.txt     # One file per bookmark with text + URL + media list
└── media/
    ├── <media_key>.jpg   # Photos
    ├── <media_key>.mp4   # Highest-bitrate MP4 for videos/GIFs
    └── <media_key>_poster.jpg  # Video thumbnails
```

## Filtering note

The X API returns bookmarks in **bookmarking-order** (most recently saved first), but doesn't expose the bookmark timestamp. The `--hours` / `--since` filter is applied to **tweet created_at** (when the post was published). For most uses this approximates "what I saved recently" — but if you bookmarked an old tweet today, it will be excluded.

## API tier requirements

- Endpoint: `GET /2/users/:id/bookmarks`
- Auth: OAuth 2.0 User Context with `bookmark.read` scope
- Available on Free tier (rate limited — currently ~10 requests per 15 min)

## Files in this skill

- `SKILL.md` — this file
- `README.md` — same content as SKILL.md, for non-Claude readers
- `SETUP.md` — first-time setup walkthrough
- `scripts/auth.mjs` — OAuth 2.0 PKCE flow (opens browser once)
- `scripts/fetch.mjs` — bookmark fetcher + media downloader
- `scripts/.env.example` — credential template
- `scripts/.gitignore` — ignores `.env` and `.tokens.json`
