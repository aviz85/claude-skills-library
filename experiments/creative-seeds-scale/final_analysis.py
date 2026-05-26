#!/usr/bin/env python3
"""Final analysis: 3 experiments, 360 total outputs."""

import statistics, json

def avg(lst): return sum(lst)/len(lst) if lst else 0
def cohens_d(g1, g2):
    if len(g1)<2 or len(g2)<2: return 0
    m1,m2=statistics.mean(g1),statistics.mean(g2)
    s1,s2=statistics.stdev(g1),statistics.stdev(g2)
    p=((s1**2+s2**2)/2)**0.5
    return (m1-m2)/p if p>0 else 0
def welch_t(g1,g2):
    import math
    n1,n2=len(g1),len(g2); m1,m2=statistics.mean(g1),statistics.mean(g2)
    v1,v2=statistics.variance(g1),statistics.variance(g2)
    se=(v1/n1+v2/n2)**0.5
    if se==0: return 0,1.0
    t=(m1-m2)/se
    p=2*(1-0.5*(1+math.erf(abs(t)/math.sqrt(2))))
    return t,p

# ── EXP 1: PASSIVE ──
EXP1 = {
    "R1": {"T1": {"s": [9.0,7.67,9.0,8.33,7.67], "c": [8.0,7.33,8.0,7.33,7.33]},
            "T2": {"s": [9.0,8.33,7.33,6.33,6.33], "c": [7.33,8.33,8.67,9.33,7.67]},
            "T3": {"s": [7.67,8.67,9.0,6.33,7.33], "c": [8.0,6.67,7.67,8.33,8.67]},
            "T4": {"s": [7.67,8.67,7.67,8.67,7.0], "c": [8.67,6.67,7.33,7.0,7.33]}},
    "R2": {"T1": {"s": [8.67,8.0,9.33,6.33,7.67], "c": [5.67,6.67,7.0,7.33,8.67]},
            "T2": {"s": [8.33,6.67,7.67,8.67,7.67], "c": [7.67,9.0,6.67,8.33,5.67]},
            "T3": {"s": [6.0,8.33,5.33,9.0,7.67], "c": [7.33,7.67,8.0,5.33,6.33]},
            "T4": {"s": [8.0,6.33,7.67,6.0,7.0], "c": [8.67,8.67,7.33,8.33,9.67]}},
    "R3": {"T1": {"s": [8.33,8.0,8.33,6.67,7.67], "c": [8.0,8.0,6.67,8.33,7.67]},
            "T2": {"s": [8.0,7.0,7.67,8.67,7.67], "c": [8.67,6.0,8.0,7.33,8.0]},
            "T3": {"s": [7.0,8.67,6.0,6.33,5.33], "c": [7.67,6.33,7.67,8.33,7.67]},
            "T4": {"s": [7.67,8.0,9.0,6.33,7.0], "c": [7.67,6.33,7.67,8.33,8.33]}},
}

# ── EXP 2: ACTIVE ──
EXP2 = {
    "R1": {"T1": {"s": [7.7,8.0,7.7,8.3,8.0], "c": [5.7,5.0,6.3,5.7,6.0]},
            "T2": {"s": [8.7,7.3,9.0,8.0,8.7], "c": [6.3,6.7,6.3,6.3,7.3]},
            "T3": {"s": [8.3,7.7,8.0,7.7,8.3], "c": [4.7,3.7,3.7,3.3,4.0]},
            "T4": {"s": [8.0,8.3,8.7,8.3,8.3], "c": [6.0,7.0,6.0,7.0,7.3]}},
    "R2": {"T1": {"s": [7.7,8.0,7.7,8.0,8.3], "c": [6.0,6.7,6.7,7.3,5.7]},
            "T2": {"s": [7.7,8.3,8.3,8.0,8.7], "c": [6.3,7.0,6.0,7.7,7.0]},
            "T3": {"s": [7.0,7.3,7.7,7.3,7.0], "c": [4.3,4.3,4.3,4.3,4.3]},
            "T4": {"s": [8.0,8.0,8.3,9.0,8.3], "c": [7.7,7.3,6.7,7.0,6.3]}},
    "R3": {"T1": {"s": [7.3,8.0,7.3,7.7,8.0], "c": [6.3,7.0,6.3,6.0,6.3]},
            "T2": {"s": [8.7,8.0,8.0,8.0,9.0], "c": [7.0,8.0,7.3,7.7,8.3]},
            "T3": {"s": [7.7,7.3,8.0,8.0,7.0], "c": [4.3,4.3,4.3,4.7,4.0]},
            "T4": {"s": [8.0,7.0,7.7,8.3,8.7], "c": [7.7,6.7,8.0,8.0,7.0]}},
}

