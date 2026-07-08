---
name: whatsapp
description: "WhatsApp automation (Green API primary, WAHA fallback). Use for: send/receive messages, send voice/images/files, retrieve incoming messages (text, voice, images), transcribe voice messages. WAME = 'WhatsApp ME' = send me by WhatsApp."
enhancedBy:
  - get-contact: "Auto-lookup phone by name. Without it: ask user for phone directly"
---

# WhatsApp Automation

Send messages via unified script with Green API (primary) + WAHA (fallback if configured).

## Quick Start - Unified Script

```bash
cd ~/.claude/skills/whatsapp/scripts

# Text message
npx ts-node send-message.ts "Hello!" --to 972501234567

# Multiline text from shell: use $'...'
npx ts-node send-message.ts $'Line 1\n\nLine 2\n- Bullet A\n- Bullet B' --to 972501234567

# Image with caption
npx ts-node send-message.ts --to 972501234567 --image /path/to/image.jpg --caption "Check this out!"

# Video with caption
npx ts-node send-message.ts --to 972501234567 --video /path/to/video.mp4 --caption "Watch this!"

# Any media file (auto-detect)
npx ts-node send-message.ts --to 972501234567 --media /path/to/any-file --caption "Here!"

# Voice message
npx ts-node send-message.ts --to 972501234567 --voice /path/to/audio.ogg

# File/document
npx ts-node send-message.ts --to 972501234567 --file /path/to/doc.pdf --caption "Here's the doc"

# Send to group
npx ts-node send-message.ts "Group message" --group 120363xxx@g.us

# Reply to a specific message (quoted reply)
npx ts-node send-message.ts "Reply!" --group 120363xxx@g.us --quote BAE5367237E13A1B

# Voice as quoted reply
npx ts-node send-message.ts --group 120363xxx@g.us --voice /tmp/voice.mp3 --quote BAE5367237E13A1B

# Dry run (preview)
npx ts-node send-message.ts "Test" --to 972501234567 --dry-run
```

## Default Numbers

| Alias | Number | Use Case |
|-------|--------|----------|
| **myself / me / test** | `$MY_PHONE` (from `config.sh`) | Default recipient |

## Sending Video & Audio — encode to AAC

WhatsApp (and Facebook) play a video **silently** if its audio track is MP3 muxed into an MP4 — the file is valid and has sound in desktop players, but the mobile app drops it. Always ship video with **AAC** audio:

```bash
# Re-encode ONLY the audio to AAC, leave the video untouched; +faststart for streaming
ffmpeg -y -i in.mp4 -c:v copy -c:a aac -b:a 192k -movflags +faststart out.mp4

# Verify it isn't silent before sending
ffmpeg -i out.mp4 -af volumedetect -f null /dev/null 2>&1 | grep mean_volume
```

Voice notes: convert the source to OGG/Opus first — raw MP3 in a container is unreliable in the app.

## Script Options

| Option | Description |
|--------|-------------|
| `"message"` | Text message (first positional argument) |
| `--to, --phone <NUMBER>` | Phone number (Israeli format accepted) |
| `--group <ID>` | Group ID (format: 120363xxx@g.us) |
| `--image <PATH>` | Attach image file |
| `--video <PATH>` | Attach video file (MP4, etc.) |
| `--media <PATH>` | Attach any media file (auto-detect) |
| `--voice <PATH>` | Send voice message (OGG/MP3) |
| `--file <PATH>` | Attach document/file |
| `--caption <TEXT>` | Caption for media files |
| `--quote <MSG_ID>` | Reply to a specific message (quotedMessageId) |
| `--dry-run` | Preview without sending |

## Multiline Formatting

When sending a WhatsApp message with line breaks from the shell, do **not** pass literal `\n` inside a normal quoted string if you want actual newlines in the final message.

Use shell ANSI-C quoting instead:

```bash
npx ts-node send-message.ts $'Hi\n\nLine 2\n- Item 1\n- Item 2' --group 120363xxx@g.us
```

