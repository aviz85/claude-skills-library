#!/usr/bin/env node
// quick-voice launcher (cross-platform: macOS, Linux, Windows).
// Usage: node scripts/launch.js <session-id>
//
// Expects runtime/<session-id>/config.json to already exist.
// 1. Verifies OPENAI_API_KEY (env or .env)
// 2. Runs `npm install` once if node_modules is missing
// 3. Finds a free port in 3031..3040
// 4. Spawns server.js, waits for /config to respond
// 5. Opens the default browser at http://localhost:<port>
// 6. Waits until done.flag appears OR the server process exits
// 7. Prints runtime/<id>/output.md and exits

const fs = require("fs");
const net = require("net");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");

const SKILL_DIR = path.resolve(__dirname, "..");
const sessionId = process.argv[2];

if (!sessionId) {
  console.error("Usage: node scripts/launch.js <session-id>");
  process.exit(1);
}

const RUNTIME_DIR = path.join(SKILL_DIR, "runtime", sessionId);
const CONFIG = path.join(RUNTIME_DIR, "config.json");
const OUTPUT = path.join(RUNTIME_DIR, "output.md");
const DONE_FLAG = path.join(RUNTIME_DIR, "done.flag");
const LOG = path.join(RUNTIME_DIR, "server.log");

if (!fs.existsSync(CONFIG)) {
  console.error("Missing config:", CONFIG);
  process.exit(1);
}

// --- Resolve OPENAI_API_KEY ---
function loadEnvFile(p) {
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const envCandidates = [
  path.join(SKILL_DIR, ".env"),
  path.join(process.env.HOME || "", "aviz-crm", "voice-app", ".env"),
];
const envFromFile = {};
for (const ec of envCandidates) {
  Object.assign(envFromFile, loadEnvFile(ec));
}
if (!OPENAI_API_KEY) OPENAI_API_KEY = envFromFile.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY not set. Put it in", path.join(SKILL_DIR, ".env"));
  process.exit(1);
}

// --- Install deps if missing ---
if (!fs.existsSync(path.join(SKILL_DIR, "node_modules"))) {
  console.log("Installing dependencies (one-time)...");
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npmCmd, ["install", "--silent", "--no-audit", "--no-fund"], {
    cwd: SKILL_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error("npm install failed");
    process.exit(r.status || 1);
  }
}

// --- Find a free port in 3031..3040 ---
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

async function findFreePort() {
  for (let p = 3031; p <= 3040; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error("No free port in 3031-3040");
}

// --- Open default browser cross-platform ---
function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", shell: true }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch (err) {
    console.warn("Could not open browser automatically:", err.message);
    console.warn("Open this URL manually:", url);
  }
}

// --- Wait for HTTP endpoint to respond (server readiness) ---
function waitForServer(port, maxMs = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function attempt() {
      const req = http.get({ host: "127.0.0.1", port, path: "/config", timeout: 500 }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve(true);
        retry();
      });
      req.on("error", retry);
      req.on("timeout", () => { req.destroy(); retry(); });
    }
    function retry() {
      if (Date.now() - start > maxMs) return resolve(false);
      setTimeout(attempt, 200);
    }
    attempt();
  });
}

// --- Main ---
(async () => {
  // Reset done flag from any previous run
  try { fs.unlinkSync(DONE_FLAG); } catch {}

  const port = await findFreePort();
  console.log(`Starting quick-voice session on port ${port}...`);
  console.log(`  session: ${sessionId}`);
  console.log(`  runtime: ${RUNTIME_DIR}`);
  console.log(`  output:  ${OUTPUT}`);

  // Log file gets stdout/stderr from server
  const logStream = fs.openSync(LOG, "a");
  fs.writeSync(logStream, `\n--- launch ${new Date().toISOString()} ---\n`);

  const child = spawn(process.execPath, [path.join(SKILL_DIR, "server.js")], {
    cwd: SKILL_DIR,
    env: {
      ...process.env,
      OPENAI_API_KEY,
      QV_PORT: String(port),
      QV_SESSION_ID: sessionId,
    },
    stdio: ["ignore", logStream, logStream],
  });

  let serverExited = false;
  let serverExitCode = null;
  child.on("exit", (code) => {
    serverExited = true;
    serverExitCode = code;
  });

  // Graceful shutdown if the launcher is killed
  const shutdown = () => {
    if (!serverExited) {
      try { child.kill("SIGTERM"); } catch {}
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const ready = await waitForServer(port);
  if (!ready) {
    console.error("Server did not become ready in 8s. Check", LOG);
    try { child.kill("SIGTERM"); } catch {}
    process.exit(1);
  }

  const url = `http://localhost:${port}`;
  console.log(`Opening ${url}`);
  openBrowser(url);

  // Poll for done.flag or server exit
  const pollMs = 1000;
  while (!serverExited) {
    if (fs.existsSync(DONE_FLAG)) {
      // Give the server a moment to finish writing output.md, then stop it.
      await new Promise((r) => setTimeout(r, 1200));
      try { child.kill("SIGTERM"); } catch {}
      break;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  // Wait briefly for clean exit
  for (let i = 0; i < 20 && !serverExited; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("");
  console.log(`===== Session output: ${OUTPUT} =====`);
  if (fs.existsSync(OUTPUT)) {
    process.stdout.write(fs.readFileSync(OUTPUT, "utf8"));
  } else {
    console.log("(no output written)");
  }
  console.log(`===== End =====`);

  process.exit(serverExitCode === null ? 0 : (serverExitCode || 0));
})().catch((err) => {
  console.error("Launcher failed:", err);
  process.exit(1);
});
