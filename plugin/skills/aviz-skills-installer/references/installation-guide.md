# Detailed Installation Guide

## Prerequisites

- Git installed: `git --version`
- Node.js (for npm-based skills): `node --version`
- Claude Code installed and running

## Complete Installation Commands

### One-Liner for User-Based Installation

```bash
SKILL=skill-name && TEMP=$(mktemp -d) && git clone https://github.com/aviz/claude-skills-library.git "$TEMP/lib" --depth 1 && mkdir -p ~/.claude/skills && cp -r "$TEMP/lib/skills/$SKILL" ~/.claude/skills/ && rm -rf "$TEMP" && echo "Installed $SKILL to ~/.claude/skills/"
```

### One-Liner for Project-Based Installation

```bash
SKILL=skill-name && TEMP=$(mktemp -d) && git clone https://github.com/aviz/claude-skills-library.git "$TEMP/lib" --depth 1 && mkdir -p .claude/skills && cp -r "$TEMP/lib/skills/$SKILL" .claude/skills/ && rm -rf "$TEMP" && echo "Installed $SKILL to .claude/skills/"
```

## Step-by-Step Manual Installation

### 1. Clone the Library

```bash
# Create temp directory
TEMP_DIR=$(mktemp -d)

# Clone with minimal depth
git clone https://github.com/aviz/claude-skills-library.git "$TEMP_DIR/lib" --depth 1

# Verify clone
ls "$TEMP_DIR/lib/skills/"
```

### 2. Choose Your Scope

**For User-Based (personal, all projects):**
```bash
DEST=~/.claude/skills
mkdir -p "$DEST"
```

**For Project-Based (shared via git):**
```bash
DEST=.claude/skills
mkdir -p "$DEST"
```

### 3. Copy the Skill

```bash
SKILL_NAME=whatsapp  # Replace with desired skill

cp -r "$TEMP_DIR/lib/skills/$SKILL_NAME" "$DEST/"

# Verify copy
ls -la "$DEST/$SKILL_NAME/"
```

### 4. Install Dependencies (if needed)

Check if the skill has a package.json:

```bash
if [ -f "$DEST/$SKILL_NAME/scripts/package.json" ]; then
    cd "$DEST/$SKILL_NAME/scripts"
    npm install
    cd -
fi
```

### 5. Configure Environment (if needed)

Check for .env.example:

```bash
if [ -f "$DEST/$SKILL_NAME/.env.example" ]; then
    cp "$DEST/$SKILL_NAME/.env.example" "$DEST/$SKILL_NAME/.env"
    echo "IMPORTANT: Edit $DEST/$SKILL_NAME/.env with your API keys"
fi
```

### 6. Cleanup

```bash
rm -rf "$TEMP_DIR"
```

### 7. Verify Installation

```bash
# Check SKILL.md exists
cat "$DEST/$SKILL_NAME/SKILL.md" | head -20
```

### 8. Restart Claude Code

Close and reopen your terminal, then start a new Claude Code session.

## Skill-Specific Setup

### whatsapp
Requires Green API credentials:
1. Sign up at https://green-api.com/
2. Create an instance and get credentials
3. Edit `.env`:
   ```
   GREEN_API_ID=your_instance_id
   GREEN_API_TOKEN=your_api_token
   ```

### speech-generator
Requires ElevenLabs API key:
1. Sign up at https://elevenlabs.io/
2. Get API key from settings
3. Edit `.env`:
   ```
   ELEVENLABS_API_KEY=your_api_key
   ```

### nano-banana-poster
Requires Google Gemini API key:
1. Get key from https://makersuite.google.com/app/apikey
2. Edit `.env`:
   ```
   GEMINI_API_KEY=your_api_key
   ```

### wordpress-publisher
Requires WordPress credentials:
1. Get your WordPress site URL
2. Create an application password in WordPress
3. Edit `.env`:
   ```
   WP_URL=https://your-site.com
   WP_USERNAME=your_username
   WP_PASSWORD=your_app_password
   ```

### html-to-pdf / html-to-pptx
No API keys needed, but requires npm install:
```bash
cd ~/.claude/skills/html-to-pdf/scripts && npm install
cd ~/.claude/skills/html-to-pptx/scripts && npm install
```

### calendar
Requires Google Apps Script setup:
1. Create a new Google Apps Script project
2. Deploy as web app
3. Follow instructions in SKILL.md

### supabase-helper
Requires Supabase project credentials:
1. Create project at https://supabase.com/
2. Get project URL and anon key
3. Configure as specified in SKILL.md

## Installing Multiple Skills

```bash
# Install multiple skills at once
SKILLS="whatsapp speech-generator html-to-pdf"
TEMP=$(mktemp -d)
git clone https://github.com/aviz/claude-skills-library.git "$TEMP/lib" --depth 1

for SKILL in $SKILLS; do
    cp -r "$TEMP/lib/skills/$SKILL" ~/.claude/skills/
    echo "Installed: $SKILL"
done

rm -rf "$TEMP"
```

## Updating a Skill

```bash
SKILL=whatsapp
DEST=~/.claude/skills

# Backup existing
mv "$DEST/$SKILL" "$DEST/${SKILL}_backup_$(date +%Y%m%d)"

# Reinstall
TEMP=$(mktemp -d)
git clone https://github.com/aviz/claude-skills-library.git "$TEMP/lib" --depth 1
cp -r "$TEMP/lib/skills/$SKILL" "$DEST/"
rm -rf "$TEMP"

# Restore .env if exists
if [ -f "$DEST/${SKILL}_backup_$(date +%Y%m%d)/.env" ]; then
    cp "$DEST/${SKILL}_backup_$(date +%Y%m%d)/.env" "$DEST/$SKILL/"
fi
```

## Uninstalling a Skill

```bash
SKILL=whatsapp
DEST=~/.claude/skills

# Remove the skill
rm -rf "$DEST/$SKILL"

echo "Removed: $SKILL"
```

## Troubleshooting

### "Skill not found" after installation

1. Verify file exists:
   ```bash
   ls -la ~/.claude/skills/SKILL_NAME/SKILL.md
   ```

2. Check YAML frontmatter:
   ```bash
   head -10 ~/.claude/skills/SKILL_NAME/SKILL.md
   ```
   Should start with `---` and have `name:` and `description:` fields.

3. Restart Claude Code session completely.

### npm install fails

```bash
# Try with legacy peer deps
npm install --legacy-peer-deps

# Or clean install
rm -rf node_modules package-lock.json
npm install
```

### Permission errors

```bash
# Fix permissions
chmod -R u+rwX ~/.claude/skills/SKILL_NAME
```

### Git clone fails

```bash
# Check git is installed
git --version

# Try HTTPS instead
git clone https://github.com/aviz/claude-skills-library.git

# If behind proxy
git config --global http.proxy http://proxy:port
```