Why:
- `"text with \n"` sends the characters `\` + `n` — but the script auto-converts these to real newlines
- `$'text with \n'` sends real line breaks natively

Either form works — the script normalizes literal `\n` to real newlines before sending.

**Apostrophes inside `$'...'`:** Use `\'` directly — do NOT use the `'\''` trick. The `'\''` pattern breaks out of ANSI-C quoting, and everything after it becomes regular single-quoted (where `\n` is literal).

```bash
# CORRECT — apostrophe inside $'...'
$'I\'ve added a check.\n\nNext line.'

# WRONG — breaks ANSI-C quoting, \n becomes literal after the apostrophe
$'I'\''ve added a check.\n\nNext line.'
```

For structured WhatsApp messages, prefer:
- short opening line
- blank line
- short bullet list
- blank line
- closing line

## Formatting Rule — Match Language

**English messages:** Use regular bullets/dashes. Never use Hebrew letters (א. ב. ג.) in English text.

```
- First item
- Second item
- Third item
```

**Hebrew messages:** Every line must start with a Hebrew character for correct RTL rendering. Use Hebrew letters for list items.

```
א. פריט ראשון
ב. פריט שני
ג. פריט שלישי
```

**Don't mix:** No Hebrew letters in English messages, no dashes/numbers in Hebrew messages.

**Don't:**
```
- פריט ראשון
1. פריט שני
* פריט שלישי
```

Lines starting with non-Hebrew characters (dashes, numbers, asterisks, English) break RTL alignment in WhatsApp. Always ensure the first visible character is Hebrew.

## Provider Logic

| Content Type | Primary | Fallback |
|--------------|---------|----------|
| **Text** | Green API | WAHA (if configured) |
| **Image** | Green API | - |
| **Video** | Green API | - |
| **Voice** | Green API | - |
| **File** | Green API | - |

**Note:** WAHA is not currently installed. Green API handles all message types.

## Configuration

Credentials in `scripts/.env`:

```env
# Green API (primary provider)
GREEN_API_URL=https://7103.api.greenapi.com
GREEN_API_INSTANCE=your_instance
GREEN_API_TOKEN=your_token

# WAHA (optional fallback — uncomment if installed)
# WAHA_URL=http://localhost:3001
# WAHA_API_KEY=your_key
# WAHA_SESSION=default
```

## Phone Number Format

| Input | Normalized |
|-------|------------|
| `972501234567` | `972501234567@c.us` |
| `0501234567` | `972501234567@c.us` |
| `501234567` | `972501234567@c.us` |

## Direct API (WAHA)

For text messages only:

```bash
source ~/.claude/skills/whatsapp/config.sh

curl -s -X POST "$WAHA_URL/api/sendText" \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "chatId": "972501234567@c.us",
    "text": "Hello!"
  }'
```

## Check Session Status

```bash
source ~/.claude/skills/whatsapp/config.sh
curl -s -H "X-Api-Key: $WAHA_API_KEY" "$WAHA_URL/api/sessions/default"
```

## Finding Contact by Name

When user says "send WhatsApp to [name]" without phone number:

1. Use `get-contact` skill to search CRM
2. If not found → ask user for phone
3. If multiple → ask user to choose
4. If one → confirm before sending

**Always confirm contact before sending.**

## Finding a Group by Name or Project

When user says "send to [project] group" — search Green API directly (WAHA may be down):

```bash
TOKEN=$(grep "GREEN_API_TOKEN" ~/.claude/skills/whatsapp/scripts/.env | cut -d'=' -f2)
INSTANCE=$(grep "GREEN_API_INSTANCE" ~/.claude/skills/whatsapp/scripts/.env | cut -d'=' -f2)
curl -s "https://7103.api.greenapi.com/waInstance$INSTANCE/getChats/$TOKEN" | python3 -c "
import json,sys
data=json.load(sys.stdin)
for c in (data if isinstance(data,list) else []):
    if '@g.us' in c.get('id',''):
        print(c.get('id'), '|', c.get('name',''))
"
```

Then send using `send-message.ts --group <ID>`.

**Never check WAHA session before sending** — the script handles fallback automatically.

## Provider Notes

Green API is the primary provider. WAHA is not installed and only used as fallback if explicitly configured.
Just run `send-message.ts` — it uses Green API directly.

## Retrieving Messages (get-messages.ts)

Fetch incoming messages, voice recordings, and media from any contact:

```bash
# Get recent messages from a contact
npx ts-node get-messages.ts --chat 972526062921 --count 5

