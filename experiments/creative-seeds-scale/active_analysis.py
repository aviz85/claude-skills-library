#!/usr/bin/env python3
"""Full analysis: Active vs Passive exposure — Creative Seeds experiment."""

import statistics
import json

# ── ACTIVE EXPOSURE SCORES ──
ACTIVE = {
    "R1": {
        "T1": {
            "seeded": [7.7, 8.0, 7.7, 8.3, 8.0],
            "control": [5.7, 5.0, 6.3, 5.7, 6.0],
        },
        "T2": {
            "seeded": [8.7, 7.3, 9.0, 8.0, 8.7],
            "control": [6.3, 6.7, 6.3, 6.3, 7.3],
        },
        "T3": {
            "seeded": [8.3, 7.7, 8.0, 7.7, 8.3],
            "control": [4.7, 3.7, 3.7, 3.3, 4.0],
        },
        "T4": {
            "seeded": [8.0, 8.3, 8.7, 8.3, 8.3],
            "control": [6.0, 7.0, 6.0, 7.0, 7.3],
        },
    },
    "R2": {
        "T1": {
            "seeded": [7.7, 8.0, 7.7, 8.0, 8.3],
            "control": [6.0, 6.7, 6.7, 7.3, 5.7],
        },
        "T2": {
            "seeded": [7.7, 8.3, 8.3, 8.0, 8.7],
            "control": [6.3, 7.0, 6.0, 7.7, 7.0],
        },
        "T3": {
            "seeded": [7.0, 7.3, 7.7, 7.3, 7.0],
            "control": [4.3, 4.3, 4.3, 4.3, 4.3],
        },
        "T4": {
            "seeded": [8.0, 8.0, 8.3, 9.0, 8.3],
            "control": [7.7, 7.3, 6.7, 7.0, 6.3],
        },
    },
    "R3": {
        "T1": {
            "seeded": [7.3, 8.0, 7.3, 7.7, 8.0],
            "control": [6.3, 7.0, 6.3, 6.0, 6.3],
        },
        "T2": {
            "seeded": [8.7, 8.0, 8.0, 8.0, 9.0],
            "control": [7.0, 8.0, 7.3, 7.7, 8.3],
        },
        "T3": {
            "seeded": [7.7, 7.3, 8.0, 8.0, 7.0],
            "control": [4.3, 4.3, 4.3, 4.7, 4.0],
        },
        "T4": {
            "seeded": [8.0, 7.0, 7.7, 8.3, 8.7],
            "control": [7.7, 6.7, 8.0, 8.0, 7.0],
        },
    },
}

