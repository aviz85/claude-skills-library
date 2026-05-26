---
name: live-transcribe
description: "Start real-time microphone transcription using ElevenLabs Scribe v2 Realtime. Use when user wants to start live transcription, dictation, or real-time speech capture. Triggers on: 'תתחיל תמלול', 'תמלל בזמן אמת', 'start transcribing', 'live transcribe', 'הקלט מה שאני אומר'. After starting, tell user they can say 'אוקי זה מספיק בוא נעצור את התמלול' to stop, or use /live-transcribe-stop."
---

# Live Transcribe — Start

Start real-time microphone transcription. The script captures audio, streams to ElevenLabs Scribe v2 Realtime via WebSocket, and writes committed text to a temp file continuously.

## Start command

```bash
source ~/.claude/skills/transcribe/scripts/.env && \
  ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" \
  nohup python3 ~/.claude/scripts/realtime-transcribe.py > /tmp/realtime-transcribe.log 2>&1 &
```

Wait ~4 seconds, then read the first line of `/tmp/realtime-transcribe.log` for the startup JSON:

```json
{"status": "started", "pid": 12345, "output_file": "/tmp/transcribe-20260526-143022.txt", ...}
```

## Before starting

Check if one is already running:
```bash
test -f /tmp/realtime-transcribe.pid && kill -0 $(cat /tmp/realtime-transcribe.pid) 2>/dev/null && echo "ALREADY RUNNING"
```

If already running, tell the user and offer to stop first.

## What to tell the user

1. Transcription is running
2. The output file path
3. Ways to stop: say "אוקי, זה מספיק, בוא נעצור את התמלול", or ask the agent to stop, or `/live-transcribe-stop`
4. They can ask to read the transcript anytime

## Audio cues

Pre-recorded sounds play automatically:
- **Start:** "התחלתי תמלול!" (before recording begins)
- **Stop:** "סיימתי את התמלול." (after recording ends)
- **Reminder:** "אני עדיין מתמלל." (every 30 minutes)
