---
name: aviz-skills-installer
description: Install skills from the AVIZ Skills Library. Use when user wants to install a skill, browse available skills, set up Claude Code skills, or asks about skill installation. Triggers on "install skill", "add skill", "setup skill", "available skills", "skill library", "browse skills".
---

# AVIZ Skills Installer

A conversational guide to installing skills from the AVIZ Skills Library.

## Quick Start

Ask the user:
1. **What skill do you want to install?** (or show available skills)
2. **Project-based or user-based installation?**

Then execute the installation.

## Available Skills

| Skill | Description | Documentation |
|-------|-------------|---------------|
| **whatsapp** | WhatsApp automation via Green API - send messages, images, voice, get group members | [Docs](https://aviz.github.io/claude-skills-library/skills/whatsapp.html) |
| **speech-generator** | Generate speech with ElevenLabs TTS using cloned voice | [Docs](https://aviz.github.io/claude-skills-library/skills/speech-generator.html) |
| **nano-banana-poster** | Generate images with Google Gemini AI | [Docs](https://aviz.github.io/claude-skills-library/skills/nano-banana-poster.html) |
| **html-to-pdf** | Convert HTML to PDF with Hebrew/RTL support | [Docs](https://aviz.github.io/claude-skills-library/skills/html-to-pdf.html) |
| **html-to-pptx** | Convert HTML to PowerPoint presentations | [Docs](https://aviz.github.io/claude-skills-library/skills/html-to-pptx.html) |
| **wordpress-publisher** | Publish posts to WordPress sites | [Docs](https://aviz.github.io/claude-skills-library/skills/wordpress-publisher.html) |
| **presentation-architect** | Transform ideas into structured presentation scripts | [Docs](https://aviz.github.io/claude-skills-library/skills/other-skills.html) |
| **gh-pages-deploy** | Deploy content to GitHub Pages | [Docs](https://aviz.github.io/claude-skills-library/skills/other-skills.html) |
| **calendar** | Google Calendar integration - check/add events | [Docs](https://aviz.github.io/claude-skills-library/skills/other-skills.html) |
| **supabase-helper** | Supabase helper for migrations, RLS, queries | [Docs](https://aviz.github.io/claude-skills-library/skills/other-skills.html) |
| **skill-creator** | Guide for creating new Claude Code skills | [Docs](https://aviz.github.io/claude-skills-library/skills/other-skills.html) |
| **agentic-app-builder** | Build complete agentic applications | [Docs](https://aviz.github.io/claude-skills-library/skills/other-skills.html) |

Full library: https://aviz.github.io/claude-skills-library/

## Installation Types

### Project-Based (`.claude/skills/`)
- Shared with your team via git
- Available only in this repository
- Best for: Team collaboration, standardized workflows

### User-Based (`~/.claude/skills/`)
- Personal, available in all your projects
- Not shared via git
- Best for: Personal tools, consistent experience across projects

## Installation Process

### Step 1: Clone the library (temporary)
```bash
TEMP_DIR=$(mktemp -d)
git clone https://github.com/aviz/claude-skills-library.git "$TEMP_DIR/lib" --depth 1
```

### Step 2: Copy skill to destination

**For project-based:**
```bash
mkdir -p .claude/skills
cp -r "$TEMP_DIR/lib/skills/SKILL_NAME" .claude/skills/
```

**For user-based:**
```bash
mkdir -p ~/.claude/skills
cp -r "$TEMP_DIR/lib/skills/SKILL_NAME" ~/.claude/skills/
```

### Step 3: Install dependencies (if needed)
```bash
cd DESTINATION/SKILL_NAME/scripts
npm install 2>/dev/null || true
```

### Step 4: Configure environment (if needed)
Some skills require API keys. Check for `.env.example`:
```bash
if [ -f DESTINATION/SKILL_NAME/.env.example ]; then
    cp DESTINATION/SKILL_NAME/.env.example DESTINATION/SKILL_NAME/.env
    echo "Edit .env file with your API keys"
fi
```

### Step 5: Cleanup
```bash
rm -rf "$TEMP_DIR"
```

## Conversational Flow

Follow this conversation pattern:

### 1. Greet and discover intent
```
I can help you install skills from the AVIZ Skills Library!

Would you like to:
1. See all available skills
2. Install a specific skill (tell me which one)
3. Learn about a skill before installing
```

### 2. Show available skills (if requested)
Display the Available Skills table above with brief descriptions.

### 3. Ask about installation scope
```
Where would you like to install [SKILL_NAME]?

1. **Project-based** (.claude/skills/) - Shared with your team via git
2. **User-based** (~/.claude/skills/) - Personal, available everywhere
```

### 4. Execute installation
Run the installation commands and report progress.

### 5. Post-installation guidance
After successful installation:
- Show the skill documentation link
- Explain how to use the skill
- Mention any required configuration (API keys, etc.)
- Offer to help with setup

### 6. Handle special cases

**Skills requiring API keys:**
- whatsapp: GREEN_API_ID, GREEN_API_TOKEN
- speech-generator: ELEVENLABS_API_KEY
- nano-banana-poster: GEMINI_API_KEY
- wordpress-publisher: WP_URL, WP_USERNAME, WP_PASSWORD

**Skills requiring npm install:**
- whatsapp, speech-generator, nano-banana-poster
- html-to-pdf, html-to-pptx
- wordpress-publisher

## Skill Documentation

After installation, always provide the documentation link:

```
Skill installed successfully!

For setup instructions and usage guide, see:
https://aviz.github.io/claude-skills-library/skills/[skill-name].html

Or open: [DESTINATION]/[skill-name]/SKILL.md
```

## Troubleshooting

### Skill doesn't appear
1. Restart Claude Code session
2. Verify SKILL.md exists in the correct location
3. Check YAML frontmatter syntax

### npm install fails
1. Ensure Node.js is installed: `node --version`
2. Check for network issues
3. Try `npm install --legacy-peer-deps`

### Permission denied
```bash
# For user-based installation
chmod -R u+rwX ~/.claude/skills/SKILL_NAME
```

## See Also

- [Installation Guide](references/installation-guide.md) - Detailed installation steps
- [Skill Locations](references/skill-locations.md) - Understanding scopes
- [Library Website](https://aviz.github.io/claude-skills-library/) - Full documentation
