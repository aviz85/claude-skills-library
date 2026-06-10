---
name: quick-voice
description: Spin up an instant browser voice session (OpenAI Realtime gpt-realtime-2) to close a topic in a short conversation instead of working through documents. Generic & white-label - works for any process. Supports live data work (read/update files, JSON, run commands), and distill mode (no tools, ends with a structured deliverable). Has a generic canvas that can display images, markdown, code, html, json, video, audio - perfect for "let's go over X" flows where the agent shows you items one by one and you react in real time. Use when user says "let's close this in a voice call", "run a quick voice session about X", "תפעיל שיחה קולית", "let's go over the [images/leads/PRs/files/notes]", or when a task is faster as a 3-minute conversation than as a document edit.
allowed-tools: Read, Write, Edit, Bash, Glob, AskUserQuestion
---

# quick-voice

White-label voice session generator. Each invocation produces a per-session web app that opens a WebRTC voice channel to OpenAI Realtime (`gpt-realtime-2`) with **context-specific instructions, tools, and canvas behavior**.

## When to use

- "תפעיל איתי שיחה קולית על X" / "let's have a quick voice call about X"
- Going through a list of items where speaking is faster than reading + clicking
- Closing a topic that needs a few decisions + updates (not a long-form plan)
- Producing a structured output (decisions / action items / notes) from a free-form discussion

## Two modes

| Mode | Tools | Output |
|---|---|---|
| **live** | File / JSON / bash tools available — agent updates real data during the call | A summary of changes made (in `output.md`) |
| **distill** | No data-mutation tools; canvas + `save_note` + `end_session` only | A long structured deliverable (decisions, notes, action items) in `output.md` |

The canvas is available in **both** modes.

## How to run a session

### Step 1 — figure out context

Look at the conversation. The user said one of:
- **Explicit:** "let's close the freelancer reviews" → topic = freelancer reviews
- **Implicit:** earlier in the conversation we generated 10 images → topic = "go over generated images"
- **Vague:** "תפעיל שיחה קולית" → call AskUserQuestion (single Q) to clarify topic + mode

### Step 2 — pick a runtime directory + generate the session config

Each session has its own **runtime directory** holding `config.json`, `output.md`,
`server.log`, `done.flag`. The runtime dir lives **outside the skill** so the
skill itself stays code-only and project data stays with the project.

Pick a session id: `id=$(date +%Y%m%d-%H%M%S)`.

