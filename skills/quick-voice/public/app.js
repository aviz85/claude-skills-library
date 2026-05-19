// quick-voice client — WebRTC to OpenAI Realtime, generic canvas, tool dispatch.
// NOTE: innerHTML is intentionally used for markdown/html canvas types — that
// IS their purpose. Content originates from a Realtime agent the user
// configured locally; this app is loopback-only and never exposed to the web.

let pc = null;
let dc = null;
let micTrack = null;
let isConnected = false;
let isMuted = false;
let config = null;

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const statusMode = document.getElementById("statusMode");
const connectBtn = document.getElementById("connectBtn");
const muteBtn = document.getElementById("muteBtn");
const doneBtn = document.getElementById("doneBtn");
const transcript = document.getElementById("transcript");
const audioOutput = document.getElementById("audioOutput");
const topicTitle = document.getElementById("topicTitle");
const topicSub = document.getElementById("topicSub");
const canvasEl = document.getElementById("canvas");
const canvasBody = document.getElementById("canvasBody");
const canvasTitle = document.getElementById("canvasTitle");
const canvasToggle = document.getElementById("canvasToggle");
const canvasEmpty = document.getElementById("canvasEmpty");

let canvasCollapsed = false;
document.querySelector(".canvas-header").addEventListener("click", () => {
  canvasCollapsed = !canvasCollapsed;
  canvasEl.classList.toggle("collapsed", canvasCollapsed);
  canvasToggle.textContent = canvasCollapsed ? "◀" : "▼";
});

connectBtn.addEventListener("click", toggleConnection);
muteBtn.addEventListener("click", toggleMute);
doneBtn.addEventListener("click", endSession);

function setStatus(state) {
  statusDot.className = "status-dot " + state;
  const labels = { "": "מנותק", connecting: "מתחבר…", connected: "מחובר — מקשיב" };
  statusText.textContent = labels[state] || state;
}

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = { user: "אתה", assistant: "סוכן", tool: "כלי" }[role] || role;
  div.appendChild(roleEl);
  div.appendChild(document.createTextNode(text));
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
}

function updateLastAssistant(delta) {
  const msgs = transcript.querySelectorAll(".msg.assistant");
  if (!msgs.length) return;
  const last = msgs[msgs.length - 1];
  if (!last._fullText) last._fullText = "";
  last._fullText += delta;
  while (last.childNodes.length > 1) last.removeChild(last.lastChild);
  last.appendChild(document.createTextNode(last._fullText));
  transcript.scrollTop = transcript.scrollHeight;
}

function setEmptyState(text) {
  while (canvasBody.firstChild) canvasBody.removeChild(canvasBody.firstChild);
  const e = document.createElement("div");
  e.className = "canvas-empty";
  e.textContent = text;
  canvasBody.appendChild(e);
}

function resolveSource(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return "/file?path=" + encodeURIComponent(src);
}

// Fetch text content from a source path (e.g. /tmp/x.md). Used by canvas types
// that take raw text (markdown, html, code, json, text).
async function loadSourceText(src) {
  if (!src) return "";
  const url = resolveSource(src);
  const r = await fetch(url);
  if (!r.ok) throw new Error("fetch " + url + " -> " + r.status);
  return await r.text();
}

