---
name: ten-by-ten
version: 1.0.0
description: "The 10x10 method — generate breadth, then converge with human judgment. Use whenever a single AI output won't nail it and quality matters (design, copy, naming, posters, messaging, strategy options, code approaches), OR when the user says '10x10', 'ten by ten', 'give me 10 options', 'show me variations', or asks to refine/tighten an output instead of round-after-round corrections."
---

# 10x10 — breadth then judgment

The fastest way to get a great result out of an AI that is not 100% reliable. Instead of
fighting one mediocre output with round after round of corrections ("add this word, move
that line") — which is slow because each round costs a full generation — you **generate
breadth, let a human pick, then converge.** Human judgment is fast and high-value; spend the
model on options, not on arguing.

Apply it by default whenever output quality matters and one shot is unlikely to land it.

## Sandbox first — never touch the real thing until the pick is made

**The variations are always generated in an isolated sandbox, never by mutating the real
target.** Copy the relevant slice into a throwaway space (a `sandbox/` dir, `/tmp`, scratch
files), generate all N options there, render/present them, and let the human choose. **Only
after a winner is picked do you apply that one change to the real data** — the live deck,
file, DB, document, etc. The real artifact is never in a half-edited state, and nothing is
lost if a direction is rejected. This is non-negotiable: breadth is exploratory, so it stays
quarantined until judgment lands.

## The loop

**1. Diverge — 10 genuinely different directions.**
Generate **10 variations that differ in direction, not in trivial tweaks.** Crucially: *you*
(the agent) propose the directions — don't ask the user to specify them. Breadth is the
point. Keep each lightweight so all 10 are cheap to scan.
> "Give me 10 ads in different directions that all carry the campaign's message — you throw
> the directions."

**2. Select — human picks the winner (fast), via the grid picker.**
Present all N together for a quick side-by-side scan. **The default selection UI is the
interactive grid picker** bundled with this skill — offer it immediately, and open it
automatically:

1. Build a **sandbox sheet** — one HTML doc with the N options as a grid of `.wrap` >
   `.cell` elements (in order = option 1..N). For visuals, render each option faithfully;
   for text, a labeled card is enough.
2. Run the picker as a **background process**:
   `python3 <skill-dir>/scripts/pick-server.py <sheet.html>` then `open http://localhost:8777`.
   (`<skill-dir>` is wherever this skill is installed.)
3. In the browser: **click = primary pick** (exactly one, solid cyan), **Shift+click =
   secondary picks** (many, dashed amber — these go to the keep bank), then **"Confirm"**.
4. Confirm **writes the result, shuts the server down, and the process exits** — the agent
   is notified on exit and reads `PICK_RESULT {"primary": N, "secondaries": [...]}` from
   stdout (also `pick-result.json`). Run it in the background so the exit notification
   closes the loop; no manual polling.
5. Apply the **primary** to the real data; route the **secondaries** to the keep bank (3b).

Human judgment here takes seconds — that's the whole efficiency gain. (Falling back to "just
tell me the number" is fine if the browser isn't available.)

**3. Converge — 10 from the chosen one.**
Generate **10 variations of the selected direction** to refine within the winner. Optionally
narrow further (10 → pick → 4 → 3 → 2 → 1). Each round tightens around what already works.

**3b. Keep bank — never let breadth evaporate.**
Breadth surfaces gems that aren't the winner but are worth keeping for *something else* — a
different slide, a poster, a campaign, a name, a future idea. The throwaway sandbox is
deleted; a **keep bank is permanent.** Before discarding the sandbox, move the
interesting-but-rejected directions into a persistent keep bank, each captured with: a
snapshot/snippet, **one line of "what's good here," and a tag for where it might fit.** Store
it inside the project so it accumulates and stays searchable; promote cross-project gems to a
shared/global bank. Good work compounds instead of resetting to zero. Offer this proactively
whenever a 10x10 round produces more than one strong direction.

**4. Lock it — make the winner deterministic.**
Re-generation drifts: ask for "the same poster with a different number" and the model quietly
changes other things. When you need the exact same result every time, **convert the winner to
code** — HTML→PDF, SVG, or a small script with the variable parts as parameters. Now it's
pixel-exact and reproducible, not re-rolled each time.

## Why it works

- **No correction hell.** Round-after-round on one output is slow and frustrating; breadth +
  selection reaches "great" far faster.
- **Human judgment, applied fast.** People are excellent at *picking* and slow at *specifying*.
  10x10 leans on the fast skill (choosing) and offloads the slow one (articulating) to breadth.
- **It compensates for imperfection.** The AI isn't 100%. Generating 10 and selecting turns an
  unreliable single shot into a reliable pick.

## How to run it well

- **Make the 10 actually diverse.** If they look like 10 copies with one word changed, you
  failed step 1. Push for different angles, tones, structures, layouts, mechanisms.
- **Present for fast comparison.** Visuals → render all 10 and show them in one grid/contact
  sheet (or send as a batch). Text → a compact numbered list. Don't dribble them out one at a
  time.
- **Default count is 10**, but scale to the task — 5 for a quick call, 10 standard, more when
  the space is wide. Say what you did.
- **Then converge, don't restart.** Round 2 is variations *of the winner*, not a fresh 10 from
  scratch.
- **Reach for determinism at the end**, once the direction is locked and exactness matters.

## Beyond design

10x10 is not just for posters. Use it for naming, headlines, copy, email drafts, strategy
options, architectural approaches, prompts, schemas — anywhere the solution space is wide and a
single attempt is a coin flip. Diverge → select → converge → (lock).
