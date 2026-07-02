---
phase: 01-rulepack-extension
verified: 2026-07-02T17:20:22Z
status: passed
score: 4/4 must-haves verified
---

# Phase 1: Rulepack Extension Verification Report

**Phase Goal:** Every per-year SARS constant a calculator needs (travel deemed-cost brackets, medical credits, retirement cap, CGT exclusions, provisional tax thresholds) lives in the rulepack, verified for 2025/2026/2027, with no hardcoded tables left in components.
**Verified:** 2026-07-02T17:20:22Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Selecting 2025/2026/2027 in a calculator produces figures matching the official SARS PAYE-GEN-01-G03-A01 deemed-cost schedule for that year | VERIFIED | `rules-2025.ts`, `rules-2026.ts`, `rules-2027.ts` each carry a 9-bracket `travelDeemedCostTable` transcribed verbatim from the plan's verified SARS data (Rev 17/18/19). `tax-tools.tsx` resolves `sRate = getDeemedRate(rulePack, vVal)` and displays `fixedCostAnnual`/`fuelCostPerKm`/`maintenanceCostPerKm` directly, with no `* 12` monthly-conversion bug. `rulepack-completeness.test.ts` pins exact spot-check values per year (18 tests, all pass). |
| 2 | 2027 rulepack reflects s11F cap R430,000, CGT annual exclusion R50,000, primary residence exclusion R3,000,000 | VERIFIED | `rules-2027.ts` lines 34-43: `retirement.annualCap: 430000`, `cgt.annualExclusion: 50000`, `cgt.primaryResidenceExclusion: 3000000`, `cgt.deathExclusion: 440000` (same verified change set). Confirmed by both `rulepack.test.ts` ("uses the published 2027 bracket and rebate updates") and `rulepack-completeness.test.ts` ("2027 Budget-2026 completeness"). |
| 3 | No tax-tools component contains a hardcoded rate table — all values trace back to rulepack-registry.ts | VERIFIED | `grep -nE "TAX_BRACKETS\|REBATES\|MEDICAL_CREDITS\|DEEMED_COST_TABLE\|CGT_EXCLUSION\|CGT_DEATH_EXCLUSION\|CGT_PRIMARY_RES\|CGT_INCLUSION_RATE\|RETIRE_PERCENT\|RETIRE_CAP" tax-tools.tsx` returns zero matches. All calculator sections (medical, retirement, CGT, provisional, deemed-cost) read via `rulePack.medicalTaxCredit.*`, `rulePack.retirement.*`, `rulePack.cgt.*`, `rulePack.provisionalTax.*`, `rulePack.travelDeemedCostTable`. The only remaining bare numeric literal (`* 0.8` in the risk-band heuristic at line 477) is a documented, plan-approved UI heuristic, not a SARS rate. Other individual-tax components (`estimate-result.tsx`, `estimate-wizard.tsx`) contain zero rate literals. |
| 4 | A rulepack-completeness test fails the build if any year's table is missing, duplicated, or a placeholder | VERIFIED | `rulepack-completeness.test.ts` exists (149 lines) with 18 tests across 7 groups: presence, structural validity (contiguous/non-overlapping brackets, sanity ranges), distinctness (anti-copy-paste `not.toEqual` pairwise for 2025/2026/2027), year-anchored spot checks, 2027 Budget-2026 completeness, provisional-tax values, and 2024 structural-only check. Plan 01-02's SUMMARY documents two live mutation tests (copied 2026↔2025 table, unconverted-cents value) that were proven to fail the gate before being reverted — this is direct evidence the gate is not just present but functionally effective. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/modules/individual-tax/types.ts` | `TravelDeemedCostBracket`, `ProvisionalTaxRules` interfaces; `IndividualTaxRulePack` extended with required `travelDeemedCostTable`/`provisionalTax` | VERIFIED | Both interfaces present (lines 142-167); both fields added as required (not optional) on `IndividualTaxRulePack` (lines 203-204). |
| `src/modules/individual-tax/rules-2025.ts` | Rev 17 travel table + provisionalTax | VERIFIED | 9-bracket table, exact values match plan; `provisionalTax` block present; `sourceReference` extended. |
| `src/modules/individual-tax/rules-2026.ts` | Rev 18 travel table + provisionalTax | VERIFIED | 9-bracket table, exact values match plan; `provisionalTax` block present; `sourceReference` extended. |
| `src/modules/individual-tax/rules-2027.ts` | Corrected retirement/CGT + Rev 19 travel table (R115k brackets) + provisionalTax | VERIFIED | `annualCap: 430000` confirmed; 9-bracket table with R115,000 increments (115000/230000/.../920000); `provisionalTax` block present. |
| `src/modules/individual-tax/rules-2024.ts` | Compile-safe carried fields, loudly flagged unverified | VERIFIED (not directly re-read this pass, confirmed via passing completeness test's "2024 structural safety only" group and prior file existence) | Non-empty `travelDeemedCostTable`/`provisionalTax` confirmed indirectly via test pass. |
| `src/modules/individual-tax/rulepack-completeness.test.ts` | Build-gate completeness test | VERIFIED | 149 lines (exceeds 60-line minimum), contains `travelDeemedCostTable`, imports from `rulepack-registry`, 18 passing tests. |
| `src/components/individual-tax/tax-tools.tsx` | Year-selector-driven, rulepack-sourced calculators | VERIFIED | Contains `getIndividualTaxRulePackByYear`, year `<select>` with exactly 2025/2026/2027 options defaulting to 2026, all 8 calculators re-sourced. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `rules-2027.ts` | `types.ts` | `IndividualTaxRulePack` required-field type-forcing | WIRED | `npx tsc --noEmit` produces zero errors attributable to any rules-*.ts file or types.ts. |
| `rulepack.test.ts` | `retirement.annualCap` | year-aware assertion | WIRED | Line 26: `rulepack.retirement.annualCap === (rulepack.assessmentYear === 2027 ? 430000 : 350000)` — confirmed passing (3/3 tests in file). |
| `rulepack-completeness.test.ts` | `rulepack-registry.ts` | `getIndividualTaxRulePack` import | WIRED | Line 2-4: imported and used throughout 18 tests, all passing. |
| `tax-tools.tsx` | `rulepack-registry.ts` | `getIndividualTaxRulePackByYear(assessmentYear)` from selector state | WIRED | Line 4 import, line 172 `const rulePack = getIndividualTaxRulePackByYear(assessmentYear)`, state driven by `<select>` at lines 693-708. |
| tax year `<select>` | all 8 calculators | `rulePack` passed into `calcTax`/`getMarginalRate`/`getDeemedRate`/direct field access | WIRED | Confirmed field-level usage: medical (391-392), retirement (418-419), CGT (439-444), provisional (466, 471-475), deemed-cost (378-381, 1394-1408). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RULE-01 | 01-01, 01-02 | 2025/2026/2027 rulepacks contain verified per-year deemed-cost travel tables from PAYE-GEN-01-G03-A01 | SATISFIED | Tables populated and pinned by `rulepack-completeness.test.ts` spot checks; REQUIREMENTS.md marks Complete. |
| RULE-02 | 01-01 | Rulepacks carry 2027 changes: s11F cap R430,000, CGT annual exclusion R50,000, primary residence R3,000,000 | SATISFIED | `rules-2027.ts` verified directly; REQUIREMENTS.md marks Complete. |
| RULE-03 | 01-03 | All tax-tools calculators read rates from the rulepack for user-selected tax year; no hardcoded tax tables in components | SATISFIED | `tax-tools.tsx` verified free of hardcoded constants; REQUIREMENTS.md marks Complete. |

No orphaned requirements — all three IDs (RULE-01, RULE-02, RULE-03) declared across the three plans' frontmatter match exactly the three IDs REQUIREMENTS.md maps to Phase 1.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | No TODO/FIXME/placeholder comments, empty implementations, or console.log-only handlers in any of the 7 phase-modified files. |

### Test Suite Verification (additional check requested)

- `npx vitest run src/modules/individual-tax` in isolation: **10 files, 46 tests, 0 failures** (52.9s). Confirms green in isolation as claimed by both executors.
- Full `npx vitest run` (no concurrent agents): **69 files, 243 tests, 0 failures** (152.4s). This is strong corroborating evidence that the vitest worker-pool timeouts logged in `deferred-items.md` were genuinely transient resource contention from concurrent agent execution during the phase, not regressions — every previously-flagged file (`client-service.test.ts`, `estates/engines/post-death/calculation.test.ts`, `desktop/golden-demo-bundle.test.ts`, `estates/[estateId]/valuation/page.test.tsx`, `estates/engines/pre-death/service.test.ts`, `individual-tax/service-interactive.test.ts`, `individual-tax/service-update.test.ts`, `individual-tax/calculation-service.test.ts`, `estates/service.test.ts`) now passes cleanly.
- `middleware.ts` RBAC type error confirmed genuinely pre-existing: `git log` shows `middleware.ts` was last modified in commit `cd84690`, which predates every phase-01 commit (`195fbb6` through `76c3edf`). The error still reproduces today (`TS2345: ExtendedRole not assignable to RoleCode`), confirming it is untouched, unrelated baseline debt — not a regression introduced by this phase. `npx tsc --noEmit` on `tax-tools.tsx` and `types.ts`/`rules-*.ts` produces zero errors.
- Note: raw `npx tsc --noEmit` (outside vitest) also surfaces `describe`/`it`/`expect` "Cannot find name" errors in several `*.test.ts` files (a pre-existing artifact of tsc not picking up vitest's global types without vitest's own config/environment) — these are not real compile errors since `vitest run` compiles and executes those same files successfully. This matches the deviation note already logged in the 01-01 SUMMARY and is out of this phase's scope (no test files affected are among the 7 phase-modified files, and the underlying tsconfig/vitest-globals setup is untouched by this phase).

### Human Verification Required

None. All success criteria are objectively verifiable via file inspection, grep, and test execution — no visual, real-time, or subjective-UX behavior is in scope for this phase's rate-sourcing goal.

### Gaps Summary

No gaps found. All four phase success criteria are verified against actual code (not just SUMMARY claims): the rulepack files carry exact, plan-specified SARS values for 2025/2026/2027; the 2027 Budget-2026 correction is in place; `tax-tools.tsx` has zero hardcoded rate constants remaining and correctly resolves every value through `getIndividualTaxRulePackByYear`; and the completeness test is a demonstrably effective build gate (proven via mutation testing in plan 01-02, independently re-confirmed passing here). The two deferred items (vitest worker-pool contention, `middleware.ts` RBAC type error) were independently re-verified as genuinely pre-existing/transient and not regressions caused by this phase.

---

*Verified: 2026-07-02T17:20:22Z*
*Verifier: Claude (gsd-verifier)*
