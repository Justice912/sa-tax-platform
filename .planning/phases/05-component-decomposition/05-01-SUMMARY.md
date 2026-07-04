---
phase: 05-component-decomposition
plan: 01
subsystem: ui
tags: [react, nextjs, refactor, individual-tax, tax-tools]

# Dependency graph
requires: []
provides:
  - "tax-tools/shared.tsx: StatCard, ResultCard, Highlight, Field, inputCls, selectCls, fmt, fmtKm, pct, MONTHS, Trip, UploadData, TabKey"
  - "tax-tools/calc-helpers.ts: calcTax, getMarginalRate, getDeemedRate (rulePack-parameterized, relocated verbatim)"
  - "tax-tools/ folder scaffold that subsequent calculator-extraction plans in this phase import from"
affects: [05-component-decomposition (remaining waves), individual-tax UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Behaviour-neutral extraction: presentational components/formatters/constants and pure calc helpers moved into dedicated modules before splitting the monolith's calculator sections"

key-files:
  created:
    - src/components/individual-tax/tax-tools/calc-helpers.ts
    - src/components/individual-tax/tax-tools/shared.tsx
  modified:
    - src/components/individual-tax/tax-tools.tsx

key-decisions:
  - "calcTax/getMarginalRate/getDeemedRate relocated verbatim, NOT consolidated with calculation-service.ts's private getBracketTax (cross-module merge stays out of scope for this phase)"
  - "TabKey moved to shared.tsx (not left in the monolith) because shell, nav, and DashboardTab's onNavigate prop all reference it; NAV array and tab state remain shell-owned in tax-tools.tsx"

requirements-completed: [PERF-01]

# Metrics
duration: 9min
completed: 2026-07-04
---

# Phase 05 Plan 01: Tax-Tools Extraction Scaffold Summary

**Relocated the pure SARS tax-bracket helpers and stateless presentational UI pieces out of the 2,156-line tax-tools.tsx monolith into `tax-tools/calc-helpers.ts` and `tax-tools/shared.tsx`, with zero behaviour change.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-04T16:23:00+02:00 (approx.)
- **Completed:** 2026-07-04T16:31:24+02:00
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Created `tax-tools/calc-helpers.ts` exporting `calcTax`, `getMarginalRate`, `getDeemedRate` with byte-for-byte identical SARS bracket logic (verbatim relocation, now as named exported functions instead of const arrow functions)
- Created `tax-tools/shared.tsx` exporting all stateless presentational components (`StatCard`, `ResultCard`, `Highlight`, `Field`), formatters (`fmt`, `fmtKm`, `pct`), constants (`MONTHS`, `inputCls`, `selectCls`), and shared types (`TabKey`, `Trip`, `UploadData`)
- Rewired `tax-tools.tsx` (2,156 → 2,018 lines) to import from both new modules; `NAV` array and `tab` state remain shell-owned as specified
- Verified zero behaviour change: `tsc --noEmit` clean on the touched files, full test suite (83 files / 415 tests) passes unchanged, and `npm run build` (Turbopack) succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract pure tax-bracket helpers into calc-helpers.ts** - `7e24ba7` (feat)
2. **Task 2: Extract presentational components, formatters, constants, and types into shared.tsx** - `cfd88da` (feat)
3. **Task 3: Rewire tax-tools.tsx to import from the new modules and delete the relocated code** - `8db6587` (refactor)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/individual-tax/tax-tools/calc-helpers.ts` - Pure SARS tax-bracket helpers (`calcTax`, `getMarginalRate`, `getDeemedRate`), rulePack-parameterized, no React
- `src/components/individual-tax/tax-tools/shared.tsx` - `"use client"` module with presentational components, formatters, constants, and shared types used across the tax-tools shell and calculators
- `src/components/individual-tax/tax-tools.tsx` - Deleted relocated definitions, added two import blocks resolving to the new modules; `export function TaxTools()` named export preserved unchanged

## Decisions Made
- `calcTax`/`getMarginalRate`/`getDeemedRate` relocated verbatim only — no consolidation with `calculation-service.ts`'s private `getBracketTax`, per research Open Question 2 decision (that cross-module merge is out of scope for this phase)
- `TabKey` placed in `shared.tsx` rather than staying local to the monolith, since it is referenced by the shell, nav, and `DashboardTab`'s `onNavigate` prop across future extraction waves
- `Field`'s `children: React.ReactNode` typing works without an explicit `import React` in either file, relying on `@types/react`'s ambient global `React` UMD namespace (same behaviour as the original monolith, which also never imported React as a namespace)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`npx tsc --noEmit` surfaces pre-existing, unrelated errors across ~10 test files (`Cannot find name 'describe'/'it'/'expect'`, one `SupportedAssessmentYear` type mismatch) that exist identically on a clean `git stash` of the base branch — confirmed pre-existing via stash/diff comparison, not caused by this plan's changes. No files touched by this plan appear in the tsc error output. Not fixed (out of scope per task's file-level verify scope; the plan's own verify command targets clean compilation of touched files, and `npm test` — the actual test runner — passes all 415 tests).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `tax-tools/` folder and its shared surface (`shared.tsx`, `calc-helpers.ts`) are in place and proven working; subsequent waves in this phase can extract individual calculator sections (travel, medical, retirement, CGT, provisional, rental, home office) and import these modules directly instead of re-deriving formatters or tax-bracket math
- No blockers identified

---
*Phase: 05-component-decomposition*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/calc-helpers.ts
- FOUND: src/components/individual-tax/tax-tools/shared.tsx
- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND commit: 7e24ba7
- FOUND commit: cfd88da
- FOUND commit: 8db6587
