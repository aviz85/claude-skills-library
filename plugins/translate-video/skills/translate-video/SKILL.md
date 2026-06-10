---
name: translate-video
description: "Translate video subtitles to any language with native-quality refinement. Full pipeline: transcribe → translate → refine → embed RTL-safe subtitles. Use for: translate video, תרגם סרטון, video translation, foreign subtitles, Hebrew subtitles, translated captions."
argument-hint: "[video-path] [target-language] [--shorts|--regular]"
---

# Translate Video

End-to-end video translation pipeline: transcribe → translate → refine subtitles → embed.

## Usage

```
/translate-video /path/to/video.mp4 he --regular
/translate-video /path/to/video.mp4 he --shorts
```

- `$1` — video file path (required)
- `$2` — target language code (default: `he`). See [references/languages.md](references/languages.md)
- `$3` — `--shorts` (TikTok/Reels) or `--regular` (YouTube/tutorials). **If omitted, ask the user.**

---

## Pipeline

### Step 1: Transcribe

If audio > 25MB, extract first:
```bash
ffmpeg -i "$VIDEO" -vn -acodec libmp3lame -ab 128k "$AUDIO.mp3" -y
```

Transcribe with word-level JSON (always include `--json`):
```bash
cd ~/.claude/skills/transcribe/scripts && [ -d node_modules ] || npm install --silent
npx ts-node transcribe.ts -i "$INPUT" -o "$BASENAME.srt" --json
```

Produces: `{basename}.srt`, `{basename}.md`, `{basename}_transcript.json`

### Step 2: Translate

Read `.md` for full context. Translate the `.srt` — preserve all timestamps and index numbers exactly. See translation rules in [references/modes.md](references/modes.md).

### Step 3: Refine Subtitles

Read [references/modes.md](references/modes.md) for full rules.

**--shorts:** Fix text only, preserve all timestamps. No merging.

**--regular:** Merge into full sentences using word-level timestamps.
1. Plan subtitle groups from `.md` (word counts per group)
2. Fill `GROUP_SIZES` in [scripts/build-timestamps.py](scripts/build-timestamps.py) and run it
3. Replace English text in output SRT with translated text

### Step 4: Post-process (both modes)

Enforces MAX 2 lines, MAX chars/line (38 for --shorts, 42 for --regular):
```bash
python3 ~/.claude/skills/translate-video/scripts/postprocess.py "$SRT" 42
```

### Step 5: RTL Fix (Hebrew / Arabic / Farsi only)

```bash
python3 ~/.claude/skills/translate-video/scripts/rtl-fix.py "$SRT"
```

### Step 6: Embed & Open

```bash
~/.local/bin/ffmpeg-ass -i "$VIDEO" \
  -vf "subtitles=$SRT:force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=30'" \
  -c:v libx264 -preset fast -crf 23 -c:a copy "$OUTPUT" -y
open "$OUTPUT"
```

> ⚠️ Do NOT use Docker ffmpeg for long videos on ARM Mac — x86 emulation is ~100x slower.

---

## Output Files

| File | Description |
|------|-------------|
| `{name}.srt` | Original language SRT |
| `{name}.md` | Readable transcript |
| `{name}_transcript.json` | Word-level timestamps |
| `{name}_{lang}.srt` | Translated + refined SRT |
| `{name}_{lang}_subtitled.mp4` | Final video |

## Supporting Files

| File | Purpose |
|------|---------|
| [references/modes.md](references/modes.md) | Detailed --shorts and --regular rules |
| [references/languages.md](references/languages.md) | Language codes + RTL flags |
| [scripts/build-timestamps.py](scripts/build-timestamps.py) | Word-index cursor for --regular timestamps |
| [scripts/postprocess.py](scripts/postprocess.py) | Enforce line limits on any SRT |
| [scripts/rtl-fix.py](scripts/rtl-fix.py) | Apply RTL Unicode markers |
