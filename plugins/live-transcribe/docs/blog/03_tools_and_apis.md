# Tools and APIs

## ElevenLabs Scribe v2 Realtime
- **Endpoint:** `wss://api.elevenlabs.io/v1/speech-to-text/realtime`
- **Auth:** `xi-api-key` header
- **Model:** `scribe_v2_realtime`
- **Latency:** ~150ms
- **Languages:** 90+
- **Cost:** Per-minute pricing (see ElevenLabs dashboard)
- **Key feature:** VAD commit strategy — auto-detects speech segments

### Message Format
```json
// Send (client → server)
{"message_type": "input_audio_chunk", "audio_base_64": "...", "sample_rate": 16000}

// Receive (server → client)
{"message_type": "committed_transcript", "text": "הטקסט שנאמר"}
```

## ElevenLabs TTS v3
- **Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Model:** `eleven_v3`
- **Used for:** Pre-generating audio cue files (start, stop, reminder)
- **Voice:** User's cloned voice for natural feedback

## Python Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `sounddevice` | latest | Microphone capture (PortAudio wrapper) |
| `websockets` | latest | WebSocket client for ElevenLabs |
| `numpy` | latest | Audio buffer handling |
| `rapidfuzz` | latest | Fuzzy string matching for stop phrase |

## macOS Utilities
- `afplay` — plays MP3 audio cues (non-blocking via subprocess)

## Gotchas
1. `sounddevice` needs microphone permission — Terminal must be authorized in System Preferences
2. `afplay` is macOS-only — swap for `aplay` on Linux
3. ElevenLabs WebSocket requires ping_interval=20 to keep connection alive
4. VAD can produce very short commits for filler sounds — filter by minimum length
