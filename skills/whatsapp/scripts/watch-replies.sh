#!/usr/bin/env bash
# watch-replies.sh — emit each NEW incoming WhatsApp message from a chat, one line each.
#
# Built to run UNDER Claude Code's `Monitor` tool: every stdout line becomes a
# notification, so you send a message, launch this, and keep working while
# replies arrive on their own. Exits only when killed (Monitor timeout / TaskStop).
#
# Usage:
#   watch-replies.sh --chat 972501234567 [--since <epoch>] [--interval 30]
#                    [--label REPLY] [--count 6]
#
#   --chat      contact number or group id (required)
#   --since     only report messages after this UNIX epoch (default: now).
#               Pass the moment you SENT, so pre-existing messages don't fire.
#   --interval  poll seconds (default 30; use >=30 for the Green API rate limit)
#   --label     prefix on each emitted line (default: REPLY)
#   --count     history window fetched per poll (default 6)
#
# Emits: "<LABEL>: <text>"  — one line per genuinely new incoming message.
# Handles text, extended text, reactions (shows the emoji), and media
# (shows "[imageMessage]" etc.) so a media/voice reply still fires an event.

set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CHAT=""; SINCE=""; INTERVAL=30; LABEL="REPLY"; COUNT=6
while [ $# -gt 0 ]; do
  case "$1" in
    --chat) CHAT="$2"; shift 2;;
    --since) SINCE="$2"; shift 2;;
    --interval) INTERVAL="$2"; shift 2;;
    --label) LABEL="$2"; shift 2;;
    --count) COUNT="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[ -z "$CHAT" ] && { echo "watch-replies.sh: --chat is required" >&2; exit 2; }
[ -z "$SINCE" ] && SINCE="$(date +%s)"

SEEN="$(mktemp -t wa_watch_XXXXXX)"
trap 'rm -f "$SEEN"' EXIT

while true; do
  npx --prefix "$DIR" ts-node "$DIR/get-messages.ts" --chat "$CHAT" --count "$COUNT" --json 2>/dev/null \
  | SEEN="$SEEN" BASE="$SINCE" LABEL="$LABEL" python3 -c '
import json, sys, os
base = int(os.environ["BASE"]); sp = os.environ["SEEN"]; label = os.environ["LABEL"]
seen = set(open(sp).read().split()) if os.path.exists(sp) else set()
try:
    msgs = json.load(sys.stdin)
except Exception:
    sys.exit(0)
new = []
for m in (msgs if isinstance(msgs, list) else []):
    if m.get("type") != "incoming":
        continue
    if int(m.get("timestamp", 0)) <= base:
        continue
    mid = m.get("idMessage")
    if not mid or mid in seen:
        continue
    tm = m.get("typeMessage")
    if tm == "reactionMessage":
        txt = "(reaction " + (m.get("extendedTextMessageData") or {}).get("text", "") + ")"
    else:
        txt = (m.get("textMessage")
               or (m.get("extendedTextMessage") or {}).get("text")
               or "[" + str(tm) + "]")
    new.append((mid, txt))
if new:
    with open(sp, "a") as f:
        for mid, _ in new:
            f.write(mid + "\n")
    for _, txt in new:
        print(label + ": " + txt.replace("\n", " / "), flush=True)
' || true
  sleep "$INTERVAL"
done
