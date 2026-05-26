#!/usr/bin/env python3
"""Full analysis of Creative Seeds experiment — 3 rounds, 120 outputs."""

import statistics
import json

# ── ALL SCORES (3 rounds × 4 tasks × 10 outputs each) ──

ROUNDS = {
    "R1": {
        "T1": {
            "seeded": [9.0, 7.67, 9.0, 8.33, 7.67],
            "control": [8.0, 7.33, 8.0, 7.33, 7.33],
        },
        "T2": {
            "seeded": [9.0, 8.33, 7.33, 6.33, 6.33],
            "control": [7.33, 8.33, 8.67, 9.33, 7.67],
        },
        "T3": {
            "seeded": [7.67, 8.67, 9.0, 6.33, 7.33],
            "control": [8.0, 6.67, 7.67, 8.33, 8.67],
        },
        "T4": {
            "seeded": [7.67, 8.67, 7.67, 8.67, 7.0],
            "control": [8.67, 6.67, 7.33, 7.0, 7.33],
        },
    },
    "R2": {
        "T1": {
            "seeded": [8.67, 8.0, 9.33, 6.33, 7.67],
            "control": [5.67, 6.67, 7.0, 7.33, 8.67],
        },
        "T2": {
            "seeded": [8.33, 6.67, 7.67, 8.67, 7.67],
            "control": [7.67, 9.0, 6.67, 8.33, 5.67],
        },
        "T3": {
            "seeded": [6.0, 8.33, 5.33, 9.0, 7.67],
            "control": [7.33, 7.67, 8.0, 5.33, 6.33],
        },
        "T4": {
            "seeded": [8.0, 6.33, 7.67, 6.0, 7.0],
            "control": [8.67, 8.67, 7.33, 8.33, 9.67],
        },
    },
    "R3": {
        "T1": {
            "seeded": [8.33, 8.0, 8.33, 6.67, 7.67],
            "control": [8.0, 8.0, 6.67, 8.33, 7.67],
        },
        "T2": {
            "seeded": [8.0, 7.0, 7.67, 8.67, 7.67],
            "control": [8.67, 6.0, 8.0, 7.33, 8.0],
        },
        "T3": {
            "seeded": [7.0, 8.67, 6.0, 6.33, 5.33],
            "control": [7.67, 6.33, 7.67, 8.33, 7.67],
        },
        "T4": {
            "seeded": [7.67, 8.0, 9.0, 6.33, 7.0],
            "control": [7.67, 6.33, 7.67, 8.33, 8.33],
        },
    },
}

TASK_NAMES = {"T1": "Brand Names", "T2": "Describe Hope", "T3": "Out-of-Office", "T4": "New Ritual"}

def avg(lst):
    return sum(lst) / len(lst) if lst else 0

def cohens_d(g1, g2):
    if len(g1) < 2 or len(g2) < 2:
        return 0
    m1, m2 = statistics.mean(g1), statistics.mean(g2)
    s1, s2 = statistics.stdev(g1), statistics.stdev(g2)
    pooled = ((s1**2 + s2**2) / 2) ** 0.5
    return (m1 - m2) / pooled if pooled > 0 else 0

def welch_t(g1, g2):
    """Welch's t-test (unequal variance). Returns t-statistic and approx p-value."""
    n1, n2 = len(g1), len(g2)
    m1, m2 = statistics.mean(g1), statistics.mean(g2)
    v1, v2 = statistics.variance(g1), statistics.variance(g2)
    se = (v1/n1 + v2/n2) ** 0.5
    if se == 0:
        return 0, 1.0
    t = (m1 - m2) / se
    # Welch-Satterthwaite df
    num = (v1/n1 + v2/n2)**2
    den = (v1/n1)**2/(n1-1) + (v2/n2)**2/(n2-1)
    df = num / den if den > 0 else 1
    # Approximate two-tailed p using normal (good for df > 30)
    import math
    p = 2 * (1 - 0.5 * (1 + math.erf(abs(t) / math.sqrt(2))))
    return t, p, df

# ── Cumulative analysis at each scale ──
print("=" * 70)
print("  CREATIVE SEEDS EXPERIMENT — FULL RESULTS (3 ROUNDS, 120 OUTPUTS)")
print("  Passive exposure only. Blind judge. Haiku 4.5 generation + judging.")
print("=" * 70)

cumulative_seeded = []
cumulative_control = []
cumulative_results = []

for round_idx, (rid, rdata) in enumerate(sorted(ROUNDS.items()), 1):
    round_seeded = []
    round_control = []
    for tid in ["T1", "T2", "T3", "T4"]:
        round_seeded.extend(rdata[tid]["seeded"])
        round_control.extend(rdata[tid]["control"])

    cumulative_seeded.extend(round_seeded)
    cumulative_control.extend(round_control)

    n_per = len(cumulative_seeded)
    s_mean = avg(cumulative_seeded)
    c_mean = avg(cumulative_control)
    d = cohens_d(cumulative_seeded, cumulative_control)
    t, p, df = welch_t(cumulative_seeded, cumulative_control)

    cumulative_results.append({
        "round": rid,
        "n_per_condition": n_per,
        "n_total": n_per * 2,
        "seeded_mean": s_mean,
        "control_mean": c_mean,
        "delta": s_mean - c_mean,
        "cohens_d": d,
        "t_stat": t,
        "p_value": p,
        "df": df,
    })

