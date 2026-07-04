---
phase: 05-component-decomposition
plan: 05
subsystem: ui
tags: [react, context, nextjs, refactor, individual-tax, tax-tools, vitest, react-profiler]

# Dependency graph
requires:
  - phase: 05-component-decomposition
    provides: "RulePackContext, two-context write-only SummaryContext, hidden-mounted tab pattern, useSummaryWriter()-only publish convention, and the render-isolation test shape established in plans 05-02/05-03/05-04"
provides:
  - "tax-tools/medical-tab.tsx: MedicalTab standalone component with colocated med state, verbatim calcMedical math (s6A rulepack-sourced via rulePack.medicalTaxCredit.*, s6B hardcoded multipliers/3x term left untouched per Phase 7 out-of-scope note), reading useRulePack(); publishes medicalTotal via useSummaryWriter()"
  - "tax-tools/provisional-tax-tab.tsx: ProvisionalTaxTab standalone component with colocated prov state, verbatim calcProv math including the Phase-1-corrected safe-harbour ternary (0.90 at/below R1m threshold, 0.80 above) preserved character-for-character, reading rulePack.provisionalTax.* and calcTax(rulePack, estTaxable) from calc-helpers via useRulePack(); no summary publish (not a Dashboard total)"
  - "tax-tools/render-isolation.test.tsx extended: Profiler-verified Medical/Provisional render isolation, a safe-harbour branch-orientation spot-check (2026, R1,000,000 threshold, proving both the 0.90 and 0.80 branches survived extraction), and a Dashboard medicalTotal-flow proof"
  - "Shell (tax-tools.tsx) with med/prov state, calcMedical/calcProv, medResult/provResult, the medicalTotal publish effect, and the now-unused calcTax import removed; renders MedicalTab/ProvisionalTaxTab via always-mounted CSS-hidden wrappers"
affects: [05-component-decomposition (remaining wave(s): travel logbook), individual-tax UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verbatim-preservation extraction under explicit dual constraints: Medical's s6B hardcoded multipliers (0.333/0.25/0.075/3x) are simultaneously copied unchanged (Phase 7 CALC-01 scope, not this phase's concern) while s6A is rulepack-sourced -- proving an extraction can mix 'leave this constant alone' and 'read this from context' within the same calculator without conflating the two"
    - "Branch-orientation regression test: rather than only checking a single safe-harbour output value, the spot-check exercises both sides of the ternary (estTaxable at/below vs above the R1,000,000 threshold) against known priorTax, so a mechanical 'tidy' that swaps the ternary's branch order (the exact Phase-1 bug this plan's constraint calls out) would flip 90,000<->80,000 and fail loudly"
    - "Provisional Tax is the second extracted calculator (after CGT) with zero useSummaryWriter() coupling -- it never appears on the Dashboard, consistent with the established pattern of only wiring a publish effect where a Dashboard StatCard actually consumes the value"

key-files:
  created:
    - src/components/individual-tax/tax-tools/medical-tab.tsx
    - src/components/individual-tax/tax-tools/provisional-tax-tab.tsx
  modified:
    - src/components/individual-tax/tax-tools.tsx
    - src/components/individual-tax/tax-tools/render-isolation.test.tsx

key-decisions:
  - "Medical and Provisional Tax extracted together as the phase's second rulepack-dependent pair, both carrying prior-phase correctness content (Medical's untouched-by-design s6B formula constants, Provisional's Phase-1-corrected safe-harbour orientation) that must survive a mechanical move without being 're-cleaned'"
  - "Added a Dashboard medicalTotal-flow test beyond the plan's explicit task-3 test list, mirroring 05-04's retirementHeadroom-flow test, to give the must-have truth 'Medical total still flows to the Dashboard' its own automated proof rather than relying solely on tsc/build/manual verification"
  - "Safe-harbour spot-check asserts both ternary branches (0.90 at/below R1m, 0.80 above) in one test against a fixed priorTax, rather than two separate output-preservation assertions, so the specific Phase-1 regression (branch orientation swap) is caught directly instead of indirectly"

requirements-completed: [PERF-01]

# Metrics
duration: 9min
completed: 2026-07-04
---

