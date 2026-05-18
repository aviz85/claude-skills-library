require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { selectTools } = require("./lib/tool-defs");
const { executeTool } = require("./lib/tools");

const SESSION_ID = process.env.QV_SESSION_ID;
const RUNTIME_DIR = path.join(__dirname, "runtime", SESSION_ID || "default");
const CONFIG_PATH = path.join(RUNTIME_DIR, "config.json");
const OUTPUT_PATH = path.join(RUNTIME_DIR, "output.md");
const LOG_PATH = path.join(RUNTIME_DIR, "server.log");
const DONE_FLAG = path.join(RUNTIME_DIR, "done.flag");

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Set it in ~/.claude/skills/quick-voice/.env");
  process.exit(1);
}
if (!fs.existsSync(CONFIG_PATH)) {
  console.error("Missing config:", CONFIG_PATH);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

function log(line) {
  const ts = new Date().toISOString();
  fs.appendFileSync(LOG_PATH, `[${ts}] ${line}\n`);
}

if (!fs.existsSync(OUTPUT_PATH)) {
  const header = `# ${config.topic || "Quick voice session"}\n\n_Session ${SESSION_ID} — ${new Date().toISOString()}_\n`;
  const template = config.output_template ? "\n" + config.output_template : "";
  fs.writeFileSync(OUTPUT_PATH, header + template);
}

let doneSignaled = false;
function signalDone() {
  if (!doneSignaled) {
    doneSignaled = true;
    fs.writeFileSync(DONE_FLAG, new Date().toISOString());
    log("done.flag written");
    setTimeout(() => process.exit(0), 1500);
  }
}

const toolDefs = selectTools(config.tools || []);
log(`Loaded config: topic="${config.topic}" mode=${config.mode} tools=[${(config.tools || []).join(",")}]`);

const ctx = {
  cwd: config.cwd || process.cwd(),
  outputPath: OUTPUT_PATH,
  signalDone,
  log,
};

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res) => res.set("Cache-Control", "no-store"),
}));

app.get("/config", (req, res) => {
  res.json({
    topic: config.topic || "Voice session",
    mode: config.mode || "live",
    instructions: config.instructions || "You are a helpful voice assistant.",
    voice: config.voice || "ash",
    tools: toolDefs,
    canvas_hints: config.canvas_hints || [],
    session_id: SESSION_ID,
  });
});

app.get("/token", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-2",
          output_modalities: ["audio"],
          instructions: config.instructions || "You are a helpful voice assistant.",
          audio: {
            output: { voice: config.voice || "ash" },
            input: { transcription: { model: "whisper-1" } },
          },
        },
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      log(`token error ${r.status}: ${text}`);
      return res.status(r.status).json({ error: text });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    log(`token exception: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post("/tool/:name", async (req, res) => {
  const name = req.params.name;
  try {
    log(`tool call: ${name} ${JSON.stringify(req.body).slice(0, 200)}`);
    const result = await executeTool(name, req.body || {}, ctx);
    res.json(result);
  } catch (err) {
    log(`tool error ${name}: ${err.message}`);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Serve a local file (image, video, etc.) from disk. Scoped to cwd for safety.
app.get("/file", (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).send("missing path");
  const absolute = path.isAbsolute(p) ? p : path.join(ctx.cwd, p);
  // Light-weight scope check: must live under cwd or be in a public-ish location.
  if (!fs.existsSync(absolute)) return res.status(404).send("not found");
  res.sendFile(absolute);
});

app.post("/done", (req, res) => {
  signalDone();
  res.json({ ok: true });
});

const PORT = process.env.QV_PORT || 3031;
app.listen(PORT, () => {
  console.log(`quick-voice session "${config.topic}" — http://localhost:${PORT}`);
  console.log(`runtime: ${RUNTIME_DIR}`);
  log(`server listening on ${PORT}`);
});
