# Claude Code Skills Library

A collection of useful skills for Claude Code by aviz.

## Available Skills

| Skill | Description |
|-------|-------------|
| **whatsapp** | WhatsApp automation - send messages, get group members, send images/voice |
| **speech-generator** | Generate speech audio with ElevenLabs TTS |
| **nano-banana-poster** | Generate marketing posters using Google GenAI |
| **presentation-architect** | Create detailed presentation blueprints |
| **html-to-pdf** | Convert HTML to PDF with RTL support |
| **gh-pages-deploy** | Deploy to GitHub Pages |
| **supabase-helper** | Supabase development helper |
| **calendar** | Google Calendar integration |
| **skill-creator** | Guide for creating new skills |

## Installation

1. Clone this repository:
```bash
git clone https://github.com/aviz/claude-skills-library.git
```

2. Copy the skills you want to your Claude Code skills folder:
```bash
cp -r claude-skills-library/skills/SKILL_NAME ~/.claude/skills/
```

3. Configure environment variables as needed (see each skill's README)

4. Restart Claude Code to load the new skills

## Requirements

Some skills require additional setup:
- **whatsapp**: Green API account and credentials
- **speech-generator**: ElevenLabs API key
- **nano-banana-poster**: Gemini API key
- **html-to-pdf**: Run `npm install` in the skill's scripts folder
- **calendar**: Google Apps Script deployment (included)

## License

MIT
