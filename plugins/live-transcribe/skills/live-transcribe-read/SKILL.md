---
name: live-transcribe-read
description: "Read the latest real-time transcription. Use when user asks to see, read, or show a transcription that was captured via live-transcribe. Triggers on: 'תקריא תמלול', 'מה תמללתי', 'התמלול האחרון', 'show transcription', 'what did I say', 'read the transcript', 'מה נכתב בתמלול', 'תראה לי את התמלול'. Also use when user references transcription content without being explicit — e.g. 'summarize what I said', 'translate the transcription'."
---

# Live Transcribe — Read

Read the most recent transcription file from a live-transcribe session.

## Finding the latest transcription

The real-time transcript lives in the **log file**, not the .txt file. The log updates continuously during recording.

```bash
# Primary source — real-time log (updates live during recording)
cat /tmp/realtime-transcribe.log 2>/dev/null

# Extract only the spoken text (strip metadata lines)
grep '^\[committed\]' /tmp/realtime-transcribe.log 2>/dev/null | sed 's/^\[committed\] //'
```

The `.txt` file (`/tmp/transcribe-*.txt`) may contain a final dump but does NOT update in real-time. Always prefer the log file.

## Check if transcription is still active

```bash
if test -f /tmp/realtime-transcribe.pid && kill -0 $(cat /tmp/realtime-transcribe.pid) 2>/dev/null; then
  echo "ACTIVE — file is still being updated"
else
  echo "FINISHED — file is complete"
fi
```

## Read the file

Use `grep` to extract committed text from the log, stripping `[committed]` prefixes. Skip the first JSON status line and `[session started]` markers.

## What to tell the user

1. The transcription text
2. Whether it's still being updated or finished
3. If still active: they can check again later for more content
4. If no files found: tell them no transcription has been recorded yet

## Working with the transcription

The user may ask to do things with the text beyond just reading it:
- Summarize, translate, extract action items, format, etc.
- The text is available in the main context after reading — proceed with whatever the user asks
