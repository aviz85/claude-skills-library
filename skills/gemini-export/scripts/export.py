#!/usr/bin/env python3
"""
Claude Code -> Gemini Conversation Exporter

Converts Claude Code JSONL conversation files to a format
compatible with Gemini's "Import from Claude" feature.

Mimics the Claude.ai export format (conversations.json inside a zip).
"""

import json
import os
import glob
import zipfile
import sys
import argparse
from datetime import datetime, timezone


def extract_text_from_content(content):
    """Extract plain text from Claude Code message content."""
    if isinstance(content, str):
        return content.strip()
    elif isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, dict):
                ptype = part.get('type', '')
                if ptype == 'text':
                    texts.append(part.get('text', ''))
                elif ptype == 'tool_result':
                    result_content = part.get('content', '')
                    if isinstance(result_content, str) and len(result_content) > 10:
                        texts.append(f"[Tool result: {result_content[:500]}]")
                    elif isinstance(result_content, list):
                        for rc in result_content:
                            if isinstance(rc, dict) and rc.get('type') == 'text':
                                texts.append(f"[Tool result: {rc.get('text', '')[:500]}]")
        return '\n'.join(texts).strip()
    return ''


def parse_session(filepath):
    """Parse a Claude Code JSONL session file into conversation turns."""
    messages = []
    session_id = os.path.basename(filepath).replace('.jsonl', '')
    created_at = None

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            entry_type = entry.get('type', '')

            if entry_type in ('user', 'assistant'):
                msg = entry.get('message', {})
                if isinstance(msg, dict):
                    role = msg.get('role', entry_type)
                    content = msg.get('content', '')
                    text = extract_text_from_content(content)

                    if text and len(text) > 5:
                        ts = entry.get('timestamp', '')
                        messages.append({
                            'role': 'human' if role == 'user' else 'assistant',
                            'text': text,
                            'timestamp': ts
                        })
                        if not created_at and ts:
                            created_at = ts

    return session_id, messages, created_at


def build_claude_export(proj_dir, output_path, max_conversations=None):
    """Build a zip file mimicking Claude.ai's export format."""
    jsonl_files = sorted(
        glob.glob(os.path.join(proj_dir, "*.jsonl")),
        key=os.path.getmtime,
        reverse=True
    )

    if max_conversations:
        jsonl_files = jsonl_files[:max_conversations]

    conversations = []
    total_messages = 0
    skipped = 0

    for i, filepath in enumerate(jsonl_files):
        session_id, messages, created_at = parse_session(filepath)

        if len(messages) < 2:
            skipped += 1
            continue

        first_user = next((m for m in messages if m['role'] == 'human'), None)
        name = first_user['text'][:80] if first_user else f"Session {session_id[:8]}"

        chat_messages = []
        for j, msg in enumerate(messages):
            chat_messages.append({
                "uuid": f"{session_id}-msg-{j}",
                "text": msg['text'],
                "content": [{"type": "text", "text": msg['text']}],
                "sender": msg['role'],
                "created_at": msg.get('timestamp') or datetime.now(timezone.utc).isoformat(),
                "updated_at": msg.get('timestamp') or datetime.now(timezone.utc).isoformat(),
                "attachments": [],
                "files": []
            })

        file_mtime = os.path.getmtime(filepath)
        file_date = datetime.fromtimestamp(file_mtime, timezone.utc).isoformat()

        conversations.append({
            "uuid": session_id,
            "name": name,
            "created_at": created_at or file_date,
            "updated_at": file_date,
            "chat_messages": chat_messages
        })

        total_messages += len(messages)

        if (i + 1) % 20 == 0:
            sys.stderr.write(f"  Processed {i+1}/{len(jsonl_files)} files...\n")

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        conv_json = json.dumps(conversations, ensure_ascii=False, indent=2)
        zf.writestr('conversations.json', conv_json)

    zip_size = os.path.getsize(output_path) / (1024 * 1024)

    return {
        'total_files': len(jsonl_files),
        'conversations': len(conversations),
        'skipped': skipped,
        'total_messages': total_messages,
        'zip_size_mb': round(zip_size, 2),
        'output': output_path
    }


