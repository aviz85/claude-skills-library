# Live Transcribe: Real-Time Speech-to-Text for Claude Code

## The Challenge: Voice is the fastest input — but AI agents can't hear you

### Background Story
Aviz builds AI-powered workflows for a living. His typical day involves Zoom meetings, brainstorming sessions, and client calls — where the most valuable context is spoken, not typed. The problem? His Claude Code agent only sees what's typed into the terminal. Everything said in a meeting evaporates unless someone manually takes notes.

### The Problem
AI agents are incredibly powerful at processing text, but they're deaf. You finish a 47-minute meeting full of decisions, action items, and context — then spend 15 minutes trying to summarize it for the agent. By the time you type it all in, you've lost the nuance.

### Why This Matters
The gap between spoken context and typed context is the single biggest bottleneck in human-agent workflows. If the agent could "listen" to meetings in real-time, it could:
- Auto-generate summaries while you're still talking
- Create Jira tickets from spoken action items
- Draft follow-up emails before the meeting ends
- Process voice as a first-class input, not an afterthought

### Project Goals
1. Stream microphone audio to ElevenLabs Scribe v2 Realtime via WebSocket
2. Write committed transcription text to a temp file in real-time
3. Enable the agent to read the file at any time during the session
4. Support voice-activated stop via fuzzy phrase detection
5. Add audio feedback cues (start, stop, 30-min reminder)
6. Package as a reusable skill family for any Claude Code user

### Why This Project is Interesting
This isn't batch transcription — the file updates *while you speak*. The agent can read partial transcriptions mid-conversation, enabling workflows that were previously impossible: real-time context injection, live meeting assistance, and voice-driven task creation.
