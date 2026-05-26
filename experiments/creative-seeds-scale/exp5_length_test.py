#!/usr/bin/env python3
"""
Experiment 5: Task Length vs Seed Effectiveness
================================================
Same task (Out-of-Office), 3 length conditions:
  L1: One sentence
  L2: Short paragraph (3-4 sentences)
  L3: Full creative email with backstory

Both groups get "be wildly creative" instruction.
Treatment also gets seeds.
Blind pairwise judging.

3 rounds × 3 lengths × 5 trials = 45 pairwise comparisons
"""

import json, os, random, re, subprocess, time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

SEEDS_FILE = os.path.expanduser("~/.claude/skills/creative-seeds/seeds.md")
RESULTS_DIR = Path(__file__).parent / "results"
MODEL = "haiku"

LENGTHS = {
    "L1": {
        "name": "One Sentence",
        "prompt": "Write an out-of-office auto-reply in EXACTLY ONE SENTENCE for someone who quit their corporate job to become a beekeeper. Make it memorable and funny. ONE SENTENCE ONLY.",
    },
    "L2": {
        "name": "Short Paragraph",
        "prompt": "Write an out-of-office auto-reply in 3-4 sentences for someone who quit their corporate job to become a beekeeper. Make it memorable, funny, and subtly profound.",
    },
    "L3": {
        "name": "Full Email",
        "prompt": "Write a full out-of-office email auto-reply (subject line + body, at least 6-8 sentences) for someone who quit their corporate job to become a beekeeper. Include a brief backstory, something philosophical about the career change, and make it memorable, funny, and subtly profound.",
    },
}

# Pre-selected seed groups per round (from previous experiments)
SEED_GROUPS = {
    "R1": ["glacier/tambourine/velcro", "anchovy/kaleidoscope/origami", "mustard/periscope/quilt"],
    "R2": ["kumquat/artichoke/bismuth", "parabola/fjord/pendulum", "monarchy/tarantula/pomegranate"],
    "R3": ["trombone/custard/zeppelin", "lobotomy/turquoise/clavicle", "hieroglyph/marmalade/igloo"],
}

def load_seeds():
    with open(SEEDS_FILE) as f:
        content = f.read()
    seeds = [s.strip() for s in re.split(r'\n---\n', content) if re.search(r'##\s*\d+\.', s)]
    return seeds

def get_random_seeds(all_seeds, n=3):
    chosen = random.sample(all_seeds, n)
    return "\n\n---\n\n".join(chosen)

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
    """Remove any condition hints from output."""
    text = re.sub(r'\*?\*?\(?(with|without)\s*(creative\s*)?seeds?\)?\.?\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\*?\*?\(?(with|without)\s*(simple\s*)?wildness\s*boost\)?\.?\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\*?\*?WITH\s+(NARRATIVE\s+)?SEEDS?[:\s]*[^*]*\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\*?\*?WITH\s+SIMPLE\s+WILDNESS\s+BOOST\*?\*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'seeds?\)', ')', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*[\.\*\-]+\s*', '', text)
    return text.strip()