Choose the runtime directory:
- **Inside a project** (git repo / codebase you're working in):
  put it at `<project-root>/.quick-voice/<id>/`. Add `.quick-voice/` to the
  project's `.gitignore` so session data never gets committed.
- **No project context:**
  use `/tmp/quick-voice-$USER/<id>/`.

Create the directory and write `config.json` into it:

```json
{
  "mode": "live",
  "topic": "Short Hebrew topic title",
  "instructions": "Full Hebrew system prompt for the realtime agent. Tell it what to do, what to ask, when to use the canvas, when to call save_note, when to call end_session. Be specific about the flow.",
  "voice": "ash",
  "cwd": "/absolute/path/used/as/root/for/relative/file/ops",
  "tools": ["canvas_show", "canvas_clear", "save_note", "end_session", "read_file", "list_dir", "update_json"],
  "canvas_hints": [
    { "type": "image", "source": "/abs/path/to/image1.png", "title": "Image 1" },
    { "type": "image", "source": "/abs/path/to/image2.png", "title": "Image 2" }
  ],
  "output_template": "# Session output\n\n## Decisions\n\n## Action items\n\n## Notes\n"
}
```

**Fields:**

- `mode`: `"live"` or `"distill"`.
- `topic`: shown in the page header.
- `instructions`: the system prompt. Write it in Hebrew (Aviz prefers Hebrew). Be specific — describe the flow you want the agent to follow.
- `voice`: `"ash"` (default), `"alloy"`, `"cedar"`, etc.
- `cwd`: directory the file tools are scoped to. **Required** if any file tool is enabled.
- `tools`: whitelist of tool names from the full set (see `lib/tool-defs.js`). For **distill mode** use only: `canvas_show`, `canvas_clear`, `save_note`, `end_session`. For **live mode** add file / JSON / bash tools as needed.
- `canvas_hints`: optional. If you pre-load items the agent should walk through, list them here. Otherwise the agent decides what to show.
- `output_template`: seeds `output.md` so the agent has a structure to fill in via `save_note`.

### Step 3 — launch

```bash
node ~/.claude/skills/quick-voice/scripts/launch.js <runtime-dir>
```

`<runtime-dir>` is the absolute path to the directory you created in Step 2.
The launcher reads `<runtime-dir>/config.json` and writes `output.md`,
`server.log`, `done.flag` back into the same directory.

Cross-platform (macOS / Linux / Windows). This:
1. Verifies `OPENAI_API_KEY` (from env or `~/.claude/skills/quick-voice/.env`)
2. Runs `npm install` once if `node_modules` is missing
3. Finds a free port in 3031-3040 (uses `net.createServer` — no shell needed)
4. Spawns `server.js`, polls `/config` until ready
5. Opens the default browser at `http://localhost:<port>` (`open` on macOS, `xdg-open` on Linux, `start` on Windows)
6. Waits for the user to end the session (close browser → `/done` is hit, or the agent calls `end_session`)
7. Prints `output.md` and exits

### Step 4 — surface the output

After the launcher returns, read `runtime/<id>/output.md` and present it to the user. Do NOT delete the runtime dir automatically — the user may want to re-open or audit it. The session log is in `runtime/<id>/server.log`.

## Available tools (full set)

See `lib/tool-defs.js` for OpenAI Realtime tool definitions and `lib/tools.js` for implementations. Whitelist via `config.json.tools`.

**Canvas (both modes):**
- `canvas_show({ type, source, title?, content? })` — display in canvas. `type` ∈ `image|markdown|html|code|json|video|audio|text|url`.
  - For **media** (`image`, `video`, `audio`): pass `source` (file path or URL).
  - For **text-like** (`markdown`, `html`, `code`, `json`, `text`): pass either `content` (inline string) OR `source` (file path — the client fetches the file via `/file` and renders it). If you have a long block already on disk, prefer `source`; if you're generating short content inline, use `content`.
  - For `url`: pass `source` (iframe src).
- `canvas_clear()` — clear canvas.

**Output / control (both modes):**
- `save_note({ heading, content })` — append a section to `output.md`.
- `end_session({ summary? })` — finalize and close. `summary` is appended to output.md.

**Data (live mode only):**
- `read_file({ path })` — read file under `cwd`.
- `write_file({ path, content })` — write file under `cwd`.
- `append_file({ path, content })` — append.
- `update_json({ path, patch })` — shallow-merge `patch` into a JSON file (object root only).
- `list_dir({ path })` — list directory contents.
- `run_bash({ cmd })` — run a shell command in `cwd`. Use sparingly.

## Examples

### Example 1 — "let's go over the images you just created" (distill)

```json
{
  "mode": "distill",
  "topic": "סקירת תמונות",
  "instructions": "אתה מציג לאביץ תמונות אחת אחת. עבור כל תמונה: 1) קרא ל-canvas_show עם הנתיב מ-canvas_hints, 2) שאל 'מה דעתך?', 3) הקשב לתגובה, 4) קרא ל-save_note עם heading='[שם תמונה]' ו-content=[התגובה של אביץ]. כשמסיימים את כל התמונות — קרא ל-end_session.",
  "voice": "ash",
  "tools": ["canvas_show", "canvas_clear", "save_note", "end_session"],
  "canvas_hints": [
    { "type": "image", "source": "/Users/aviz/aviz-crm/output/img-001.png", "title": "1" },
    { "type": "image", "source": "/Users/aviz/aviz-crm/output/img-002.png", "title": "2" }
  ],
  "output_template": "# פידבק על תמונות\n\n"
}
```

### Example 2 — "review pending freelancer scores" (live)

```json
{
  "mode": "live",
  "topic": "סקירת פרילנסרים",
  "instructions": "פתח בקריאה ל-read_file({path: 'data/freelancers.json'}). הצג כל פרילנסר בקנבס (canvas_show type=json). שאל את אביץ לעדכון ציון. עדכן עם update_json. תעד ב-save_note. סיים עם end_session.",
  "voice": "ash",
  "cwd": "/Users/aviz/aviz-crm",
  "tools": ["canvas_show", "canvas_clear", "save_note", "end_session", "read_file", "update_json", "list_dir"],
  "output_template": "# Freelancer review session\n\n## Updates made\n\n"
}
```

### Example 3 — vague invocation

User says only "תפעיל שיחה קולית". Call AskUserQuestion once:

> Question: "על מה השיחה?"
> Options: [explicit topic the user types in via 'Other'], "סקירה חופשית — distill בלבד"

Then build the config from the answer.

## Anti-patterns

- **Don't bake secrets.** `OPENAI_API_KEY` comes from `~/.claude/skills/quick-voice/.env` (or the project's `.env`). Never inline.
- **Don't generate huge instructions.** Keep `instructions` ≤ 2KB. The agent needs to act fast.
- **Don't skip `cwd`** when enabling file tools — it scopes the blast radius.
- **Don't enable `run_bash` unless really needed.** Prefer specific tools.
- **Don't auto-delete `runtime/<id>/`.** The user may want to re-open or audit.

## Files in this skill

- `server.js` — Express server. Reads `$QV_RUNTIME_DIR/config.json`, vends OpenAI ephemeral tokens, executes tool calls server-side, serves files via `/file?path=...`.
- `public/index.html`, `public/app.js` — WebRTC client + generic canvas renderer (markdown/html/code/json/text can be loaded from `source` paths in addition to inline `content`).
- `lib/tool-defs.js` — OpenAI Realtime tool schemas.
- `lib/tools.js` — server-side tool implementations.
- `scripts/launch.js` — cross-platform Node launcher: takes an absolute `<runtime-dir>` path, finds free port, spawns server, opens browser, waits for done.

Per-session files (`config.json`, `output.md`, `server.log`, `done.flag`) live in the runtime directory you picked — typically `<project>/.quick-voice/<id>/` or `/tmp/quick-voice-$USER/<id>/`.
