#!/usr/bin/env python3
"""Analyze judging results from the creative seeds experiment."""

import json
from datetime import datetime

# Mapping: A,C,E,G,I = seeded (odd letters) | B,D,F,H,J = control (even letters)
SEEDED_IDS = {"A", "C", "E", "G", "I"}
CONTROL_IDS = {"B", "D", "F", "H", "J"}

# Judge results (from agent outputs)
T1_SCORES = [
    {"id": "A", "originality": 9, "memorability": 9, "precision": 9},
    {"id": "B", "originality": 8, "memorability": 8, "precision": 8},
    {"id": "C", "originality": 8, "memorability": 7, "precision": 8},
    {"id": "D", "originality": 7, "memorability": 8, "precision": 7},
    {"id": "E", "originality": 9, "memorability": 9, "precision": 9},
    {"id": "F", "originality": 8, "memorability": 8, "precision": 8},
    {"id": "G", "originality": 8, "memorability": 9, "precision": 8},
    {"id": "H", "originality": 7, "memorability": 8, "precision": 7},
    {"id": "I", "originality": 8, "memorability": 8, "precision": 7},
    {"id": "J", "originality": 7, "memorability": 8, "precision": 7},
]

T2_SCORES = [
    {"id": "A", "originality": 9, "memorability": 9, "precision": 9},
    {"id": "B", "originality": 7, "memorability": 7, "precision": 8},
    {"id": "C", "originality": 8, "memorability": 9, "precision": 8},
    {"id": "D", "originality": 8, "memorability": 8, "precision": 9},
    {"id": "E", "originality": 7, "memorability": 8, "precision": 7},
    {"id": "F", "originality": 9, "memorability": 9, "precision": 8},
    {"id": "G", "originality": 6, "memorability": 7, "precision": 6},
    {"id": "H", "originality": 9, "memorability": 10, "precision": 9},
    {"id": "I", "originality": 6, "memorability": 7, "precision": 6},
    {"id": "J", "originality": 7, "memorability": 8, "precision": 8},
]

T3_SCORES = [
    {"id": "A", "originality": 7, "memorability": 8, "precision": 8},
    {"id": "B", "originality": 8, "memorability": 7, "precision": 9},
    {"id": "C", "originality": 9, "memorability": 9, "precision": 8},
    {"id": "D", "originality": 6, "memorability": 7, "precision": 7},
    {"id": "E", "originality": 9, "memorability": 9, "precision": 9},
    {"id": "F", "originality": 7, "memorability": 8, "precision": 8},
    {"id": "G", "originality": 6, "memorability": 7, "precision": 6},
    {"id": "H", "originality": 8, "memorability": 8, "precision": 9},
    {"id": "I", "originality": 7, "memorability": 8, "precision": 7},
    {"id": "J", "originality": 9, "memorability": 8, "precision": 9},
]

T4_SCORES = [
    {"id": "A", "originality": 7, "memorability": 8, "precision": 8},
    {"id": "B", "originality": 8, "memorability": 9, "precision": 9},
    {"id": "C", "originality": 9, "memorability": 9, "precision": 8},
    {"id": "D", "originality": 6, "memorability": 7, "precision": 7},
    {"id": "E", "originality": 8, "memorability": 8, "precision": 7},
    {"id": "F", "originality": 7, "memorability": 8, "precision": 7},
    {"id": "G", "originality": 8, "memorability": 9, "precision": 9},
    {"id": "H", "originality": 7, "memorability": 8, "precision": 6},
    {"id": "I", "originality": 6, "memorability": 7, "precision": 8},
    {"id": "J", "originality": 7, "memorability": 8, "precision": 7},
]

ALL_TASKS = {
    "T1": {"name": "Brand Names", "scores": T1_SCORES},
    "T2": {"name": "Describe Hope", "scores": T2_SCORES},
    "T3": {"name": "Out-of-Office", "scores": T3_SCORES},
    "T4": {"name": "New Ritual", "scores": T4_SCORES},
}

def avg(lst):
    return sum(lst) / len(lst) if lst else 0

def analyze_group(scores, ids):
    group = [s for s in scores if s["id"] in ids]
    o = [s["originality"] for s in group]
    m = [s["memorability"] for s in group]
    p = [s["precision"] for s in group]
    overall = [(s["originality"] + s["memorability"] + s["precision"]) / 3 for s in group]
    return {
        "originality": avg(o),
        "memorability": avg(m),
        "precision": avg(p),
        "overall": avg(overall),
        "all_overalls": overall,
    }

def cohens_d(group1, group2):
    import statistics
    if len(group1) < 2 or len(group2) < 2:
        return 0
    m1, m2 = statistics.mean(group1), statistics.mean(group2)
    s1, s2 = statistics.stdev(group1), statistics.stdev(group2)
    pooled = ((s1**2 + s2**2) / 2) ** 0.5
    return (m1 - m2) / pooled if pooled > 0 else 0

# ── Analysis ──
print("=" * 65)
print("  CREATIVE SEEDS EXPERIMENT — LARGE SCALE RESULTS (v2)")
print("  Clean prompt: seeds present without instruction")
print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
print(f"  Model: Haiku 4.5 (generation + judging)")
print(f"  N = 5 trials × 2 conditions × 4 tasks = 40 outputs")
print("=" * 65)

