---
phase: 07-calculator-audit
plan: 04
subsystem: individual-tax-calculators
tags: [provisional-tax, para-19, para-20, safe-harbour, rulepack, calc-04]

# Dependency graph
requires:
  - phase: 07-01
    provides: "Corrected 2027 rulepack tax brackets/rebates/thresholds (bracket-1 max 245100, primary rebate 17820)"
provides:
  - "Real para-19 basic amount (prior-year taxable income + 8%/18-month simple escalation) using existing rulepack fields"
  - "Corrected para-20 safe-harbour floor as a taxable-income figure: lesser of basic amount or 90% of estimate at/below R1m, 80% above"
  - "P2 payment nets off the P1 payment already made"
  - "Per-year + R1m-boundary + escalation + P2-nets-P1 regression suite for ProvisionalTaxTab"
  - "render-isolation.test.tsx provisional branch-orientation case reconciled to the new model"
affects: [individual-tax-calculators, provisional-tax-tab, render-isolation-suite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Boolean form fields modelled as yes/no <select> bound to a state boolean (matches CGT tab's primaryRes/death pattern)"
    - "Per-year divergence proof computed inline via calcTax(getIndividualTaxRulePack(year), est) rather than hand-derived literals, so the test documents its own arithmetic"

key-files:
  created:
    - src/components/individual-tax/tax-tools/provisional-tax-tab.test.tsx
  modified:
    - src/components/individual-tax/tax-tools/provisional-tax-tab.tsx
    - src/components/individual-tax/tax-tools/render-isolation.test.tsx

key-decisions:
  - "Removed the priorTax input/state entirely (not kept as inert display) — it played no role in the corrected para-20 math and its removal simplifies the form"
  - "First Period Payment field always rendered (not conditionally shown only for P2) — keeps the component's existing always-visible-fields pattern and avoids conditional-rendering complexity not required by the plan"
  - "Basic Amount ResultCard added; grid changed from 3 to 4 cards (2x2) to fit the new card without cramming a 5th column"

requirements-completed: [CALC-04]

# Metrics
duration: 12min
completed: 2026-07-07
---

# Phase 7 Plan 04: Provisional Tax Para 19/20 Rework Summary

**Reworked the Provisional Tax estimator from a broken "prior-year tax × 0.9/0.8" heuristic into a real SARS para 19 (basic amount, 8%/18-month escalation) + para 20 (taxable-income safe-harbour floor, lesser-of logic, P2 nets P1) model, fully pinned by a new regression suite plus a reconciled render-isolation branch-orientation guard.**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-07-07
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **Para 19 basic amount is now real.** `priorTaxable` (previously captured but unused) now drives `basicAmount`, escalated 8% (simple, not compound) via `rulePack.provisionalTax.basicAmountEscalationRate` only when the new `latestAssessmentOver18Months` checkbox-select is "yes".
- **Para 20 safe-harbour floor corrected to a taxable-income figure.** The old code multiplied prior-year *tax* by 0.90/0.80; it now computes `safeHarbourTaxableIncome` as `min(basicAmount, 0.9 × estimate)` at/below R1,000,000 and `0.8 × estimate` above R1,000,000 (basic-amount option correctly falls away above the threshold) — both the threshold and the two percentages are read live from `rulePack.provisionalTax`.
- **P2 now nets off P1.** A new `firstPayment` input feeds `payment = max(0, netTax - paye - firstPayment)` for the second period, replacing the old `max(0, netTax - paye)` that silently ignored money already paid.
- **2027 full-year tax reads the corrected 2027 brackets/rebate** (07-01 dependency) — proven live by switching the tax-year selector inside `<TaxTools />` and asserting the computed 2027 `fullTax` diverges from the 2026 figure for the same estimated taxable income.
- **Branch-orientation regression guard preserved.** The pre-existing render-isolation "safe-harbour branch orientation" case (which asserted the OLD `priorTax × 0.9/0.8` = 90000/80000 model) was rewritten to prove the SAME 0.90-at/below-R1m-vs-0.80-above orientation under the NEW taxable-income floor model (`priorTaxable=2,000,000` so the basic amount never binds; 450000/1200000). Every other test in that file is byte-identical.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement para 19 basic amount + para 20 taxable-income safe harbour + P2-nets-P1** - `7e93029` (feat)
2. **Task 2: Add per-year + R1m boundary + escalation + P2-nets-P1 regression tests** - `5189863` (test)
3. **Task 3: Reconcile the render-isolation provisional safe-harbour case to the new model** - `107f02e` (test)

**Plan metadata:** (this commit, following STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified

- `src/components/individual-tax/tax-tools/provisional-tax-tab.tsx` - Reworked `calcProv`: real basic amount + escalation, taxable-income safe-harbour floor, P2 nets P1, penalty-exposure-driven risk band; UI gained "Latest Assessment Older Than 18 Months?" select, "First Period Payment Already Paid (R)" input, and a "Basic Amount" ResultCard; removed the now-unused "Prior Year Tax Assessed (R)" input/state.
- `src/components/individual-tax/tax-tools/provisional-tax-tab.test.tsx` - New suite: R1m boundary/branch-orientation, basic-amount-binding case, 8%/18-month escalation, P2-nets-P1 (literal 100632 derived and asserted), and the 2027-vs-2026 full-tax divergence proof (rebate 17820 asserted directly).
- `src/components/individual-tax/tax-tools/render-isolation.test.tsx` - Reconciled only the one "safe-harbour branch orientation" test case to the new model (450000/1200000 instead of 90000/80000); every other case in the file untouched.

## Decisions Made

- Removed the `priorTax` input/state entirely rather than keeping it as inert display — it had no remaining role once the safe-harbour comparison moved to taxable income, and the plan explicitly permitted removal.
- Kept "First Period Payment Already Paid (R)" always visible (not conditionally rendered only in P2) to match the component's existing pattern of always-mounted fields and to keep the form simple to test.
- Changed the ResultCard grid from `grid-cols-3` (3 cards) to `grid-cols-2` (4 cards, 2x2) to fit the new "Basic Amount" card without a lopsided 5-column row.

## Deviations from Plan

None — all three tasks were implemented exactly as specified in the plan. Every literal in Task 2's test suite (450000, 1200000, 300000, 540000/500000, 100632) matched hand arithmetic on the first `vitest` run with no adjustments needed. The 2027-divergence test computes its expected values inline via `calcTax(getIndividualTaxRulePack(year), est)` rather than hardcoding literals, so it is self-verifying against the 07-01 rulepack fix rather than restating it.

## Compliance Sign-Off Flag — Sign-off #2 (MEDIUM confidence, not blocking)

Per `07-RESEARCH.md` "4. Provisional Tax" and Concrete Change List C, this plan implements a **defensible reconstruction** of para 19/20 mechanics using the rulepack's existing fields, pinned by tests — but two aspects remain MEDIUM confidence pending a practitioner's review against the primary SARS guides (the GEN-PT-01-G01 Guide for Provisional Tax and Interpretation Note 1 Issue 3 PDFs did not render for verbatim quoting during research):

1. **Single-step 8% escalation past 18 months.** The model applies one flat 8% uplift to the basic amount whenever `latestAssessmentOver18Months` is true. SARS's actual mechanic may compound or step multiple 8% increments for assessments substantially older than 18 months (e.g., 24+ months) rather than a single flat uplift — this plan deliberately implements only the single-step case (per the plan's explicit scope) and defers multi-year escalation.
2. **"Actual taxable income" approximated by the estimate.** SARS's para 20 safe-harbour test technically compares the second-period *estimate* against the *actual* taxable income determined on final assessment (only known after the year ends). In an estimator UI, "actual" cannot exist yet, so this implementation uses the user's own `estimatedTaxable` figure as a stand-in for "actual" wherever the safe-harbour comparison needs a taxable-income base — this is the standard approximation for a self-assessment planning tool, but it means the tool's risk/penalty-exposure output is only as good as the user's own estimate, not a true post-assessment reconciliation.

This does not block merge — the mechanics are now testable, testable-by-design, and materially more correct than the pre-existing `priorTax × 0.9/0.8` heuristic that ignored the basic amount entirely. Recommend folding into the same practitioner review as research sign-off items #1 (medical s6B) and #4 (2027 rulepack data).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CALC-04 requirement complete; ProvisionalTaxTab now reads all para 19/20 inputs from the rulepack per year, with a regression suite pinning the R1m boundary, escalation, and P2-netting mechanics.
- All 17 tests across `provisional-tax-tab.test.tsx` (5) and `render-isolation.test.tsx` (12) pass; full `npm test` run confirms 98 test files / 482 tests pass with no regressions from this plan's changes (parallel executor 07-05's Retirement/CGT label-fix commits landed cleanly alongside, no git-index collisions on this plan's three commits — verified via `git diff HEAD --stat` after each).
- Remaining Phase 7 compliance sign-offs (#1 medical s6B, #2 provisional para 19/20 — this plan, #4 2027 rulepack data) should be reviewed together by a practitioner before production release; none block further development.

---
*Phase: 07-calculator-audit*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/provisional-tax-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/provisional-tax-tab.test.tsx
- FOUND: src/components/individual-tax/tax-tools/render-isolation.test.tsx
- FOUND: .planning/phases/07-calculator-audit/07-04-SUMMARY.md
- FOUND commit 7e93029 (feat(07-04): implement para 19 basic amount + para 20 taxable-income safe harbour + P2-nets-P1)
- FOUND commit 5189863 (test(07-04): add per-year + R1m boundary + escalation + P2-nets-P1 regression tests)
- FOUND commit 107f02e (test(07-04): reconcile render-isolation provisional case to the taxable-income safe-harbour floor)
