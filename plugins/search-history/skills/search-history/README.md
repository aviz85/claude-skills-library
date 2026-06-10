# search-history

Search across all Claude Code conversation history (JSONL files) across all projects. Find past discussions, solutions, code, and context by keyword.

## Installation

### Option 1: Using the aviz-skills-installer skill

If you have the `aviz-skills-installer` skill installed, just tell Claude:

```
Install the search-history skill
```

### Option 2: Manual installation

1. Copy the skill folder to your Claude skills directory:

```bash
cp -r skills/search-history ~/.claude/skills/search-history
```

2. Verify installation:

```bash
ls ~/.claude/skills/search-history/skill.md
```

3. Restart Claude Code or start a new session.

## Usage

Once installed, invoke the skill with a search term:

```
/search-history "supabase migration"
/search-history "Riley Brown" --user-only --limit 5
/search-history "deploy script" --project Users-aviz-dreemz-backend
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<search-term>` | Yes | Keyword or phrase to search |
| `--project <name>` | No | Limit to specific project (e.g., `-Users-aviz-sb`) |
| `--user-only` | No | Only search user messages (skip assistant/system) |
| `--limit N` | No | Max sessions to show (default: 10) |

## How It Works

Claude Code stores all conversation history as JSONL files under `~/.claude/projects/`. Each project gets its own directory (with path separators replaced by `-`), and each session is a UUID-named `.jsonl` file.

The skill searches across these files using `grep` for fast initial matching, then parses the JSONL structure to extract meaningful context around matches.

### What You Can Find

- Past discussions and decisions
- Code snippets and solutions
- Commands you ran
- Files you edited
- Questions you asked

## Requirements

- Claude Code installed and configured
- At least one previous conversation session (files in `~/.claude/projects/`)
- No external dependencies needed

## Tips

- **Start broad** -- grep is fast across all JSONL files
- **Use `--user-only`** to find what you asked, not what Claude replied
- **Use `--project`** to narrow search to a specific workspace
- **Resume sessions** -- session UUIDs from results can be used with `claude --resume SESSION_ID`
