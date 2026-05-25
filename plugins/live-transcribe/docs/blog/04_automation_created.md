# Automation Created

## Skill Family: live-transcribe

Three skills work together as a cohesive system:

### live-transcribe (start)
- **Trigger:** "תתחיל תמלול", "start transcribing", "live transcribe"
- **What it does:** Launches the Python transcription script as a background process
- **Returns:** File path to the live transcript

### live-transcribe-read
- **Trigger:** "מה תמללתי", "what did I say", "show transcript"
- **What it does:** Finds the latest `/tmp/transcribe-*.txt` file and reads it
- **Returns:** The transcription text + whether it's still active

### live-transcribe-stop
- **Trigger:** "עצור תמלול", "stop transcribing"
- **What it does:** Touches the stop file or runs the stop script

## Scripts

| Script | Purpose |
|--------|---------|
| `realtime-transcribe.py` | Main transcription engine (asyncio + WebSocket) |
| `stop-transcribe.sh` | Graceful stop with 5s timeout + force kill |

## Audio Assets

| File | Content | When |
|------|---------|------|
| `start.mp3` | "התחלתי תמלול!" | Before recording begins |
| `stop.mp3` | "סיימתי את התמלול." | When transcription ends |
| `reminder.mp3` | "אני עדיין מתמלל." | Every 30 minutes |

## Claude Code Agent Collaboration

### Iterative Problem Solving
The stop sound feature went through 4 iterations:
1. First attempt: sound in Python's `finally` block — but `reminder_loop` blocked `asyncio.gather` for 30 minutes
2. Second attempt: moved sound to `stop-transcribe.sh` — but voice-triggered stops didn't play it
3. Third attempt: sound in `finally` + shell script — race condition, double-play risk
4. Final solution: play sound at the exact detection point (before setting stop_event), non-blocking via Popen

### Real-Time API Integration
The agent researched the ElevenLabs Scribe Realtime API documentation via web search, extracted the WebSocket protocol details, and wrote the streaming client — all in one conversation turn.

### Quality Review Loop
Each iteration was tested live — the user spoke, the agent read the transcript, and together they identified issues (false-positive stop phrase detection, missing audio cues, fuzzy threshold tuning).
