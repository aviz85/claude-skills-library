# x-bookmarks-fetcher

Standalone Claude Code skill that downloads X (Twitter) bookmarks via the official **X API v2** — no Chrome session, no scraping, no third-party services. Pure HTTPS + OAuth 2.0.

Saves each bookmark's text, metadata, and media (images + videos) into a local folder you can grep, archive, feed to an LLM, or pipe into anything else.

## Why this exists

X's bookmark UI is hostile to power users:
- Bookmarks are buried, slow, and don't expose timestamps.
- The official "Download your data" archive omits bookmarks entirely.
- Most third-party tools either scrape (fragile + ToS-risky) or want your Twitter login (sketchy).

This skill uses the **same API endpoint** an X-employed engineer would use: `GET /2/users/:id/bookmarks`. It needs a developer app (free) and a one-time browser consent. After that, every fetch is a pure API call.

## Install

```bash
cd ~/.claude/skills
git clone <this-repo> x-bookmarks-fetcher   # or copy the folder
cd x-bookmarks-fetcher
```

No `npm install` needed — the scripts use only Node.js stdlib (`https`, `crypto`, `fs`, `http`, `url`). Tested on Node ≥ 18.

## First-time setup

See **[SETUP.md](./SETUP.md)** for the full walkthrough. TL;DR:

1. Create an X developer app at https://developer.x.com — enable **OAuth 2.0** and set callback URL to `http://127.0.0.1:8765/callback`.
2. `cp scripts/.env.example scripts/.env` and fill in `X_CLIENT_ID` + `X_CLIENT_SECRET`.
3. `node scripts/auth.mjs` — browser opens, click Authorize, tokens save automatically.

## Usage

```bash
cd scripts

# Last 48 hours of bookmarks (default)
node fetch.mjs

# Last 24h
node fetch.mjs --hours 24

# Everything since a specific timestamp
node fetch.mjs --since 2026-05-19T00:00:00Z

# Custom output folder
node fetch.mjs --out ~/Downloads/x-bookmarks
```

## Output layout

```
/tmp/x-bookmarks-20260520/
├── bookmarks-raw.json    # untouched API response
├── index.json            # parsed list (id, url, text, author, media refs, downloaded files)
├── index.md              # readable markdown summary
├── @handle_tweetid.txt   # one per bookmark — author, URL, full text
└── media/
    ├── <media_key>.jpg
    ├── <media_key>.mp4         # highest-bitrate MP4 variant
    └── <media_key>_poster.jpg
```

## How it filters

The X API returns bookmarks in **bookmarking-order** (newest save first), but doesn't expose the bookmark timestamp itself. The `--hours` / `--since` filter applies to **tweet `created_at`** (publication time of the post you saved). That's a close-enough proxy for "what did I save recently" — the only false-negatives are old tweets you bookmarked today.

## Security

- `scripts/.env` and `scripts/.tokens.json` are in `.gitignore`.
- Tokens are stored with `chmod 600`.
- All HTTPS calls go directly to `api.twitter.com` and `api.x.com` — no third-party servers in the loop.
- Refresh token auto-rotates every 2 hours. Lost the token file? Just run `node auth.mjs` again.

## Limitations

- **Free tier rate limit**: ~10 requests per 15 minutes on this endpoint. The script handles 429s by waiting for the reset timestamp.
- **Page size**: 100 bookmarks per request.
- **No bookmark-timestamp**: the API never returns when you bookmarked something.
- **No cursoring back in time past a few hundred bookmarks** on Free tier in practice.

## License

MIT. Share freely.
