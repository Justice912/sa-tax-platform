---
phase: 07-calculator-audit
plan: 05
subsystem: individual-tax-tax-tools-ui
tags: [rulepack, retirement, cgt, s11f, capital-gains-tax, per-year-labels, vitest, testing-library]

# Dependency graph
requires:
  - phase: 07-calculator-audit (plan 01)
    provides: Corrected 2027 rulepack tax brackets/rebates/thresholds -- the marginal-rate figures Retirement/CGT read via getMarginalRate() are now correct for 2027
provides:
  - "Retirement subtitle + ResultCard sub interpolate rulePack.retirement.annualCap/deductiblePercentageLimit instead of hardcoded R350,000/R350k"
  - "CGT primary-residence/death select options + Taxable Portion card interpolate rulePack.cgt.* instead of hardcoded R2m/R40k/R300k/(40%)"
  - "Per-year regression tests proving Retirement cap 350000->430000 and CGT 50k/3m/440k/40% on a 2026->2027 tax-year switch"
affects: [calculator-audit, individual-tax-tax-tools, dashboard]

tech-stack:
  added: []
  patterns:
    - "Label-only rulepack interpolation: template-literal strings built from rulePack.* values passed straight into JSX text/attributes, no new state or memoization needed since rulePack itself is already memoized on assessmentYear"
    - "DOM-level per-year regression tests render the full <TaxTools /> shell (not the isolated tab) so the real tax-year <select> and real button nav drive the year switch, proving useRulePack() context reactivity end-to-end"

key-files:
  created:
    - src/components/individual-tax/tax-tools/retirement-tab.test.tsx
    - src/components/individual-tax/tax-tools/cgt-tab.test.tsx
  modified:
    - src/components/individual-tax/tax-tools/retirement-tab.tsx
    - src/components/individual-tax/tax-tools/cgt-tab.tsx

key-decisions:
  - "Did not touch calcRetire/calcCGT -- both were already rulepack-sourced and per-year-correct per 07-RESEARCH.md; only the display strings were stale"
  - "CGT primary-residence proof test uses a gain (R2,500,000) that the 2026 R2m exclusion cannot fully absorb but the 2027 R3m exclusion can, driving cgtPayable from R82,800 to R0 -- a much stronger regression guard than only asserting the label text changed"

requirements-completed: [CALC-02, CALC-03]

# Metrics
duration: 15min
completed: 2026-07-07
---

# Phase 7 Plan 05: Retirement + CGT Per-Year Label Fixes Summary

