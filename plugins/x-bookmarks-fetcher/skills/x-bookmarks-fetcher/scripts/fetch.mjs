#!/usr/bin/env node
// Fetch X bookmarks via OAuth 2.0 user-context, filter by tweet created_at,
// save text + download images/videos.

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { URL, URLSearchParams } from "node:url";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(SCRIPT_DIR, ".env");
const TOKENS_PATH = path.join(SCRIPT_DIR, ".tokens.json");

if (!fs.existsSync(ENV_PATH) || !fs.existsSync(TOKENS_PATH)) {
  console.error("\nMissing .env or .tokens.json. Run `node auth.mjs` first.");
  console.error("See SETUP.md for the full first-time setup walkthrough.\n");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

let tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));

// ---- args ----
function getArg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  return process.argv[i + 1];
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const hours = parseInt(getArg("hours", "48"), 10);
const sinceArg = getArg("since");
const outArg = getArg("out");
const maxPages = parseInt(getArg("max-pages", "20"), 10);
const skipMedia = hasFlag("no-media");

const since = sinceArg ? new Date(sinceArg) : new Date(Date.now() - hours * 3600 * 1000);
if (isNaN(since.getTime())) {
  console.error(`Invalid --since: ${sinceArg}`); process.exit(1);
}

const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const outRoot = outArg || `/tmp/x-bookmarks-${dateStamp}`;
const mediaDir = path.join(outRoot, "media");
fs.mkdirSync(outRoot, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });

// ---- token helpers ----
function saveTokens(t) {
  t.obtained_at = Date.now();
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(t, null, 2));
  fs.chmodSync(TOKENS_PATH, 0o600);
  tokens = t;
}

function tokenExpired() {
  return Date.now() > tokens.obtained_at + (tokens.expires_in - 60) * 1000;
}

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

async function refreshIfNeeded() {
  if (!tokenExpired()) return;
  console.log("[*] Refreshing access token...");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: env.X_CLIENT_ID,
  }).toString();
  const basic = Buffer.from(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`).toString("base64");
  const r = await httpsRequest({
    method: "POST",
    hostname: "api.twitter.com",
    path: "/2/oauth2/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
      Authorization: `Basic ${basic}`,
    },
  }, body);
  if (r.status !== 200) throw new Error(`Refresh failed ${r.status}: ${r.body}\nRe-run \`node auth.mjs\`.`);
  saveTokens(JSON.parse(r.body));
  console.log("[*] Token refreshed.");
}

async function apiGet(url) {
  await refreshIfNeeded();
  const u = new URL(url);
  return httpsRequest({
    method: "GET",
    hostname: u.hostname,
    path: u.pathname + u.search,
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const f = fs.createWriteStream(dest);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { "User-Agent": "x-bookmarks-fetcher/1.0" } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        f.close();
        try { fs.unlinkSync(dest); } catch {}
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        f.close();
        try { fs.unlinkSync(dest); } catch {}
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(f);
      f.on("finish", () => f.close(() => resolve(dest)));
      f.on("error", reject);
    }).on("error", reject);
  });
}

async function getMe() {
  const r = await apiGet("https://api.twitter.com/2/users/me");
  if (r.status !== 200) throw new Error("users/me failed: " + r.body);
  return JSON.parse(r.body).data;
}

async function getAllBookmarks(userId, sinceDate) {
  const baseParams = new URLSearchParams({
    "max_results": "100",
    "tweet.fields": "created_at,author_id,attachments,entities,public_metrics,referenced_tweets,conversation_id,lang,note_tweet",
    "expansions": "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id",
    "user.fields": "username,name,verified",
    "media.fields": "type,url,preview_image_url,variants,alt_text,duration_ms,height,width",
  });

  const all = { data: [], includes: { users: [], media: [], tweets: [] } };
  let token = null;
  let pages = 0;
  const sinceMs = sinceDate.getTime();

  while (pages < maxPages) {
    const params = new URLSearchParams(baseParams);
    if (token) params.set("pagination_token", token);
    const url = `https://api.twitter.com/2/users/${userId}/bookmarks?` + params.toString();

    const r = await apiGet(url);
    if (r.status === 429) {
      const reset = parseInt(r.headers["x-rate-limit-reset"] || "0", 10) * 1000;
      const waitMs = Math.max(reset - Date.now(), 5000);
      console.log(`[!] Rate limited, waiting ${Math.round(waitMs / 1000)}s...`);
      await new Promise(res => setTimeout(res, waitMs));
      continue;
    }
    if (r.status !== 200) throw new Error(`bookmarks failed ${r.status}: ${r.body}`);

    const j = JSON.parse(r.body);
    pages++;
    const items = j.data || [];
    all.data.push(...items);
    if (j.includes?.users) all.includes.users.push(...j.includes.users);
    if (j.includes?.media) all.includes.media.push(...j.includes.media);
    if (j.includes?.tweets) all.includes.tweets.push(...j.includes.tweets);
    console.log(`[*] Page ${pages}: +${items.length} bookmarks (total ${all.data.length})`);

    // Heuristic: bookmarks come in bookmark-order (not created_at order). Always pull at least
    // 2 pages to be safe, then stop when no item on the page is within the time window.
    if (pages >= 2) {
      const anyRecent = items.some(t => new Date(t.created_at).getTime() >= sinceMs);
      if (!anyRecent) { console.log(`[*] No tweets on this page within window — stopping.`); break; }
    }

    token = j.meta?.next_token;
    if (!token) break;
    await new Promise(res => setTimeout(res, 800));
  }

  return all;
}

