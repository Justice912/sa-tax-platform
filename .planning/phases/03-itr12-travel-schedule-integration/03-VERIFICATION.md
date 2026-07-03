---
phase: 03-itr12-travel-schedule-integration
verified: 2026-07-03T15:16:58Z
status: passed
score: 6/6 must-haves verified (across 3 plans)
---

# Phase 3: ITR12 Travel Schedule Integration Verification Report

**Phase Goal:** The travel schedule calculation uses real logbook data instead of the crude allowance×ratio estimate, correctly distinguishing SARS travel allowance codes, without breaking any other schedule.
**Verified:** 2026-07-03T15:16:58Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `calculateTravelSchedule` uses `claimedDeduction` (capped at `travelAllowance` via `Math.min`) as `deductibleAmount` when a logbook is present — never the ratio estimate | ✓ VERIFIED | `travel-schedule.ts:38` — `deductibleAmount = r2(Math.min(logbookResult.claimedDeduction, input.travelAllowance))`, verbatim, no method re-selection |
| 2 | The claimed deduction never exceeds the travel allowance, for both DEEMED and ACTUAL methods | ✓ VERIFIED | Cap applied uniformly outside any `costMethod` branch (`travel-schedule.ts:34-42`); `schedules.test.ts` cap test (line 80-89) and ACTUAL-verbatim test (line 91-102) both pass |
| 3 | `allowanceType` REIMBURSIVE → 3702/"Reimbursive travel allowance"; FIXED/absent → 3701/"Travel allowance"; deduction math identical | ✓ VERIFIED | `travel-schedule.ts:27-29`; `schedules.test.ts:104-142` proves identical `deductibleAmount` between REIMBURSIVE and FIXED |
| 4 | Deduction line uses `TRAVEL_CLAIM`; fabricated "4014" gone from `travel-schedule.ts`; downstream filters in `calculation-service.ts`/`report-transformer.ts` updated in lockstep | ✓ VERIFIED | `grep "4014" travel-schedule.ts` → zero matches; `calculation-service.ts:362` filters `3701 \|\| 3702` (income), `:408` filters `TRAVEL_CLAIM` (deduction); `report-transformer.ts:267-268` looks up `TRAVEL_CLAIM ?? 4014` |
| 5 | Single-argument `calculateTravelSchedule` calls produce byte-identical estimate output; existing estimate test passes untouched | ✓ VERIFIED | Original "estimates travel allowance claims and warnings" test (schedules.test.ts:40-53) unmodified and passing; only the deduction line's *code* changed (4014→TRAVEL_CLAIM), amounts identical |
| 6 | `LogbookTravelResult.warnings` map into schedule warnings; `TRAVEL_LOGBOOK_REQUIRED` suppressed when logbook present | ✓ VERIFIED | `travel-schedule.ts:39-42` maps warnings only in the logbook branch; `TRAVEL_LOGBOOK_REQUIRED` push only exists in the `else` (no-logbook) branch (line 45-50) |
| 7 (03-02) | `calculateNearEfilingIndividualTaxEstimate` accepts optional `LogbookTravelResult`, distinguishing computations text; 3702 income row conditional; fabricated "ND 458-221" narrative removed | ✓ VERIFIED | `calculation-service.ts:205-218,402-411`; `report-transformer.ts:193-206` conditional 3702 splice; `grep "ND 458-221"` → zero matches anywhere in report-transformer.ts |
| 8 (03-03) | `getIndividualTaxAssessmentResult` resolves the client's logbook for the assessment year and threads it into the calculation; no-client/no-logbook/wrong-year/LEGACY_SCAFFOLD paths fall back unchanged | ✓ VERIFIED | `service.ts:192-219`; guarded by `assessmentMode === "NEAR_EFILING_ESTIMATE"` (outer) + `hasTravelAllowance && clientId` (inner), no try/catch; `service-logbook.test.ts` proves logbook-fed, client-fallback, and year-fallback paths end-to-end against the seeded demo logbook |
| 9 | Full existing test suite passes unmodified (no regressions in any other schedule) | ✓ VERIFIED | `npm test` run independently during this verification: **75 files / 320 tests, all passing**; `git diff --stat` since phase start shows only additive changes to `schedules.test.ts`, `calculation-service.test.ts`, and a new `service-logbook.test.ts` — zero pre-existing test files had lines removed/altered |

