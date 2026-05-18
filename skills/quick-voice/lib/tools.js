// Server-side tool implementations. Each takes (args, ctx) where ctx contains:
//   - cwd: working directory for relative file paths
//   - outputPath: absolute path to runtime/<id>/output.md
//   - signalDone: callback to mark the session ended
//   - log: function for writing to server.log

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function resolvePath(p, cwd) {
  if (!p) throw new Error("Missing path");
  return path.isAbsolute(p) ? p : path.join(cwd, p);
}

function truncate(s, n) {
  if (typeof s !== "string") s = String(s);
  if (s.length <= n) return s;
  return s.slice(0, n) + "\n…[truncated " + (s.length - n) + " chars]";
}

const HANDLERS = {
  async canvas_show(args) {
    return { ok: true, ...args };
  },

  async canvas_clear() {
    return { ok: true };
  },

  async save_note(args, ctx) {
    const heading = args.heading || "Note";
    const content = args.content || "";
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    const section = `\n## ${heading}\n_${ts}_\n\n${content}\n`;
    fs.appendFileSync(ctx.outputPath, section);
    ctx.log(`save_note: ${heading} (${content.length} chars)`);
    return { ok: true, heading };
  },

  async end_session(args, ctx) {
    if (args.summary) {
      const section = `\n## Final summary\n\n${args.summary}\n`;
      fs.appendFileSync(ctx.outputPath, section);
    }
    ctx.log("end_session called");
    ctx.signalDone();
    return { ok: true, message: "Session ending. Goodbye." };
  },

  async read_file(args, ctx) {
    const p = resolvePath(args.path, ctx.cwd);
    const content = fs.readFileSync(p, "utf8");
    return { ok: true, path: p, content: truncate(content, 50_000) };
  },

  async write_file(args, ctx) {
    const p = resolvePath(args.path, ctx.cwd);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, args.content || "");
    ctx.log(`write_file: ${p} (${(args.content || "").length} chars)`);
    return { ok: true, path: p, bytes: (args.content || "").length };
  },

  async append_file(args, ctx) {
    const p = resolvePath(args.path, ctx.cwd);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, args.content || "");
    return { ok: true, path: p };
  },

  async update_json(args, ctx) {
    const p = resolvePath(args.path, ctx.cwd);
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    if (typeof data !== "object" || Array.isArray(data) || data === null) {
      throw new Error("update_json requires root to be a JSON object");
    }
    Object.assign(data, args.patch || {});
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
    ctx.log(`update_json: ${p} keys=${Object.keys(args.patch || {}).join(",")}`);
    return { ok: true, path: p, patched_keys: Object.keys(args.patch || {}) };
  },

  async array_update_json(args, ctx) {
    const p = resolvePath(args.path, ctx.cwd);
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    let arr;
    if (Array.isArray(data)) {
      arr = data;
    } else if (args.array_key && Array.isArray(data[args.array_key])) {
      arr = data[args.array_key];
    } else {
      throw new Error("array_update_json: could not locate the array. Pass array_key for {key:[...]} layouts.");
    }
    const idx = arr.findIndex((r) => r && r[args.match_field] === args.match_value);
    if (idx === -1) {
      throw new Error(`No record where ${args.match_field}=${args.match_value}`);
    }
    Object.assign(arr[idx], args.patch || {});
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
    ctx.log(`array_update_json: ${p} ${args.match_field}=${args.match_value}`);
    return { ok: true, path: p, updated_index: idx, record: arr[idx] };
  },

  async list_dir(args, ctx) {
    const p = resolvePath(args.path, ctx.cwd);
    const entries = fs.readdirSync(p, { withFileTypes: true }).map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
    }));
    return { ok: true, path: p, entries };
  },

  async run_bash(args, ctx) {
    const cmd = args.cmd;
    if (!cmd) throw new Error("Missing cmd");
    ctx.log(`run_bash: ${cmd}`);
    const result = spawnSync("bash", ["-c", cmd], {
      cwd: ctx.cwd,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 60_000,
    });
    if (result.error) {
      return { ok: false, stderr: String(result.error.message) };
    }
    return {
      ok: result.status === 0,
      exit_code: result.status,
      stdout: truncate(result.stdout || "", 4000),
      stderr: truncate(result.stderr || "", 2000),
    };
  },
};

async function executeTool(name, args, ctx) {
  const fn = HANDLERS[name];
  if (!fn) throw new Error("Unknown tool: " + name);
  return await fn(args || {}, ctx);
}

module.exports = { executeTool, HANDLERS };
