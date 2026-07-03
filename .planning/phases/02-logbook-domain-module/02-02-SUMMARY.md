---
phase: 02-logbook-domain-module
plan: 02
subsystem: calculation-engine
tags: [typescript, vitest, tdd, sars-travel, logbook]

# Dependency graph
requires:
  - phase: 02-logbook-domain-module
    provides: "LogbookCostMethod/ActualCostExpenses/LogbookWarning/LogbookTravelResult types from 02-01, and Phase 1's TravelDeemedCostBracket/getIndividualTaxRulePackByYear"
provides:
  - "calculateDeemedCost(vehicleCostPrice, businessKm, totalKm, table) pure function implementing PAYE-GEN-01-G03-A01 fixed-cost apportionment"
  - "calculateActualCost(vehicleCostPrice, businessKm, totalKm, expenses) pure function with R665,000 vehicle-value cap"
  - "buildTravelResult(input, table) comparison builder computing both methods and resolving the claim via explicit costMethod switch"
  - "ACTUAL_COST_VEHICLE_VALUE_CAP exported constant (665,000)"
affects: [02-03-repository, 02-04-service, phase-3-itr12-travel-schedule]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared resolveKilometreDenominator helper: totalKm floored at businessKm when the closing odometer is not yet recorded, reused identically by both deemed and actual engines"
    - "Single final r2() rounding per function call — no intermediate per-trip rounding, proven at 1,000-trip scale"
    - "Method exclusivity via explicit if/else switch on costMethod, never a ?? fallback chain between deemed/actual results"

key-files:
  created:
    - src/modules/logbook/calculation.ts
    - src/modules/logbook/calculation.test.ts
  modified: []

key-decisions:
  - "Deemed-cost fixed cost is apportioned over Math.max(totalKm, businessKm) rather than totalKm alone, guarding against a data-entry error where businessKm exceeds the recorded totalKm"
  - "Actual-cost finance charges are pro-rated by cappedValue/vehicleCostPrice when the vehicle's cost price exceeds R665,000 — flagged TODO(compliance-review) per research Open Question 2, exact SARS mechanics underdocumented"
  - "ACTUAL election with null actualExpenses claims 0, not the deemed figure — enforced by an explicit if/else, tested directly against the fallback-chain anti-pattern"

patterns-established:
  - "Pure calculation functions (no I/O, no repository/service imports) always take the resolved rate table as a parameter — rulepack resolution stays with the caller"

requirements-completed: [LOG-05]

# Metrics
duration: 9min
completed: 2026-07-03
---

# Phase 02 Plan 02: Deemed/Actual Travel Cost Engines Summary

**Two independently-tested pure functions (calculateDeemedCost, calculateActualCost) implementing SARS's PAYE-GEN-01-G03-A01 deemed-cost apportionment and the R665,000-capped actual-cost method, plus buildTravelResult which computes both for side-by-side comparison while resolving the claimed deduction solely via an explicit costMethod switch.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-03T08:18:48Z
- **Completed:** 2026-07-03T08:27:23Z
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments
- Implemented the SARS deemed-cost formula correctly per PAYE-GEN-01-G03-A01: the bracket's annual fixed cost is divided by TOTAL kilometres travelled in the year (not claimed in full), then added to per-km fuel/maintenance rates before multiplying by business kilometres.
- Implemented the actual-cost method with the R665,000 statutory vehicle-value cap (s8(1)(b)(iiiA)(bb)) applied to both wear-and-tear (7-year straight line) and finance-charge pro-ration.
- Proved method exclusivity with direct tests: a DEEMED election claims the deemed figure even when complete, higher-yielding actual expense data is present; an ACTUAL election with no expense data claims 0, never silently falling back to the deemed figure.
- Verified rounding discipline at scale: 1,000 trips of fractional km each produce a result that matches single-final-rounding but differs from naive per-trip rounding (14,998.50 vs 15,000.00 in the test case).
- Verified year-table resolution: identical inputs against the real 2026 vs 2027 rulepacks produce different deductions (70,789.20 vs 74,897.20), confirming no accidental year coupling.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — write the failing calculation test suite** - `d0bdb4b` (test)
2. **Task 2: GREEN — implement calculation.ts to pass every test** - `ed06767` (feat)
3. **Task 3: REFACTOR — clean up and run the full suite** - no commit (no code changes required; see below)

**Plan metadata:** (this commit) — docs: complete plan

_Note: Task 3 made no code changes — the shared kilometre-denominator helper and all three compliance doc comments were already in place from Task 2's implementation, and `npm run test` (71 files / 284 tests) passed unchanged. Per the plan's instruction to "commit only if refactoring changed code," no refactor commit was created._

## Files Created/Modified
- `src/modules/logbook/calculation.ts` - `calculateDeemedCost`, `calculateActualCost`, `buildTravelResult`, `ACTUAL_COST_VEHICLE_VALUE_CAP`, and the shared `resolveKilometreDenominator` helper
- `src/modules/logbook/calculation.test.ts` - 17 tests across deemed-cost formula/boundary/precision cases, actual-cost cap/ratio-clamp cases, buildTravelResult exclusivity cases, and year-table resolution

## Decisions Made
- The kilometre denominator (`resolveKilometreDenominator`) is shared verbatim between `calculateDeemedCost` and `calculateActualCost`: when `totalKm` is null/≤0, businessKm is used as the floor; otherwise the denominator is `Math.max(totalKm, businessKm)`, so a businessKm value accidentally exceeding the recorded totalKm never produces a per-km rate below the bracket's true intent or a ratio above 1.
- Finance charges are pro-rated by `cappedValue / vehicleCostPrice` only when the vehicle's cost price exceeds the R665,000 cap; below the cap they pass through unmodified. This is the defensible interpretation flagged in 02-RESEARCH.md's Open Question 2 — the exact statutory mechanic is underdocumented in available secondary sources, so the code carries a `TODO(compliance-review)` comment rather than asserting certainty.
- `buildTravelResult`'s `claimedDeduction` is resolved with an explicit `if (costMethod === "DEEMED") ... else ...` — deliberately avoiding any `??`/fallback-chain shape, per Pitfall 1's exact warning sign. An ACTUAL election with `actualExpenses: null` claims `0`, not the deemed figure, and carries an `ACTUAL_EXPENSES_MISSING` warning.

## Deviations from Plan

None - plan executed exactly as written. All exported names, formulas, rounding conventions, and doc-comment citations match the plan's specification verbatim.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02-03 (repository) and 02-04 (service) can now import `calculateDeemedCost`, `calculateActualCost`, and `buildTravelResult` directly from `src/modules/logbook/calculation.ts` to implement `getTravelResult()`.
- Phase 3's ITR12 travel schedule wiring can eventually consume `buildTravelResult`'s output shape (`LogbookTravelResult`) once Phase 2's service layer exposes it — no changes needed to this plan's exports for that integration.
- No blockers identified. The R665,000 cap and finance-charge pro-ration remain flagged for a pre-production compliance review (per 02-RESEARCH.md), consistent with Phase 1's precedent of loudly-commented unverified figures.

---
*Phase: 02-logbook-domain-module*
*Completed: 2026-07-03*

## Self-Check: PASSED

All claimed files exist and all task commits are present in git history:
- FOUND: src/modules/logbook/calculation.ts
- FOUND: src/modules/logbook/calculation.test.ts
- FOUND: commit d0bdb4b (Task 1)
- FOUND: commit ed06767 (Task 2)