**Score:** 9/9 truths verified (must_haves truths from all 3 plans consolidated; no duplicates counted twice)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/modules/individual-tax/schedules/travel-schedule.ts` | Logbook-aware schedule, allowance cap, 3701/3702, TRAVEL_CLAIM | ✓ VERIFIED | Exports `calculateTravelSchedule(input, logbookResult?)`; matches plan's exact interface spec; no "4014" string present |
| `src/modules/individual-tax/types.ts` | `allowanceType` optional field | ✓ VERIFIED | Line 37: `allowanceType?: "FIXED" \| "REIMBURSIVE";` |
| `src/modules/individual-tax/validation.ts` | Zod schema accepts `allowanceType` | ✓ VERIFIED | Line 51: `allowanceType: z.enum(["FIXED", "REIMBURSIVE"]).optional(),` inside `travel:` object |
| `src/modules/individual-tax/schedules/schedules.test.ts` | TDD suite, min 180 lines | ✓ VERIFIED | 257 lines; 8 new nested case groups under "calculateTravelSchedule with logbook input"; all 15 tests in file pass |
| `src/modules/individual-tax/calculation-service.ts` | logbookResult threading + distinguishing computations | ✓ VERIFIED | `logbookResult` param threaded to `calculateTravelSchedule`; `travelClaimComputations` ternary built at line 402-404 |
| `src/modules/individual-tax/report-transformer.ts` | Conditional 3702 row, line-driven travel deduction row | ✓ VERIFIED | Line 195-206 conditional splice; line 267-283 line-driven travel row; TODO(compliance-review) comment present per plan instruction for 3713/3825 |
| `src/modules/individual-tax/calculation-service.test.ts` | Logbook-path, cap, 3702 assertions, min 200 lines | ✓ VERIFIED | 5 new `it` blocks (lines 226-315 approx) covering logbook feed, cap, reviewRequired flip, 3702, estimate text |
| `src/modules/individual-tax/service.ts` | Async logbook resolution at `getIndividualTaxAssessmentResult` | ✓ VERIFIED | `getLogbookForClientYear`/`getLogbookTravelResult` imported and called (line 209-210); guarded, no try/catch |
| `src/modules/individual-tax/service-logbook.test.ts` | End-to-end integration tests, min 80 lines | ✓ VERIFIED | 149 lines; 3 integration tests (logbook-fed, client fallback, year fallback), all pass and independently recompute expectations from the same service seam |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `travel-schedule.ts` | `logbook/types.ts` | `LogbookTravelResult` type-only import | ✓ WIRED | Line 6: `import type { LogbookTravelResult } from "@/modules/logbook/types";` |
| `calculation-service.ts` | `travel.lines` | Income filter widened to 3701\|\|3702, deduction filter renamed to TRAVEL_CLAIM | ✓ WIRED | Lines 362, 408 — exact match to plan spec |
| `report-transformer.ts` | `calc.deductionLines` | `findLine` TRAVEL_CLAIM with 4014 fallback | ✓ WIRED | Line 267-268 |
| `calculation-service.ts` | `schedules/travel-schedule.ts` | `calculateTravelSchedule(input.travel, logbookResult)` | ✓ WIRED | Line 218 |
| `report-transformer.ts` | `calc.deductionLines` | travel row rendered from found line's computations | ✓ WIRED | Line 267-283, `travelLine?.computations` used directly, no hardcoded narrative |
| `service.ts` | `logbook/service.ts` | `getLogbookForClientYear` + `getLogbookTravelResult` | ✓ WIRED | Lines 14, 209-210 |
| `service.ts` | `calculation-service.ts` | `calculateNearEfilingEstimate(input, logbookResult)` second argument | ✓ WIRED | Line 213, and wrapper at 184-190 passes it through to `calculateNearEfilingIndividualTaxEstimate` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ITR-01 | 03-01, 03-02, 03-03 | Logbook result feeds the ITR12 travel schedule with correct source codes (3701/3702) and verified deduction codes, replacing the allowance×ratio estimate | ✓ SATISFIED | Full chain verified: schedule (03-01) → calculation/report (03-02) → service wiring (03-03), end-to-end integration test proves a real logbook overrides the ratio estimate |
| ITR-02 | 03-01, 03-03 | Travel deduction follows SARS method rules (deemed vs actual, claim limited to allowance where applicable); all existing schedule tests keep passing | ✓ SATISFIED | Allowance cap applied uniformly via `Math.min`; DEEMED/ACTUAL consumed verbatim from Phase 2; full 320-test suite green with zero pre-existing test modifications |

No orphaned requirements — both ITR-01 and ITR-02 are declared in plan frontmatter and mapped in REQUIREMENTS.md's traceability table to Phase 3 exclusively.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `report-transformer.ts` | 150-151 | `TODO(compliance-review)` comment above 3713/3825 placeholder rows | ℹ️ Info | Explicitly called for by plan 03-02 as an intentional, scoped deferral to Phase 7 audit backlog — not a gap in this phase's scope |

No blocker or warning anti-patterns found in any of the 9 files modified/created across this phase's 3 plans. No stub returns, no empty handlers, no console.log-only implementations.

### Human Verification Required

None. All truths, artifacts, and key links were verifiable programmatically via source inspection and an independent full test-suite run (75 files / 320 tests, all passing, executed live during this verification — not merely trusted from SUMMARY.md).

### Gaps Summary

No gaps found. Plan 03-03's executor was interrupted by a session limit after its two code/test commits (`9a0c800`, `bb028a9`), with `03-03-SUMMARY.md` and the requirements-status doc updates committed afterward by the orchestrator (`2da0405`). This verification independently re-ran the full suite from the current `HEAD` and confirmed the orchestrator's claimed 75 files / 320 tests passing figure exactly, and independently re-read every modified source file (not relying on SUMMARY.md prose) to confirm:
- `travel-schedule.ts` matches the plan's exact interface spec, byte-for-byte on the logic that matters (cap, verbatim consumption, code selection).
- The lockstep filter updates in `calculation-service.ts` and `report-transformer.ts` are present and correctly scoped to the near-eFiling path only (the legacy `calculateIndividualTax2026`'s own "4014"/"3701" lines at lines 121/145 are untouched, confirmed by function-boundary inspection).
- `service.ts`'s logbook resolution guard is a plain `if`, no try/catch, matching the plan's explicit anti-pattern warning.
- `service-logbook.test.ts` is a genuine, non-trivial integration test file (149 lines, 3 real test cases) that independently recomputes its expected values from the same service seam under test rather than hardcoding magic numbers — a pattern that resists false-positive verification.
- `git diff --stat` since the phase's first commit confirms only additive changes to two existing test files and one wholly new test file — no pre-existing test was altered, satisfying the phase's explicit "without breaking any other schedule" goal clause.

The phase goal is fully achieved: the travel schedule now uses real logbook data (capped at the allowance) instead of the ratio estimate, correctly distinguishes 3701 vs 3702, and the full regression suite proves no other schedule broke.

---

*Verified: 2026-07-03T15:16:58Z*
*Verifier: Claude (gsd-verifier)*
