"""
build-timestamps.py — Regular mode timestamp builder
Uses sequential word-index cursor (no text search — avoids duplicate-word ambiguity).

Usage:
  1. Set WORDS_JSON and OUTPUT_SRT paths
  2. Fill GROUP_SIZES with the word count of each subtitle group (in order)
  3. Run — produces an English SRT with correct timestamps
  4. Edit the SRT: replace English text with translated text per entry

How GROUP_SIZES works:
  - Each number = consecutive words from the JSON that belong to one subtitle
  - Cursor advances sequentially: group N starts exactly where group N-1 ended
  - sum(GROUP_SIZES) must equal total number of words in the JSON

Example:
  GROUP_SIZES = [
      16,  # "All right... for everyone."
       7,  # "Honestly... blind spot."
      ...
  ]
"""

import json, sys

WORDS_JSON = 'PATH_TO_transcript.json'   # e.g. ~/Downloads/video_transcript.json
OUTPUT_SRT = 'PATH_TO_output.srt'        # e.g. ~/Downloads/video_he.srt

# FILL THIS IN — one number per subtitle, in speech order
GROUP_SIZES = [
    # e.g. 16, 7, 8, ...
]


def to_srt_time(seconds: float) -> str:
    ms = round(seconds * 1000)
    h = ms // 3600000; ms %= 3600000
    m = ms // 60000;   ms %= 60000
    s = ms // 1000;    ms %= 1000
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


with open(WORDS_JSON, encoding='utf-8') as f:
    words = json.load(f)['words']

if sum(GROUP_SIZES) != len(words):
    print(f'WARNING: GROUP_SIZES sums to {sum(GROUP_SIZES)}, but JSON has {len(words)} words')

cursor = 0
entries = []
for size in GROUP_SIZES:
    group = words[cursor:cursor + size]
    if not group:
        print(f'ERROR: ran out of words at cursor={cursor}')
        sys.exit(1)
    start_ts = to_srt_time(group[0]['start'])
    end_ts   = to_srt_time(group[-1]['end'])
    text     = ' '.join(w['word'] for w in group)
    entries.append((start_ts, end_ts, text))
    cursor += size

lines = []
for i, (s, e, t) in enumerate(entries, 1):
    lines += [str(i), f'{s} --> {e}', t, '']

with open(OUTPUT_SRT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'Done: {len(entries)} entries written to {OUTPUT_SRT}')
print(f'Cursor: {cursor}/{len(words)} words consumed')