function pickVideoVariant(variants) {
  const mp4 = (variants || []).filter(v => v.content_type === "video/mp4" && typeof v.bit_rate === "number");
  if (!mp4.length) return null;
  mp4.sort((a, b) => b.bit_rate - a.bit_rate);
  return mp4[0];
}

async function downloadMedia(media, outDir) {
  if (!media) return [];
  const key = media.media_key;
  const tasks = [];
  if (media.type === "photo" && media.url) {
    const ext = path.extname(new URL(media.url).pathname) || ".jpg";
    tasks.push({ url: media.url, dest: path.join(outDir, `${key}${ext}`) });
  } else if (media.type === "video" || media.type === "animated_gif") {
    const v = pickVideoVariant(media.variants);
    if (v) tasks.push({ url: v.url, dest: path.join(outDir, `${key}.mp4`) });
    if (media.preview_image_url) tasks.push({ url: media.preview_image_url, dest: path.join(outDir, `${key}_poster.jpg`) });
  }
  const saved = [];
  for (const t of tasks) {
    try { await download(t.url, t.dest); saved.push(path.basename(t.dest)); }
    catch (e) { console.error(`  download failed: ${t.url}: ${e.message}`); }
  }
  return saved;
}

function sanitize(s) { return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80); }

async function main() {
  console.log(`[*] Filter: tweets created since ${since.toISOString()}`);
  console.log(`[*] Output: ${outRoot}`);

  const me = await getMe();
  console.log(`[*] Authenticated as @${me.username} (id ${me.id})`);

  const result = await getAllBookmarks(me.id, since);

  const usersById = Object.fromEntries(result.includes.users.map(u => [u.id, u]));
  const mediaByKey = Object.fromEntries(result.includes.media.map(m => [m.media_key, m]));

  const sinceMs = since.getTime();
  const filtered = result.data.filter(t => new Date(t.created_at).getTime() >= sinceMs);
  console.log(`[*] ${filtered.length} of ${result.data.length} bookmarks are within the time window`);

  fs.writeFileSync(path.join(outRoot, "bookmarks-raw.json"), JSON.stringify(result, null, 2));

  const items = [];
  for (const t of filtered) {
    const user = usersById[t.author_id];
    const handle = user?.username || t.author_id;
    const url = `https://x.com/${handle}/status/${t.id}`;
    const mediaKeys = t.attachments?.media_keys || [];
    const mediaItems = mediaKeys.map(k => mediaByKey[k]).filter(Boolean);

    const downloadedFiles = [];
    if (!skipMedia) {
      for (const m of mediaItems) {
        const files = await downloadMedia(m, mediaDir);
        downloadedFiles.push(...files);
      }
    }

    const text = t.note_tweet?.text || t.text || "";
    items.push({
      id: t.id,
      url,
      created_at: t.created_at,
      author: { id: t.author_id, username: handle, name: user?.name },
      text,
      lang: t.lang,
      public_metrics: t.public_metrics,
      media: mediaItems.map(m => ({
        media_key: m.media_key,
        type: m.type,
        alt_text: m.alt_text,
        duration_ms: m.duration_ms,
        width: m.width,
        height: m.height,
      })),
      downloaded_files: downloadedFiles,
    });

    const slug = sanitize(`${handle}_${t.id}`);
    fs.writeFileSync(
      path.join(outRoot, `${slug}.txt`),
      `@${handle} — ${t.created_at}\n${url}\n\n${text}\n` +
        (downloadedFiles.length ? `\n[media: ${downloadedFiles.join(", ")}]\n` : "")
    );
  }

  fs.writeFileSync(path.join(outRoot, "index.json"), JSON.stringify(items, null, 2));

  const md = [
    `# X Bookmarks`,
    ``,
    `Fetched: ${new Date().toISOString()}`,
    `Filter: tweets created since ${since.toISOString()}`,
    `Authenticated as: @${me.username}`,
    `Count: ${items.length}`,
    ``,
    ...items.map(it => {
      const lines = [
        `## @${it.author.username} — ${it.created_at}`,
        `${it.url}`,
        ``,
        it.text,
      ];
      if (it.downloaded_files.length) lines.push(``, `media: ${it.downloaded_files.join(", ")}`);
      return lines.join("\n");
    }),
  ].join("\n\n");
  fs.writeFileSync(path.join(outRoot, "index.md"), md);

  console.log(`\n[done] Saved ${items.length} bookmarks + media to ${outRoot}`);
  console.log(`       bookmarks-raw.json — full API response`);
  console.log(`       index.json         — parsed items`);
  console.log(`       index.md           — readable summary`);
  console.log(`       <handle>_<id>.txt  — one per bookmark`);
  if (!skipMedia) console.log(`       media/             — images + videos`);
}

main().catch(e => { console.error("\nERROR:", e.message || e); process.exit(1); });
