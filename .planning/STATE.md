# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-02)

**Core value:** A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.
**Current focus:** Phase 1 - Rulepack Extension

## Current Position

Phase: 1 of 7 (Rulepack Extension)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-07-02 — Roadmap created from requirements and research

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Full SARS elogbook format (vehicle details, year odometers, both cost methods) — deemed-only shortcut fails audit requirements
- Logbooks persist per client + tax year, independent of assessment lifecycle
- Import supports CSV + XLSX + SARS elogbook auto-detect
- Split tax-tools.tsx monolith rather than patch (root cause is architecture, not one hot loop)
- Individual Tax only this milestone; estates/trusts/company modules deferred
- Tax years 2025-2027 in scope (2024 excluded)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2/actual-cost: wear-and-tear mechanics and possible R800,000 vehicle-value cap need verification against SARS Interpretation Note IN47 (MEDIUM confidence, WebSearch-derived)
- Phase 3/ITR12: exact deduction codes 4014/4015 are LOW-MEDIUM confidence (contradictory signal — 4015 may be commission-income-specific); must confirm against PAYE-AE-06-G06 and IT-AE-36-G05 before hardcoding
- Phase 7/medical credits: s6B multipliers (3x/4x, 25%/33.3%, 7.5% threshold) are MEDIUM confidence; re-verify against SARS Guide IT07
- Phase 7/provisional tax: 8%/18-month basic-amount escalation mechanics are MEDIUM confidence; verify against Interpretation Note 1 (Issue 3)
- Phase 4/Worker bundling: no confirmed worked example of `new Worker(new URL(...))` under Next.js 16.1.6 + Turbopack; run a small spike early in Phase 4
- Phase 4: SheetJS `xlsx` must be installed from cdn.sheetjs.com, NOT the npm registry (npm version has unpatched CVEs)

## Session Continuity

Last session: 2026-07-02
Stopped at: ROADMAP.md and STATE.md created; REQUIREMENTS.md traceability pending update
Resume file: None
