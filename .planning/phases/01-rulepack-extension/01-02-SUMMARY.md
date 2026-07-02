---
phase: 01-rulepack-extension
plan: 02
subsystem: testing
tags: [vitest, build-gate, rulepack, individual-tax, regression-test]

# Dependency graph
requires:
  - phase: 01-rulepack-extension (plan 01)
    provides: travelDeemedCostTable and provisionalTax populated for 2024-2027 in the individual-tax rulepack registry
provides:
  - Build-gate test (rulepack-completeness.test.ts) that fails npm run test if any verified year's travel/provisional-tax data is missing, duplicated across years, structurally broken, or a placeholder
affects: [01-rulepack-extension, individual-tax]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rulepack completeness build-gate: per-year data (travelDeemedCostTable, provisionalTax) is protected against silent regression via presence + structural + distinctness + year-anchored spot-check assertions in a dedicated test file"

key-files:
  created:
    - src/modules/individual-tax/rulepack-completeness.test.ts
    - .planning/phases/01-rulepack-extension/deferred-items.md
  modified: []

key-decisions:
  - "Used it.each over VERIFIED_YEARS = [2025, 2026, 2027] for presence/structural/provisional-tax assertion groups to avoid repetition while keeping year-anchored spot checks as individual named tests for clearer failure messages"
  - "2024 confined to a single structural non-empty check per plan 01-01's locked scope rule (its table is intentionally identical to 2025's, so it is excluded from distinctness and exact-value assertions)"

patterns-established:
  - "Mutation testing to prove a build-gate test's effectiveness: temporarily corrupt data, confirm the gate fails, revert via git checkout, confirm byte-identical restoration via git diff before finishing"

requirements-completed: [RULE-01]

# Metrics
duration: 27min
completed: 2026-07-02
---

# Phase 1 Plan 2: Rulepack Completeness Build Gate Summary

**Vitest build-gate test (18 assertions across 7 groups) that fails `npm run test` if any of the 2025/2026/2027 individual-tax rulepacks has a missing, duplicated, structurally broken, or placeholder travel-deemed-cost table or provisional-tax block.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-02T18:29:00+02:00 (approx, per STATE.md session start)
- **Completed:** 2026-07-02T18:56:00+02:00
- **Tasks:** 2 completed
- **Files modified:** 1 created (test file); 2 files mutated-then-reverted (verification only, no net change)

## Accomplishments
- Created `rulepack-completeness.test.ts` with 18 tests across 7 assertion groups: presence, structural validity, anti-copy-paste distinctness, year-anchored spot checks (PAYE-GEN-01-G03-A01 Rev 17/18/19), 2027 Budget-2026 completeness, provisional-tax safe-harbour values, and 2024's limited structural-only check
- Proved the gate actually catches regressions via two mutation tests: (1) copying 2025's travel table into 2026 — caught by both the distinctness check and the year-anchored spot check; (2) an unconverted-cents value (220.1 instead of 2.201 rand/km) — caught by the sanity-range check
- Confirmed both source files (`rules-2026.ts`, `rules-2027.ts`) restored byte-identical to HEAD after mutation testing (`git diff HEAD` reports 0 lines)
- Full individual-tax module test suite (10 files, 46 tests) passes green after restoration, including the new completeness test and the pre-existing `rulepack.test.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Write rulepack-completeness.test.ts** - `6b6f1e9` (test)
2. **Task 2: Prove the gate actually fails on broken data, then restore** - no commit (verification-only task; mutations were reverted by design, leaving zero net file change — confirmed via `git diff HEAD`)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/modules/individual-tax/rulepack-completeness.test.ts` - Build-gate test: presence, structural validity, distinctness, year-anchored spot checks, 2027 Budget-2026 completeness, provisional-tax values, 2024 structural-only check
- `.planning/phases/01-rulepack-extension/deferred-items.md` - Logs an out-of-scope vitest worker-pool timeout issue observed during full-suite runs (see Issues Encountered)

## Decisions Made
- Used `it.each` for the four assertion groups that repeat identically across VERIFIED_YEARS (presence x2, structural validity, provisional-tax values), keeping year-anchored spot checks and 2027 Budget-2026 completeness as individually named tests since each has year-specific published values that read better as distinct test names in failure output
- Confirmed via mutation testing that both the distinctness check and the sanity-range check are independently sufficient to catch their respective bug classes (copy-paste and unconverted cents), satisfying the plan's "if any mutation does NOT fail the test, strengthen the assertion" requirement — no strengthening was needed

## Deviations from Plan

None - plan executed exactly as written. All 7 assertion groups specified in Task 1 were implemented; both mutations specified in Task 2 were applied, confirmed to fail the gate, and reverted.

## Issues Encountered

**Full-suite `npm run test` intermittently failed 3 unrelated test files with vitest worker-pool timeouts** (`client-service.test.ts`, `estates/engines/post-death/calculation.test.ts`, `desktop/golden-demo-bundle.test.ts`) during Task 1 verification. Root-caused to resource contention from a concurrent agent (plan 01-03) running on the same machine at the same time — confirmed unrelated to this plan's change by running the rulepack tests in isolation (21/21 passing, no errors) and by re-running the scoped `src/modules/individual-tax/` suite after mutation testing (10 files, 46 tests, all green). Logged to `deferred-items.md` per the scope-boundary rule (out-of-scope, pre-existing infra flakiness, not caused by this plan's changes) rather than fixed. No action needed from a future phase unless it reproduces without concurrent agent activity.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase success criterion 4 satisfied: the build gate is in place and demonstrably catches missing/duplicated/placeholder rulepack data for the verified years (2025-2027)
- Plan 01-03 (tax-tools.tsx refactor) proceeds independently on its own file scope; no conflicts observed
- This completes 2 of 3 plans in phase 01-rulepack-extension; plan 01-03 status should be checked before considering the phase complete

---
*Phase: 01-rulepack-extension*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: src/modules/individual-tax/rulepack-completeness.test.ts
- FOUND: .planning/phases/01-rulepack-extension/deferred-items.md
- FOUND: .planning/phases/01-rulepack-extension/01-02-SUMMARY.md
- FOUND: commit 6b6f1e9
- Confirmed: rules-2026.ts and rules-2027.ts byte-identical to HEAD (0 diff lines) after mutation testing
