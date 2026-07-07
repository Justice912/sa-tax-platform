# Milestones

## v1.0 Individual Tax SARS Compliance (Shipped: 2026-07-07)

**Delivered:** The Individual Tax module brought fully in line with current SARS requirements — a real, persisted, SARS-format travel logbook (capture + import) feeding the ITR12, both deemed and actual cost methods, virtualized to 10,000+ trips, with all remaining calculators audited against 2025–2027 SARS rules.

**Stats:**
- **Phases:** 7 (all verified `passed`)
- **Plans:** 33 (executed across wave-based parallel execution)
- **Timeline:** 2026-07-02 → 2026-07-07 (~5 days)
- **Git range:** `c177875` (Phase 1 research) → milestone tag `v1.0`
- **Health at ship:** 482 tests / 98 files green; Turbopack production build clean; deployed to Vercel.

**Key accomplishments:**
- **Per-year SARS rulepacks (2025–2027)** as the single source of truth: tax brackets, rebates, thresholds, medical credits, retirement s11F caps, CGT exclusions/inclusion, provisional-tax parameters, and deemed-cost travel rate tables (Phase 1).
- **SARS-compliant logbook domain module**: vehicle/trip/logbook data model with deemed-cost AND actual-cost calculation engines, persisted per client + tax year, unit-tested in isolation (Phase 2).
- **ITR12 travel schedule integration**: logbook results feed the travel schedule with correct source codes (3701/3702), replacing the crude allowance × business-km estimate — without breaking existing schedule tests (Phase 3).
- **Robust import pipeline**: CSV + XLSX import with official SARS eLogbook auto-detection, off-main-thread (Web Worker) parsing, and DoS-guarded pre-commit validation (Phase 4).
- **Architecture fix**: the 2,148-line `tax-tools.tsx` monolith split into independent per-calculator components with Profiler-verified render isolation, eliminating the per-keystroke full re-render (Phase 5).
- **End-to-end logbook UX**: a real wiring container loading persisted logbooks via Server Actions, a `@tanstack/react-virtual` trip table bounded at 10,000+ rows (PERF-02/03), a 5-step import wizard, a deemed-vs-actual cost-method panel, CSV export, and a printable SARS-audit summary (Phase 6).
- **Calculator compliance audit**: fixed a silent 2027 rulepack data bug (pre-Budget estimates → gazetted Budget-2026 figures), corrected the medical s6B formula (under-65 4× MTC + excess-contributions term), reworked provisional tax to real para 19/20 mechanics, and made retirement/CGT labels per-year rulepack-sourced (Phase 7).

**Human compliance sign-off outstanding (non-blocking, pinned by loud-failing tests):**
- Corrected 2027 gazetted brackets/rebates/thresholds — confirm against final published SARS 2026/27 tax tables.
- Medical s6B formula interpretation (IT07 PDF unrenderable for verbatim quoting).
- Provisional para 19/20 basic-amount / safe-harbour mechanics (IN1 Issue 3).
- Home-office salaried-employee eligibility policy (block-with-warning vs allow + s23(m)).

See `.planning/phases/07-calculator-audit/07-VERIFICATION.md` and each phase's `*-SUMMARY.md` for detail.

---
