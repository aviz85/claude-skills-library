# Results

## Before vs After

| Metric | Before (manual) | After (live-transcribe) |
|--------|-----------------|-------------------------|
| Meeting notes | Manual typing post-meeting | Real-time, automatic |
| Context transfer to agent | 5-15 min summarizing | Instant (read file) |
| Voice input processing | Record → upload → transcribe → paste | Speak → agent reads live |
| Action item extraction | Manual review | Agent processes in real-time |
| Latency | Minutes (batch) | 150ms (streaming) |

## Transcription Quality
- **Provider:** ElevenLabs Scribe v2 Realtime
- **Accuracy:** ~93.5% across 30 languages (FLEURS benchmark)
- **Hebrew:** Excellent — tested with casual speech, filler words, code-switching
- **Latency:** 150ms — faster than a human typist

## Stop Phrase Detection
- **Method:** Fuzzy matching (rapidfuzz partial_ratio)
- **Threshold:** 82%
- **True positive rate:** Catches natural variations ("אוקיי" vs "אוקי", added filler words)
- **False positive rate:** Zero in testing (threshold high enough to avoid accidental triggers)

## Resource Usage
- **CPU:** Minimal — audio capture and base64 encoding are lightweight
- **Network:** ~32 KB/s upstream (16kHz × 16-bit × base64 overhead)
- **Disk:** Plain text file, grows at ~1 KB per minute of speech