# Get messages from last 2 hours
npx ts-node get-messages.ts --chat 972526062921 --minutes 120

# Get all messages from a time range
npx ts-node get-messages.ts --start "2h ago" --end "now"

# Output as JSON (includes download URLs for media)
npx ts-node get-messages.ts --chat 972526062921 --json
```

**What you get:**
- Text messages with full content
- **Voice messages** with download URL (OGA/OGG format) — can be transcribed separately
- **Images** with download URL and metadata
- Timestamps, sender info, file names
- All message types (extended text, reactions, media)

**Quoted/reply messages are shown inline** — `get-messages.ts` now displays quoted context automatically with `↳ Reply to` prefix. Both `extendedTextMessage` and `quotedMessage` types are handled.

Message types: `textMessage`, `extendedTextMessage` (with `.text`), `quotedMessage` (reply with `.quotedMessage.textMessage`), `reactionMessage`, `imageMessage`

**Voice Message Workflow:**
1. Get messages with `get-messages.ts --json`
2. Extract `downloadUrl` from `audioMessage` type
3. Download the OGA file
4. Convert to WAV: `ffmpeg -i file.oga -ar 16000 file.wav`
5. Transcribe: `/transcribe --language he /path/to/file.wav`

## Waiting for Replies — Monitor Integration

Sometimes after sending a message you need the contact's reply **before you can continue** — an approval, a decision, feedback, a "how much do I owe you". Instead of stopping and asking the user to watch the chat, hand the waiting to the `Monitor` tool and keep working; each new reply arrives as a notification.

Use `scripts/watch-replies.sh` — it polls for genuinely *new* incoming messages (dedupes by id, handles text / reactions / media) and prints one line per reply, which is exactly what `Monitor` consumes. Exits only when killed (Monitor timeout / `TaskStop`).

```bash
# usage
scripts/watch-replies.sh --chat <number|groupId> [--since <epoch>] [--interval 30] [--label REPLY]
```

Launch it through the **Monitor** tool (not Bash), so replies notify you while you keep working:
- `command`: `~/.claude/skills/whatsapp/scripts/watch-replies.sh --chat 972501234567 --since "$(date +%s)" --label CLIENT`
- `timeout_ms`: how long to wait (e.g. `3600000` for an hour).
- **Always set `--since` to the moment you sent** (`$(date +%s)`), or old history re-fires as if new.

> ⚠️ **Do NOT hand-roll an inline poller in the Monitor `command`.** Passing a group id or JSON body directly in the shell breaks under zsh — `@g.us` triggers `bad math expression: illegal character: @`, and the monitor exits 1. `watch-replies.sh` takes the chat as an **argument** (`--chat <id>`), so group ids are safe. Always reach for this script; never inline the group id + curl/python in the Monitor command.

### Decide per situation whether to use it
Reach for it when the reply changes what you do next:
- you sent something that needs **approval before the next step** (a draft, a preview, a quote);
- you asked a **question** and will act on the answer;
- you're in an **iterative loop** (send fix → they review → send next);
- you started long work and want to hear back **without blocking**.

Skip it for fire-and-forget (a confirmation, an FYI, a "done") — no reply is expected, so there's nothing to watch.

### Staying in the conversation
Often the right move is to *remain engaged*: when a reply lands, respond, then **re-arm a fresh watcher** (new `--since`) for the next turn. That's a real back-and-forth — send sample → they approve → send fix → wait again — until the thread naturally closes (final approval, thanks, payment settled, or the user says wrap up). Each round: **send → watch → reply → re-watch.** Use your judgement on when the exchange is genuinely done and it's time to stop watching.

### Discipline
- Each watcher has its own dedupe file, so two watchers on the same chat double-fire — `TaskStop` the old one before arming a new one.
- Reactions surface as `(reaction 👍)` and media as `[imageMessage]`; when you need the image URL / caption / voice file, pull the full record with `get-messages.ts --json`.

## When to Use

- Send notifications or alerts
- Share images/posters
- Voice messages
- Document sharing
- Automated reminders
- Workshop follow-ups
- **Retrieve and transcribe voice messages** from customers
- **Check media attachments** from contacts