# ── PASSIVE EXPOSURE SCORES (from previous experiment) ──
PASSIVE = {
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
    import math
    n1, n2 = len(g1), len(g2)
    m1, m2 = statistics.mean(g1), statistics.mean(g2)
    v1, v2 = statistics.variance(g1), statistics.variance(g2)
    se = (v1/n1 + v2/n2) ** 0.5
    if se == 0:
        return 0, 1.0, 1
    t = (m1 - m2) / se
    num = (v1/n1 + v2/n2)**2
    den = (v1/n1)**2/(n1-1) + (v2/n2)**2/(n2-1)
    df = num / den if den > 0 else 1
    p = 2 * (1 - 0.5 * (1 + math.erf(abs(t) / math.sqrt(2))))
    return t, p, df

def analyze_experiment(data, label):
    all_seeded = []
    all_control = []
    cumulative_seeded = []
    cumulative_control = []
    cumulative_results = []

    for rid in ["R1", "R2", "R3"]:
        round_s, round_c = [], []
        for tid in ["T1", "T2", "T3", "T4"]:
            round_s.extend(data[rid][tid]["seeded"])
            round_c.extend(data[rid][tid]["control"])
        cumulative_seeded.extend(round_s)
        cumulative_control.extend(round_c)

        d = cohens_d(list(cumulative_seeded), list(cumulative_control))
        t, p, df = welch_t(list(cumulative_seeded), list(cumulative_control))
        cumulative_results.append({
            "round": rid, "n": len(cumulative_seeded) * 2,
            "s_mean": avg(cumulative_seeded), "c_mean": avg(cumulative_control),
            "delta": avg(cumulative_seeded) - avg(cumulative_control),
            "d": d, "p": p,
        })

    all_seeded = cumulative_seeded
    all_control = cumulative_control

    return {
        "label": label,
        "all_seeded": all_seeded,
        "all_control": all_control,
        "cumulative": cumulative_results,
        "final_mean_s": avg(all_seeded),
        "final_mean_c": avg(all_control),
        "final_delta": avg(all_seeded) - avg(all_control),
        "final_d": cohens_d(all_seeded, all_control),
        "final_p": welch_t(all_seeded, all_control)[1],
    }

# ── Run analysis ──
passive = analyze_experiment(PASSIVE, "Passive")
active = analyze_experiment(ACTIVE, "Active")

print("=" * 72)
print("  CREATIVE SEEDS — PASSIVE vs ACTIVE EXPOSURE COMPARISON")
print("  120 outputs each (60 seeded + 60 control per experiment)")
print("  Haiku 4.5 · Blind judging · 3 rounds × 4 tasks × 5 trials")
print("=" * 72)

# Summary table
print("\n┌────────────────────────────────────────────────────────────────────┐")
print("│                      HEADLINE RESULTS                            │")
print("├──────────┬──────────┬──────────┬────────┬────────┬───────────────┤")
print(f"│ {'Exposure':>8} │ {'Seeded':>8} │ {'Control':>8} │ {'Delta':>6} │ {'d':>6} │ {'p':>6}        │")
print("├──────────┼──────────┼──────────┼────────┼────────┼───────────────┤")

for exp in [passive, active]:
    sig = "***" if exp["final_p"] < 0.001 else "**" if exp["final_p"] < 0.01 else "*" if exp["final_p"] < 0.05 else "n.s."
    d_label = 'large' if abs(exp['final_d']) >= 0.8 else 'medium' if abs(exp['final_d']) >= 0.5 else 'small' if abs(exp['final_d']) >= 0.2 else 'negligible'
    print(f"│ {exp['label']:>8} │ {exp['final_mean_s']:>8.2f} │ {exp['final_mean_c']:>8.2f} │ {exp['final_delta']:>+6.2f} │ {exp['final_d']:>6.3f} │ {exp['final_p']:.4f} {sig:>4}   │")

print("└──────────┴──────────┴──────────┴────────┴────────┴───────────────┘")

# Cumulative by scale
print("\n┌────────────────────────────────────────────────────────────────────┐")
print("│                  CUMULATIVE BY EXPERIMENT SIZE                    │")
print("├──────────┬───────┬──────────────────────┬──────────────────────────┤")
print(f"│ {'':>8} │ {'N':>5} │ {'PASSIVE':^20} │ {'ACTIVE':^24} │")
print(f"│ {'':>8} │ {'':>5} │ {'Δ':>6} {'d':>7} {'p':>7} │ {'Δ':>6} {'d':>7} {'p':>7}        │")
print("├──────────┼───────┼──────────────────────┼──────────────────────────┤")

for i in range(3):
    pc = passive["cumulative"][i]
    ac = active["cumulative"][i]
    print(f"│ {pc['round']:>8} │ {pc['n']:>5} │ {pc['delta']:>+6.2f} {pc['d']:>7.3f} {pc['p']:>7.3f} │ {ac['delta']:>+6.2f} {ac['d']:>7.3f} {ac['p']:>7.3f}        │")

print("└──────────┴───────┴──────────────────────┴──────────────────────────┘")

# Per-task comparison
print("\n┌────────────────────────────────────────────────────────────────────┐")
print("│                    PER-TASK COMPARISON                           │")
print("└────────────────────────────────────────────────────────────────────┘")

for tid in ["T1", "T2", "T3", "T4"]:
    p_s, p_c, a_s, a_c = [], [], [], []
    for rid in ["R1", "R2", "R3"]:
        p_s.extend(PASSIVE[rid][tid]["seeded"])
        p_c.extend(PASSIVE[rid][tid]["control"])
        a_s.extend(ACTIVE[rid][tid]["seeded"])
        a_c.extend(ACTIVE[rid][tid]["control"])

    pd = cohens_d(p_s, p_c)
    ad = cohens_d(a_s, a_c)
    pp = welch_t(p_s, p_c)[1]
    ap = welch_t(a_s, a_c)[1]

    print(f"\n  {tid}: {TASK_NAMES[tid]}")
    print(f"    Passive: S={avg(p_s):.2f} C={avg(p_c):.2f} Δ={avg(p_s)-avg(p_c):+.2f} d={pd:.3f} p={pp:.3f}")
    print(f"    Active:  S={avg(a_s):.2f} C={avg(a_c):.2f} Δ={avg(a_s)-avg(a_c):+.2f} d={ad:.3f} p={ap:.3f}")

# Key finding
print("\n" + "=" * 72)
print("  KEY FINDINGS")
print("=" * 72)
print(f"""
  PASSIVE EXPOSURE: Δ = {passive['final_delta']:+.3f}, d = {passive['final_d']:.3f}, p = {passive['final_p']:.4f}
  → No effect. Seeds as silent context do NOT improve creative output.

  ACTIVE EXPOSURE:  Δ = {active['final_delta']:+.3f}, d = {active['final_d']:.3f}, p = {active['final_p']:.4f}
  → Large effect. Seeds with instruction dramatically improve scores.

  BUT: The active effect is likely CONFOUNDED:
  1. Seeded outputs directly reference seed content (glaciers, mustard, etc.)
  2. This makes them stylistically distinct — judge can tell them apart
  3. The judge (same model) may systematically prefer "creative-looking" outputs
  4. Control outputs for T3 (out-of-office) scored uniformly ~4.0 — suspicious

  CONCLUSION: Active seeds change OUTPUT STYLE (more metaphorical, literary),
  and the AI judge rewards that style. But this isn't necessarily "better
  creativity" — it's style preference baked into the evaluation.
""")

# Score distributions
print("  SCORE DISTRIBUTIONS:")
print(f"    Active Seeded:  mean={avg(active['all_seeded']):.2f}, stdev={statistics.stdev(active['all_seeded']):.2f}")
print(f"    Active Control: mean={avg(active['all_control']):.2f}, stdev={statistics.stdev(active['all_control']):.2f}")
print(f"    Passive Seeded: mean={avg(passive['all_seeded']):.2f}, stdev={statistics.stdev(passive['all_seeded']):.2f}")
print(f"    Passive Control:mean={avg(passive['all_control']):.2f}, stdev={statistics.stdev(passive['all_control']):.2f}")

# Save for graphing
graph_data = {
    "passive": {
        "cumulative": passive["cumulative"],
        "final": {"delta": passive["final_delta"], "d": passive["final_d"], "p": passive["final_p"],
                   "s_mean": passive["final_mean_s"], "c_mean": passive["final_mean_c"]},
    },
    "active": {
        "cumulative": active["cumulative"],
        "final": {"delta": active["final_delta"], "d": active["final_d"], "p": active["final_p"],
                   "s_mean": active["final_mean_s"], "c_mean": active["final_mean_c"]},
    },
}

with open("/Users/aviz/claude-skills-library/experiments/creative-seeds-scale/results/comparison_data.json", "w") as f:
    json.dump(graph_data, f, indent=2)

print("\n  Data saved to results/comparison_data.json")