# Phase 05 Plan 05: Medical Credits and Provisional Tax Extraction Summary

**Extracted Medical Tax Credits and Provisional Tax calculators into standalone, colocated-state components reading rulepack rates via `useRulePack()`, preserving the Phase-1-corrected safe-harbour ternary orientation and the Phase-7-out-of-scope s6B hardcoded formula constants character-for-character, with a dedicated regression test proving the safe-harbour branch orientation survived the move.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-04T17:14:40+02:00 (approx., following 05-04 completion)
- **Completed:** 2026-07-04T17:23:32+02:00
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Created `tax-tools/medical-tab.tsx`: `MedicalTab` owns its own `med` state and computes `medResult` via the verbatim `calcMedical` math — Section 6A reads `rulePack.medicalTaxCredit.{firstTwoMembersPerMonth,additionalMemberPerMonth}` through `useRulePack()`, while Section 6B's hardcoded multipliers (0.333/0.25), the 7.5%-of-taxable-income threshold, and the `3 * s6a` term are left byte-identical per the plan's explicit Phase 7 (CALC-01) out-of-scope note; publishes `medResult.total` to `medicalTotal` via `useSummaryWriter()` for the Dashboard
- Created `tax-tools/provisional-tax-tab.tsx`: `ProvisionalTaxTab` owns its own `prov` state and computes `provResult` via the verbatim `calcProv` math, most critically the safe-harbour ternary `estTaxable > pt.safeHarbourTaxableIncomeThreshold ? priorTax * pt.safeHarbourActualPctAboveThreshold : priorTax * pt.safeHarbourBasicAmountOrActualPctBelowThreshold` moved character-for-character (no reordering, no branch-orientation change) — this ternary carries the Phase-1 fix (0.90 at/below R1m, 0.80 above per SARS para 20); also preserves `fullTax = calcTax(rulePack, estTaxable) - rulePack.rebates.primary` (imported from `calc-helpers`), the P1/P2 payment split, and the `payment < safeHarbour * 0.8` risk-band heuristic unchanged; no summary publish since Provisional Tax is not one of the five Dashboard totals
- Rewired `tax-tools.tsx`: removed the `med`/`prov` `useState` blocks, `calcMedical`/`calcProv` functions, `medResult`/`provResult` consts, the `medicalTotal` summary-publish `useEffect`, and the now-orphaned `calcTax` import; the two inline `{tab === "medical" && (...)}` / `{tab === "provisional" && (...)}` blocks became always-mounted, CSS-hidden wrappers rendering `<MedicalTab />` / `<ProvisionalTaxTab />`
- Extended `render-isolation.test.tsx` with a new `"Medical/Provisional render isolation"` describe block containing three tests: (1) Profiler-verified isolation — typing into Medical's monthly-contribution field never fires ProvisionalTaxTab's `onRender`; (2) a safe-harbour branch-orientation spot-check — with `priorTax` fixed at 100,000, `estimatedTaxable = 500,000` (at/below the 2026 R1,000,000 threshold) asserts the displayed Safe Harbour equals `fmt(90000)` (the 0.90 basic/below branch), then switching to `estimatedTaxable = 1,500,000` (above threshold) asserts it flips to `fmt(80000)` (the 0.80 actual/above branch) — a mechanical ternary "tidy" that swapped branch orientation would instead show 90,000 for the above-threshold case, so this test catches exactly the Phase-1 regression the plan's constraint warns about; (3) a Dashboard-flow proof — typing a monthly contribution into Medical, navigating to the Dashboard via the real nav button, and confirming the published `medicalTotal` (`fmt(4368)`) renders there
- Verified zero behaviour change: `tsc --noEmit` shows no new errors on any touched/created file (only the same pre-existing, unrelated test-file errors from earlier plans — confirmed via grep for the touched filenames, zero matches), full suite grew from 84→84 files (unchanged count, extended existing file) / 422→425 tests all green, and `npm run build` (Turbopack) compiles successfully including the `/individual-tax/tools` route

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract MedicalTab** - `21f48ca` (feat)
2. **Task 2: Extract ProvisionalTaxTab (preserve safe-harbour orientation verbatim)** - `8a846ae` (feat)
3. **Task 3: Wire both tabs into the shell, extend isolation test, and spot-check safe-harbour** - `51f2c2e` (refactor)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/components/individual-tax/tax-tools/medical-tab.tsx` - `MedicalTab`: colocated `med` state, verbatim `calcMedical` (s6A rulepack-sourced, s6B untouched), publishes `medicalTotal`
- `src/components/individual-tax/tax-tools/provisional-tax-tab.tsx` - `ProvisionalTaxTab`: colocated `prov` state, verbatim `calcProv` including the Phase-1-corrected safe-harbour ternary, no summary publish
- `src/components/individual-tax/tax-tools/render-isolation.test.tsx` - Added Profiler isolation, safe-harbour branch-orientation spot-check, and Dashboard medicalTotal-flow tests for Medical/Provisional
- `src/components/individual-tax/tax-tools.tsx` - Removed `med`/`prov` state, `calcMedical`/`calcProv`, their result consts, the `medicalTotal` publish effect, and the orphaned `calcTax` import; medical/provisional JSX blocks replaced by hidden-mounted wrappers rendering the new components

## Decisions Made
- Medical and Provisional Tax extracted together as the phase's second rulepack-dependent pair, both explicitly carrying prior-phase correctness content that must not be "cleaned up" during the mechanical move
- Added an automated Dashboard medicalTotal-flow test (mirroring 05-04's retirementHeadroom-flow test) beyond the plan's explicit task-3 test list, to give the must-have truth "Medical total still flows to the Dashboard" its own regression coverage
- The safe-harbour spot-check asserts both ternary branches in a single test against one fixed `priorTax`, directly targeting the specific Phase-1 branch-orientation regression called out in the plan's constraints (research Pitfall 4), rather than only checking output-preservation for one input set

## Deviations from Plan

### Auto-added Test Coverage

**1. [Rule 2 - Missing Critical] Added Dashboard medicalTotal-flow test**
- **Found during:** Task 3
- **Issue:** The plan's must_haves truths list "Medical total still flows to the Dashboard" and the top-level verification section states "Dashboard medical total still correct," but task 3's explicit action list only called for a Profiler isolation test and a safe-harbour spot-check — leaving that specific must-have truth without a dedicated automated assertion (following the 05-04 precedent where a comparable Retirement-headroom-flow test was written).
- **Fix:** Added a test that types a monthly medical contribution into `MedicalTab` via the full `<TaxTools />` shell, navigates to the Dashboard via the real nav button, and asserts the published `medicalTotal` (`fmt(4368)`) renders there.
- **Files modified:** src/components/individual-tax/tax-tools/render-isolation.test.tsx
- **Verification:** Test passes as part of the full `npm test` run (425/425 green).
- **Committed in:** 51f2c2e (Task 3 commit)

---

**Total deviations:** 1 auto-added (test coverage matching an existing must-have truth and prior-plan precedent)
**Impact on plan:** Strengthens verification of an already-declared must-have; no scope creep, no architectural change.

## Issues Encountered

None. `npx tsc --noEmit` continues to surface the same pre-existing, unrelated test-file errors documented in prior 05-0x summaries (confirmed unrelated to any file touched in this plan by grepping the full tsc output for touched filenames — zero matches).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The rulepack-dependent extraction pattern (colocated state + verbatim math reading `useRulePack()` + CSS-hide mount + optional `useSummaryWriter()`-only publish + Profiler-verified isolation + regression spot-check where prior-phase correctness fixes are involved) is now proven for four calculators (CGT, Retirement, Medical, Provisional Tax) with two more non-rulepack-dependent ones (Rental, Home Office) done earlier — 6 of 8 calculators extracted
- Travel Logbook remains the sole shell-owned calculator in `TaxToolsInner`, including its deemed-cost calculation (`getDeemedRate`), trip CRUD/import/export state, and the monthly chart — the final wave continues the same extraction pattern for it
- No blockers identified

---
*Phase: 05-component-decomposition*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/medical-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/provisional-tax-tab.tsx
- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND: src/components/individual-tax/tax-tools/render-isolation.test.tsx
- FOUND commit: 21f48ca
- FOUND commit: 8a846ae
- FOUND commit: 51f2c2e
