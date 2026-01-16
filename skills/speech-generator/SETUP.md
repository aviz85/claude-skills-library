# Speech Generator - Setup Guide

## Prerequisites

- ElevenLabs account
- Node.js installed

## 1. Create ElevenLabs Account

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up (free tier available)
3. Get your API key from Settings

## 2. Get Voice ID

Options:
1. **Built-in voices** - Use ElevenLabs library voices
2. **Clone your voice** - Create custom voice from samples

Find voice IDs in the ElevenLabs dashboard under "Voices".

## 3. Configure Credentials

Create `.env` in `scripts/` folder:

```bash
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
```

## 4. Install Dependencies

```bash
cd scripts/
npm install
```

## 5. Test

```bash
# List available voices
npx ts-node generate_speech.ts --list-voices

# Generate test speech
npx ts-node generate_speech.ts -t "Hello world" -o /tmp/test.mp3
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 error | Check API key |
| Voice not found | Verify voice ID exists |
| Quota exceeded | Check ElevenLabs usage limits |
