---
name: whatsapp
description: "WhatsApp automation using Green API. Send messages, voice notes, images, and get group members."
version: "1.0.0"
author: aviz85
tags:
  - whatsapp
  - messaging
  - automation
enhancedBy:
  - get-contact: "Auto-lookup contact by name. Without it: ask user for phone directly"
  - speech-generator: "Generate voice audio with TTS. Without it: send existing audio files only"
setup: "./SETUP.md"
setup_complete: false
---

# WhatsApp Automation (Green API)

> **First time?** If `setup_complete: false` above, run `./SETUP.md` first, then set `setup_complete: true`.

Send messages and get group information via WhatsApp.

## Workflow

1. **Get contact** - Use `get-contact` skill or ask user for phone
2. **Send message** - Text, voice, image, or file
3. **Confirm delivery** - Check response for success

## Scripts

All scripts in `scripts/` folder:

| Script | Use |
|--------|-----|
| `send-message.ts` | Text messages |
| `send-voice.ts` | Voice notes (converts to OGG) |
| `send-image.ts` | Images with captions |
| `get-group-members.ts` | Extract group phone numbers |

## Quick Examples

```bash
cd scripts/

# Text message
npx ts-node send-message.ts --phone "972501234567" --message "Hello!"

# Voice note
npx ts-node send-voice.ts --phone "972501234567" --audio "/path/audio.mp3"

# Image with caption
npx ts-node send-image.ts --phone "972501234567" --image "/path/image.jpg" --caption "Check this!"

# Preview without sending
npx ts-node send-message.ts --phone "972501234567" --message "Test" --dry-run
```

## Sending Video & Audio — encode to AAC

WhatsApp (and Facebook) play a video **silently** if its audio track is MP3 muxed into an MP4 — the file is valid and has sound in desktop players, but the mobile app drops it. Always ship video with **AAC** audio:

```bash
# Re-encode ONLY the audio to AAC, leave the video untouched; +faststart for streaming
ffmpeg -y -i in.mp4 -c:v copy -c:a aac -b:a 192k -movflags +faststart out.mp4

# Verify it isn't silent before sending
ffmpeg -i out.mp4 -af volumedetect -f null /dev/null 2>&1 | grep mean_volume
```

Voice notes: convert the source to OGG/Opus first (`send-voice.ts` handles this) — raw MP3 in a container is unreliable in the app.

## Phone Formats

| Input | Normalized |
|-------|------------|
| `0501234567` | `972501234567@c.us` |
| `+972501234567` | `972501234567@c.us` |
| `972501234567` | `972501234567@c.us` |

## Default Numbers

Configure your test number in skill for quick access:

| Alias | Number |
|-------|--------|
| **myself / me / test** | `YOUR_PHONE_NUMBER` |

## Notes

- Use `--dry-run` to preview before bulk operations
- Voice notes require `ffmpeg` installed
- Rate limits apply when sending many messages
