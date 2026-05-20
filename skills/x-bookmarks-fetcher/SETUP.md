# Setup — x-bookmarks-fetcher

One-time setup, ~5 minutes. After this every fetch is a pure API call.

## 1. Create an X developer app

1. Go to **https://developer.x.com/en/portal/dashboard** and sign in with your X account.
2. If you don't already have a project, create one (the Free tier is fine).
3. Inside the project, create an **App** (any name).
4. On the app page, find **User authentication settings** and click **Set up** (or **Edit** if it already exists).

## 2. Configure OAuth 2.0

Fill the User authentication settings form like this:

| Field | Value |
|-------|-------|
| **App permissions** | `Read` (or `Read and write` if you also want to post) |
| **Type of App** | `Web App, Automated App or Bot` ← critical, this enables OAuth 2.0 |
| **Callback URI / Redirect URL** | `http://127.0.0.1:8765/callback` |
| **Website URL** | any URL you own (e.g. your portfolio or `https://x.com/your_handle`) |

Save. X will display your **Client ID** and **Client Secret** (the secret may appear only once — copy it now).

> ⚠️ If you previously had OAuth 2.0 disabled and only had OAuth 1.0a keys, X will regenerate the OAuth 2.0 credentials when you save. The OAuth 1.0a keys are unrelated and stay the same.

## 3. Drop credentials into `.env`

```bash
cd ~/.claude/skills/x-bookmarks-fetcher/scripts
cp .env.example .env
```

Edit `.env`:

```env
X_CLIENT_ID=your-client-id-from-x-dev-portal
X_CLIENT_SECRET=your-client-secret-from-x-dev-portal
```

`.env` is gitignored. Don't commit it.

## 4. Authorize once

```bash
node auth.mjs
```

This will:
1. Print an authorization URL and `open` it in your default browser.
2. You log in to X (if not already) and click **Authorize app**.
3. X redirects to `http://127.0.0.1:8765/callback` — a tiny local server (started by the script) catches the code.
4. The server exchanges the code for an `access_token` + `refresh_token` and saves them to `scripts/.tokens.json`.

You should see:

```
Tokens saved to: /Users/.../x-bookmarks-fetcher/scripts/.tokens.json
   scopes: users.read tweet.read offline.access bookmark.read
   expires in: 7200 seconds
```

The `refresh_token` is what makes this last forever — `fetch.mjs` auto-rotates the access token when it's about to expire.

## 5. Fetch

```bash
node fetch.mjs                  # last 48h
node fetch.mjs --hours 24       # last 24h
node fetch.mjs --hours 168      # last week
```

Output lands in `/tmp/x-bookmarks-<YYYYMMDD>/` by default. See **README.md** for full options.

---

## Troubleshooting

### "Something went wrong — you weren't able to give access to the App"
Your callback URL isn't registered or isn't an exact match. Recheck step 2 — it must be exactly `http://127.0.0.1:8765/callback` (no trailing slash, http not https).

### "Unsupported Authentication" on `fetch.mjs`
The bookmarks endpoint requires OAuth 2.0 User Context. Make sure `node auth.mjs` finished successfully and `.tokens.json` exists in `scripts/`. Inspect with `cat scripts/.tokens.json` — it should contain `access_token`, `refresh_token`, and `scope: "... bookmark.read ..."`.

### Rate limit (429)
Free tier ≈ 10 requests / 15 min on this endpoint. `fetch.mjs` reads `x-rate-limit-reset` from the response headers and sleeps until the window opens. If you hit this often, paginate over multiple sessions instead of in one shot.

### Port 8765 already in use
Some other process is listening on it. Either free the port (`lsof -i :8765`) or change `PORT` at the top of `auth.mjs` — but you'll also need to update the Callback URI in the X dev portal to match.

### Tokens lost / corrupt
Just re-run `node auth.mjs`. Click Authorize again. New tokens overwrite the old file.