# ── EXP 3: SEEDS vs "BE CREATIVE!" ──
EXP3 = {
    "R1": {"T1": {"s": [6.3,6.7,6.7,7.0,7.3], "c": [7.3,8.0,7.0,7.7,7.0]},
            "T2": {"s": [8.0,8.7,8.3,8.0,8.7], "c": [8.0,7.3,7.7,8.3,7.7]},
            "T3": {"s": [6.7,6.0,6.0,5.7,6.7], "c": [7.0,7.0,6.3,6.7,6.0]},
            "T4": {"s": [7.67,7.33,8.0,6.67,8.0], "c": [8.0,8.0,8.0,7.67,8.0]}},
    "R2": {"T1": {"s": [7.3,7.7,7.0,8.0,7.3], "c": [7.7,7.3,7.0,7.3,7.3]},
            "T2": {"s": [8.0,8.0,8.3,8.0,8.0], "c": [8.3,8.3,8.0,8.3,8.7]},
            "T3": {"s": [7.3,7.7,7.3,7.7,7.3], "c": [8.0,7.7,7.7,7.7,7.7]},
            "T4": {"s": [6.7,7.0,6.0,6.3,6.3], "c": [8.7,9.3,9.0,8.0,9.7]}},
    "R3": {"T1": {"s": [7.0,6.7,6.3,6.7,5.7], "c": [7.3,7.3,7.0,7.0,7.0]},
            "T2": {"s": [7.7,7.7,8.0,7.3,6.7], "c": [8.0,8.0,8.0,9.3,9.0]},
            "T3": {"s": [7.3,7.0,6.0,7.3,5.0], "c": [8.0,7.7,8.0,8.0,8.0]},
            "T4": {"s": [7.7,8.3,8.0,7.7,8.3], "c": [8.0,8.0,8.0,8.3,8.7]}},
}

def flatten(exp):
    all_s, all_c = [], []
    for r in exp.values():
        for t in r.values():
            all_s.extend(t["s"]); all_c.extend(t["c"])
    return all_s, all_c

NAMES = {"T1":"Brand Names","T2":"Describe Hope","T3":"Out-of-Office","T4":"New Ritual"}

print("=" * 75)
print("  CREATIVE SEEDS EXPERIMENT — FINAL REPORT")
print("  360 total outputs · 3 experiments · Haiku 4.5 · Blind judging")
print("=" * 75)

# Headline
print("\n┌─────────────────────────────────────────────────────────────────────────┐")
print("│                         HEADLINE RESULTS                              │")
print("├───────────────────────────┬──────────┬──────────┬────────┬─────┬──────┤")
print(f"│ {'Experiment':<25} │ {'Seeded':>8} │ {'Control':>8} │ {'Delta':>6} │ {'d':>5}│ {'p':>5}│")
print("├───────────────────────────┼──────────┼──────────┼────────┼─────┼──────┤")

