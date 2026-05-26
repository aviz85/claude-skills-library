#!/usr/bin/env python3
"""
Creative Seeds Experiment — Large Scale
========================================
A/B test: Do absurdist micro-stories improve AI creative output?

- Treatment: 3 random seeds injected before the task
- Control: identical task, no seeds
- Blind judge: rates all outputs without knowing condition
- N trials per condition per task (default 10)

Usage:
    python3 run_experiment.py                  # Run full experiment (10 trials)
    python3 run_experiment.py --trials 5       # Quick test (5 trials)
    python3 run_experiment.py --judge-only     # Re-run judging on existing results
    python3 run_experiment.py --analyze-only   # Re-analyze existing judged results
"""

import json
import os
import random
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

TRIALS_PER_CONDITION = 10
MAX_PARALLEL = 6  # concurrent claude processes
SEEDS_FILE = os.path.expanduser("~/.claude/skills/creative-seeds/seeds.md")
RESULTS_DIR = Path(__file__).parent / "results"
MODEL = "sonnet"  # for generation (fast + cheap)
JUDGE_MODEL = "opus"  # for judging (best quality)

TASKS = {
    "T1": {
        "name": "Brand Names",
        "prompt": "Generate 5 brand names for a therapy app targeting perfectionists. For each name, write one sentence explaining the concept. Be creative and unexpected — avoid generic wellness/therapy naming patterns."
    },
    "T2": {
        "name": "Describe Hope",
        "prompt": "Write 4 sentences describing 'hope' without using any clichés. No light-at-end-of-tunnel, no sunrise metaphors, no 'keep going' sentiment. Find genuinely fresh ways to express this emotion."
    },
    "T3": {
        "name": "Out-of-Office",
        "prompt": "Write an out-of-office email auto-reply for someone who quit their corporate job to become a beekeeper. Make it memorable, funny, and subtly profound."
    },
    "T4": {
        "name": "New Ritual",
        "prompt": "Invent a new human ritual that should exist but doesn't. Describe what it is, when it happens, how it works, and why humans need it. Make it feel both absurd and deeply true."
    },
}

JUDGE_PROMPT_TEMPLATE = """You are a blind judge in a creativity experiment. Rate the following creative output on three dimensions, each on a 1-10 scale.

**Scoring criteria:**
- **Originality (1-10):** How novel and unique are the ideas? Does it surprise you? Would you have seen this coming?
- **Memorability (1-10):** Does it stick? Would you remember this tomorrow? Does it resonate emotionally or intellectually?
- **Precision (1-10):** Is the language earned? Is every word doing work? Is there economy and craft in the writing?

**The task was:** {task_prompt}

**The output to judge:**
{output}

**Respond ONLY with valid JSON, no other text:**
{{"originality": <1-10>, "memorability": <1-10>, "precision": <1-10>, "notes": "<brief 1-sentence justification>"}}
"""

# ── Seed Loading ────────────────────────────────────────────────────────────

def load_seeds():
    """Load all 50 seeds from the seeds file."""
    with open(SEEDS_FILE) as f:
        content = f.read()
    seeds = [s.strip() for s in re.split(r'\n---\n', content) if re.search(r'##\s*\d+\.', s)]
    return seeds

def get_random_seeds(all_seeds, n=3):
    """Pick n random seeds."""
    chosen = random.sample(all_seeds, n)
    return "\n\n---\n\n".join(chosen)

# ── Claude Runner ───────────────────────────────────────────────────────────

def run_claude(prompt, model="sonnet", timeout=120):
    """Run claude -p with a prompt, return the output text."""
    cmd = ["claude", "-p", "--model", model, prompt]
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, env=env
        )
        if result.returncode != 0:
            return f"ERROR: {result.stderr[:500]}"
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "ERROR: timeout"
    except Exception as e:
        return f"ERROR: {e}"

# ── Experiment Runner ───────────────────────────────────────────────────────

def run_single_trial(task_id, task_prompt, condition, seeds_text, trial_num):
    """Run one trial: either seeded or control."""
    if condition == "seeded":
        full_prompt = (
            "Before you begin, read these creative seeds — let them shift your thinking. "
            "Do NOT reference them in your response.\n\n"
            f"{seeds_text}\n\n"
            "---\n\n"
            f"Now, here is your task:\n\n{task_prompt}"
        )
    else:
        full_prompt = task_prompt

    output = run_claude(full_prompt, model=MODEL)

    return {
        "task_id": task_id,
        "trial": trial_num,
        "condition": condition,
        "output": output,
        "timestamp": datetime.now().isoformat(),
        "seeds_used": seeds_text[:200] + "..." if condition == "seeded" else None,
    }

