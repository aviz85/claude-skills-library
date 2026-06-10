"""
rtl-fix.py — Apply RTL Unicode markers to Hebrew/Arabic/Farsi SRT files.

MANDATORY for he/ar/fa — run AFTER postprocess.py, BEFORE ffmpeg embed.

U+200F (RLM) + U+202B (RLE) are both required for libass+FriBidi to render
RTL text correctly. Do NOT add U+202C at end — it breaks RTL detection.

Usage:
  python3 rtl-fix.py <srt_file>
"""

import re, sys

SRT_FILE = sys.argv[1] if len(sys.argv) > 1 else 'input.srt'

with open(SRT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result = []
for line in lines:
    stripped = line.strip()
    if (stripped
            and not re.match(r'^\d+$', stripped)
            and not re.match(r'\d{2}:\d{2}:\d{2}', stripped)):
        clean = line.strip('\u202b\u202c\u200f\u200e')
        line = '\u200F\u202B' + clean
    result.append(line)

with open(SRT_FILE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(result))

print(f'RTL fix applied to {SRT_FILE}')
