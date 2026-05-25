# Live Transcribe — Real-Time Speech-to-Text for Claude Code

A Claude Code plugin that adds real-time microphone transcription using ElevenLabs Scribe v2 Realtime WebSocket API.

Your AI agent becomes a live transcription assistant — start recording, keep working, read the transcript anytime, and stop when you're done. Voice-activated stop phrase detection included.

## What it does

- Streams microphone audio to ElevenLabs Scribe v2 Realtime via WebSocket
- Writes committed text to a temp file in real-time as you speak
- Plays audio cues: start, stop, and a 30-minute reminder
- Detects a stop phrase ("ok stop transcribing") using fuzzy matching
- Three skills work together: `start`, `read`, `stop`

## Requirements

- **ElevenLabs API key** with Scribe access ([elevenlabs.io](https://elevenlabs.io))
- **Python 3.10+** with these packages:
  ```bash
  pip install sounddevice websockets numpy rapidfuzz
  ```
- **macOS** (uses `afplay` for audio cues — easy to swap for `aplay` on Linux)
- **Microphone access** granted to your terminal

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/aviz85/claude-skills-library.git
```

### 2. Copy the skills to your Claude Code skills directory

```bash
cp -r claude-skills-library/plugins/live-transcribe/skills/* ~/.claude/skills/
```

### 3. Copy scripts and audio assets

```bash
cp claude-skills-library/plugins/live-transcribe/scripts/realtime-transcribe.py ~/.claude/scripts/
cp claude-skills-library/plugins/live-transcribe/scripts/stop-transcribe.sh ~/.claude/scripts/
chmod +x ~/.claude/scripts/stop-transcribe.sh

mkdir -p ~/.claude/scripts/transcribe-sounds
cp claude-skills-library/plugins/live-transcribe/assets/*.mp3 ~/.claude/scripts/transcribe-sounds/
```

### 4. Set your ElevenLabs API key

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export ELEVENLABS_API_KEY="sk_your_key_here"
```

Or create a `.env` file that the skill can source:
```bash
echo 'ELEVENLABS_API_KEY=sk_your_key_here' > ~/.claude/skills/transcribe/scripts/.env
```

### 5. Generate your own voice cues (optional)

The included audio files use a cloned voice. To generate your own:

```bash
# Using ElevenLabs TTS API (replace VOICE_ID with your voice)
curl -s "https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Started transcribing!", "model_id": "eleven_v3"}' \
  -o ~/.claude/scripts/transcribe-sounds/start.mp3

# Repeat for stop.mp3 and reminder.mp3
```

## Usage

### Start transcribing
Tell Claude: "start live transcription" / "transcribe what I say"

### Read the transcript
Tell Claude: "what did I say?" / "read the transcription" / "show transcript"

### Stop transcribing
- **Voice:** Say "ok, stop transcribing" (fuzzy-matched)
- **Chat:** Tell Claude "stop the transcription"
- **Manual:** `touch /tmp/realtime-transcribe.stop`

## How it works

```
Microphone → sounddevice (PCM 16kHz) → base64 → WebSocket → ElevenLabs Scribe v2 Realtime
                                                                    ↓
                                                          committed_transcript
                                                                    ↓
                                                        /tmp/transcribe-{ts}.txt
                                                                    ↓
                                                          Claude reads on demand
```

The transcript file updates in real-time. Claude can read it anytime — while you're still talking. This opens up patterns like:
- Live meeting notes
- Dictation → immediate processing
- Voice-driven workflows
- Real-time translation of speech

## Configuration

Edit `realtime-transcribe.py` to customize:

| Setting | Default | Description |
|---------|---------|-------------|
| `SAMPLE_RATE` | 16000 | Audio sample rate in Hz |
| `FUZZY_THRESHOLD` | 82 | Stop phrase detection sensitivity (0-100) |
| `REMINDER_INTERVAL_SECS` | 1800 | Reminder sound interval (30 min) |
| `language_code` | `he` | Default language (ISO 639-1) |

## License

MIT