function showInCanvas({ type, source, content, title, language }) {
  while (canvasBody.firstChild) canvasBody.removeChild(canvasBody.firstChild);

  const wrap = document.createElement("div");
  wrap.className = "canvas-content";

  if (title) {
    const t = document.createElement("div");
    t.className = "item-title";
    t.textContent = title;
    wrap.appendChild(t);
    canvasTitle.textContent = title;
  } else {
    canvasTitle.textContent = "קנבס";
  }

  switch (type) {
    case "image": {
      const img = document.createElement("img");
      img.className = "canvas-image";
      img.src = resolveSource(source);
      img.alt = title || "";
      wrap.appendChild(img);
      break;
    }
    case "video": {
      const v = document.createElement("video");
      v.className = "canvas-video";
      v.src = resolveSource(source);
      v.controls = true;
      wrap.appendChild(v);
      break;
    }
    case "audio": {
      const a = document.createElement("audio");
      a.className = "canvas-audio";
      a.src = resolveSource(source);
      a.controls = true;
      wrap.appendChild(a);
      break;
    }
    case "url": {
      const f = document.createElement("iframe");
      f.className = "canvas-iframe";
      f.src = source;
      wrap.appendChild(f);
      break;
    }
    case "markdown": {
      const md = document.createElement("div");
      md.className = "canvas-markdown";
      if (content) {
        md.innerHTML = renderMarkdown(content);
      } else if (source) {
        md.textContent = "Loading…";
        loadSourceText(source)
          .then((t) => { md.innerHTML = renderMarkdown(t); })
          .catch((e) => { md.textContent = "Failed to load: " + e.message; });
      } else {
        md.textContent = "";
      }
      wrap.appendChild(md);
      break;
    }
    case "html": {
      const h = document.createElement("div");
      if (content) {
        h.innerHTML = content;
      } else if (source) {
        h.textContent = "Loading…";
        loadSourceText(source)
          .then((t) => { h.innerHTML = t; })
          .catch((e) => { h.textContent = "Failed to load: " + e.message; });
      }
      wrap.appendChild(h);
      break;
    }
    case "code": {
      const c = document.createElement("pre");
      c.className = "canvas-code";
      if (language) c.dataset.lang = language;
      if (content) {
        c.textContent = content;
      } else if (source) {
        c.textContent = "Loading…";
        loadSourceText(source)
          .then((t) => { c.textContent = t; })
          .catch((e) => { c.textContent = "Failed to load: " + e.message; });
      }
      wrap.appendChild(c);
      break;
    }
    case "json": {
      const j = document.createElement("pre");
      j.className = "canvas-json";
      const renderJson = (raw) => {
        try {
          const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
          j.textContent = JSON.stringify(obj, null, 2);
        } catch (e) {
          j.textContent = String(raw);
        }
      };
      if (content !== undefined) {
        renderJson(content);
      } else if (source) {
        j.textContent = "Loading…";
        loadSourceText(source).then(renderJson)
          .catch((e) => { j.textContent = "Failed to load: " + e.message; });
      }
      wrap.appendChild(j);
      break;
    }
    case "text":
    default: {
      const tx = document.createElement("div");
      tx.className = "canvas-text";
      if (content) {
        tx.textContent = content;
      } else if (source) {
        tx.textContent = "Loading…";
        loadSourceText(source)
          .then((t) => { tx.textContent = t; })
          .catch((e) => { tx.textContent = "Failed to load: " + e.message; });
      }
      wrap.appendChild(tx);
    }
  }

  canvasBody.appendChild(wrap);
}

function clearCanvas() {
  setEmptyState("קנבס נוקה");
  canvasTitle.textContent = "קנבס";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(md) {
  let h = escapeHtml(md);
  // GFM tables: header row + separator row + data rows
  h = h.replace(
    /(?:^\|.+\|[ \t]*\n)(?:^\|[\s\-:|]+\|[ \t]*\n)(?:^\|.+\|[ \t]*\n?)+/gm,
    (block) => {
      const lines = block.trim().split("\n").filter(Boolean);
      const parseRow = (line) =>
        line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const header = parseRow(lines[0]);
      const rows = lines.slice(2).map(parseRow);
      let out = '<table class="md-table"><thead><tr>';
      for (const c of header) out += "<th>" + c + "</th>";
      out += "</tr></thead><tbody>";
      for (const row of rows) {
        out += "<tr>";
        for (const c of row) out += "<td>" + c + "</td>";
        out += "</tr>";
      }
      out += "</tbody></table>";
      return out;
    }
  );
  h = h.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.*$)/gm, "<h1>$1</h1>");
  h = h.replace(/```([\s\S]*?)```/g, (_, code) => "<pre>" + code + "</pre>");
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  h = h.replace(/^\- (.*$)/gm, "<li>$1</li>");
  h = h.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  h = h.replace(/\n\n/g, "</p><p>");
  return "<p>" + h + "</p>";
}

async function executeTool(name, args) {
  if (name === "canvas_show") { showInCanvas(args); return { ok: true }; }
  if (name === "canvas_clear") { clearCanvas(); return { ok: true }; }

  const r = await fetch("/tool/" + encodeURIComponent(name), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const result = await r.json();

  if (name === "end_session") setTimeout(() => endSession(), 1200);
  return result;
}

async function handleFunctionCall(item) {
  let args = {};
  try { args = JSON.parse(item.arguments || "{}"); } catch {}
  const preview = JSON.stringify(args).slice(0, 120);
  addMessage("tool", item.name + "(" + preview + ")");

  const result = await executeTool(item.name, args);
  const resultStr = JSON.stringify(result);
  addMessage("tool", "← " + resultStr.slice(0, 200) + (resultStr.length > 200 ? "…" : ""));

  if (!dc || dc.readyState !== "open") return;

  dc.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: item.call_id,
      output: resultStr,
    },
  }));
  dc.send(JSON.stringify({ type: "response.create" }));
}

