# Learnings

## What Worked Well

1. **asyncio.gather for concurrent tasks** — sending audio, receiving transcripts, and running the reminder timer all run concurrently without threads
2. **VAD commit strategy** — letting ElevenLabs decide when a sentence is complete produces much better results than manual silence detection
3. **Fuzzy matching at 82%** — high enough to avoid false positives, low enough to catch natural speech variations
4. **Non-blocking audio cues** — `subprocess.Popen` without `wait()` lets the sound play while the process continues/exits
5. **Temp file as shared memory** — dead simple, zero infrastructure, works perfectly for single-machine agent workflows

## What Didn't Work

1. **Fuzzy matching on partial transcripts** — partial transcripts are too noisy and incomplete; matching against them caused false stop detections. Solution: only match against committed (finalized) text.
2. **Stop sound in Python's `finally` block** — `asyncio.gather` waits for ALL tasks, and `reminder_loop` sleeps for 30 minutes. The `finally` block never ran until the sleep completed. Solution: use `asyncio.wait_for(stop_event.wait(), timeout=...)` in the reminder loop.
3. **Stop sound in `stop-transcribe.sh` only** — doesn't cover the voice-triggered stop path. Solution: play sound at the exact detection point in Python, before setting stop_event.
4. **ElevenLabs TTS v2 vs v3** — v2 voice quality was noticeably worse for short Hebrew phrases. Always use `eleven_v3`.

## Surprises

1. **"התחלתי תמלול!" gets transcribed** — the start sound plays through speakers, the microphone picks it up, and it appears in the transcript. Fix: play the sound *before* starting the microphone.
2. **afplay survives parent process death** — on macOS, `Popen` spawns afplay as a separate process that keeps playing even if Python exits. This turned a bug into a feature for the stop sound.
3. **The agent can read the file mid-conversation** — this unlocks patterns we didn't plan for, like live summarization and real-time context injection.

## Recommendations

- **Start with VAD, not manual commit** — it produces better sentence boundaries
- **Fuzzy threshold 80-85%** — lower risks false positives, higher misses natural variations
- **Pre-generate audio cues** — generating TTS on every start/stop adds unnecessary latency and API cost
- **Keep the temp file simple** — plain text, no JSON, no timestamps. The agent can add structure later.
