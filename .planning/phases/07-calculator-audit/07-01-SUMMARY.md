---
phase: 07-calculator-audit
plan: 01
subsystem: individual-tax-rulepack
tags: [rulepack, 2027, budget-2026, tax-brackets, rebates, calc-06]
dependency-graph:
  requires: []
  provides:
    - "Corrected gazetted 2027 tax brackets, rebates, and age thresholds in rules-2027.ts"
    - "Per-year calcTax/getMarginalRate regression guard (calc-helpers.test.ts) proving CALC-06"
  affects:
    - "src/modules/individual-tax/rules-2027.ts"
    - "src/modules/individual-tax/rulepack.test.ts"
    - "All 2027 downstream calculators reading useRulePack() (provisional, retirement, CGT, dashboard totals)"
tech-stack:
  added: []
  patterns:
    - "Plain numeric Vitest assertions for rulepack data (no DOM/en-ZA normalizer needed)"
key-files:
  created:
    - src/components/individual-tax/tax-tools/calc-helpers.test.ts
  modified:
    - src/modules/individual-tax/rules-2027.ts
    - src/modules/individual-tax/rulepack.test.ts
decisions:
  - "[Phase 07]: Corrected 2027 rulepack tax brackets/rebates/thresholds to gazetted Budget-2026 figures (HIGH confidence, three independent sources) -- pending practitioner sign-off #4 against final SARS 2026/27 tables before release"
  - "[Phase 07]: Left 2027 medicalTaxCredit, retirement.annualCap, cgt, travelDeemedCostTable, provisionalTax byte-unchanged -- Phase 1 already verified these correct"
metrics:
  duration: 8min
  completed: 2026-07-07
---

# Phase 7 Plan 01: Rulepack 2027 Data Correction Summary

Corrected the 2027 rulepack's tax brackets, rebates and age thresholds from pre-Budget-2026 estimates to the gazetted Budget-2026 figures, updated the test that had locked the wrong values in, and added a per-year `calcTax`/`getMarginalRate` guard proving every calculator reads brackets live from the rulepack for the selected year (CALC-06).

## What Was Built

**Task 1 — Corrected `rules-2027.ts`.** Replaced the `taxBrackets`, `rebates`, and `thresholds` blocks with the gazetted Budget-2026 2026/27 values from `07-RESEARCH.md`:
- Tax brackets: ceilings 245,100 / 383,100 / 530,200 / 695,800 / 887,000 / 1,878,600 (removing the fabricated 6th boundary at 1,578,100 that never existed in the gazette); base-tax chain 0 / 44,118 / 79,998 / 125,599 / 185,215 / 259,783 / 666,339; rates unchanged (18/26/31/36/39/41/45%).
- Rebates: primary 17,820, secondary 9,765, tertiary 3,249 (was 18,395/10,077/3,356).
- Thresholds: under65 99,000, age65To74 153,250, age75Plus 171,300 (was 104,758/162,689/182,850).
- `medicalTaxCredit` (376/254), `retirement.annualCap` (430,000), `cgt` (50k/440k/3m/40%), `interestExemption`, `travelDeemedCostTable`, `provisionalTax`, `periodStart/End`, `sourceReference` all left byte-unchanged — Phase 1 already verified these correct.

**Task 2 — Updated `rulepack.test.ts`.** The `"uses the published 2027 bracket and rebate updates"` test previously asserted the WRONG estimates (locking the bug in). Swapped its `max`, `rebates`, and `thresholds` expectations to the corrected figures above. `medicalTaxCredit`, `retirement.annualCap`, and `cgt` assertions were left unchanged (already correct, unweakened).

**Task 3 — New `calc-helpers.test.ts` (CALC-06 guard).** Created a new suite importing `calcTax`/`getMarginalRate` from `calc-helpers.ts` and `getIndividualTaxRulePack` from the registry, proving the shared calc functions are year-sourced, not constant:
- `calcTax(2025, 500000)` = 117,507 vs `calcTax(2027, 500000)` = 116,237 — asserted unequal.
- `getMarginalRate(2025, 880000)` = 0.41 vs `getMarginalRate(2027, 880000)` = 0.39 (the R887,000 boundary moved up in 2027, so the same taxable income now falls one bracket lower) — asserted unequal.
- Sanity check: `getIndividualTaxRulePack(2027).rebates.primary` = 17,820.

All expected literals were hand-verified against the `baseTax + (taxable - min + 1) * rate` formula before writing the test and matched exactly on the first run — no rounding adjustments were needed.

## Verification