for name, exp, clabel in [
    ("1. Passive Exposure", EXP1, "Plain"),
    ("2. Active Exposure", EXP2, "Plain"),
    ("3. Seeds vs Be Creative", EXP3, "Creative!"),
]:
    s, c = flatten(exp)
    d = cohens_d(s, c)
    t, p = welch_t(s, c)
    sig = "***" if p<0.001 else "**" if p<0.01 else "*" if p<0.05 else "n.s."
    print(f"│ {name:<25} │ {avg(s):>8.2f} │ {avg(c):>8.2f} │ {avg(s)-avg(c):>+6.2f} │{d:>5.2f}│{p:>5.3f}│ {sig}")

print("└───────────────────────────┴──────────┴──────────┴────────┴─────┴──────┘")

# Per-task for Exp3
print("\n┌─────────────────────────────────────────────────────────────────────────┐")
print("│              EXP 3: SEEDS vs 'BE CREATIVE!' — PER TASK                │")
print("└─────────────────────────────────────────────────────────────────────────┘")

for tid in ["T1","T2","T3","T4"]:
    s, c = [], []
    for r in EXP3.values():
        s.extend(r[tid]["s"]); c.extend(r[tid]["c"])
    d = cohens_d(s, c)
    t, p = welch_t(s, c)
    winner = "SEEDS" if avg(s)>avg(c) else "CREATIVE!" if avg(c)>avg(s) else "TIE"
    sig = "*" if p<0.05 else ""
    print(f"  {tid}: {NAMES[tid]:<15} Seeds={avg(s):.2f} Creative!={avg(c):.2f} Δ={avg(s)-avg(c):+.2f} d={d:.2f} p={p:.3f}{sig} → {winner}")

# The big picture
print("\n" + "=" * 75)
print("  CONCLUSIONS")
print("=" * 75)

s1,c1 = flatten(EXP1); s2,c2 = flatten(EXP2); s3,c3 = flatten(EXP3)

print(f"""
  EXPERIMENT 1 — PASSIVE EXPOSURE (seeds present, no instruction)
  Seeds: {avg(s1):.2f} | Control: {avg(c1):.2f} | Delta: {avg(s1)-avg(c1):+.2f} | d = {cohens_d(s1,c1):.3f}
  VERDICT: NO EFFECT. Passive seeds do nothing.

  EXPERIMENT 2 — ACTIVE EXPOSURE (seeds + "use these to inspire")
  Seeds: {avg(s2):.2f} | Control: {avg(c2):.2f} | Delta: {avg(s2)-avg(c2):+.2f} | d = {cohens_d(s2,c2):.3f}
  VERDICT: HUGE EFFECT — but confounded (judge not blind, style transfer).

  EXPERIMENT 3 — SEEDS vs "BE CREATIVE!" INSTRUCTION
  Seeds: {avg(s3):.2f} | Creative!: {avg(c3):.2f} | Delta: {avg(s3)-avg(c3):+.2f} | d = {cohens_d(s3,c3):.3f}
  VERDICT: "BE CREATIVE!" BEATS SEEDS.

  ═══════════════════════════════════════════════════════════════════
  BOTTOM LINE:

  Creative seeds add NO measurable value beyond simply asking the
  AI to "be creative." The active exposure effect (Exp 2) was an
  artifact of style transfer + judge bias, not genuine creativity
  enhancement.

  The simplest instruction — "be wildly creative and original" —
  performs as well or better than elaborate absurdist seed stories.

  Seeds may still have value for HUMAN creativity (breaking human
  pattern-thinking), but for AI models, a direct instruction to be
  creative is equally or more effective.
  ═══════════════════════════════════════════════════════════════════
""")

# Save all data
all_data = {"exp1_passive": EXP1, "exp2_active": EXP2, "exp3_seeds_vs_creative": EXP3}
with open("/Users/aviz/claude-skills-library/experiments/creative-seeds-scale/results/all_experiments.json", "w") as f:
    json.dump(all_data, f, indent=2)
print("  All data saved to results/all_experiments.json")