def export_memories(memory_dir, output_path):
    """Export Claude Code memories as structured markdown."""
    if not os.path.exists(memory_dir):
        return None

    memories = []
    for f in sorted(glob.glob(os.path.join(memory_dir, "*.md"))):
        if os.path.basename(f) == 'MEMORY.md':
            continue
        try:
            with open(f, 'r', encoding='utf-8') as fh:
                content = fh.read()
            memories.append({
                'file': os.path.basename(f),
                'content': content
            })
        except Exception:
            pass

    if not memories:
        return None

    lines = ["# Memories exported from Claude Code", ""]
    for m in memories:
        lines.append(f"## {m['file']}")
        lines.append(m['content'])
        lines.append("")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    return len(memories)


def find_project_dirs(base, all_projects=False):
    """Find Claude Code project directories."""
    if not os.path.exists(base):
        return []

    cwd = os.getcwd()
    dirs = []

    for d in os.listdir(base):
        full = os.path.join(base, d)
        if not os.path.isdir(full):
            continue
        # Check if it has JSONL files
        if glob.glob(os.path.join(full, "*.jsonl")):
            if all_projects:
                dirs.append(full)
            else:
                # Try to match current working directory
                # The dir name encodes the path with dashes
                decoded = d.replace('--', os.sep)
                if 'Desktop' in d or cwd.replace('\\', '/').replace('/', '-') in d:
                    dirs.append(full)

    # If no match found, return the largest project dir
    if not dirs and not all_projects:
        candidates = []
        for d in os.listdir(base):
            full = os.path.join(base, d)
            if os.path.isdir(full):
                jsonl_count = len(glob.glob(os.path.join(full, "*.jsonl")))
                if jsonl_count > 0:
                    candidates.append((jsonl_count, full))
        if candidates:
            candidates.sort(reverse=True)
            dirs = [candidates[0][1]]

    return dirs


def main():
    parser = argparse.ArgumentParser(description='Export Claude Code to Gemini format')
    parser.add_argument('--max', type=int, help='Max conversations to export')
    parser.add_argument('--output', type=str, help='Output directory (default: Desktop)')
    parser.add_argument('--all-projects', action='store_true', help='Export all projects')
    args = parser.parse_args()

    base = os.path.expanduser("~/.claude/projects")
    proj_dirs = find_project_dirs(base, args.all_projects)

    if not proj_dirs:
        print(json.dumps({"error": "No Claude Code project directories found"}))
        sys.exit(1)

    # Output directory
    output_dir = args.output or os.path.expanduser("~/Desktop")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    zip_output = os.path.join(output_dir, "claude_code_export_for_gemini.zip")
    memory_output = os.path.join(output_dir, "claude_code_memories_for_gemini.md")

    # Merge all project dirs if multiple
    all_conversations_result = None
    for proj_dir in proj_dirs:
        result = build_claude_export(proj_dir, zip_output, args.max)
        if all_conversations_result is None:
            all_conversations_result = result
        else:
            all_conversations_result['conversations'] += result['conversations']
            all_conversations_result['total_messages'] += result['total_messages']
            all_conversations_result['skipped'] += result['skipped']

    # Export memories from first project dir that has them
    mem_count = 0
    for proj_dir in proj_dirs:
        memory_dir = os.path.join(proj_dir, "memory")
        count = export_memories(memory_dir, memory_output)
        if count:
            mem_count = count
            break

    # Output results as JSON for the skill to parse
    output = {
        "success": True,
        "conversations": {
            "count": all_conversations_result['conversations'],
            "messages": all_conversations_result['total_messages'],
            "skipped": all_conversations_result['skipped'],
            "zip_path": zip_output,
            "zip_size_mb": all_conversations_result['zip_size_mb']
        },
        "memories": {
            "count": mem_count,
            "file_path": memory_output if mem_count else None
        }
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == '__main__':
    main()
