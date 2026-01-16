# Nano Banana Poster - Setup Guide

## Prerequisites

- Google Cloud account (for Gemini API)
- Node.js installed

## 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Click "Get API Key"
4. Create new key or use existing

## 2. Configure Credentials

Create `.env` in `scripts/` folder:

```bash
GEMINI_API_KEY=your_api_key_here
```

## 3. Install Dependencies

```bash
cd scripts/
npm install
```

## 4. Test

```bash
# Basic generation
npx ts-node generate_poster.ts "A beautiful sunset over mountains"
```

Output will be saved as `poster_0.jpg` in current directory.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 error | Check API key |
| Rate limited | Wait a few minutes, or check quota |
| Image not generated | Check prompt for safety filters |

## Notes

- Free tier has usage limits
- Some prompts may be filtered for safety
- Images are 1024px on longest edge