# Print cumulative table
print("\n┌──────────────────────────────────────────────────────────────────┐")
print("│              CUMULATIVE RESULTS BY EXPERIMENT SIZE              │")
print("├────────┬───────┬──────────┬──────────┬────────┬────────┬───────┤")
print(f"│ {'Scale':>6} │ {'N':>5} │ {'Seeded':>8} │ {'Control':>8} │ {'Delta':>6} │ {'d':>6} │ {'p':>5} │")
print("├────────┼───────┼──────────┼──────────┼────────┼────────┼───────┤")
for cr in cumulative_results:
    sig = "*" if cr["p_value"] < 0.05 else ""
    print(f"│ {cr['round']:>6} │ {cr['n_total']:>5} │ {cr['seeded_mean']:>8.2f} │ {cr['control_mean']:>8.2f} │ {cr['delta']:>+6.2f} │ {cr['cohens_d']:>6.3f} │ {cr['p_value']:>4.3f}{sig} │")
print("└────────┴───────┴──────────┴──────────┴────────┴────────┴───────┘")

# Final stats
final = cumulative_results[-1]
effect_label = 'large' if abs(final['cohens_d']) >= 0.8 else 'medium' if abs(final['cohens_d']) >= 0.5 else 'small' if abs(final['cohens_d']) >= 0.2 else 'negligible'
sig_label = "YES (p < 0.05)" if final['p_value'] < 0.05 else "NO (p >= 0.05)"

print(f"\n  Final N = {final['n_total']} ({final['n_per_condition']} per condition)")
print(f"  Seeded mean: {final['seeded_mean']:.3f}")
print(f"  Control mean: {final['control_mean']:.3f}")
print(f"  Delta: {final['delta']:+.3f}")
print(f"  Cohen's d: {final['cohens_d']:.3f} ({effect_label})")
print(f"  Welch's t: {final['t_stat']:.3f} (df={final['df']:.1f})")
print(f"  p-value: {final['p_value']:.4f}")
print(f"  Statistically significant: {sig_label}")

# ── Per-task analysis across all rounds ──
print("\n" + "=" * 70)
print("  PER-TASK ANALYSIS (ALL 3 ROUNDS COMBINED)")
print("=" * 70)

for tid in ["T1", "T2", "T3", "T4"]:
    all_s = []
    all_c = []
    for rdata in ROUNDS.values():
        all_s.extend(rdata[tid]["seeded"])
        all_c.extend(rdata[tid]["control"])

    s_mean = avg(all_s)
    c_mean = avg(all_c)
    d = cohens_d(all_s, all_c)
    t, p, df = welch_t(all_s, all_c)
    winner = "SEEDED" if s_mean > c_mean else "CONTROL" if c_mean > s_mean else "TIE"
    sig = " *" if p < 0.05 else ""

    print(f"\n  {tid}: {TASK_NAMES[tid]}")
    print(f"    Seeded:  {s_mean:.2f} (n=15)  |  Control: {c_mean:.2f} (n=15)")
    print(f"    Δ = {s_mean - c_mean:+.2f}, d = {d:.3f}, p = {p:.3f}{sig}  →  {winner}")

# ── Per-round breakdown ──
print("\n" + "=" * 70)
print("  PER-ROUND BREAKDOWN")
print("=" * 70)

for rid, rdata in sorted(ROUNDS.items()):
    round_s = []
    round_c = []
    wins = 0
    for tid in ["T1", "T2", "T3", "T4"]:
        s = rdata[tid]["seeded"]
        c = rdata[tid]["control"]
        round_s.extend(s)
        round_c.extend(c)
        if avg(s) > avg(c):
            wins += 1

    d = cohens_d(round_s, round_c)
    print(f"\n  {rid}: Seeded={avg(round_s):.2f}  Control={avg(round_c):.2f}  Δ={avg(round_s)-avg(round_c):+.2f}  d={d:.3f}  Task wins: {wins}/4")

# ── Score distributions ──
print("\n" + "=" * 70)
print("  SCORE DISTRIBUTIONS (ALL 60 SCORES PER CONDITION)")
print("=" * 70)

for label, scores in [("Seeded", cumulative_seeded), ("Control", cumulative_control)]:
    print(f"\n  {label} (n={len(scores)}, mean={avg(scores):.2f}, stdev={statistics.stdev(scores):.2f}):")
    for val in range(10, 4, -1):
        count = sum(1 for s in scores if val - 0.5 <= s < val + 0.5)
        bar = "█" * count
        if count:
            print(f"    {val:2d} │ {bar} ({count})")

# ── Methodology ──
print("\n" + "=" * 70)
print("  METHODOLOGY")
print("=" * 70)
print("""
  - 3 rounds × 4 tasks × 5 trials × 2 conditions = 120 total outputs
  - Seeds placed in prompt WITHOUT ANY instruction (passive exposure only)
  - Each round used different random seeds from the 50 available
  - Judge was blind — outputs shuffled with no condition labels
  - Same model (Haiku 4.5) for generation AND judging
  - Scoring: Originality + Memorability + Precision (1-10 each), averaged

  LIMITATIONS:
  - Same model judges own outputs (potential systematic bias)
  - Single judge per output (no inter-rater reliability)
  - N=15 per condition per task — moderate power
  - Haiku is a smaller model — effects may differ with larger models
""")

# ── Save data for graphing ──
graph_data = {
    "cumulative": cumulative_results,
    "all_seeded": cumulative_seeded,
    "all_control": cumulative_control,
}

with open("/Users/aviz/claude-skills-library/experiments/creative-seeds-scale/results/graph_data.json", "w") as f:
    json.dump(graph_data, f, indent=2)

print("  Graph data saved to results/graph_data.json")
