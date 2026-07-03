---
phase: 03-itr12-travel-schedule-integration
plan: 02
subsystem: tax-calculation
tags: [vitest, individual-tax, logbook, sars-codes, report-transformer]

# Dependency graph
requires:
  - phase: 03-itr12-travel-schedule-integration/03-01
    provides: "calculateTravelSchedule(input, logbookResult?) emitting 3701/3702 income lines and a TRAVEL_CLAIM deduction line"
provides:
  - "calculateNearEfilingIndividualTaxEstimate(input, logbookResult?) — optional trailing LogbookTravelResult threaded into the travel schedule"
  - "Travel deduction line computations text distinguishing logbook-based (method-identifying) claims from km-ratio estimates"
  - "Printed ITA34-style report renders the travel deduction from the real calculation line and shows a 3702 row only when the calc emits one"
affects: [03-itr12-travel-schedule-integration/03-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional trailing parameter (logbookResult?) kept the calculation-service entry point synchronous and pure, matching the pattern established in the schedule layer (03-01)"
    - "Conditional row insertion in report-transformer (findLine(...) truthy check) preserves exact legacy-code lists while extending for new calc paths"

key-files:
  created: []
  modified:
    - src/modules/individual-tax/calculation-service.ts
    - src/modules/individual-tax/report-transformer.ts
    - src/modules/individual-tax/calculation-service.test.ts

key-decisions:
  - "Travel deduction computations text is built once (travelClaimComputations) from logbookResult presence/absence and passed as makeScheduleLines' prefix, avoiding a second branch inside the line-mapping call"
  - "report-transformer's 4014 fallback stays for the legacy calculateIndividualTax2026 path; only the near-eFiling TRAVEL_CLAIM/4014 lookup order was made honest (real computations instead of the fabricated ND 458-221 narrative)"
  - "Left a TODO(compliance-review) comment above the always-zero 3713/3825 placeholder rows referencing PAYE-AE-06-G06, per plan instruction to defer that relabeling to the Phase 7 audit backlog"

patterns-established: []

requirements-completed: [ITR-01]

# Metrics
duration: 8min
completed: 2026-07-03
---

# Phase 03 Plan 02: Calculation & Report Integration Summary

**Threaded the resolved LogbookTravelResult into calculateNearEfilingIndividualTaxEstimate (optional 2nd argument, byte-identical single-argument behavior), replaced the printed report's fabricated "ND 458-221" travel narrative with the real calculation line's computations, and added a conditional 3702 reimbursive-income row that never appears on legacy reports.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-03T10:42:00Z
- **Completed:** 2026-07-03T10:49:46Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `calculateNearEfilingIndividualTaxEstimate(input, logbookResult?)` passes the optional logbook result straight through to `calculateTravelSchedule`; all pre-existing single-argument call sites and tests are unchanged in behavior
- The TRAVEL_CLAIM deduction line's `computations` string now reads `"Logbook-based travel claim (DEEMED|ACTUAL method): R X.XX calculated from logbook data, limited to the travel allowance received"` when a logbook is present, or `"Estimated travel claim: allowance × business-kilometre ratio (no logbook on file)"` otherwise — the practitioner can see at a glance which source produced the figure
- `report-transformer.ts`'s `buildDeductionRows` now renders the travel row from the found `TRAVEL_CLAIM`/`4014` line's real code and computations; the fabricated "purchase date 2021-03-01, registration ND 458-221..." narrative is gone entirely
- `buildIncomeGroups` appends a 3702 "Reimbursive travel allowance" row only when `calc.incomeLines` actually contains a 3702 line — the legacy report's exact `["3601","3701","3713","3810","3825"]` code list is untouched and its test passes unmodified
- 5 new test case groups added to `calculation-service.test.ts` (314 lines total) covering: logbook-fed claim, allowance cap flowing to `totalDeductions`, reimbursive 3702 income line with no 3701 and TRAVEL_CLAIM still present, no-logbook km-ratio estimate text, and logbook warnings flipping `reviewRequired` through the existing `warnings.length > 0` mechanism
- Full suite: 74 test files / 317 tests green, no existing test modified

## Task Commits

Each task was committed atomically:

1. **Task 1: Thread logbookResult through the near-eFiling calculation** - `3270dc6` (feat)
2. **Task 2: Render the new codes honestly in the printed report** - `85818b2` (fix)
3. **Task 3: Extend calculation-service tests for the logbook and 3702 paths** - `f75348c` (test)

**Plan metadata:** (recorded below in Final Commit)

## Files Created/Modified
- `src/modules/individual-tax/calculation-service.ts` - Added optional `logbookResult?: LogbookTravelResult | null` parameter to `calculateNearEfilingIndividualTaxEstimate`; passes it into `calculateTravelSchedule`; builds `travelClaimComputations` (logbook-based vs estimate text) as the deduction line's computations
- `src/modules/individual-tax/report-transformer.ts` - `buildIncomeGroups` conditionally splices a 3702 row after 3701 when present; `buildDeductionRows` derives the travel row's code/computations/amount from the found `TRAVEL_CLAIM`/`4014` line instead of a hardcoded fabricated vehicle narrative; added a compliance-review TODO above the 3713/3825 placeholders
- `src/modules/individual-tax/calculation-service.test.ts` - Added `makeLogbookResult` and `makeNearEfilingInput` fixture factories plus 5 new test case groups (logbook feed, cap-to-totals, warnings-flip-reviewRequired, reimbursive 3702, no-logbook estimate text)

## Decisions Made
- Kept the deduction-line computations logic as a single ternary computed before the `makeScheduleLines` call (rather than branching inside the map), matching the plan's exact interface spec and keeping the line-building helper generic
- Reused the schedules.test.ts `makeLogbookResult` factory shape locally in calculation-service.test.ts rather than importing it, keeping each test file's fixtures self-contained (existing project convention — schedules.test.ts does the same)
- Test group 3 (reimbursive income line) intentionally uses a single-argument call with zero business/total kilometres, which also triggers the pre-existing `TRAVEL_LOGBOOK_REQUIRED` warning; the plan's assertions for that case don't check warnings, so this was left as-is rather than adding kilometre values that would change the deduction amount away from a clean "estimate path" demonstration

## Deviations from Plan

None - plan executed exactly as written. All 5 "must_haves.truths" and 3 "artifacts" from the plan frontmatter are satisfied; no architectural changes, bugs, or missing-functionality gaps were discovered outside plan scope.

## Issues Encountered

None. `npx tsc --noEmit` surfaced pre-existing "Cannot find name 'describe'/'expect'" errors in unrelated test files (a bare-tsc vs vitest-globals config gap, not something this plan's files touch or introduced) — confirmed out of scope via `grep` showing zero matches for `calculation-service.ts`/`report-transformer.ts` in that output, and left unfixed per the scope-boundary rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The near-eFiling calculation entry point now accepts an optional `LogbookTravelResult`; plan 03-03 (service-layer wiring) can resolve the logbook from the repository and pass it into `calculateNearEfilingIndividualTaxEstimate` without any further signature changes
- The printed report honestly reflects whichever travel source (logbook or estimate) produced the figure — no remaining fabricated narrative text in the deductions section
- No blockers for 03-03

---
*Phase: 03-itr12-travel-schedule-integration*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 3 modified files confirmed present on disk; SUMMARY.md confirmed present; all 3 task commits (3270dc6, 85818b2, f75348c) confirmed present in git history.
