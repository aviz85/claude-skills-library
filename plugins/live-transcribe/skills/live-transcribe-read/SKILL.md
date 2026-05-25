---
name: live-transcribe-read
description: "Read the latest real-time transcription. Use when user asks to see, read, or show a transcription captured via live-transcribe. Triggers on: 'read transcription', 'show transcript', 'what did I say', 'latest transcription'. Also use when user references transcription content implicitly — e.g. 'summarize what I said', 'translate the transcription'."
---

# Live Transcribe — Read

Read the most recent transcription file from a live-transcribe session.

## Finding the latest transcription

```bash
ls -t /tmp/transcribe-*.txt 2>/dev/null | head -1
```

Files are named `/tmp/transcribe-{YYYYMMDD-HHMMSS}.txt`.

## Check if transcription is still active

```bash
if test -f /tmp/realtime-transcribe.pid && kill -0 $(cat /tmp/realtime-transcribe.pid) 2>/dev/null; then
  echo "ACTIVE"
else
  echo "FINISHED"
fi
```

## What to tell the user

1. The transcription text
2. Whether it's still being updated or finished
3. If no files found: no transcription has been recorded yet
