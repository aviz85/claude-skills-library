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

### Option A: Plugin install (recommended)

```bash
/plugin marketplace add aviz85/claude-skills-library
/plugin install live-transcribe@aviz-skills-library
```

This installs the skills, scripts, and audio assets as a plugin. Everything lives under `~/.claude/plugins/`.

### Option B: Manual install

```bash
git clone https://github.com/aviz85/claude-skills-library.git
cp -r claude-skills-library/plugins/live-transcribe/skills/* ~/.claude/skills/
cp claude-skills-library/plugins/live-transcribe/scripts/* ~/.claude/scripts/
mkdir -p ~/.claude/scripts/transcribe-sounds
cp claude-skills-library/plugins/live-transcribe/assets/*.mp3 ~/.claude/scripts/transcribe-sounds/
chmod +x ~/.claude/scripts/stop-transcribe.sh
```

### Set your ElevenLabs API key

```bash
export ELEVENLABS_API_KEY="sk_your_key_here"  # add to ~/.zshrc
```

### Install Python dependencies

```bash
pip install sounddevice websockets numpy rapidfuzz
```

### Generate your own voice cues (optional)

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

## Codex CLI (OpenAI) Adaptation

This plugin was built for Claude Code, but the core transcription engine (`realtime-transcribe.py`) works with any agent that can run shell commands and read files. Here's how to use it with Codex CLI.

### Codex native voice vs. this plugin

Codex CLI (v0.105.0+) has built-in Whisper voice input (spacebar in composer). That's great for quick dictation prompts, but it's **not** continuous background transcription. This plugin fills a different need: long-running transcription that writes to a file the agent can read mid-session.

### Skill setup

Codex skills live in `.agents/skills/` (project-level) or `$HOME/.agents/skills` (global):

```
$HOME/.agents/skills/live-transcribe/
├── SKILL.md
├── scripts/
│   ├── realtime-transcribe.py
│   └── stop-transcribe.sh
└── assets/
    ├── start.mp3
    ├── stop.mp3
    └── reminder.mp3
```

**SKILL.md for Codex:**
```markdown
---
name: Live Transcribe
description: Start real-time microphone transcription using ElevenLabs Scribe v2 Realtime WebSocket. Writes to /tmp/transcribe-{timestamp}.txt in real-time.
---

## Start
ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" python3 $HOME/.agents/skills/live-transcribe/scripts/realtime-transcribe.py &
sleep 3 && head -1 /tmp/realtime-transcribe.log

## Read latest
cat $(ls -t /tmp/transcribe-*.txt | head -1)

## Stop
bash $HOME/.agents/skills/live-transcribe/scripts/stop-transcribe.sh
```

### Key differences from Claude Code

| | Claude Code | Codex CLI |
|---|---|---|
| **Skill location** | `~/.claude/skills/` | `~/.agents/skills/` or `.agents/skills/` |
| **Background tasks** | `run_in_background` parameter | Spawn subprocess with `&` |
| **Plugin install** | `/plugin marketplace add` | Copy files manually |
| **Audio playback** | `afplay` works from Bash tool | Same — `afplay` from shell |
| **File monitoring** | Read tool on `/tmp/` files | Same — `cat` or read tool |

### Adaptation checklist

1. Copy `scripts/` and `assets/` to `$HOME/.agents/skills/live-transcribe/`
2. Update `SOUNDS_DIR` in `realtime-transcribe.py` to point to the new assets location, or set `LIVE_TRANSCRIBE_SOUNDS_DIR` env var
3. Set `ELEVENLABS_API_KEY` in your shell profile
4. Install Python deps: `pip install sounddevice websockets numpy rapidfuzz`

### MCP server wrapper (advanced)

For tighter integration, wrap the transcription script as an MCP server so Codex treats it as a native tool:

```yaml
# .agents/mcp-servers/live-transcribe.yaml
name: live-transcribe
type: stdio
command: python
args: ["/path/to/transcribe-mcp-server.py"]
env:
  ELEVENLABS_API_KEY: $ELEVENLABS_API_KEY
```

This lets Codex invoke `start_transcription`, `read_transcript`, and `stop_transcription` as structured tool calls rather than raw shell commands.

## License

MIT