def run_generation_phase(n_trials):
    """Run all generation trials in parallel."""
    all_seeds = load_seeds()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    results_file = RESULTS_DIR / "generation_results.json"

    # Resume from existing results if available
    existing = []
    if results_file.exists():
        existing = json.loads(results_file.read_text())
        done_keys = {(r["task_id"], r["condition"], r["trial"]) for r in existing}
        print(f"  Resuming: {len(existing)} trials already done")
    else:
        done_keys = set()

    # Build work queue
    work = []
    for task_id, task in TASKS.items():
        for condition in ["seeded", "control"]:
            for trial in range(1, n_trials + 1):
                if (task_id, condition, trial) not in done_keys:
                    seeds_text = get_random_seeds(all_seeds) if condition == "seeded" else ""
                    work.append((task_id, task["prompt"], condition, seeds_text, trial))

    total = len(work)
    if total == 0:
        print("  All generation trials already complete!")
        return existing

    print(f"  Running {total} trials ({MAX_PARALLEL} parallel)...")
    results = list(existing)
    completed = 0

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as executor:
        futures = {
            executor.submit(run_single_trial, *w): w for w in work
        }
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            completed += 1
            status = "✓" if not result["output"].startswith("ERROR") else "✗"
            print(f"  [{completed}/{total}] {status} {result['task_id']} {result['condition']} #{result['trial']}")

            # Save incrementally
            if completed % 5 == 0:
                results_file.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    results_file.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"  Saved {len(results)} results to {results_file}")
    return results

# ── Judging Phase ───────────────────────────────────────────────────────────

def judge_single(entry, task_prompt):
    """Have the judge rate one output."""
    prompt = JUDGE_PROMPT_TEMPLATE.format(
        task_prompt=task_prompt,
        output=entry["output"]
    )
    raw = run_claude(prompt, model=JUDGE_MODEL, timeout=90)

    # Extract JSON from response
    try:
        # Try to find JSON in the response
        json_match = re.search(r'\{[^}]+\}', raw, re.DOTALL)
        if json_match:
            scores = json.loads(json_match.group())
        else:
            scores = json.loads(raw)
    except (json.JSONDecodeError, AttributeError):
        scores = {"originality": 0, "memorability": 0, "precision": 0, "notes": f"PARSE_ERROR: {raw[:200]}"}

    return {
        **entry,
        "scores": scores,
        "judge_model": JUDGE_MODEL,
    }

def run_judging_phase(results):
    """Judge all outputs blindly."""
    judged_file = RESULTS_DIR / "judged_results.json"

    # Resume from existing
    existing_judged = []
    if judged_file.exists():
        existing_judged = json.loads(judged_file.read_text())
        done_keys = {(r["task_id"], r["condition"], r["trial"]) for r in existing_judged}
        print(f"  Resuming: {len(existing_judged)} already judged")
    else:
        done_keys = set()

    # Shuffle results so judge sees them in random order (blind)
    to_judge = [r for r in results
                if (r["task_id"], r["condition"], r["trial"]) not in done_keys
                and not r["output"].startswith("ERROR")]
    random.shuffle(to_judge)

    total = len(to_judge)
    if total == 0:
        print("  All judging already complete!")
        return existing_judged

    print(f"  Judging {total} outputs ({MAX_PARALLEL} parallel)...")
    judged = list(existing_judged)
    completed = 0

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as executor:
        futures = {
            executor.submit(judge_single, entry, TASKS[entry["task_id"]]["prompt"]): entry
            for entry in to_judge
        }
        for future in as_completed(futures):
            result = future.result()
            judged.append(result)
            completed += 1
            s = result.get("scores", {})
            avg = (s.get("originality", 0) + s.get("memorability", 0) + s.get("precision", 0)) / 3
            print(f"  [{completed}/{total}] {result['task_id']} {result['condition']} #{result['trial']} → avg {avg:.1f}")

            if completed % 5 == 0:
                judged_file.write_text(json.dumps(judged, indent=2, ensure_ascii=False))

    judged_file.write_text(json.dumps(judged, indent=2, ensure_ascii=False))
    print(f"  Saved {len(judged)} judged results to {judged_file}")
    return judged

