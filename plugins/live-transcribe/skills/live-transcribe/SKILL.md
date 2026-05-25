---
name: live-transcribe
description: "Start real-time microphone transcription using ElevenLabs Scribe v2 Realtime. Use when user wants to start live transcription, dictation, or real-time speech capture. Triggers on: 'start transcribing', 'live transcribe', 'record what I say', 'real-time transcription'. After starting, tell user they can say 'ok stop transcribing' to stop via voice, or use /live-transcribe:stop."
---

# Live Transcribe — Start

Start real-time microphone transcription via ElevenLabs Scribe v2 Realtime WebSocket API.

## Start command

```bash
ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" \
  nohup python3 <plugin-dir>/scripts/realtime-transcribe.py > /tmp/realtime-transcribe.log 2>&1 &
```

The API key must be set in the environment. Check `~/.claude/skills/transcribe/scripts/.env` or the user's env.

Wait ~4 seconds, then read `/tmp/realtime-transcribe.log` first line for startup JSON:
```json
{"status": "started", "pid": 12345, "output_file": "/tmp/transcribe-20260526-143022.txt"}
```

## Before starting

Check if one is already running:
```bash
test -f /tmp/realtime-transcribe.pid && kill -0 $(cat /tmp/realtime-transcribe.pid) 2>/dev/null && echo "ALREADY RUNNING"
```

## Audio cues

Pre-recorded sounds in the plugin's `assets/` directory play automatically:
- **Start:** before recording begins
- **Stop:** when transcription ends (any method)
- **Reminder:** every 30 minutes

## What to return

1. The output file path
2. That transcription is running
3. Ways to stop: voice phrase, chat command, or `/live-transcribe:stop`
