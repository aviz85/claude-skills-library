---
name: search-history
description: "Search across all Claude Code conversation history (JSONL files) across all projects."
version: "1.0.0"
author: aviz85
tags:
  - history
  - search
  - conversations
  - JSONL
  - memory
---

# Search Claude Code Conversation History

Search across all Claude Code sessions and projects to find past discussions, solutions, and context.

## Usage

/search-history "aviz-museum"
/search-history "supabase migration" --project Users-aviz-dreemz-backend
/search-history "Riley Brown" --user-only --limit 5

## Parameters

- `<search-term>` -- keyword or phrase to search (required)
- `--project <name>` -- limit to specific project dir (e.g., -Users-aviz-sb)
- `--user-only` -- only search user messages (skip assistant/progress/system)
- `--limit N` -- max sessions to show (default: 10)

## How It Works

### Storage Structure

```
~/.claude/projects/
  -Users-aviz-sb/                    # Project dir (path with / -> -)
    ae1972bf-...-2e6f1b34be03.jsonl   # Session file (UUID)
    ae1972bf-.../                      # Session artifacts
      subagents/                      # Subagent logs
      tool-results/                   # Tool output files
  -Users-aviz-dreemz-backend/
    ...
```

### JSONL Message Types

Each line is a JSON object with a type field:

| Type | Description | Key Fields |
|------|-------------|------------|
| `user` | User input | message.content (string or array), timestamp, cwd |
| `assistant` | Claude response | message.content (array of text/tool_use blocks), message.model |
| `progress` | Tool execution tracking | data.toolName, data.status |
| `system` | System events | Compaction, boundaries |
| `file-history-snapshot` | File backup metadata | snapshot.timestamp |
| `queue-operation` | Inbox operations | operation |
| `last-prompt` | Last user prompt text | prompt |

### Content Extraction

- **User messages:** `message.content` is usually a string, sometimes array of content blocks.
- **Assistant messages:** `message.content` is array -- extract `.text` from `type: "text"` blocks.

## Implementation

Search using grep + Python for structured output:

```bash
# Quick grep across all projects
grep -rl "SEARCH_TERM" ~/.claude/projects/*/*.jsonl
```

For structured search with context, use Python to parse JSONL files, extract matching messages, and display with session metadata (project, timestamp, message type).

## Tips

- Start broad -- grep is fast across all JSONL files
- Use `--user-only` to find what YOU asked, not what Claude replied
- Use `--project` to narrow to a specific workspace
- Session UUIDs can be used with `claude --resume SESSION_ID`
- Tool results are in separate `.txt` files under `session-dir/tool-results/`
- Subagent conversations are in `session-dir/subagents/agent-*.jsonl`