**Interpolated `rulePack.retirement.annualCap` and `rulePack.cgt.*` into four previously-hardcoded display strings (Retirement subtitle/sub, CGT's three select options and its Taxable Portion card), and added DOM-level regression tests proving each figure and its label now update correctly when the tax year switches 2026 -> 2027.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-07T14:00Z (approx, following 07-01 completion)
- **Completed:** 2026-07-07T14:15Z
- **Tasks:** 2
- **Files modified:** 4 (2 components + 2 new test files)

## Accomplishments

- Retirement calculator's subtitle ("27.5% cap / R350,000 annual limit") and Deduction Limit card's `sub` label ("27.5% or R350k") now read `rulePack.retirement.annualCap`/`deductiblePercentageLimit` live -- both showed the wrong 2027 figure (R350k instead of R430k) before this plan.
- CGT calculator's three select options (primary-residence "Yes — R2m exclusion", disposal-on-death "No — R40k exclusion" / "Yes — R300k exclusion") and the "Taxable Portion (40%)" card label now read `rulePack.cgt.primaryResidenceExclusion`/`annualExclusion`/`deathExclusion`/`inclusionRate` live -- all four were hardcoded and wrong for 2027 (R3m/R50k/R440k) before this plan.
- New `retirement-tab.test.tsx`: proves the Deduction Limit card moves R350,000 -> R430,000 (and the subtitle/sub text moves "350" -> "430") on a tax-year switch, with income set high enough (R2,000,000) that 27.5% always exceeds the cap in both years, isolating the cap as the binding constraint.
- New `cgt-tab.test.tsx`: (1) confirms the existing 2026 worked-example math (`cgtPayable = R88,200`) is unaffected by the label changes; (2) proves the 2027 select-option and card labels literally contain the new figures (R3,000,000 / R50,000 / R440,000 / 40%); (3) a third test drives an actual R2,500,000 primary-residence gain through both years -- the 2026 R2m exclusion leaves `cgtPayable = R82,800`, while the 2027 R3m exclusion fully absorbs the gain, dropping `cgtPayable` to `R0` -- proving the larger exclusion is genuinely applied in the calculation, not just displayed.
- Full `npm test` run: **98 test files, 482 tests, all pass** (includes the parallel 07-04 executor's new provisional-tax tests, confirming no cross-file interference).

## Task Commits

Each task was committed atomically:

1. **Task 1: Retirement — interpolate the per-year cap into labels + per-year test** - `4594b0a` (fix)
2. **Task 2: CGT — interpolate per-year exclusions/inclusion into labels + per-year test** - `1495de7` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/components/individual-tax/tax-tools/retirement-tab.tsx` - Subtitle and ResultCard `sub` now interpolate `rulePack.retirement.annualCap`/`deductiblePercentageLimit` via `fmt()` instead of the literal "R350,000"/"R350k" strings; `calcRetire` untouched.
- `src/components/individual-tax/tax-tools/retirement-tab.test.tsx` - New suite: renders `<TaxTools />`, navigates to Retirement, types a high income (R2,000,000) so the cap always binds, asserts the Deduction Limit card and subtitle/sub text show R350,000/"350" at 2026 and R430,000/"430" at 2027.
- `src/components/individual-tax/tax-tools/cgt-tab.tsx` - Three select `<option>` labels and the Taxable Portion `ResultCard` label now interpolate `rulePack.cgt.*` via `fmt()`/`.toFixed(0)` instead of the literal "R2m"/"R40k"/"R300k"/"(40%)" strings; `calcCGT` untouched.
- `src/components/individual-tax/tax-tools/cgt-tab.test.tsx` - New suite: (1) reconfirms the 2026 worked-example `cgtPayable = R88,200`; (2) asserts the 2027 select options and card label contain the corrected 50k/3m/440k/40% figures; (3) drives a R2,500,000 primary-residence gain through both years to prove the R3m 2027 exclusion is actually applied in the math (cgtPayable R82,800 -> R0), not just in the label.

## Decisions Made

- Did not touch `calcRetire`/`calcCGT` — both were already rulepack-sourced and per-year-correct per `07-RESEARCH.md` sections "2. Retirement" / "3. CGT"; this plan is display-only, exactly as scoped.
- Chose a primary-residence gain amount (R2,500,000) specifically between the 2026 (R2m) and 2027 (R3m) exclusion caps so the third CGT test proves the *math*, not just the label, reacts to the year switch — the gain is only fully absorbed once the 2027 exclusion applies.

## Deviations from Plan

None — plan executed exactly as written. One label-collision issue was caught and fixed *during* test authoring (not a deviation from the plan's intent, just an implementation detail): `getByLabelText(/taxable income \(r\)/i)` matched multiple fields once the full `<TaxTools />` shell is rendered (CGT, Medical, and both Provisional Tax fields all contain "Taxable Income (R)"). Resolved by matching CGT's full label text `/taxable income \(r\) — for marginal rate/i`, which is unique across the shell. This was necessary to make the plan's own specified test-rendering approach (full `<TaxTools />`, not the isolated tab) work, not a change to what was tested.

### Process deviation (not a code deviation) — transient git-index / render race with parallel executor 07-04

07-04 (Provisional Tax logic audit) ran concurrently in the same working tree per the phase's wave design. One interim `npx vitest run` of `retirement-tab.test.tsx cgt-tab.test.tsx render-isolation.test.tsx` hit a single failure in `render-isolation.test.tsx`'s Provisional Tax case (`getByLabelText(/prior year tax assessed \(r\)/i)` not found) — this was 07-04 mid-edit on `provisional-tax-tab.tsx` at that exact moment, not a defect in this plan's changes. Re-running immediately after (and again after 07-04's final commit landed) passed cleanly; the full `npm test` run (98 files / 482 tests) confirms no residual conflict. No files owned by this plan were affected; `git status --short` before each commit showed only this plan's own files staged, and `git diff HEAD --stat` after each commit confirmed each commit contained exactly its intended files.

## Issues Encountered

None beyond the label-collision test fix and the transient parallel-executor race described above, both resolved without needing to alter the plan's scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CALC-02 and CALC-03 are now fully closed: math was already correct (Phase 1/07-01), and every displayed retirement/CGT figure and its label is now per-year-correct and rulepack-sourced, with regression tests guarding against future hardcoding regressions.
- This was the last plan (05) in Phase 7 (Calculator Audit) per `.planning/STATE.md`'s "Total Plans in Phase: 5" — after this plan's metadata commit, Phase 7 is complete pending 07-02/07-03/07-04's own summaries (already landed per `git log`).
- No blockers introduced. Pre-existing compliance sign-off flags (Medical s6B, Provisional para 19/20 mechanics, 2027 gazetted figures) remain open per STATE.md and are unaffected by this plan.

---
*Phase: 07-calculator-audit*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/retirement-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/retirement-tab.test.tsx
- FOUND: src/components/individual-tax/tax-tools/cgt-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/cgt-tab.test.tsx
- FOUND: .planning/phases/07-calculator-audit/07-05-SUMMARY.md
- FOUND commit 4594b0a (fix(07-05): interpolate per-year s11F cap into Retirement display labels)
- FOUND commit 1495de7 (fix(07-05): interpolate per-year exclusions/inclusion into CGT display labels)
