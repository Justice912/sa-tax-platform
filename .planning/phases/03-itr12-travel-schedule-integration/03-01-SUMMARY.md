---
phase: 03-itr12-travel-schedule-integration
plan: 01
subsystem: tax-calculation
tags: [zod, vitest, individual-tax, logbook, sars-codes, tdd]

# Dependency graph
requires:
  - phase: 02-logbook-domain-module
    provides: "LogbookTravelResult type and buildTravelResult claimedDeduction resolution (Phase 2 output seam)"
provides:
  - "calculateTravelSchedule accepts an optional LogbookTravelResult second parameter"
  - "Allowance-capped deduction (min(claimedDeduction, travelAllowance)) per SARS IT-AE-36-G05 p.115"
  - "allowanceType field distinguishing 3701 (fixed) vs 3702 (reimbursive) income codes"
  - "Descriptive TRAVEL_CLAIM deduction pseudo-code replacing fabricated 4014 in the schedule layer"
affects: [03-itr12-travel-schedule-integration/03-02, 03-itr12-travel-schedule-integration/03-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional trailing parameter for cross-module composition (logbookResult?) keeps single-arg call sites byte-identical"
    - "Descriptive pseudo-codes (TRAVEL_CLAIM) for computation lines with no verified SARS source code, matching existing NORMAL_TAX/MEDICAL_CREDIT/CGT/IRP6 precedent"
    - "Lockstep downstream filter updates whenever a computation line code changes (income + deduction + report layers)"

key-files:
  created: []
  modified:
    - src/modules/individual-tax/types.ts
    - src/modules/individual-tax/validation.ts
    - src/modules/individual-tax/schedules/travel-schedule.ts
    - src/modules/individual-tax/schedules/schedules.test.ts
    - src/modules/individual-tax/calculation-service.ts
    - src/modules/individual-tax/report-transformer.ts

key-decisions:
  - "Allowance cap (min(claimedDeduction, travelAllowance)) applies uniformly to both DEEMED and ACTUAL cost methods, per research's MEDIUM-confidence extension applied by design rather than branching"
  - "allowanceType only changes the income line's code/description (3701 vs 3702) — deduction math is identical for both, avoiding the research's Pitfall 2 warning sign"
  - "report-transformer keeps a 4014 fallback because the legacy calculateIndividualTax2026 path still legitimately emits that code; only the near-eFiling schedule layer moved to TRAVEL_CLAIM"

patterns-established:
  - "Cross-module optional-result composition: downstream module functions accept an optional upstream module's result type as a trailing parameter rather than importing/recomputing it"

requirements-completed: [ITR-01, ITR-02]

# Metrics
duration: 12min
completed: 2026-07-03
---

# Phase 03 Plan 01: Logbook-Aware Travel Schedule Summary

**calculateTravelSchedule now consumes Phase 2's LogbookTravelResult (capping the claim at the travel allowance received), distinguishes 3701/3702 income codes via a new allowanceType field, and replaces the fabricated "4014" deduction code with the descriptive TRAVEL_CLAIM pseudo-code across the schedule, calculation-service, and report-transformer layers.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-03T10:26:00Z
- **Completed:** 2026-07-03T10:38:55Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Logbook path: `deductibleAmount = round(min(logbookResult.claimedDeduction, input.travelAllowance))`, consuming `claimedDeduction` verbatim regardless of DEEMED/ACTUAL — no method re-selection in the schedule layer
- Single-argument (estimate) call path is byte-identical to pre-phase behaviour except the renamed deduction line code
- `allowanceType?: "FIXED" | "REIMBURSIVE"` added to `IndividualTaxTravelInput` and its Zod schema, selecting income line 3701 or 3702 without touching deduction math
- Fabricated "4014" code eliminated from `travel-schedule.ts`; downstream `calculation-service.ts` and `report-transformer.ts` filters updated in lockstep so the deduction line no longer silently vanishes from totals or the printed report
- 8 new TDD case groups added to `schedules.test.ts` (15 total tests in the file), full RED before GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — write failing logbook-path tests** - `3da6cd0` (test)
2. **Task 2: GREEN — extend type/schema and implement the logbook-aware schedule** - `ae52a2f` (feat)
3. **Task 3: LOCKSTEP — update downstream code filters and run the full suite** - `a67516e` (feat)

**Plan metadata:** (pending — recorded below in Final Commit)

_Note: This plan followed pure RED → GREEN → LOCKSTEP structure; no refactor commit was needed since the GREEN implementation matched the target shape directly._

## Files Created/Modified
- `src/modules/individual-tax/types.ts` - Added optional `allowanceType?: "FIXED" | "REIMBURSIVE"` to `IndividualTaxTravelInput`
- `src/modules/individual-tax/validation.ts` - Added `allowanceType: z.enum(["FIXED", "REIMBURSIVE"]).optional()` to the `travel` object so `.parse()` no longer strips a stored election
- `src/modules/individual-tax/schedules/travel-schedule.ts` - `calculateTravelSchedule(input, logbookResult?)`: logbook branch caps the claim at the allowance and maps logbook warnings through; estimate branch unchanged; deduction line code renamed 4014 → TRAVEL_CLAIM in both branches; income line code follows `allowanceType`
- `src/modules/individual-tax/schedules/schedules.test.ts` - 8 new case groups (logbook DEEMED, allowance cap, ACTUAL verbatim consumption, 3701/3702 income code with identical deduction, default/FIXED code, logbook warning passthrough, no-allowance short-circuit with logbook present, fallback estimate TRAVEL_CLAIM rename)
- `src/modules/individual-tax/calculation-service.ts` - Income filter widened to `3701 || 3702`; deduction filter renamed `4014` → `TRAVEL_CLAIM` (near-eFiling path only; legacy `calculateIndividualTax2026` untouched, out of scope per research)
- `src/modules/individual-tax/report-transformer.ts` - `buildDeductionRows` looks up `TRAVEL_CLAIM` first, falling back to legacy `4014` (still emitted by `calculateIndividualTax2026`, which `report-transformer.test.ts` also renders)

## Decisions Made
- Allowance cap applied uniformly to DEEMED and ACTUAL methods rather than branching by cost method — matches the plan's explicit instruction and avoids re-implementing method selection (Phase 2's responsibility) in the schedule layer
- Kept the legacy `4014` fallback in `report-transformer.ts` rather than removing it, since `calculateIndividualTax2026` (out of scope for this plan) still emits it and an existing test renders that legacy path
- Grouped the 8 new test cases into a nested `describe("calculateTravelSchedule with logbook input", ...)` block adjacent to the existing travel estimate test, rather than scattering them or creating a new top-level file, for readability while leaving all existing tests untouched

## Deviations from Plan

None - plan executed exactly as written. All 6 "must_haves.truths" and 4 "artifacts" from the plan frontmatter are satisfied; no architectural changes, bugs, or missing-functionality gaps were discovered outside plan scope.

## Issues Encountered

None. RED confirmed 6 of 8 new case groups failing initially (2 coincidentally already passed under the unmodified estimate implementation because a second argument was previously ignored and those two cases' expected values matched the estimate-path defaults); GREEN made all 15 tests in the file pass; LOCKSTEP full suite run confirmed 74 test files / 312 tests green with no existing test modified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `travel-schedule.ts` is ready for plan 03-02 (report rendering improvements) to consume `TRAVEL_CLAIM` directly rather than falling back to `4014` for the near-eFiling path
- The `allowanceType` field exists on the type/schema/schedule layer but has no UI selector yet — deferred to Phase 6 per research Open Question 1; downstream forms currently default to FIXED/3701
- No blockers for 03-02 or 03-03

---
*Phase: 03-itr12-travel-schedule-integration*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 6 modified files confirmed present on disk; all 3 task commits (3da6cd0, ae52a2f, a67516e) confirmed present in git history.