# ── Analysis ────────────────────────────────────────────────────────────────

def analyze(judged):
    """Statistical analysis of results."""
    report_file = RESULTS_DIR / "analysis_report.md"

    # Filter out errors
    valid = [r for r in judged if r.get("scores", {}).get("originality", 0) > 0]

    # Group by condition
    seeded = [r for r in valid if r["condition"] == "seeded"]
    control = [r for r in valid if r["condition"] == "control"]

    def avg_scores(group):
        if not group:
            return {"originality": 0, "memorability": 0, "precision": 0, "overall": 0}
        o = sum(r["scores"]["originality"] for r in group) / len(group)
        m = sum(r["scores"]["memorability"] for r in group) / len(group)
        p = sum(r["scores"]["precision"] for r in group) / len(group)
        return {"originality": o, "memorability": m, "precision": p, "overall": (o + m + p) / 3}

    s_avg = avg_scores(seeded)
    c_avg = avg_scores(control)

    # Per-task breakdown
    task_results = {}
    for task_id in TASKS:
        s_task = [r for r in seeded if r["task_id"] == task_id]
        c_task = [r for r in control if r["task_id"] == task_id]
        s_a = avg_scores(s_task)
        c_a = avg_scores(c_task)
        task_results[task_id] = {
            "name": TASKS[task_id]["name"],
            "seeded": s_a,
            "control": c_a,
            "delta": s_a["overall"] - c_a["overall"],
            "winner": "seeded" if s_a["overall"] > c_a["overall"] else "control",
            "n_seeded": len(s_task),
            "n_control": len(c_task),
        }

    # Simple statistical test (Mann-Whitney U approximation via normal approx)
    def compute_effect_size(seeded_scores, control_scores):
        """Cohen's d effect size."""
        if not seeded_scores or not control_scores:
            return 0
        import statistics
        s_mean = statistics.mean(seeded_scores)
        c_mean = statistics.mean(control_scores)
        s_std = statistics.stdev(seeded_scores) if len(seeded_scores) > 1 else 0.001
        c_std = statistics.stdev(control_scores) if len(control_scores) > 1 else 0.001
        pooled_std = ((s_std**2 + c_std**2) / 2) ** 0.5
        if pooled_std == 0:
            return 0
        return (s_mean - c_mean) / pooled_std

    s_overalls = [(r["scores"]["originality"] + r["scores"]["memorability"] + r["scores"]["precision"]) / 3 for r in seeded]
    c_overalls = [(r["scores"]["originality"] + r["scores"]["memorability"] + r["scores"]["precision"]) / 3 for r in control]

    effect_d = compute_effect_size(s_overalls, c_overalls)

    # Win rate
    wins_seeded = sum(1 for t in task_results.values() if t["winner"] == "seeded")
    total_tasks = len(task_results)

    # ── Generate Report ─────────────────────────────────────────────────────
    report = f"""# Creative Seeds Experiment — Large Scale Results

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Trials per condition per task:** {len(seeded) // total_tasks if total_tasks else 0}
**Total outputs judged:** {len(valid)}
**Generation model:** {MODEL}
**Judge model:** {JUDGE_MODEL}

---

## Overall Results

| Metric | Seeded | Control | Delta |
|--------|--------|---------|-------|
| **Originality** | {s_avg['originality']:.2f} | {c_avg['originality']:.2f} | {s_avg['originality'] - c_avg['originality']:+.2f} |
| **Memorability** | {s_avg['memorability']:.2f} | {c_avg['memorability']:.2f} | {s_avg['memorability'] - c_avg['memorability']:+.2f} |
| **Precision** | {s_avg['precision']:.2f} | {c_avg['precision']:.2f} | {s_avg['precision'] - c_avg['precision']:+.2f} |
| **Overall** | **{s_avg['overall']:.2f}** | **{c_avg['overall']:.2f}** | **{s_avg['overall'] - c_avg['overall']:+.2f}** |

**Task Win Rate:** {wins_seeded}/{total_tasks} tasks won by seeded group
**Cohen's d (effect size):** {effect_d:.3f} ({'large' if abs(effect_d) >= 0.8 else 'medium' if abs(effect_d) >= 0.5 else 'small' if abs(effect_d) >= 0.2 else 'negligible'})

---

## Per-Task Breakdown

"""
    for task_id, t in sorted(task_results.items()):
        marker = "🏆" if t["winner"] == "seeded" else "  "
        report += f"""### {task_id}: {t['name']} {marker}

| | Seeded (n={t['n_seeded']}) | Control (n={t['n_control']}) | Delta |
|---|---|---|---|
| Originality | {t['seeded']['originality']:.2f} | {t['control']['originality']:.2f} | {t['seeded']['originality'] - t['control']['originality']:+.2f} |
| Memorability | {t['seeded']['memorability']:.2f} | {t['control']['memorability']:.2f} | {t['seeded']['memorability'] - t['control']['memorability']:+.2f} |
| Precision | {t['seeded']['precision']:.2f} | {t['control']['precision']:.2f} | {t['seeded']['precision'] - t['control']['precision']:+.2f} |
| **Overall** | **{t['seeded']['overall']:.2f}** | **{t['control']['overall']:.2f}** | **{t['seeded']['overall'] - t['control']['overall']:+.2f}** |

"""

    # Score distribution
    report += """---

## Score Distribution

### Seeded Group
"""
    for score_val in range(10, 0, -1):
        count = sum(1 for s in s_overalls if round(s) == score_val)
        bar = "█" * count
        if count:
            report += f"  {score_val:2d} │ {bar} ({count})\n"

    report += "\n### Control Group\n"
    for score_val in range(10, 0, -1):
        count = sum(1 for s in c_overalls if round(s) == score_val)
        bar = "█" * count
        if count:
            report += f"  {score_val:2d} │ {bar} ({count})\n"

    # Statistical notes
    report += f"""
---

## Statistical Notes

- **N (seeded):** {len(seeded)} outputs
- **N (control):** {len(control)} outputs
- **Effect size (Cohen's d):** {effect_d:.3f}
  - Small: 0.2, Medium: 0.5, Large: 0.8
- **Interpretation:** {'The seeded group shows a statistically meaningful improvement.' if effect_d >= 0.3 else 'The effect is small or negligible at this sample size.'}

### Limitations
- Single judge model ({JUDGE_MODEL}) — inter-rater reliability unknown
- Judge may have systematic biases toward certain styles
- Seeds are sampled randomly — some seed combinations may be more effective than others

---

*Generated by Creative Seeds Experiment Runner*
"""

    report_file.write_text(report)
    print(f"\n{'='*60}")
    print(report)
    print(f"{'='*60}")
    print(f"Report saved to: {report_file}")

    # Also save summary JSON
    summary = {
        "date": datetime.now().isoformat(),
        "n_seeded": len(seeded),
        "n_control": len(control),
        "seeded_avg": s_avg,
        "control_avg": c_avg,
        "effect_size_d": effect_d,
        "task_win_rate": f"{wins_seeded}/{total_tasks}",
        "per_task": task_results,
    }
    (RESULTS_DIR / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))

# ── Main ────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    n_trials = TRIALS_PER_CONDITION

    if "--trials" in args:
        idx = args.index("--trials")
        n_trials = int(args[idx + 1])

    analyze_only = "--analyze-only" in args
    judge_only = "--judge-only" in args

    print(f"""
╔══════════════════════════════════════════════════════╗
║   Creative Seeds Experiment — Large Scale            ║
║   {n_trials} trials × 2 conditions × {len(TASKS)} tasks = {n_trials * 2 * len(TASKS)} runs     ║
╚══════════════════════════════════════════════════════╝
""")

    if analyze_only:
        judged_file = RESULTS_DIR / "judged_results.json"
        judged = json.loads(judged_file.read_text())
        analyze(judged)
        return

    if judge_only:
        gen_file = RESULTS_DIR / "generation_results.json"
        results = json.loads(gen_file.read_text())
    else:
        print("Phase 1: Generation")
        print("=" * 40)
        results = run_generation_phase(n_trials)

    print("\nPhase 2: Blind Judging")
    print("=" * 40)
    judged = run_judging_phase(results)

    print("\nPhase 3: Analysis")
    print("=" * 40)
    analyze(judged)

if __name__ == "__main__":
    main()
