#!/usr/bin/env node
// X OAuth 2.0 Authorization Code Flow with PKCE
// Opens browser once, exchanges code for tokens, saves to .tokens.json next to this script.
// Re-run anytime to refresh the tokens file from scratch.

import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { URL, URLSearchParams } from "node:url";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(SCRIPT_DIR, ".env");
const TOKENS_PATH = path.join(SCRIPT_DIR, ".tokens.json");

if (!fs.existsSync(ENV_PATH)) {
  console.error(`\nMissing ${ENV_PATH}\n`);
  console.error(`Copy .env.example to .env and fill in X_CLIENT_ID + X_CLIENT_SECRET.`);
  console.error(`See SETUP.md for instructions.\n`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const CLIENT_ID = env.X_CLIENT_ID;
const CLIENT_SECRET = env.X_CLIENT_SECRET;
const PORT = parseInt(env.CALLBACK_PORT || "8765", 10);
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ["tweet.read", "users.read", "bookmark.read", "offline.access"].join(" ");

if (!CLIENT_ID || CLIENT_ID.includes("your-")) {
  console.error("X_CLIENT_ID is not set. Edit scripts/.env. See SETUP.md.");
  process.exit(1);
}
if (!CLIENT_SECRET || CLIENT_SECRET.includes("your-")) {
  console.error("X_CLIENT_SECRET is not set. Edit scripts/.env. See SETUP.md.");
  process.exit(1);
}

function b64url(buf) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

const codeVerifier = b64url(crypto.randomBytes(64));
const codeChallenge = b64url(crypto.createHash("sha256").update(codeVerifier).digest());
const state = b64url(crypto.randomBytes(16));

const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");

console.log("\n=== X OAuth 2.0 setup ===\n");
console.log("Callback URI (must match the one registered in the X dev portal):");
console.log("  " + REDIRECT_URI + "\n");
console.log("Opening this URL to authorize:");
console.log("  " + authUrl.toString() + "\n");

function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }).toString();
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const r = https.request("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        Authorization: `Basic ${basic}`,
      },
    }, res => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject); r.write(body); r.end();
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (u.pathname !== "/callback") {
    res.writeHead(404); res.end("not found"); return;
  }

  const code = u.searchParams.get("code");
  const gotState = u.searchParams.get("state");
  const err = u.searchParams.get("error");

  if (err) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>Authorization error</h2><pre>${err}\n${u.searchParams.get("error_description") || ""}</pre>`);
    console.error("\nAuth error:", err, u.searchParams.get("error_description") || "");
    server.close(); process.exit(1);
  }

  if (gotState !== state) {
    res.writeHead(400); res.end("state mismatch");
    console.error("\nState mismatch — possible CSRF. Re-run.");
    server.close(); process.exit(1);
  }

  try {
    const tk = await exchangeCode(code);
    if (tk.status !== 200) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h2>Token exchange failed</h2><pre>${tk.body}</pre>`);
      console.error("\nToken exchange failed:", tk.status, tk.body);
      server.close(); process.exit(1);
    }
    const tokens = JSON.parse(tk.body);
    tokens.obtained_at = Date.now();
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
    fs.chmodSync(TOKENS_PATH, 0o600);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>Authorized</h2><p>Tokens saved to ${TOKENS_PATH}. You can close this tab.</p>`);
    console.log("\nTokens saved to:", TOKENS_PATH);
    console.log("   scopes:", tokens.scope);
    console.log("   access_token expires in:", tokens.expires_in, "seconds");
    console.log("\nYou can now run:  node fetch.mjs\n");
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
    console.error(e); server.close(); process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Listening on ${REDIRECT_URI} ...\n`);
  const opener = process.platform === "darwin" ? "open"
              : process.platform === "win32" ? "start"
              : "xdg-open";
  execFile(opener, [authUrl.toString()], () => {});
});

setTimeout(() => {
  console.error("\nTimed out waiting for authorization (5 min).");
  server.close(); process.exit(1);
}, 5 * 60 * 1000);
