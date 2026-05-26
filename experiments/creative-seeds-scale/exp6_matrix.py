#!/usr/bin/env python3
"""
Experiment 6: Task Type × Length Matrix
========================================
2×2 design to separate "length" from "task type":

              Short              Long
Analytical    5 brand names      10 names + explanations
Narrative     1 sentence         8-10 sentence story

Same creative domain within each type (naming / laughter).
Both groups get "be wildly creative". Treatment also gets seeds.
Blind pairwise judging.

3 rounds × 4 cells × 5 trials = 60 pairwise comparisons
"""

import json, os, random, re, subprocess, math, time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

SEEDS_FILE = os.path.expanduser("~/.claude/skills/creative-seeds/seeds.md")
RESULTS_DIR = Path(__file__).parent / "results"
MODEL = "haiku"

CELLS = {
    "AS": {
        "name": "Analytical-Short",
        "type": "analytical",
        "length": "short",
        "prompt": "Generate 5 creative brand names for a spice shop. Just the names, nothing else. Be wildly creative and unconventional — avoid generic food/kitchen naming patterns.",
    },
    "AL": {
        "name": "Analytical-Long",
        "type": "analytical",
        "length": "long",
        "prompt": "Generate 10 creative brand names for a spice shop. For each name, write 2-3 sentences explaining the concept, the feeling it evokes, and who it's for. Be wildly creative and unconventional — avoid generic food/kitchen naming patterns.",
    },
    "NS": {
        "name": "Narrative-Short",
        "type": "narrative",
        "length": "short",
        "prompt": "In exactly one sentence, describe the feeling of laughing so hard you can't breathe. No clichés, no 'tears streaming' or 'sides splitting.' Find something genuinely fresh.",
    },
    "NL": {
        "name": "Narrative-Long",
        "type": "narrative",
        "length": "long",
        "prompt": "Write a vivid short story (8-10 sentences) about a specific moment of laughing so hard you can't breathe. Make it concrete — who, where, what triggered it. No clichés. Make the reader feel it physically.",
    },
}

def load_seeds():
    with open(SEEDS_FILE) as f:
        content = f.read()
    seeds = [s.strip() for s in re.split(r'\n---\n', content) if re.search(r'##\s*\d+\.', s)]
    return seeds

def get_random_seeds(all_seeds, n=3):
    return "\n\n---\n\n".join(random.sample(all_seeds, n))

def run_claude(prompt, model="haiku", timeout=120):
    cmd = ["claude", "-p", "--model", model, prompt]
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
        if result.returncode != 0:
            return f"ERROR: {result.stderr[:500]}"
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "ERROR: timeout"
    except Exception as e:
        return f"ERROR: {e}"

def clean_output(text):
    text = re.sub(r'\*?\*?\(?(with|without)\s*(creative\s*)?seeds?\)?\.?\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\*?\*?\(?(with|without)\s*(simple\s*)?wildness\s*boost\)?\.?\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\*?\*?WITH\s+(NARRATIVE\s+)?SEEDS?[:\s]*[^*]*\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\*?\*?WITH\s+SIMPLE\s+WILDNESS\s+BOOST\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'seeds?\)', ')', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*[\.\*\-]+\s*', '', text)
    return text.strip()

def generate_outputs(all_seeds):
    print("\n" + "="*60)
    print("  PHASE 1: GENERATING OUTPUTS (120 total)")
    print("="*60)

    all_outputs = {}

    for round_id in ["R1", "R2", "R3"]:
        seeds_text = get_random_seeds(all_seeds, 3)

        for cell_id, cell_info in CELLS.items():
            key = f"{round_id}-{cell_id}"
            print(f"\n  Generating {key}: {cell_info['name']}...")

            tasks = []
            for i, label in enumerate("ABCDEFGHIJ"):
                is_seeded = (i % 2 == 0)

                if is_seeded:
                    prompt = (
                        "Be wildly creative, unconventional, and original. Break every pattern you know.\n\n"
                        "Before you begin, read these creative seeds — let them shift your thinking. "
                        "Do NOT reference them directly in your response.\n\n"
                        f"{seeds_text}\n\n---\n\n"
                        f"Now, here is your task:\n\n{cell_info['prompt']}"
                    )
                else:
                    prompt = (
                        "Be wildly creative, unconventional, and original. Break every pattern you know.\n\n"
                        f"{cell_info['prompt']}"
                    )

                tasks.append((label, is_seeded, prompt))

            outputs = {}
            with ThreadPoolExecutor(max_workers=5) as pool:
                futures = {}
                for label, is_seeded, prompt in tasks:
                    f = pool.submit(run_claude, prompt, MODEL)
                    futures[f] = (label, is_seeded)

                for f in as_completed(futures):
                    label, is_seeded = futures[f]
                    raw = f.result()
                    cleaned = clean_output(raw)
                    outputs[label] = cleaned
                    cond = "S" if is_seeded else "C"
                    print(f"    {label}({cond}): {len(cleaned)} chars")

            all_outputs[key] = outputs

    return all_outputs

