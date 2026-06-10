# Subtitle Refinement Modes

## MODE A: `--shorts` (Preserve Timestamps)

**PRIMARY RULE: DO NOT change, merge, or regroup timestamps.**

Fix only the text within each entry:
- Fix grammar/naturalness — minimal edits only
- Do NOT merge entries
- Do NOT move words between entries
- Only rephrase within each entry (no added/removed content)

**Line limits:** MAX 2 lines, MAX 38 chars/line

**If you MUST split an entry** (line too long): divide timestamp proportionally.

**Never:**
- ❌ Merge 2+ entries into 1
- ❌ Regroup words across entry boundaries
- ❌ Change timestamps (unless splitting)

---

## MODE B: `--regular` (Merge into Readable Sentences)

**Goal:** Full sentences per subtitle, comfortable reading pace.

**Timestamp rule:** Use word-level cursor — see [../scripts/build-timestamps.py](../scripts/build-timestamps.py)

### Workflow

**Step 1 — Plan groups** (read `.md` only, NOT the full JSON)

Read `.md` for full context. Plan subtitle groups — each group = one natural sentence or clause. Record how many words each group contains (consecutive, in order).

**Step 2 — Build timestamps with cursor script**

Fill in `GROUP_SIZES` in `build-timestamps.py` and run it. The script uses a sequential index cursor — no text search, no ambiguity about repeated words.

**Step 3 — Replace English with translation**

Edit the output SRT: replace each English group text with its translation. Timestamps stay as computed.

**Line limits:** MAX 2 lines, MAX 42 chars/line

**Target entry count:** ~1 entry per 3–5 seconds of speech

**Allowed:**
- ✅ Merge multiple raw entries into one
- ✅ Rephrase freely for naturalness (same meaning)
- ✅ Prefer breaking at existing punctuation (period/comma already in text)

**Never:**
- ❌ Add content not said
- ❌ Remove content that was said
- ❌ Add punctuation that doesn't exist in the original

---

## Mode Comparison

| | `--shorts` | `--regular` |
|---|---|---|
| Merge entries? | ❌ Never | ✅ Yes, into sentences |
| Change timestamps? | ❌ Never | ✅ Via cursor script |
| Max chars/line | 38 | 42 |
| Best for | Reels, TikTok, Stories | YouTube, tutorials, talks |
| Entry count | Same as raw | ~3–5x fewer |
