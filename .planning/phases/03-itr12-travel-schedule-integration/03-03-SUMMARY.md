---
phase: 03-itr12-travel-schedule-integration
plan: 03
subsystem: api
tags: [individual-tax, logbook, travel-schedule, near-efiling, vitest]

# Dependency graph
requires:
  - phase: 03-itr12-travel-schedule-integration (plan 02)
    provides: calculateNearEfilingIndividualTaxEstimate(input, logbookResult?) and calculateTravelSchedule threading a LogbookTravelResult into the deduction line
  - phase: 02 (logbook domain module)
    provides: getLogbookForClientYear / getLogbookTravelResult service API, seeded demo logbook fixture
provides:
  - Async logbook resolution wired into getIndividualTaxAssessmentResult, the single place holding both clientId and assessmentYear
  - End-to-end proof (integration tests) that a real logbook overrides the ratio estimate, and that both fallback triggers (no client match, no year match) leave legacy behaviour untouched
  - Full regression suite passing with the seeded demo logbook now live for client_001/2026
affects: [phase-04-import-pipeline, phase-06-ui-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async resolution performed at the service layer immediately before dispatch to a still-synchronous, still-pure calculation layer (calculateNearEfilingIndividualTaxEstimate never became async)"
    - "Optional foreign-key lookups (clientId?: string) guarded with a plain if, never try/catch — a throwing lookup must surface as a bug, not be swallowed as absence"

key-files:
  created:
    - src/modules/individual-tax/service-logbook.test.ts
  modified:
    - src/modules/individual-tax/service.ts

key-decisions:
  - "[Phase 03] Logbook resolution guarded by hasTravelAllowance && clientId in getIndividualTaxAssessmentResult, skipping repository I/O entirely for assessments with no travel section or no linked client"
  - "[Phase 03] calculateNearEfilingEstimate wrapper widened with an optional second parameter so all existing single-argument callers keep compiling unchanged"

patterns-established:
  - "Integration tests independently recompute the expected value from the same seam under test (getLogbookForClientYear + getLogbookTravelResult) rather than hardcoding a number, so the assertion tracks the rulepack table instead of a magic constant"

requirements-completed: [ITR-01, ITR-02]

# Metrics
duration: 7min
completed: 2026-07-03
---

# Phase 3 Plan 3: Logbook-to-Assessment Integration Summary

**Wired async logbook resolution into `getIndividualTaxAssessmentResult` so a client's real travel logbook — not the allowance x business-km ratio estimate — feeds the near-eFiling assessment's TRAVEL_CLAIM deduction, with three new integration tests proving the logbook-fed path and both fallback triggers, and the full 320-test suite green with zero pre-existing test files touched.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-03T10:51:22Z (following 03-02 completion)
- **Completed:** 2026-07-03T10:57:47Z
- **Tasks:** 3 (2 code/test commits + 1 verification-only)
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- `getIndividualTaxAssessmentResult` now resolves the client's logbook for the assessment year (via Phase 2's `getLogbookForClientYear` + `getLogbookTravelResult`) and passes the result into the existing, still-synchronous `calculateNearEfilingEstimate` — the only integration point in the codebase holding both `clientId` and `assessmentYear`
- Three new integration tests prove the seam end-to-end against the seeded demo logbook: a real logbook shrinks/replaces the ratio estimate with `min(claimedDeduction, allowance)`; a client with no logbook falls back to the ratio estimate; a client whose logbook doesn't cover the requested year also falls back
- Full existing suite (75 files / 320 tests) verified green with the seeded logbook now live for `client_001`/2026 — including `service-interactive.test.ts`'s near-eFiling test, which now takes the logbook path and still satisfies its `taxableIncome > 800000` assertion

## Task Commits

Each task was committed atomically:

1. **Task 1: Resolve the logbook in getIndividualTaxAssessmentResult and thread it down** - `9a0c800` (feat)
2. **Task 2: Integration tests against the seeded demo logbook** - `bb028a9` (test)
3. **Task 3: Phase-complete verification — full suite unmodified** - no commit (verification-only; `npm test` was green with zero fixes required)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/modules/individual-tax/service.ts` - Imports `getLogbookForClientYear`/`getLogbookTravelResult`; widens `calculateNearEfilingEstimate` to accept an optional `LogbookTravelResult`; `getIndividualTaxAssessmentResult` resolves the logbook (guarded by `assessmentMode`, `hasTravelAllowance`, and `clientId`) before dispatching to the calculation layer
- `src/modules/individual-tax/service-logbook.test.ts` - Three integration tests: logbook-fed assessment (client_001/2026), no-logbook-for-client fallback (client_002), no-logbook-for-year fallback (client_001/2027)

## Decisions Made
- Guard order is `assessmentMode === "NEAR_EFILING_ESTIMATE" && nearEfilingInput.travel.hasTravelAllowance && clientId` — the `hasTravelAllowance` check skips a repository round-trip whenever the travel section isn't in play, independent of whether a logbook exists
- No try/catch around the lookup: `clientId` is `string | undefined` and is checked explicitly; anything that throws past that point (e.g. a corrupt logbook record) is a genuine bug that must propagate, not be reinterpreted as "no logbook"
- Test fixture reuses the exact client_001-style near-eFiling shape from `service-interactive.test.ts` (travelAllowance 85000, businessKilometres 18500, totalKilometres 30200) so the ratio-estimate constant used across all three tests is provably the same pre-phase figure

## Deviations from Plan

None - plan executed exactly as written. All three tasks passed verification on the first attempt with no auto-fixes required.

## Issues Encountered

None. `npx tsc --noEmit` was run as an extra sanity check beyond the plan's listed verification commands; the only errors it surfaced were pre-existing, unrelated to this plan (estates module type mismatches, a `middleware.ts` role-type issue, and test-file "cannot find name describe/it/expect" errors caused by vitest globals not being visible to a bare `tsc` invocation) — none touch `service.ts` or the new test file, so nothing was logged to deferred-items.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ITR-01 and ITR-02 are complete: the logbook now feeds real near-eFiling assessments end-to-end, and every fallback path (no client, no logbook for client, no logbook for year, LEGACY_SCAFFOLD mode) is proven unchanged by an unmodified, fully green regression suite
- Phase 3 (ITR12 Travel Schedule Integration) is now complete across all three plans (03-01 line-code filters, 03-02 calculation/report threading, 03-03 this integration)
- Phase 4 (import pipeline) and Phase 6 (UI/reporting) can rely on `getIndividualTaxAssessmentResult` transparently resolving logbook data with no further plumbing required

---
*Phase: 03-itr12-travel-schedule-integration*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/modules/individual-tax/service.ts
- FOUND: src/modules/individual-tax/service-logbook.test.ts
- FOUND: 9a0c800 (feat commit)
- FOUND: bb028a9 (test commit)
