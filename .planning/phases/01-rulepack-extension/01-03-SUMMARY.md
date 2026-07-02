---
phase: 01-rulepack-extension
plan: 03
subsystem: individual-tax
tags: [react, nextjs, sars-rulepack, individual-tax, tax-tools]

# Dependency graph
requires:
  - phase: 01-rulepack-extension (plan 01-01)
    provides: Populated travelDeemedCostTable and provisionalTax fields on 2024-2027 rulepacks
provides:
  - Tax-year selector (2025/2026/2027, default 2026) in the individual-tax UI
  - tax-tools.tsx fully re-sourced from getIndividualTaxRulePackByYear() — zero hardcoded SARS rate constants remain
  - Corrected provisional-tax safe-harbour branch orientation (0.90 at/below R1m, 0.80 above, per SARS para 20)
affects: [phase-5-tax-tools-decomposition, phase-7-calc-fixes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rulepack-parameterized pure functions: calcTax/getMarginalRate/getDeemedRate take rulePack as first argument instead of closing over module-level constants"

key-files:
  created: []
  modified:
    - src/components/individual-tax/tax-tools.tsx

key-decisions:
  - "Default tax year 2026; selector offers only 2025/2026/2027 (2024 excluded per REQUIREMENTS.md scope)"
  - "Kept local bracket-math functions (calcTax/getMarginalRate) parameterized by rulepack rather than redirecting to calculation-service.ts — that refactor is Phase 5"
  - "Did not split/decompose the component — Phase 5 owns decomposition; this plan only changed data sourcing + added the selector"
  - "s6B medical formula constants (0.333/0.25/0.075/3x multipliers) intentionally left untouched — Phase 7 CALC-01 scope"
  - "Fixed inverted provisional-tax safe-harbour branch orientation as a deliberate one-line correctness fix while wiring rulepack fields (was: 0.9 above R1m / 0.8 below; now: 0.90 at/below R1m / 0.80 above, per SARS para 20)"

patterns-established:
  - "Pattern: component-level calculators accept the resolved rulepack as an explicit parameter rather than importing rate constants directly, enabling year-switching without prop drilling into deeper calc functions computed during render"

requirements-completed: [RULE-03]

# Metrics
duration: 30min
completed: 2026-07-02
---

# Phase 1 Plan 3: Tax-Tools Year Selector and Rulepack Sourcing Summary

**Added a 2025/2026/2027 tax-year selector to tax-tools.tsx and deleted all hardcoded SARS rate constants, re-sourcing all eight calculators (travel deemed cost, medical s6A, retirement, CGT, provisional tax, and their dependents) from `getIndividualTaxRulePackByYear()`.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-02T16:29:55Z
- **Completed:** 2026-07-02T16:59:02Z
- **Tasks:** 3
- **Files modified:** 1 (`src/components/individual-tax/tax-tools.tsx`)

## Accomplishments
- Deleted the entire `SARS CONSTANTS` block (`TAX_BRACKETS`, `REBATES`, `MEDICAL_CREDITS`, `DEEMED_COST_TABLE`, `CGT_EXCLUSION`, `CGT_DEATH_EXCLUSION`, `CGT_PRIMARY_RES`, `CGT_INCLUSION_RATE`, `RETIRE_PERCENT`, `RETIRE_CAP`) — zero unlabeled 2024/2025-era literals remain
- Added a tax-year `<select>` (2025/2026/2027, default 2026) next to the tab navigation, with descriptive period labels
- Parameterized `calcTax`, `getMarginalRate`, `getDeemedRate` to take the resolved `IndividualTaxRulePack` as an argument, updating all four call sites (deemed rate, retirement marginal rate, CGT marginal rate, provisional full-tax calc)
- Re-sourced every calculator: travel deemed cost (fixed/fuel/maintenance), medical s6A credits, retirement deductible cap, CGT exclusions/inclusion rate, and provisional-tax rebate/safe-harbour figures — all now read from `rulePack`
- Corrected the deemed-cost fixed-cost field from a monthly-then-x12 pattern to the rulepack's native annual figure (removed the stray `* 12`)
- Fixed the provisional-tax safe-harbour branch orientation, which was inverted relative to SARS para 20 (previously applied 90% above R1m / 80% below — now correctly applies 90% at/below R1m / 80% above)
- Updated the dashboard subtitle to reflect the selected year dynamically instead of a hardcoded "2024/2025" label
- Verified end-to-end: year switching changes deemed-cost bracket boundaries (R100k-increment table for 2026 vs new R115k-increment table for 2027), retirement cap (R350k → R430k), and CGT annual exclusion (R40k → R50k) exactly as SARS-published

## Task Commits

Each task was committed atomically (Tasks 1 and 2 were implemented as a single continuous edit to the same file and combined into one commit; Task 3 was verification-only and its documentation output was committed separately):

1. **Tasks 1 & 2: Add year selector, parameterize helpers, delete constants block** - `30da5c8` (feat)
2. **Task 3: End-to-end verification (test/build/spot-check)** - documented in `76c3edf` (docs) — no code changes to tax-tools.tsx were required; verification-only

**Plan metadata:** (this commit, following STATE.md/ROADMAP.md update)

## Files Created/Modified
- `src/components/individual-tax/tax-tools.tsx` - Year selector state, rulepack-parameterized calculators, deleted hardcoded rate constants, corrected safe-harbour branch orientation

## Decisions Made
- Combined Task 1 (selector + helper parameterization) and Task 2 (constant deletion + call-site rewiring) into a single commit because both tasks touched the same continuous regions of the same file — splitting them would have required either committing intermediate broken states (helpers parameterized but old constants still present and unused) or re-reading/re-diffing to force an artificial split. The plan's own Task 1 verification note acknowledges Task 2 fallout is expected before Task 2 runs, confirming they are tightly coupled.
- Left the s6B medical formula multipliers (0.333, 0.25, 0.075, 3x thresholds) and the provisional-tax risk-band heuristic (`payment < safeHarbour * 0.8`) untouched exactly as the plan's locked decisions specify — confirmed via the Task 3 literal sweep that no other rate-bearing numeric literals remain.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dashboard subtitle showed a hardcoded "Tax Year 2024/2025" label that would now contradict the newly-added year selector**
- **Found during:** Task 2 (re-sourcing calculators)
- **Issue:** The dashboard tab's subtitle text was a static string unrelated to any rulepack constant, but with the year now user-selectable, displaying a fixed "2024/2025" would be actively misleading/incorrect regardless of the selected year — a direct correctness regression caused by adding the selector in this task.
- **Fix:** Changed the subtitle to `Tax Year {assessmentYear - 1}/{assessmentYear}` so it tracks the selected year.
- **Files modified:** `src/components/individual-tax/tax-tools.tsx`
- **Commit:** `30da5c8` (part of Task 1/2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, directly caused by this task's own change)
**Impact on plan:** Necessary follow-on fix to avoid shipping a newly-misleading label as a side effect of adding the selector. No scope creep — did not touch the other static option-hint labels (R2m/R40k/R300k/27.5%/R350k in CGT and retirement sections), since those are informational UI copy outside this plan's stated scope (data sourcing + selector only, not full label auditing).

## Issues Encountered
- `npm run test` (full suite) reported vitest worker-pool startup timeouts on 6 unrelated test files (estates valuation page, estates pre-death service, individual-tax service-interactive/service-update/calculation-service, estates service) plus a flaky timeout in the estates filing-pack route test. Confirmed via `git stash` baseline comparison against pre-plan HEAD that these are pre-existing resource-contention flakiness (concurrent plan 01-02 execution on the same machine competing for CPU/memory during vitest worker startup), not regressions from this plan's changes. Logged in `.planning/phases/01-rulepack-extension/deferred-items.md`.
- `npm run build` failed the TypeScript project-check step on a pre-existing, unrelated `middleware.ts` RBAC role-type error (`ExtendedRole` not assignable to `RoleCode`). Confirmed this file was last modified in commit `cd84690`, well before this phase began, and this plan does not touch `middleware.ts`. Turbopack's own compile step succeeded ("Compiled successfully in 42s"); only the subsequent standalone tsc check failed, and only on this unrelated file. `npx tsc --noEmit` independently confirms zero errors in `tax-tools.tsx`. Logged in `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RULE-03 satisfied: all eight tax-tools calculators are rulepack-sourced and year-switchable; no hardcoded SARS rate tables remain in the component.
- Phase success criteria 1 and 3 verified by hand-checked spot values matching rulepack data exactly (2026 vs 2027 deemed-cost bracket boundaries, retirement cap, CGT exclusion).
- Phase 5 (component decomposition) can proceed on a component whose data-sourcing is already rulepack-correct — no further rate-table migration needed there.
- Phase 7 (CALC-01/CALC-04) inherits the s6B multipliers and full safe-harbour formula audit as pre-scoped, untouched by this plan.
- Pre-existing, unrelated `middleware.ts` type error and vitest worker-pool flakiness remain open in `deferred-items.md` for a future cleanup pass — neither blocks this plan's completion.

---
*Phase: 01-rulepack-extension*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND: .planning/phases/01-rulepack-extension/01-03-SUMMARY.md
- FOUND: .planning/phases/01-rulepack-extension/deferred-items.md
- FOUND commit: 30da5c8
- FOUND commit: 76c3edf