def build_judge_prompts(all_outputs):
    print("\n" + "="*60)
    print("  PHASE 2: BUILDING JUDGE PROMPTS")
    print("="*60)

    judge_prompts = {}
    decode_key = {}
    positions = [1, 2, 1, 2, 1]

    for round_id in ["R1", "R2", "R3"]:
        for cell_id, cell_info in CELLS.items():
            key = f"{round_id}-{cell_id}"
            outputs = all_outputs[key]

            pairs_text = []
            seeded_positions = []
            pair_labels = [("A","B"), ("C","D"), ("E","F"), ("G","H"), ("I","J")]

            for pair_idx, (s_label, c_label) in enumerate(pair_labels):
                pos = positions[pair_idx]
                seeded_positions.append(pos)

                if pos == 1:
                    opt1, opt2 = outputs[s_label], outputs[c_label]
                else:
                    opt1, opt2 = outputs[c_label], outputs[s_label]

                pairs_text.append(f"""
--- PAIR {pair_idx + 1} ---

**Option 1:**
{opt1}

**Option 2:**
{opt2}

Your choice for Pair {pair_idx + 1} (1 or 2):""")

            prompt = f"""You are a blind judge in a creativity experiment. You will see 5 pairs of creative outputs. For each pair, choose which one is MORE CREATIVE, ORIGINAL, and MEMORABLE. You MUST pick one — no ties allowed.

The task was: {cell_info['prompt']}

{"".join(pairs_text)}

Respond with ONLY a JSON object:
{{"pair1": <1 or 2>, "pair2": <1 or 2>, "pair3": <1 or 2>, "pair4": <1 or 2>, "pair5": <1 or 2>}}"""

            judge_prompts[key] = prompt
            decode_key[key] = {"seeded_positions": seeded_positions}
            print(f"  Built: {key}")

    return judge_prompts, decode_key

def run_judges(judge_prompts):
    print("\n" + "="*60)
    print("  PHASE 3: RUNNING 12 BLIND JUDGES")
    print("="*60)

    results = {}

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {}
        for key, prompt in judge_prompts.items():
            judge_prompt = (
                "You are a blind judge evaluating creative outputs. "
                "Read the following and evaluate the 5 pairs. "
                "Respond ONLY with valid JSON.\n\n" + prompt
            )
            f = pool.submit(run_claude, judge_prompt, MODEL, 180)
            futures[f] = key

        for f in as_completed(futures):
            key = futures[f]
            raw = f.result()
            print(f"\n  Judge {key}: ", end="")

            try:
                match = re.search(r'\{[^}]+\}', raw)
                if match:
                    data = json.loads(match.group())
                    results[key] = data
                    print(f"✓ {data}")
                else:
                    print(f"✗ No JSON")
                    results[key] = None
            except json.JSONDecodeError as e:
                print(f"✗ JSON error: {e}")
                results[key] = None

    return results

