"""
postprocess.py — Enforce MAX 2 lines and MAX_CHARS per line on a translated SRT.
Splits long lines at word boundaries. If an entry exceeds 2 lines, creates sub-entries
with proportionally divided timestamps.

Usage:
  python3 postprocess.py <srt_file> [max_chars]

  max_chars defaults:
    38 for --shorts mode
    42 for --regular mode
"""

import re, sys

INPUT    = sys.argv[1] if len(sys.argv) > 1 else 'input.srt'
MAX_CHARS = int(sys.argv[2]) if len(sys.argv) > 2 else 42


def ts_to_ms(ts):
    h, m, rest = ts.split(':'); s, ms = rest.split(',')
    return int(h)*3600000 + int(m)*60000 + int(s)*1000 + int(ms)


def ms_to_ts(ms):
    h = ms//3600000; ms %= 3600000
    m = ms//60000;   ms %= 60000
    s = ms//1000;    ms %= 1000
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def split_line(line, max_chars):
    clean = line.strip('\u202b\u202c\u200f\u200e')
    if len(clean) <= max_chars:
        return [clean]
    words = clean.split(' '); chunks = []; current = ''
    for word in words:
        test = (current + ' ' + word).strip()
        if len(test) <= max_chars:
            current = test
        else:
            if current: chunks.append(current)
            current = word
    if current: chunks.append(current)
    return chunks


with open(INPUT, 'r', encoding='utf-8') as f:
    content = f.read()

blocks = re.split(r'\n\n+', content.strip())
result = []

for block in blocks:
    lines = block.split('\n')
    if len(lines) < 3: continue
    ts_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', lines[1])
    if not ts_match: continue
    start_ts, end_ts = ts_match.group(1), ts_match.group(2)
    text_lines = [l.strip('\u202b\u202c\u200f\u200e') for l in lines[2:] if l.strip()]

    all_sublines = []
    for tl in text_lines:
        all_sublines.extend(split_line(tl, MAX_CHARS))

    chunks = [all_sublines[i:i+2] for i in range(0, len(all_sublines), 2)]
    start_ms = ts_to_ms(start_ts); end_ms = ts_to_ms(end_ts)
    chunk_ms = max(1, (end_ms - start_ms) // len(chunks))

    for i, chunk in enumerate(chunks):
        c_start = ms_to_ts(start_ms + i * chunk_ms)
        c_end   = ms_to_ts(start_ms + (i+1)*chunk_ms - 1) if i < len(chunks)-1 else end_ts
        result.append((c_start, c_end, chunk))

output_lines = []
for idx, (s, e, tls) in enumerate(result, 1):
    output_lines += [str(idx), f'{s} --> {e}'] + ['\u202b' + l + '\u202c' for l in tls] + ['']

with open(INPUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

max_len = max(len(l.strip('\u202b\u202c')) for _, _, ls in result for l in ls)
print(f'Done: {len(result)} entries, max {max_len} chars/line')
