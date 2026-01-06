---
name: whatsapp
description: "WhatsApp automation using Green API. Use when the user wants to 'get group members', 'get phone numbers from group', 'send WhatsApp message', 'message participants', 'send voice', 'send audio', 'voice message', 'send image', 'send poster', 'send file', or any WhatsApp-related task."
---

# WhatsApp Automation (Green API)

Send messages and get group information via WhatsApp using Green API.

## Related Skills

| Skill | Use For |
|-------|---------|
| `speech-generator` | Generate voice audio with ElevenLabs TTS. Use this first when user asks to "send voice message" or "send audio message", then send the generated audio via WhatsApp. |

## Default Numbers

Configure your default phone number for quick testing:

| Alias | Number | Use Case |
|-------|--------|----------|
| **myself / me / test** | `YOUR_PHONE_NUMBER` | Send to yourself when: no number specified, "send to myself", "send to me", or any test messages |

**TIP:** Edit this section with your phone number (international format, no +) for quick access.

## Prerequisites

1. Green API account at [green-api.com](https://green-api.com)
2. Instance created and authorized (QR code scanned)
3. Credentials configured in `.env` file

## Setup

### 1. Install Dependencies

```bash
cd ~/.claude/skills/whatsapp/scripts
npm install
```

### 2. Configure Credentials

Create `.env` file in the scripts folder:

```bash
GREEN_API_URL=https://7103.api.greenapi.com
GREEN_API_INSTANCE=your_instance_id
GREEN_API_TOKEN=your_api_token
```

Get credentials from [green-api.com console](https://console.green-api.com/).

## Scripts

### 1. Get Group Members

Extract all phone numbers from a WhatsApp group.

```bash
cd ~/.claude/skills/whatsapp/scripts
npx ts-node get-group-members.ts "GROUP_ID"
```

**Output options:**
```bash
# Just phone numbers (one per line)
npx ts-node get-group-members.ts "GROUP_ID" --phones-only

# Full JSON output
npx ts-node get-group-members.ts "GROUP_ID" --json

# Save to file
npx ts-node get-group-members.ts "GROUP_ID" --phones-only > phones.txt
```

**GROUP_ID format:** `120363123456789012@g.us`

### 2. Send Message

Send WhatsApp messages to individuals or groups.

```bash
cd ~/.claude/skills/whatsapp/scripts

# Send to individual
npx ts-node send-message.ts --phone "972501234567" --message "Hello!"

# Send to group
npx ts-node send-message.ts --group "GROUP_ID" --message "Hello group!"

# Send DM to all group members
npx ts-node send-message.ts --group "GROUP_ID" --dm-all --message "Personal message"

# Preview without sending
npx ts-node send-message.ts --phone "972501234567" --message "Test" --dry-run
```

**Options:**
| Option | Description |
|--------|-------------|
| `--phone <NUMBER>` | Phone number (international, no +) |
| `--group <ID>` | Group ID (`120363xxx@g.us`) |
| `--message <TEXT>` | Message text |
| `--dm-all` | DM each group participant |
| `--dry-run` | Preview without sending |

### 3. Send Image

Send images with optional captions.

```bash
cd ~/.claude/skills/whatsapp/scripts

# Send image
npx ts-node send-image.ts --phone "972501234567" --image "/path/to/image.jpg"

# Send image with caption
npx ts-node send-image.ts --phone "972501234567" --image "/path/to/image.jpg" --caption "Check this out!"
```

**Options:**
| Option | Description |
|--------|-------------|
| `--phone <NUMBER>` | Phone number (international, no +) |
| `--image <PATH>` | Path to image file (jpg, png, gif, webp) |
| `--caption <TEXT>` | Optional caption for the image |
| `--dry-run` | Preview without sending |

**Supported formats:** JPG, PNG, GIF, WebP, MP4, PDF (max 100MB)

### 4. Send Voice Message

Send audio as WhatsApp voice note (converts to OGG/opus).

```bash
cd ~/.claude/skills/whatsapp/scripts

# Send voice note
npx ts-node send-voice.ts --phone "972501234567" --audio "/path/to/audio.mp3"

# Preview without sending
npx ts-node send-voice.ts --phone "972501234567" --audio "/path/to/audio.mp3" --dry-run
```

**Options:**
| Option | Description |
|--------|-------------|
| `--phone <NUMBER>` | Phone number (international, no +) |
| `--audio <PATH>` | Path to audio file (mp3, wav, etc.) |
| `--dry-run` | Preview without sending |

**Note:** Audio is converted to OGG (opus codec) for WhatsApp voice note format. Requires ffmpeg.

## Examples

### Get all numbers from a workshop group
```bash
npx ts-node get-group-members.ts "120363044291817037@g.us" --phones-only
```

### Send workshop link to everyone
```bash
npx ts-node send-message.ts \
  --group "120363044291817037@g.us" \
  --dm-all \
  --message "הנה הקישור לסדנה: https://example.com/watch"
```

### Send thank you to group
```bash
npx ts-node send-message.ts \
  --group "120363044291817037@g.us" \
  --message "תודה על ההשתתפות! 🎉"
```

## Phone Number Formats

- **Input:** `0501234567`, `+972501234567`, `972501234567`
- **Output:** `972501234567` (normalized)
- **WhatsApp format:** `972501234567@c.us`

## Notes

- Phone must be connected to internet
- Rate limits apply when sending many messages
- Use `--dry-run` to preview before bulk operations
- Group ID can be found in WhatsApp Web URL or via API
