---
name: gemini-export
description: "Export Claude Code conversations and memories to Google Gemini format. Use when user says 'export to gemini', 'gemini import', 'transfer to gemini', 'move chats to gemini', 'sync with gemini', 'backup conversations', 'export history', or mentions wanting to use their Claude Code context in Gemini. Also triggers on Hebrew: 'ייצוא לג׳מיני', 'להעביר לג׳מיני', 'גיבוי שיחות'."
version: "1.0.0"
author: aviz85
tags:
  - gemini
  - export
  - migration
  - backup
  - conversations
  - memories
---

# Gemini Export - Claude Code to Google Gemini

Export your Claude Code conversation history and memories to Google Gemini's import format.

## What gets exported

1. **Conversations** - All JSONL session files converted to a ZIP matching Claude.ai's export format (which Gemini natively supports)
2. **Memories** - All memory files from the current project exported as structured markdown

## How to run

Run the export script:

```bash
python3 "<SKILL_DIR>/scripts/export.py"
```

The script auto-detects the current project directory from `~/.claude/projects/` and exports everything.

### Options

```bash
# Export only the last 50 conversations
python3 "<SKILL_DIR>/scripts/export.py" --max 50

# Export to a specific directory
python3 "<SKILL_DIR>/scripts/export.py" --output /path/to/dir

# Export all projects (not just current)
python3 "<SKILL_DIR>/scripts/export.py" --all-projects
```

## After export

Two files are created on the Desktop (or specified output dir):

| File | Contents |
|------|----------|
| `claude_code_export_for_gemini.zip` | Conversations in Claude.ai export format |
| `claude_code_memories_for_gemini.md` | Memories as structured markdown |

### Import to Gemini - Conversations

1. Go to **gemini.google.com**
2. Click Settings (bottom right) -> **Import memory to Gemini**
3. In the **Import conversations** section, click **Add**
4. Upload the `claude_code_export_for_gemini.zip` file
5. Wait for processing (can take up to a day for large exports)

### Import to Gemini - Memories

**Option A - Automatic (recommended):**
1. In Gemini settings -> Import memory to Gemini
2. Copy the prompt Gemini provides
3. Paste it here in Claude Code - Claude will respond with all stored memories
4. Copy Claude's response back into Gemini

**Option B - Manual:**
1. Open `claude_code_memories_for_gemini.md`
2. Copy the content
3. Paste into the Gemini memory import text box

## Important notes

- Gemini import requires a **personal Google account** (not Workspace)
- Not available in EEA, Switzerland, or UK
- ZIP files up to 5GB supported, max 5 uploads per day
- Tool calls and thinking blocks are stripped - only human-readable text is exported
- The export format mimics Claude.ai's official export, which Gemini natively recognizes
