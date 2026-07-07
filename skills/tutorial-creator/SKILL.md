# Tutorial Creator

Creates professional tutorials from raw screen recordings - with narration, music, subtitles, and automatic distribution.

## When to Use

```
/tutorial-creator path/to/screen-recording.mp4
```

Or when user says:
- "Create a tutorial from this video"
- "Turn this recording into a professional video"
- "Add narration to this screencast"

## Full Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      TUTORIAL CREATOR                            │
│                    (Orchestrator Skill)                          │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────┐
     │  1. SCRIPT WRITING                                   │
     │     └── tutorial-narration-writer skill              │
     │         Input: User description + feature name       │
     │         Output: Hebrew narration text                │
     └──────────────────────────┬───────────────────────────┘
                                ▼
     ┌──────────────────────────────────────────────────────┐
     │  2. VIDEO ANALYSIS                                   │
     │     └── Gemini 2.0 Flash                             │
     │         Input: Video + Script keywords/cues          │
     │         Output: Timecodes for each script section    │
     └──────────────────────────┬───────────────────────────┘
                                ▼
     ┌──────────────────────────────────────────────────────┐
     │  3. AUDIO CREATION                                   │
     │     ├── speech-generator → narration.mp3             │
     │     ├── transcribe → word-level timestamps           │
     │     └── music-generator → background_music.mp3       │
     └──────────────────────────┬───────────────────────────┘
                                ▼
     ┌──────────────────────────────────────────────────────┐
     │  4. VIDEO EDITING (ffmpeg)                           │
     │     ├── Speed adjustment (slow/fast per section)     │
     │     ├── Audio mixing (narration + music)             │
     │     ├── Fadeout (last 3 seconds)                     │
     │     └── Burn subtitles (Hebrew RTL)                  │
     └──────────────────────────┬───────────────────────────┘
                                ▼
     ┌──────────────────────────────────────────────────────┐
     │  5. DISTRIBUTION                                     │
     │     ├── youtube-uploader → unlisted link             │
     │     ├── whatsapp → send for review                   │
     │     └── PROPOSE: Facebook/LinkedIn marketing post    │
     └──────────────────────────────────────────────────────┘
```

## Step 1: Script Writing

### Required Input from User

1. **What's the feature/topic?** - Brief description
2. **What's the main message?** - What should the viewer understand
3. **Desired length** - short (30-45s) / medium (60-90s) / long (2-3min)

### Skill Reference

```
→ Reference: ~/.claude/skills/tutorial-narration-writer/SKILL.md
```

**Style characteristics:**
- Opens with "חברים" (friends)
- Casual like sharing with friends
- Uses analogies for technical explanations
- Ends with "וזה עובד" (and it works)

### Output

```
Script text (715-1500 characters depending on length)
+ List of cues/keywords to search in video
```

## Step 2: Video Analysis

### Targeted Search

Instead of asking "analyze the video", request specific cues:

```
"Find these moments in the video:
1. Task creation moment (cue: task creation)
2. Kanban board updating (cue: kanban update)
3. Switching to different project (cue: project switch)
..."
```

### Analysis Code

```typescript
// analyze_video.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyzeVideo(videoPath: string, cues: string[]) {
  // Upload video
  const uploadResult = await ai.files.upload({
    file: videoPath,
    config: { mimeType: 'video/mp4' }
  });

  // Wait for processing
  let file = await ai.files.get({ name: uploadResult.name! });
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 2000));
    file = await ai.files.get({ name: uploadResult.name! });
  }

  // Analyze with specific cues
  const prompt = `Find these moments in the video with precise timecodes:
${cues.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return JSON: [{"cue": "...", "timecode": "MM:SS", "description": "..."}]`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      role: 'user',
      parts: [
        { fileData: { fileUri: file.uri!, mimeType: 'video/mp4' } },
        { text: prompt }
      ]
    }]
  });

  return JSON.parse(response.text);
}
```

### Output

```json
[
  {"cue": "task creation", "timecode": "00:03", "description": "User creates 5 tasks"},
  {"cue": "kanban update", "timecode": "00:07", "description": "Board updates in real-time"},
  {"cue": "project switch", "timecode": "00:13", "description": "Opens different project"}
]
```

## Step 3: Audio Creation

### 3.1 Narration

```bash
cd ~/.claude/skills/speech-generator/scripts
npx ts-node generate_speech.ts \
  -t "script text here" \
  -o narration.mp3
```

### 3.2 Word-Level Transcription

```bash
cd ~/.claude/skills/transcribe/scripts
npx ts-node transcribe.ts \
  -i narration.mp3 \
  -o narration.srt \
  -l he \
  --json \
  --max-words 10
```

**Important:** Word-level transcription is used to sync video to narration!

### 3.3 Background Music

```bash
cd ~/.claude/skills/music-generator/scripts
npx ts-node generate_music.ts \
  --prompt "Upbeat tech background music, soft electronic, inspiring" \
  --duration <video_duration + 5> \
  --instrumental \
  --output background_music.mp3
