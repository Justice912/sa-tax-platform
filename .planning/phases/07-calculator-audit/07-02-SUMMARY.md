---
phase: 07-calculator-audit
plan: 02
subsystem: individual-tax-calculators
tags: [medical-credits, s6b, sars-compliance, calc-01]
dependency-graph:
  requires: []
  provides:
    - "calcMedicalCredits pure function (exported from medical-tab.tsx)"
  affects:
    - "src/components/individual-tax/tax-tools/medical-tab.tsx"
tech-stack:
  added: []
  patterns:
    - "Pure-function extraction of calculator math for direct unit-testability (no DOM/en-ZA formatting needed)"
key-files:
  created:
    - src/components/individual-tax/tax-tools/medical-tab.test.tsx
  modified:
    - src/components/individual-tax/tax-tools/medical-tab.tsx
decisions:
  - "Adopted SARS s6B interpretation: under-65 = 4x MTC + excess-contributions term + 7.5% floor; 65+/disability = 3x MTC + 33.3%, sum-then-floor, no 7.5% floor (MEDIUM confidence, sign-off #1 outstanding)"
  - "Left the 3x/4x base as the contribution-capped s6A (min(annualMTC, contributions)) rather than switching to the uncapped statutory MTC -- deferred, flagged for sign-off"
  - "Left the under-65 (contributions - 4x MTC) term un-inner-floored (only the final s6b result is floored at 0) -- deferred, flagged for sign-off"
metrics:
  duration: 15min
  completed: 2026-07-07
---

# Phase 7 Plan 02: Medical Section 6B Formula Correction Summary

Corrected the Section 6B additional medical-credit formula in `medical-tab.tsx` (under-65 3x-to-4x multiplier bug plus a missing excess-contributions term; 65+/disability floor-order fix), extracting the math into an exported, directly-unit-testable pure function `calcMedicalCredits`.

## What Was Built

**Task 1 — Correct s6B and extract medical math to an exported pure function.**
Extracted the previously inline `calcMedical` body in `medical-tab.tsx` into an exported `calcMedicalCredits(inputs, rulePack)` pure function plus an exported `MedicalCreditInputs` interface. The component's `calcMedical` now builds a `MedicalCreditInputs` object from component state (`annualContributions = monthlyContrib * 12`) and delegates to `calcMedicalCredits`. Section 6A (rulepack-sourced monthly credit, unchanged) is preserved verbatim. Section 6B corrections:
- **Under-65, no disability:** multiplier changed `3 * s6a` -> `4 * s6a`; added the previously-missing excess-contributions term so `qual = (contributions - 4*s6a) + outOfPocket - 0.075*taxableIncome`, floored at 0.
- **65+ or disability:** changed from floor-then-add (`oop + max(0, contrib - 3*s6a)`) to sum-then-floor (`max(0, (contrib - 3*s6a) + oop)`), removing the over-generous early floor on the contribution-excess term. No 7.5% floor in this branch (unchanged, correctly absent).

All JSX, ResultCards, the Highlight, and the `useEffect(setSummaryValue("medicalTotal", ...))` Dashboard-publish wiring were left untouched.

**Task 2 — Per-year s6A + per-branch s6B regression tests.**
Created `medical-tab.test.tsx` (7 tests) importing `calcMedicalCredits` directly and `getIndividualTaxRulePack` from the registry — no DOM/en-ZA formatting involved:
- s6A per-year: 2026 (2 members, 364/mo) and 2027 (2 members, 376/mo; 3 members with the 254 additional-member rate) all match hand-computed literals exactly.
- s6B under-65: worked example (deps=2, contrib=60000, oop=5000, taxableIncome=300000, 2026) proves `s6a=8736`, `s6b=1889` (4x + excess term + 7.5% floor), `total=10625` — plus a separate floor-at-0 case.
- s6B 65+/disability: worked example (deps=2, contrib=60000, oop=10000, 2026, age="65to74") proves `s6a=8736`, `s6b=14583` (3x/33.3%, sum-then-floor), `total=23319`; a second case proves the disability=true path (age="under65", disability=true) routes to the same branch and produces the identical `s6b=14583`.