def analyze(judge_results, decode_key):
    print("\n" + "="*60)
    print("  PHASE 4: ANALYSIS — 2×2 MATRIX")
    print("="*60)

    # Aggregate by cell
    per_cell = {cid: {"seeds_wins": 0, "total": 0} for cid in CELLS}
    per_key = {}

    for key, choices in judge_results.items():
        if choices is None:
            print(f"  ⚠ Skipping {key}")
            continue

        _, cell_id = key.split("-")
        seeded_pos = decode_key[key]["seeded_positions"]

        seeds_wins = 0
        for i in range(5):
            chosen = choices.get(f"pair{i+1}")
            if chosen == seeded_pos[i]:
                seeds_wins += 1

        per_cell[cell_id]["seeds_wins"] += seeds_wins
        per_cell[cell_id]["total"] += 5
        per_key[key] = {"seeds_wins": seeds_wins, "total": 5}

        print(f"  {key}: Seeds {seeds_wins}/5")

    # Matrix display
    print("\n" + "="*60)
    print("  2×2 MATRIX: SEED WIN RATE")
    print("="*60)

    def fmt(cid):
        d = per_cell[cid]
        if d["total"] == 0:
            return "N/A"
        rate = d["seeds_wins"] / d["total"]
        n = d["total"]
        se = (0.25 / n) ** 0.5
        z = (rate - 0.5) / se if se > 0 else 0
        p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
        return f"{d['seeds_wins']}/{d['total']} ({rate:.0%}) p={p:.3f}{sig}"

    print(f"\n  {'':20s} {'SHORT':>25s}   {'LONG':>25s}")
    print(f"  {'':20s} {'─'*25}   {'─'*25}")
    print(f"  {'ANALYTICAL':20s} {fmt('AS'):>25s}   {fmt('AL'):>25s}")
    print(f"  {'NARRATIVE':20s} {fmt('NS'):>25s}   {fmt('NL'):>25s}")

    # By dimension
    print("\n  By TYPE (aggregated):")
    for ttype in ["analytical", "narrative"]:
        wins = sum(per_cell[c]["seeds_wins"] for c in CELLS if CELLS[c]["type"] == ttype)
        total = sum(per_cell[c]["total"] for c in CELLS if CELLS[c]["type"] == ttype)
        if total > 0:
            rate = wins / total
            se = (0.25 / total) ** 0.5
            z = (rate - 0.5) / se if se > 0 else 0
            p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
            sig = "*" if p < 0.05 else ""
            print(f"    {ttype:12s}: {wins}/{total} ({rate:.0%}) p={p:.3f}{sig}")

    print("\n  By LENGTH (aggregated):")
    for length in ["short", "long"]:
        wins = sum(per_cell[c]["seeds_wins"] for c in CELLS if CELLS[c]["length"] == length)
        total = sum(per_cell[c]["total"] for c in CELLS if CELLS[c]["length"] == length)
        if total > 0:
            rate = wins / total
            se = (0.25 / total) ** 0.5
            z = (rate - 0.5) / se if se > 0 else 0
            p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
            sig = "*" if p < 0.05 else ""
            print(f"    {length:12s}: {wins}/{total} ({rate:.0%}) p={p:.3f}{sig}")

    # Overall
    total_wins = sum(d["seeds_wins"] for d in per_cell.values())
    total_all = sum(d["total"] for d in per_cell.values())
    if total_all > 0:
        rate = total_wins / total_all
        se = (0.25 / total_all) ** 0.5
        z = (rate - 0.5) / se if se > 0 else 0
        p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
        print(f"\n  OVERALL: {total_wins}/{total_all} ({rate:.1%}) p={p:.3f}")

    # Position bias
    pos1 = 0
    pos_total = 0
    for key, choices in judge_results.items():
        if choices is None:
            continue
        for i in range(5):
            if choices.get(f"pair{i+1}") == 1:
                pos1 += 1
            pos_total += 1
    if pos_total > 0:
        print(f"\n  Position bias: Option 1 chosen {pos1}/{pos_total} ({pos1/pos_total:.0%})")

    # Per-round detail
    print("\n  Per-round breakdown:")
    for key in sorted(per_key.keys()):
        d = per_key[key]
        print(f"    {key}: Seeds {d['seeds_wins']}/{d['total']}")

    return {
        "per_cell": per_cell,
        "per_key": per_key,
        "total_seeds_wins": total_wins,
        "total_comparisons": total_all,
    }

def main():
    random.seed(43)
    all_seeds = load_seeds()
    print(f"  Loaded {len(all_seeds)} seeds")

    outputs = generate_outputs(all_seeds)

    RESULTS_DIR.mkdir(exist_ok=True)
    with open(RESULTS_DIR / "exp6_outputs.json", "w") as f:
        json.dump(outputs, f, indent=2)
    print("\n  Outputs saved to results/exp6_outputs.json")

    judge_prompts, decode_key = build_judge_prompts(outputs)

    judge_results = run_judges(judge_prompts)

    analysis = analyze(judge_results, decode_key)

    final = {
        "experiment": "Exp 6: Task Type × Length Matrix",
        "methodology": "2x2 (analytical/narrative × short/long), both groups get 'be creative', treatment also gets seeds, blind pairwise",
        "model": MODEL,
        "cells": {k: {"name": v["name"], "type": v["type"], "length": v["length"]} for k, v in CELLS.items()},
        "timestamp": datetime.now().isoformat(),
        "results": analysis,
        "judge_raw": {k: v for k, v in judge_results.items() if v},
        "decode_key": decode_key,
    }
    with open(RESULTS_DIR / "exp6_results.json", "w") as f:
        json.dump(final, f, indent=2)

    print("\n  All results saved to results/exp6_results.json")
    print("\n" + "="*60)
    print("  EXPERIMENT 6 COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