all_seeded_overalls = []
all_control_overalls = []

task_results = {}

for tid, tdata in ALL_TASKS.items():
    s = analyze_group(tdata["scores"], SEEDED_IDS)
    c = analyze_group(tdata["scores"], CONTROL_IDS)
    all_seeded_overalls.extend(s["all_overalls"])
    all_control_overalls.extend(c["all_overalls"])
    task_results[tid] = {"name": tdata["name"], "seeded": s, "control": c}

# Overall
s_o = avg([r["seeded"]["originality"] for r in task_results.values()])
s_m = avg([r["seeded"]["memorability"] for r in task_results.values()])
s_p = avg([r["seeded"]["precision"] for r in task_results.values()])
s_all = avg(all_seeded_overalls)

c_o = avg([r["control"]["originality"] for r in task_results.values()])
c_m = avg([r["control"]["memorability"] for r in task_results.values()])
c_p = avg([r["control"]["precision"] for r in task_results.values()])
c_all = avg(all_control_overalls)

d = cohens_d(all_seeded_overalls, all_control_overalls)

print()
print("┌─────────────────────────────────────────────────────────────┐")
print("│                    OVERALL RESULTS                         │")
print("├──────────────┬──────────┬──────────┬───────────────────────┤")
print(f"│ {'Metric':<12} │ {'Seeded':>8} │ {'Control':>8} │ {'Delta':>8}              │")
print("├──────────────┼──────────┼──────────┼───────────────────────┤")
print(f"│ Originality  │ {s_o:>8.2f} │ {c_o:>8.2f} │ {s_o - c_o:>+8.2f}              │")
print(f"│ Memorability │ {s_m:>8.2f} │ {c_m:>8.2f} │ {s_m - c_m:>+8.2f}              │")
print(f"│ Precision    │ {s_p:>8.2f} │ {c_p:>8.2f} │ {s_p - c_p:>+8.2f}              │")
print("├──────────────┼──────────┼──────────┼───────────────────────┤")
print(f"│ OVERALL      │ {s_all:>8.2f} │ {c_all:>8.2f} │ {s_all - c_all:>+8.2f}              │")
print("└──────────────┴──────────┴──────────┴───────────────────────┘")

# Effect size
effect_label = 'large' if abs(d) >= 0.8 else 'medium' if abs(d) >= 0.5 else 'small' if abs(d) >= 0.2 else 'negligible'
print(f"\n  Cohen's d: {d:.3f} ({effect_label})")

# Win rate
wins = sum(1 for r in task_results.values() if r["seeded"]["overall"] > r["control"]["overall"])
print(f"  Task Win Rate: {wins}/4 tasks won by seeded group")

# Per-task
print()
print("┌─────────────────────────────────────────────────────────────┐")
print("│                  PER-TASK BREAKDOWN                        │")
print("└─────────────────────────────────────────────────────────────┘")

for tid, r in sorted(task_results.items()):
    s, c = r["seeded"], r["control"]
    winner = "SEEDED ✓" if s["overall"] > c["overall"] else "CONTROL ✓" if c["overall"] > s["overall"] else "TIE"
    delta = s["overall"] - c["overall"]
    task_d = cohens_d(s["all_overalls"], c["all_overalls"])

    print(f"\n  {tid}: {r['name']} → {winner} (Δ = {delta:+.2f}, d = {task_d:.2f})")
    print(f"    Seeded:  O={s['originality']:.1f}  M={s['memorability']:.1f}  P={s['precision']:.1f}  → {s['overall']:.2f}")
    print(f"    Control: O={c['originality']:.1f}  M={c['memorability']:.1f}  P={c['precision']:.1f}  → {c['overall']:.2f}")

# Score distribution
print()
print("┌─────────────────────────────────────────────────────────────┐")
print("│                 SCORE DISTRIBUTIONS                        │")
print("└─────────────────────────────────────────────────────────────┘")
print("\n  Seeded individual scores:")
for score_val in range(10, 5, -1):
    count = sum(1 for s in all_seeded_overalls if round(s) == score_val)
    bar = "█" * count
    if count:
        print(f"    {score_val:2d} │ {bar} ({count})")

print("\n  Control individual scores:")
for score_val in range(10, 5, -1):
    count = sum(1 for s in all_control_overalls if round(s) == score_val)
    bar = "█" * count
    if count:
        print(f"    {score_val:2d} │ {bar} ({count})")

# Raw numbers
print()
print("  Seeded overalls:", [f"{x:.1f}" for x in sorted(all_seeded_overalls)])
print("  Control overalls:", [f"{x:.1f}" for x in sorted(all_control_overalls)])

print()
print("=" * 65)
print("  METHODOLOGY NOTES")
print("=" * 65)
print("""
  - Seeds were placed in prompts WITHOUT any instruction to use them
  - Seeds simply appeared as text before the task (passive exposure)
  - Judge was blind — outputs shuffled (A-J) with no condition labels
  - Same model (Haiku 4.5) used for generation AND judging
  - N=5 per condition per task (40 total outputs, 40 judgments)

  LIMITATIONS:
  - Same model judges its own outputs (potential bias)
  - Haiku is a smaller model — results may differ with Opus/Sonnet
  - Single judge (no inter-rater reliability)
  - N=5 per cell is suggestive, not conclusive
""")
