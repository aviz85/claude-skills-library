# The Workflow Pipeline

## Overview Architecture

```
┌─────────────┐    PCM 16kHz     ┌──────────────────┐    WebSocket     ┌─────────────────────┐
│  Microphone  │ ──────────────► │  sounddevice      │ ──────────────► │  ElevenLabs Scribe   │
│  (hardware)  │    int16 mono   │  (Python capture)  │    base64 JSON  │  v2 Realtime         │
└─────────────┘                  └──────────────────┘                  └──────────┬────────────┘
                                                                                  │
                                                                     partial_transcript
                                                                     committed_transcript
                                                                                  │
                                                                                  ▼
┌─────────────┐    Read tool     ┌──────────────────┐    real-time     ┌──────────────────────┐
│  Claude Code │ ◄────────────── │  /tmp/transcribe- │ ◄────────────── │  Python asyncio      │
│  Agent       │    on demand    │  {timestamp}.txt   │    file write   │  event loop          │
└─────────────┘                  └──────────────────┘                  └──────────────────────┘
```

## Step 1: Audio Capture
### What We Did
Used Python's `sounddevice` library to capture microphone input as 16-bit PCM at 16kHz sample rate, mono channel.

### Technical Details
```python
stream = sd.InputStream(
    samplerate=16000,
    channels=1,
    dtype="int16",
    blocksize=1600,  # 100ms chunks
    callback=audio_callback,
)
```

### Why This Step
16kHz mono PCM is the sweet spot for speech recognition — enough quality for accurate transcription, low enough bandwidth for real-time WebSocket streaming.

## Step 2: WebSocket Streaming
### What We Did
Connected to ElevenLabs Scribe v2 Realtime API via WebSocket, streaming base64-encoded audio chunks.

### Technical Details
```python
ws_params = {
    "model_id": "scribe_v2_realtime",
    "audio_format": "pcm_16000",
    "commit_strategy": "vad",  # Voice Activity Detection
    "language_code": "he",
}
```

### Why This Step
VAD (Voice Activity Detection) mode lets ElevenLabs decide when a speech segment is complete, rather than manually managing silence detection. This produces natural, sentence-level commits.

## Step 3: Real-Time File Writing
### What We Did
Each `committed_transcript` event writes the accumulated text to a temp file immediately.

### Why This Step
The temp file acts as a shared memory between the transcription process and the Claude Code agent. The agent can read it at any time — even while recording continues.

## Step 4: Fuzzy Stop Detection
### What We Did
Used `rapidfuzz` to compare committed text against stop phrases with an 82% threshold.

### Technical Details
```python
STOP_PHRASES = [
    "אוקי זה מספיק בוא נעצור את התמלול",
    "stop transcription",
]
FUZZY_THRESHOLD = 82
```

### Why This Step
Exact string matching fails with speech — people say "אוקיי" instead of "אוקי", or add filler words. Fuzzy matching at 82% catches natural variations without false positives.

## Step 5: Audio Feedback
### What We Did
Pre-recorded 3 audio cues using ElevenLabs TTS v3 (in the user's cloned voice) and play them at key moments.

### Why This Step
Without audio feedback, you don't know if the transcription actually started or stopped. The voice cues close the feedback loop without requiring you to look at the terminal.