- `npx vitest run src/modules/individual-tax/rulepack.test.ts src/modules/individual-tax/rulepack-completeness.test.ts src/components/individual-tax/tax-tools/calc-helpers.test.ts` — 24/24 pass.
- Full suite `npm test` — **95 test files, 472 tests, all pass** (includes the parallel 07-02/07-03 executors' new test files, and confirms `calculation-service.test.ts`'s loose `toBeGreaterThan` bounds and `schedules.test.ts`'s interest-exemption-only assertion were unaffected by the data fix, as anticipated by the plan).
- Manual diff confirmed medical (376/254), retirement cap (430000), CGT (50000/440000/3000000/0.40), and `travelDeemedCostTable` in `rules-2027.ts` are byte-unchanged from before this plan.

## Compliance Sign-Off Flag (HIGH confidence, pending practitioner confirmation — research sign-off item #4)

The corrected 2027 bracket/rebate/threshold values are **HIGH confidence**, corroborated by three independent sources cited in `.planning/phases/07-calculator-audit/07-RESEARCH.md` (SARS "Rates of Tax for Individuals", SARS Budget 2026 FAQ, and ftomasek.com's independent third-party SA income tax rate table). This is the reference table and Concrete Change List A of that research document. **Per research sign-off item #4, a practitioner should confirm these figures against the final published SARS 2026/27 tax tables before this reaches production/release** — this plan does not block on that confirmation; instead the corrected values are now encoded as hard test expectations (`rulepack.test.ts` + the new `calc-helpers.test.ts` guard), so any future drift back to the wrong pre-Budget estimates fails the build loudly rather than silently corrupting output.

## What This Unblocks

Because every one of the seven tax-tools calculators reads brackets/rebates/thresholds live via `useRulePack()` → `calc-helpers.ts`, this single data fix corrects **all** 2027 output across the app simultaneously:
- **Provisional tax** (`fullTax = calcTax(rulePack, estTaxable) - rebates.primary`) now computes the correct 2027 `fullTax` and rebate offset — this was previously overstating both the bracket-derived tax and the rebate deduction.
- **Retirement** and **CGT** marginal-rate-of-saving figures (`getMarginalRate(rulePack, taxable)`) now report the correct 2027 marginal bracket, since the bracket ceilings (particularly the R887,000 boundary, previously fabricated at R1,578,100/R1,817,000) were wrong.
- **Dashboard** bracket/rebate-derived totals for the 2027 year are now correct at the data source, closing CALC-06.
- Unblocks correct-baseline 2027 regression tests for the remaining Phase 7 plans (07-04 Provisional Tax logic audit, 07-05 Retirement/CGT label fixes) — they can now assert against the real gazetted figures instead of the pre-Budget estimates.

## Deviations from Plan

### Auto-fixed Issues

None — all three tasks were implemented exactly as specified in the plan, with the exact literal values given in the plan (rules-2027.ts data, rulepack.test.ts assertions, and calc-helpers.test.ts expected numbers) all matching on the first test run with no adjustments needed.

### Process deviation (not a code deviation) — git index races with parallel executors 07-02/07-03

This plan runs in parallel (wave 1) with 07-02 (Medical) and 07-03 (Rental/Home Office) per the phase's wave design. During Task 2's commit, a bare `git commit` (after staging only `rulepack.test.ts`) twice swept up files that a concurrent executor had staged in the shared index at that moment (`medical-tab.tsx` from 07-02, then `rental-tab.test.tsx` from 07-03). Both times this was caught immediately via `git show --stat HEAD` after committing, resolved with `git reset --soft HEAD~1` (which restores the index without touching the working tree), unstaging the other executor's file with `git restore --staged <file>`, and re-committing with an explicit pathspec (`git commit ... -- <exact file>`) to guarantee only the intended file was captured. No code was lost in either case — the swept-in files remained fully intact in the working tree/index for their own executor to stage and commit normally afterward (confirmed: both 07-02 and 07-03's own SUMMARY.md files independently document the same race from their side, and both landed their own clean commits). All three of this plan's task commits (`e8b79a7`, `6fb32f0`, `be384b4`) contain exactly the one file each was meant to contain, confirmed via `git show --stat` on each. No user action needed.

The reverse also happened once at the STATE.md metadata stage: after this plan's `gsd-tools state` commands wrote its metrics/decisions to the on-disk `.planning/STATE.md` (uncommitted), the 07-03 executor's own final docs commit (`102cf19`) ran moments later and its broader `git add` swept up this plan's already-written STATE.md content before this plan reached its own final commit step. Verified via `git diff HEAD -- .planning/STATE.md` (empty — content already matches HEAD) and `git show 102cf19 -- .planning/STATE.md` (confirms both of this plan's decision lines and its metrics row are present in that commit). No content was lost or needs re-committing; only commit-message attribution differs from what this plan would have produced. This plan's final commit therefore covers only `SUMMARY.md`, `ROADMAP.md`, and `REQUIREMENTS.md` (STATE.md intentionally omitted — nothing left to stage).

## Self-Check: PASSED

- FOUND: src/modules/individual-tax/rules-2027.ts (bracket-1 max 245100, rebates.primary 17820, thresholds.under65 99000)
- FOUND: src/modules/individual-tax/rulepack.test.ts (assertions updated to corrected values)
- FOUND: src/components/individual-tax/tax-tools/calc-helpers.test.ts (3 tests, CALC-06 guard)
- FOUND commit e8b79a7 (fix(07-01): correct 2027 rulepack brackets, rebates and thresholds to gazetted Budget-2026 figures)
- FOUND commit 6fb32f0 (test(07-01): update rulepack.test.ts 2027 assertions to corrected Budget-2026 values)
- FOUND commit be384b4 (test(07-01): add per-year calc-helpers guard proving rulepack-sourced brackets (CALC-06))