def generate_outputs(all_seeds):
    """Phase 1: Generate all outputs."""
    print("\n" + "="*60)
    print("  PHASE 1: GENERATING OUTPUTS")
    print("="*60)

    all_outputs = {}

    for round_id in ["R1", "R2", "R3"]:
        seeds_text = get_random_seeds(all_seeds, 3)

        for length_id, length_info in LENGTHS.items():
            key = f"{round_id}-{length_id}"
            print(f"\n  Generating {key}: {length_info['name']}...")

            tasks = []
            # Generate 5 seeded (A,C,E,G,I) and 5 control (B,D,F,H,J)
            labels = list("ABCDEFGHIJ")

            for i, label in enumerate(labels):
                is_seeded = (i % 2 == 0)  # A,C,E,G,I = seeded

                if is_seeded:
                    prompt = (
                        "Be wildly creative, unconventional, and original. Break every pattern you know.\n\n"
                        "Before you begin, read these creative seeds — let them shift your thinking. "
                        "Do NOT reference them directly in your response.\n\n"
                        f"{seeds_text}\n\n---\n\n"
                        f"Now, here is your task:\n\n{length_info['prompt']}"
                    )
                else:
                    prompt = (
                        "Be wildly creative, unconventional, and original. Break every pattern you know.\n\n"
                        f"{length_info['prompt']}"
                    )

                tasks.append((key, label, is_seeded, prompt))

            # Run in parallel (5 at a time)
            outputs = {}
            with ThreadPoolExecutor(max_workers=5) as pool:
                futures = {}
                for k, label, is_seeded, prompt in tasks:
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
    """Phase 2: Build blind pairwise judge prompts."""
    print("\n" + "="*60)
    print("  PHASE 2: BUILDING JUDGE PROMPTS")
    print("="*60)

    judge_prompts = {}
    decode_key = {}

    # Position pattern: alternate which position seeded appears in
    # For 5 pairs: [1, 2, 1, 2, 1]
    positions = [1, 2, 1, 2, 1]

    for round_id in ["R1", "R2", "R3"]:
        for length_id, length_info in LENGTHS.items():
            key = f"{round_id}-{length_id}"
            outputs = all_outputs[key]

            pairs_text = []
            seeded_positions = []

            # Pairs: (A,B), (C,D), (E,F), (G,H), (I,J)
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

The task was: {length_info['prompt']}

{"".join(pairs_text)}

