# Project Retrospective

Living record of what worked and what didn't across milestones.

## Milestone: v1.0 — Individual Tax SARS Compliance

**Shipped:** 2026-07-07
**Phases:** 7 | **Plans:** 33

### What Was Built
Real, persisted, SARS-format travel logbook (capture + import, deemed & actual cost) feeding the ITR12; CSV/XLSX import with SARS eLogbook auto-detect and off-main-thread parsing; decomposition of the 2,148-line `tax-tools.tsx` monolith into isolated per-calculator components; virtualized trip table validated at 10,000+ rows; and a full audit of all calculators against 2025–2027 SARS rules (fixing a silent 2027 rulepack data bug, the medical s6B formula, and provisional para 19/20).

### What Worked
- **Wave-based parallel execution** with exclusive file ownership per plan kept most waves genuinely parallel and fast (e.g. Phase 6 Wave 1 shipped three independent foundations at once).
- **Research → plan → checker → execute → verify** caught real issues before code: the Phase 7 researcher discovered the silent 2027 rulepack data bug (all 2027 output wrong, with tests locking it in) purely from cross-referencing SARS sources.
- **Goal-backward `must_haves` + a dedicated verifier** meant "phase complete" reflected the goal, not just committed tasks — every phase verified `passed` against the actual codebase.
- **Testable proxies for un-measurable goals**: bounded-DOM node counts, Profiler render-count isolation, and time-budget assertions stood in for real FPS/jank that jsdom can't measure.
- **Encoding MEDIUM-confidence compliance interpretations as loud-failing tests** let us ship net-improvement corrections without silently shipping an unverified reading — the four sign-off items can't drift undetected.

### What Was Inefficient
- **Parallel-wave git-index races**: multiple executors sharing one working tree repeatedly swept each other's staged files into the wrong commit (recovered every time, but cost verification effort). A per-executor worktree would eliminate this.
- **`gsd-tools.cjs commit` is broken on this Windows/Git-Bash setup** — every executor had to be told to use plain `git`. Recurring friction across all 7 phases.
- **Session limits cut subagents off mid-task** (the Phase 6 keystone executor and two Phase 7 planning agents), forcing orchestrator-side recovery (verify what committed, finish the tail, resume via transcript). Common enough to be a standing operating assumption, not an exception.
- **`phase complete` mis-reported `is_last_phase`** when the next phase had no plans yet — ROADMAP.md had to be the source of truth for "what's next."

### Patterns Established
- Server Action boundary returning `{ record, travelResult }` for client-side merge (no `revalidatePath` per edit) — the pattern for fast persisted mutation at scale.
- `React.memo`'d row + a `ProfiledRow` wrapper *above* the `<Profiler>` to prove per-row render isolation (a bare Profiler under a `.map()` still fires for memo-bailing siblings).
- Demo seed lives in code (`src/server/demo-data.ts`), with the JSON storage file treated as a disposable runtime artifact (never committed).
- Compliance-audit plans separate "logic fix + sign-off" from "already correct — add regression test / fix label," with authoritative per-year values encoded as test expectations.

### Key Lessons
- For compliance work, **the research step is where correctness is won or lost** — the biggest bug (2027 data) was invisible in code review because the code was structurally correct and the tests asserted the wrong values.
- **Spot-check what actually committed** after every wave and every subagent — session limits and index races make the agent's self-report insufficient on its own; the definitive gate is re-running the suite on the final tree.
- **Isolate parallel executors** (worktrees) next time to remove the index-race tax.

### Cost Observations
- Model mix: orchestrator on Opus; all executors/researcher/planner/checker/verifier on Sonnet (`balanced` profile).
- Sessions: multiple (session limits hit repeatedly across the milestone).
- Notable: wave parallelism traded some rework (index races) for wall-clock speed; net positive but worktree isolation would improve it.

## Cross-Milestone Trends

*(Populated as future milestones complete.)*

| Milestone | Phases | Plans | Ship time | Tests at ship |
|-----------|--------|-------|-----------|---------------|
| v1.0 Individual Tax SARS Compliance | 7 | 33 | ~5 days | 482 / 98 files |