function handleServerEvent(event) {
  switch (event.type) {
    case "session.created":
      setStatus("connected");
      isConnected = true;
      break;
    case "conversation.item.input_audio_transcription.completed": {
      const t = event.transcript || "[לא ברור]";
      if (t.trim()) addMessage("user", t);
      break;
    }
    case "response.audio_transcript.delta": {
      const last = transcript.querySelector(".msg.assistant:last-of-type");
      if (!last || last.dataset.done === "true") addMessage("assistant", event.delta || "");
      else updateLastAssistant(event.delta || "");
      break;
    }
    case "response.output_item.done": {
      const msgs = transcript.querySelectorAll(".msg.assistant");
      if (msgs.length) msgs[msgs.length - 1].dataset.done = "true";
      break;
    }
    case "response.done": {
      if (event.response && event.response.output) {
        for (const out of event.response.output) {
          if (out.type === "function_call" && out.name) handleFunctionCall(out);
        }
      }
      break;
    }
  }
}

async function toggleConnection() {
  if (isConnected) { endSession(); return; }
  connectBtn.disabled = true;
  setStatus("connecting");
  connectBtn.textContent = "מתחבר…";

  try {
    const tokenRes = await fetch("/token");
    if (!tokenRes.ok) throw new Error("token http " + tokenRes.status);
    const tokenData = await tokenRes.json();
    const ek = tokenData.value || (tokenData.client_secret ? tokenData.client_secret.value : null);
    if (!ek) throw new Error("no ephemeral key");

    pc = new RTCPeerConnection();
    pc.ontrack = (e) => { audioOutput.srcObject = e.streams[0]; };

    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    micTrack = ms.getTracks()[0];
    pc.addTrack(micTrack);

    dc = pc.createDataChannel("oai-events");

    dc.addEventListener("open", () => {
      dc.send(JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: config.instructions,
          tools: config.tools,
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "whisper-1" },
              turn_detection: { type: "server_vad" },
            },
          },
        },
      }));

      if (config.canvas_hints && config.canvas_hints.length) {
        const hintsText = config.canvas_hints
          .map((h, i) => `${i + 1}. type=${h.type} title="${h.title || ""}" source="${h.source || ""}"`)
          .join("\n");
        dc.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{
              type: "input_text",
              text: "(System note — items available to display via canvas_show:\n" + hintsText + "\n)",
            }],
          },
        }));
      }

      dc.send(JSON.stringify({ type: "response.create" }));
    });

    dc.addEventListener("message", (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "error") console.error("Realtime error:", event);
        handleServerEvent(event);
      } catch (err) {
        console.error("parse error", err);
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: { Authorization: "Bearer " + ek, "Content-Type": "application/sdp" },
    });
    if (!sdpRes.ok) throw new Error("sdp " + sdpRes.status + ": " + (await sdpRes.text()).slice(0, 200));
    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    connectBtn.textContent = "סיים שיחה";
    connectBtn.className = "connect-btn stop";
    connectBtn.disabled = false;
    muteBtn.style.display = "block";
    doneBtn.style.display = "block";

  } catch (err) {
    console.error("connect failed", err);
    addMessage("tool", "שגיאת חיבור: " + err.message);
    setStatus("");
    connectBtn.textContent = "התחל שיחה";
    connectBtn.className = "connect-btn start";
    connectBtn.disabled = false;
  }
}

function toggleMute() {
  if (!micTrack) return;
  isMuted = !isMuted;
  micTrack.enabled = !isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🎙️";
  muteBtn.classList.toggle("muted", isMuted);
}

async function endSession() {
  try {
    if (dc) dc.close();
    if (pc) {
      pc.getSenders().forEach((s) => { if (s.track) s.track.stop(); });
      pc.close();
    }
  } catch {}
  pc = null; dc = null; micTrack = null;
  isConnected = false; isMuted = false;
  setStatus("");
  connectBtn.textContent = "השיחה הסתיימה";
  connectBtn.disabled = true;
  muteBtn.style.display = "none";
  doneBtn.style.display = "none";
  addMessage("tool", "השיחה הסתיימה. הפלט נשמר.");
  try { await fetch("/done", { method: "POST" }); } catch {}
}

window.addEventListener("beforeunload", () => {
  navigator.sendBeacon && navigator.sendBeacon("/done");
});

async function init() {
  try {
    const r = await fetch("/config");
    config = await r.json();
    topicTitle.textContent = config.topic || "Quick voice";
    topicSub.textContent = config.mode === "distill"
      ? "מצב distill — שיחה → סיכום מובנה"
      : "מצב live — עבודה על דאטה בזמן אמת";
    statusMode.textContent = config.mode;
    setStatus("");
  } catch (err) {
    statusText.textContent = "שגיאת טעינה: " + err.message;
  }
}
init();