Respond with ONLY a JSON object:
{{"pair1": <1 or 2>, "pair2": <1 or 2>, "pair3": <1 or 2>, "pair4": <1 or 2>, "pair5": <1 or 2>}}"""

            judge_prompts[key] = prompt
            decode_key[key] = {"seeded_positions": seeded_positions}
            print(f"  Built judge prompt for {key}")

    return judge_prompts, decode_key

def run_judges(judge_prompts):
    """Phase 3: Run blind judges."""
    print("\n" + "="*60)
    print("  PHASE 3: RUNNING BLIND JUDGES")
    print("="*60)

    results = {}

    # Run all 9 judges in parallel (3 rounds × 3 lengths)
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
            print(f"\n  Judge {key} returned:")
            print(f"    {raw[:200]}")

            # Parse JSON
            try:
                match = re.search(r'\{[^}]+\}', raw)
                if match:
                    data = json.loads(match.group())
                    results[key] = data
                    print(f"    ✓ Parsed: {data}")
                else:
                    print(f"    ✗ No JSON found")
                    results[key] = None
            except json.JSONDecodeError as e:
                print(f"    ✗ JSON error: {e}")
                results[key] = None

    return results

def analyze(judge_results, decode_key):
    """Phase 4: Decode and analyze."""
    print("\n" + "="*60)
    print("  PHASE 4: ANALYSIS")
    print("="*60)

    per_length = {lid: {"seeds_wins": 0, "total": 0} for lid in LENGTHS}
    per_round_length = {}

    for key, choices in judge_results.items():
        if choices is None:
            print(f"  ⚠ Skipping {key} (no data)")
            continue

        round_id, length_id = key.split("-")
        seeded_pos = decode_key[key]["seeded_positions"]

        seeds_wins = 0
        for i in range(5):
            pair_key = f"pair{i+1}"
            chosen = choices.get(pair_key)
            if chosen == seeded_pos[i]:
                seeds_wins += 1

        per_length[length_id]["seeds_wins"] += seeds_wins
        per_length[length_id]["total"] += 5
        per_round_length[key] = {"seeds_wins": seeds_wins, "total": 5}

        print(f"  {key}: Seeds {seeds_wins}/5")

    # Summary
    print("\n" + "="*60)
    print("  RESULTS: SEED EFFECTIVENESS BY OUTPUT LENGTH")
    print("="*60)

    import math

    total_seeds = 0
    total_all = 0

    for lid in ["L1", "L2", "L3"]:
        d = per_length[lid]
        if d["total"] == 0:
            continue
        rate = d["seeds_wins"] / d["total"]
        n = d["total"]
        # Binomial test (normal approx)
        se = (0.25 / n) ** 0.5
        z = (rate - 0.5) / se if se > 0 else 0
        p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""

        total_seeds += d["seeds_wins"]
        total_all += d["total"]

        bar = "█" * int(rate * 30)
        print(f"\n  {LENGTHS[lid]['name']:20s}  {d['seeds_wins']:2d}/{d['total']:2d} ({rate:.0%})  p={p:.3f} {sig}")
        print(f"  {'':20s}  |{'─'*15}|{'─'*15}|")
        print(f"  {'':20s}  |{bar:<30s}|")
        print(f"  {'':20s}  0%{' '*12}50%{' '*11}100%")

    if total_all > 0:
        overall_rate = total_seeds / total_all
        se = (0.25 / total_all) ** 0.5
        z = (overall_rate - 0.5) / se if se > 0 else 0
        p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
        print(f"\n  {'OVERALL':20s}  {total_seeds}/{total_all} ({overall_rate:.1%})  p={p:.3f}")

    # Per round detail
    print("\n  Per-round breakdown:")
    for key in sorted(per_round_length.keys()):
        d = per_round_length[key]
        print(f"    {key}: Seeds {d['seeds_wins']}/{d['total']}")

    # Position bias check
    print("\n  Position bias check:")
    pos1_chosen = 0
    pos_total = 0
    for key, choices in judge_results.items():
        if choices is None:
            continue
        for i in range(5):
            pair_key = f"pair{i+1}"
            chosen = choices.get(pair_key)
            if chosen == 1:
                pos1_chosen += 1
            pos_total += 1
    if pos_total > 0:
        print(f"    Option 1 chosen: {pos1_chosen}/{pos_total} ({pos1_chosen/pos_total:.0%})")
        print(f"    Option 2 chosen: {pos_total-pos1_chosen}/{pos_total} ({(pos_total-pos1_chosen)/pos_total:.0%})")

    return {
        "per_length": per_length,
        "per_round_length": per_round_length,
        "total_seeds_wins": total_seeds,
        "total_comparisons": total_all,
    }

def main():
    random.seed(42)
    all_seeds = load_seeds()
    print(f"  Loaded {len(all_seeds)} seeds")

    # Phase 1: Generate
    outputs = generate_outputs(all_seeds)

    # Save outputs
    RESULTS_DIR.mkdir(exist_ok=True)
    with open(RESULTS_DIR / "exp5_outputs.json", "w") as f:
        json.dump(outputs, f, indent=2)
    print("\n  Outputs saved to results/exp5_outputs.json")

    # Phase 2: Build judge prompts
    judge_prompts, decode_key = build_judge_prompts(outputs)

    with open(RESULTS_DIR / "exp5_judge_prompts.json", "w") as f:
        json.dump({"prompts": {k: v[:200]+"..." for k,v in judge_prompts.items()}, "decode_key": decode_key}, f, indent=2)

    # Phase 3: Run judges
    judge_results = run_judges(judge_prompts)

    # Phase 4: Analyze
    analysis = analyze(judge_results, decode_key)

    # Save everything
    final = {
        "experiment": "Exp 5: Output Length vs Seed Effectiveness",
        "methodology": "Same task (Out-of-Office), 3 lengths, both groups get 'be creative', treatment also gets seeds, blind pairwise",
        "model": MODEL,
        "timestamp": datetime.now().isoformat(),
        "results": analysis,
        "judge_raw": {k: v for k, v in judge_results.items() if v},
        "decode_key": decode_key,
    }
    with open(RESULTS_DIR / "exp5_results.json", "w") as f:
        json.dump(final, f, indent=2)

    print("\n  All results saved to results/exp5_results.json")
    print("\n" + "="*60)
    print("  EXPERIMENT 5 COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
