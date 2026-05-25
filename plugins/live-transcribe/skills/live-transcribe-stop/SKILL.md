---
name: live-transcribe-stop
description: "Stop a running real-time transcription. Use when user wants to stop/end live transcription. Triggers on: 'stop transcription', 'end transcription', 'stop recording'."
---

# Live Transcribe — Stop

Stop a running real-time transcription session.

## Stop command

```bash
bash <plugin-dir>/scripts/stop-transcribe.sh
```

Or simply:
```bash
touch /tmp/realtime-transcribe.stop
```

## After stopping

Read the final transcript:
```bash
ls -t /tmp/transcribe-*.txt | head -1
```
