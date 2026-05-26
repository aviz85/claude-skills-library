---
name: live-transcribe-stop
description: "Stop a running real-time transcription. Use when user wants to stop/end live transcription. Triggers on: 'עצור תמלול', 'תעצור את התמלול', 'stop transcribing', 'end transcription', 'תפסיק להקליט'."
---

# Live Transcribe — Stop

Stop a running real-time transcription session.

## Stop command

```bash
bash ~/.claude/scripts/stop-transcribe.sh
```

This sends a graceful stop signal and waits up to 5 seconds, then force-kills if needed.

## After stopping

Read the final transcript file to confirm what was captured:
```bash
ls -t /tmp/transcribe-*.txt | head -1
```
