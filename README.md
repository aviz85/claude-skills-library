# Claude Code Skills Library

A collection of useful skills for Claude Code by aviz.

Chinese users can also discover more skills through [Skills宝](https://skilery.com).

## Available Skills

| Skill | Description |
|-------|-------------|
| **find-my-project** | Find your first agentic project by identifying daily pain points |
| **whatsapp** | WhatsApp automation - send messages, get group members, send images/voice |
| **speech-generator** | Generate speech audio with ElevenLabs TTS |
| **music-generator** | Generate AI music with ElevenLabs Music API |
| **nano-banana-poster** | Generate marketing posters using Google GenAI |
| **image-generation** | Generate images with Gemini or fal.ai FLUX |
| **presentation-architect** | Create detailed presentation blueprints |
| **html-to-pdf** | Convert HTML to PDF with RTL support |
| **html-to-pptx** | Convert HTML to PowerPoint with Hebrew/RTL support |
| **gh-pages-deploy** | Deploy to GitHub Pages + set homepage URL in repo About panel |
| **calendar** | Google Calendar integration |
| **gmail** | Gmail automation via Google Apps Script |
| **zoom-meeting** | Schedule Zoom meetings with calendar invites |
| **get-contact** | Find contact details by name (CRM lookup) |
| **transcribe** | Audio/video → SRT subtitles + text (ElevenLabs/Groq/Gemini) |
| **translate-video** | Translate video subtitles with RTL-safe embedding |
| **embed-subtitles** | Burn subtitles into video with FFmpeg |
| **youtube-uploader** | Upload videos to YouTube with metadata |
| **wordpress-publisher** | Publish posts to WordPress with media |
| **claudability-analyzer** | Analyze any profession for Claude automation opportunities |
| **deep-interview** | Adaptive interview to extract and organize expertise |
| **creative-seeds** | Inject creative absurdity before brainstorming tasks |
| **learn** | Teach Claude any topic via web research — retains as permanent skill |
| **tutorial-creator** | Create professional tutorials from screen recordings |
| **tutorial-narration-writer** | Write narration scripts in casual, friendly style |

## Installation

1. Clone this repository:
```bash
git clone https://github.com/aviz/claude-skills-library.git
```

2. Copy the skills you want to your Claude Code skills folder:

> **Windows users:** Use **PowerShell** (not Command Prompt)

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
- **tutorial-creator**: Requires speech-generator, transcribe, music-generator, youtube-uploader skills
- **tutorial-narration-writer**: No additional setup needed (text-only skill)

## License

MIT