All 7 new assertions passed on the first run against the hand-computed expected literals — no rounding adjustments were needed.

## Compliance Sign-Off Flag (MEDIUM confidence — research sign-off item #1)

The s6B formula implemented here is reconstructed from the SARS Additional Medical Expenses Tax Credit page plus IT07-derived third-party worked examples (07-RESEARCH.md, section "1. Medical Credits" and "Concrete Change List B"). The SARS IT07 guide PDF itself did not render for verbatim quoting during research, so this is the adopted interpretation, not a verbatim-confirmed one. **This does not block delivery** but requires practitioner sign-off before the figure is relied upon in a filed return.

Two nuances were deliberately left as-is and are flagged for that same sign-off, per the plan's explicit compliance note:

1. **Capped vs statutory MTC base.** The 3x/4x multiplier in both s6B branches is applied to the contribution-capped `s6a` (i.e. `min(annualMTC, contributions)`), not the uncapped statutory MTC. In practice contributions almost always exceed the MTC so this rarely produces a different figure, but it is technically not identical to using the raw statutory MTC as the base. Left unchanged per the plan's scope.
2. **No inner floor on the under-65 excess-contributions term.** The under-65 branch computes `(contributions - 4*s6a) + outOfPocket - 0.075*taxableIncome` as one combined quantity and floors only the final result at 0. Whether SARS intends the `(contributions - 4*s6a)` sub-term to itself be floored at 0 before adding out-of-pocket and subtracting the 7.5% threshold (rather than allowing a negative contribution-shortfall to offset out-of-pocket) was left as the plan specified — not inner-floored. Flagged for sign-off; not blocking.

## Verification

- `npx vitest run src/components/individual-tax/tax-tools/medical-tab.test.tsx` — 7/7 pass.
- `npx vitest run src/components/individual-tax/tax-tools/render-isolation.test.tsx` — 12/12 pass, including "still publishes Medical total to the Dashboard after extraction" (contrib 1000/mo, deps 1, under-65 -> total 4368). Confirmed by hand: under both the old and corrected formulas, `s6b` evaluates to 0 for this input (qual is deeply negative either way), so the invariant holds without special-casing.

## Deviations from Plan

### Auto-fixed Issues

None — the plan's task 1 code (formula correction + extraction) and task 2 code (test suite) were implemented exactly as specified, including the exact worked-example literals given in the plan, which all matched on the first test run.

### Process deviation (not a code deviation) — git index race with parallel executor 07-01

This plan runs in parallel with 07-01 and 07-03 per the phase's wave design. Twice during execution, a `git add <medical-tab.tsx>` staged by this executor was swept into a concurrent commit made by the 07-01 executor (once into `test(07-01): update rulepack.test.ts...`, then again after that commit was amended/replaced by a second 07-01 commit of the same name, which dropped medical-tab.tsx from its diff and left this plan's changes as uncommitted working-tree state again). Both times the working-tree content itself was never lost. Task 1's change was re-staged (confirming only `medical-tab.tsx` was in the index via `git status --short` immediately before committing) and committed cleanly as `45c20e1`. Task 2's test file was committed cleanly as `5e2cb4f`. No code was lost; the only casualty was commit-message attribution on the first, superseded attempt. No user action needed — documenting per the environment gotchas' race-condition note.

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/medical-tab.tsx (calcMedicalCredits exported, s6B corrected)
- FOUND: src/components/individual-tax/tax-tools/medical-tab.test.tsx (7 tests)
- FOUND commit 45c20e1 (fix(07-02): correct Section 6B medical credit formula, extract calcMedicalCredits (CALC-01))
- FOUND commit 5e2cb4f (test(07-02): add per-year s6A + per-branch s6B regression tests for medical credits)
- Verified: `git log --oneline --all | grep -E "45c20e1|5e2cb4f"` both present.