```

## Step 4: Video Editing

### Sync Logic

```
Script section 1 → video timecode → time window for narration section 1
Script section 2 → video timecode → time window for narration section 2
...
```

### Speed Adjustment Logic

```bash
# If narration (47s) is longer than video (40s):
# Need to slow down the video
SPEED_FACTOR = video_duration / narration_duration  # 40/47 = 0.85
# PTS = 1/0.85 = 1.17 (slowdown)

# If narration is shorter than video:
# Need to speed up video or trim
```

### ffmpeg Commands

```bash
# 1. Speed adjustment
ffmpeg -y -i input.mp4 \
  -filter:v "setpts=${PTS_FACTOR}*PTS" \
  -an \
  speed_adjusted.mp4

# 2. Extend with freeze frame (if needed)
ffmpeg -y -i speed_adjusted.mp4 \
  -vf "tpad=stop_mode=clone:stop_duration=10" \
  -an \
  extended.mp4

# 3. Mix audio + fadeout
ffmpeg -y \
  -i narration.mp3 \
  -i background_music.mp3 \
  -filter_complex "
    [0:a]apad=pad_dur=${padding}[narration];
    [1:a]volume=0.15,afade=t=out:st=${fadeout_start}:d=3[music];
    [narration][music]amix=inputs=2:duration=longest[aout]
  " \
  -map "[aout]" \
  -t ${total_duration} \
  mixed_audio.mp3

# 4. Combine video + audio
ffmpeg -y \
  -i extended.mp4 \
  -i mixed_audio.mp3 \
  -c:v copy \
  -map 0:v \
  -map 1:a \
  with_audio.mp4

# 5. Burn subtitles
ffmpeg -y -i with_audio.mp4 \
  -vf "subtitles='narration.srt':force_style='FontName=Arial,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Alignment=2'" \
  -c:a copy \
  final.mp4
```

## Step 5: Distribution

### 5.1 YouTube (Automatic)

```bash
cd ~/.claude/skills/youtube-uploader/scripts
npx ts-node youtube-upload.ts \
  --video final.mp4 \
  --title "Hebrew title" \
  --description "Description..." \
  --tags "claude code,ai,tutorial" \
  --category 28 \
  --privacy unlisted
```

### 5.2 WhatsApp (Automatic)

```bash
cd ~/.claude/skills/whatsapp/scripts
npx ts-node send-message.ts \
  --to 972501234567 \
  --video final.mp4 \
  --caption "New tutorial - please review"
```

### 5.3 Marketing Post (Proposal - Needs Approval)

**Does NOT publish automatically - proposes to user:**

Example output proposal:
```markdown
## Suggested Facebook/LinkedIn Post:

מרגע שהמשימות בקלוד קוד מנוהלות באופן גלובלי, זה אומר שאפשר להזריק משימות בין פרויקטים - וזה די מגניב!

חשוב להבין שאנתרופיק בונים פה יסודות פונקציונאליים מאוד רחבים ופשוטים, אבל עם אפס התייחסות לנושאי אבטחה. לא כי זה לא חשוב להם, אלא כי הם מפרידים תחומי אחריות. כאשר ממשים מערכת כזו - צריך לקחת בחשבון שיש פה הרבה עוצמה ולדאוג לשכבת אבטחה לפי אופי ההטמעה.

[YouTube link]

---
Publish? (yes/no/edit)
```

## Full Usage Example

```
User: /tutorial-creator ~/recordings/claude-tasks.mp4

Claude: What feature are you demoing?

User: Global task management in Claude Code. Can inject tasks between projects

Claude:
Great. Starting pipeline:

1. ✓ Wrote script in your style (680 chars)
2. ✓ Analyzed video - found 8 key points
3. ✓ Generated narration (45 seconds)
4. ✓ Generated background music (55 seconds)
5. ✓ Edited video (slowdown x1.5, fadeout)
6. ✓ Added subtitles

Sending to WhatsApp for review... ✓

Uploading to YouTube (unlisted)... ✓
https://youtu.be/xxxxx

---

Suggested marketing post:
[Post text in Hebrew]

Publish to LinkedIn?
```

## Related Skills

| Skill | Purpose |
|-------|---------|
| `tutorial-narration-writer` | Script writing in Aviz's style |
| `speech-generator` | Generate narration |
| `transcribe` | Transcription + subtitles |
| `music-generator` | Background music |
| `youtube-uploader` | YouTube upload |
| `whatsapp` | Send to WhatsApp |
| `linkedin` | Publish (optional) |

## Estimated Costs

| Component | Cost |
|-----------|------|
| Gemini (analysis) | $0.02 |
| Narration (ElevenLabs) | $0.05 |
| Music (ElevenLabs) | $0.10 |
| Transcription | $0.02 |
| **Total** | **~$0.19** |

## Security Note

> **Anthropic builds broad, simple functional foundations with separation of security responsibilities.**
>
> When implementing such a system:
> - Don't store credentials in code
> - Don't give write access to unauthorized users
> - Consider rate limiting
> - Add security layer based on implementation context
