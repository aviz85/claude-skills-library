---
name: nano-banana-poster
description: "Generate marketing posters using Google GenAI based on local brand references. Use this when the user asks to 'create a poster', 'generate a marketing visual', 'make a promotional image', or any similar request for visual marketing content creation."
---

# Nano Banana Poster Generator

Generate marketing posters with AI using Google's Gemini model, styled according to brand guidelines.

## Branding Requirements

Customize the following branding elements for your posters:

**Brand Name:** `YOUR_BRAND_NAME`

**Mission:** `YOUR_MISSION_STATEMENT`

**Color Palette (example values - customize as needed):**
- Primary Color: #22C55E
- Gray Scale: #374151, #4B5563, #6B7280, #9CA3AF, #111827
- Secondary Colors: #16A34A, #158235, #166534, #14532D

**Visual Style:** Professional, educational, tech-forward (customize to your brand)

**Avatar:** Place your avatar image as `references/avatar.jpg` for personal branding

## Workflow

Follow these steps to generate a poster:

### 1. Understand the request

Identify what the user wants on the poster (topic, message, theme).

### 2. Construct the prompt with mandatory branding

**IMPORTANT:** ALWAYS include the branding requirements in your prompt. Every prompt must include:
- Brand name: "The Architect"
- Color palette: Use the exact hex values listed above (#22C55E, #374151, etc.)
- Visual style: Professional, educational, tech-forward
- The user's specific request
- Any additional requirements

Example prompt structure:
```
Create a marketing poster for [USER REQUEST].

Brand: [YOUR_BRAND] - [YOUR_MISSION].

Colors: Use [PRIMARY_COLOR] for primary accents, with supporting colors.

Style: [YOUR_STYLE] aesthetic.

[Additional user requirements]
```

Example complete prompt:
```
Create a marketing poster for a workshop announcement.

Brand: My Brand - Helping people learn new skills.

Colors: Use #22C55E for primary accents and CTAs, with supporting grays #374151, #4B5563, #6B7280.

Style: Professional, modern aesthetic with clean typography.

Include text: "Join Our Workshop" and "Learn Something New Today"
```

### 3. Execute the generation script

Run the poster generation script from the scripts directory:

```bash
cd scripts
npx ts-node generate_poster.ts "your constructed prompt here"
```

The script will:
- Automatically upload the avatar image (`references/avatar.jpg`) to the Google Files API
- Send both the avatar and prompt to Google's Gemini 3 Pro Image model
- Generate the poster image with the avatar incorporated into the design
- Save it as `poster_0.jpg` (or subsequent numbers if multiple images are generated)
- Clean up the uploaded avatar file from the server
- Output any text responses from the model

### 4. Deliver the result

Inform the user that the poster has been generated and provide the file path. The poster will be saved in the `scripts/` directory.

## Notes

- The script requires a GEMINI_API_KEY environment variable, which is already configured in `scripts/.env`
- **Avatar Auto-Upload**: The script automatically uploads `references/avatar.jpg` to Google's Files API and includes it in the generation request, then cleans it up after completion
- Generated posters are saved with sequential filenames: `poster_0.jpg`, `poster_1.jpg`, etc.
- The image size is 1K (1024x1024 pixels)
- Both image and text responses from the AI model will be captured
- If the avatar upload fails, the script continues without it and displays a warning
