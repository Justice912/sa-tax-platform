# Phase 1: Rulepack Extension - Research

**Researched:** 2026-07-02
**Domain:** SARS-compliant per-year tax rate data (deemed-cost travel tables, retirement cap, CGT exclusions, provisional tax thresholds) — TypeScript data modeling, not a new library/framework problem
**Confidence:** HIGH (values and current code shape both directly verified; two flagged items are explicitly out of scope for this phase)

## Summary

This phase is a **data-modeling and migration task**, not new technology. The codebase already has the right shape — `IndividualTaxRulePack` per assessment year, resolved via `getIndividualTaxRulePackByYear()` — for tax brackets, rebates, thresholds, interest exemption, medical credits (s6A only), retirement cap, and CGT. What's missing is (a) a `travelDeemedCostTable` field (doesn't exist at all yet), (b) a `provisionalTax` field (doesn't exist; provisional tax logic and its R1,000,000/90%/80% thresholds are hardcoded directly in `tax-tools.tsx`), and (c) **corrected values for 2027** — the current `rules-2027.ts` file has the **stale pre-Budget-2026 retirement cap (R350,000) and CGT figures (R40,000/R2,000,000)**, which is a live compliance bug, not just missing structure. Additionally, `tax-tools.tsx` duplicates `TAX_BRACKETS`, `REBATES`, `MEDICAL_CREDITS`, `DEEMED_COST_TABLE`, `CGT_*`, `RETIRE_*` as module-level constants for a single unlabeled year and has **no tax-year selector at all** — every calculator is silently locked to one hardcoded year.

**Primary recommendation:** Extend `IndividualTaxRulePack` (types.ts) with two new required fields — `travelDeemedCostTable: TravelDeemedCostBracket[]` and `provisionalTax: ProvisionalTaxRules` — populate all four rulepack files (2024–2027) with the verified SARC values below, fix the 2027 retirement/CGT values in `rules-2027.ts`, delete all hardcoded constants from `tax-tools.tsx` in favor of `getIndividualTaxRulePackByYear()` calls, add a tax-year selector (2025/2026/2027 only, per REQUIREMENTS.md scope — 2024 excluded from this milestone even though the registry still supports it for backward compatibility), and write a rulepack-completeness test that fails the build on missing/duplicated/placeholder year data — including fixing the existing test at `rulepack.test.ts:24` which currently hardcodes `retirement.annualCap === 350000` for *all* years (this assertion must become year-aware once 2027 changes to R430,000).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| RULE-01 | Rulepacks for 2025, 2026, 2027 contain verified per-year deemed-cost travel rate tables (fixed cost, fuel, maintenance by vehicle value bracket) from official SARS PAYE-GEN-01-G03-A01 schedules | Exact tables for all three years reproduced verbatim below from `.planning/research/FEATURES.md` (HIGH confidence, read directly from official SARS PDFs). New `travelDeemedCostTable` field required on `IndividualTaxRulePack`; bracket boundaries differ structurally between years (R100k increments for 2025/2026, R115k for 2027) so brackets must NOT be a shared constant across years. |
| RULE-02 | Rulepacks carry year-specific values including 2027 changes: retirement s11F cap R430,000, CGT annual exclusion R50,000, primary residence exclusion R3,000,000 | Confirmed `rules-2027.ts` currently has WRONG values (R350,000 cap, R40,000/R2,000,000 CGT) — this is a correction, not just an addition. Verified replacement values below (HIGH confidence, direct SARS Budget 2026 FAQ fetch). Also affects `cgt.deathExclusion` (R440,000) and a currently-nonexistent small business disposal exclusion field (R2,700,000) — see Open Questions on whether to add the latter this phase. |
| RULE-03 | All tax-tools calculators read rates from the rulepack for a user-selected tax year — no hardcoded tax tables in components | Full inventory of `tax-tools.tsx` hardcoded constants below, each mapped to its rulepack equivalent (existing or newly-added). Requires adding a tax-year selector to the component (currently absent entirely) and threading the selected year through to every calculator's math. |

## User Constraints

No CONTEXT.md exists for this phase (not produced by `/gsd:discuss-phase`). Constraints below are pulled directly from PROJECT.md / REQUIREMENTS.md, which serve as the locked decisions for this milestone:

- **Tax years in scope: 2025, 2026, 2027 only.** 2024 is explicitly out of scope for rate verification this milestone (REQUIREMENTS.md Out of Scope), but the registry already supports 2024 and must not be broken — `rules-2024.ts` stays as-is structurally but MUST also gain the new required fields (`travelDeemedCostTable`, `provisionalTax`) since `IndividualTaxRulePack` is used as one shared type across all four years; TypeScript will not compile if 2024 is missing required fields. Populate 2024 with reasonable/placeholder-flagged-as-out-of-scope values only if truly necessary for compile-safety, OR make the 2024 rulepack file exclude these new fields via a version-appropriate type approach (see Open Questions — this is a real design decision the planner must resolve).
- **No invented/estimated rates.** Every numeric value must trace to an official SARS source already captured in `.planning/research/FEATURES.md`. Do not fabricate 2024 travel/provisional data if it wasn't researched — flag explicitly rather than guess (per PITFALLS.md Anti-Feature list and this agent's own philosophy).
- **Existing assessments/tests must keep working.** `rulepack.test.ts` currently asserts `retirement.annualCap === 350000` for every rulepack (line 24) — this assertion is now WRONG for 2027 by requirement RULE-02 and must be deliberately updated, not left to silently pass/fail.
- **Split tax-tools.tsx monolith rather than patch** is a locked decision for a LATER phase (Phase 5, per ROADMAP/STATE.md), but Phase 1 must still eliminate the hardcoded rate constants from the file now (RULE-03) without necessarily doing the full component decomposition — i.e., this phase touches `tax-tools.tsx` to remove constants and wire in rulepack lookups + a year selector, but does not need to split it into per-tab files (that's Phase 5's job). Confirm this sequencing holds; it is implied by the roadmap phase order (Phase 1 rulepack, Phase 5 decomposition) but not explicitly stated as a phase boundary rule anywhere — flag for the planner.

## Standard Stack

No new libraries needed. This phase is pure TypeScript data/type changes plus one React component wiring change (a `<select>` for tax year, already an established UI pattern in the codebase — e.g. see `selectCls` used for `prov.period` in tax-tools.tsx).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| TypeScript | (existing project version) | Type-safe rulepack shape extension | Already governs `IndividualTaxRulePack`; no new tooling required |
| Vitest | (existing project version) | Rulepack completeness test | Already used for `rulepack.test.ts` and all `*.test.ts` in this module |

### Alternatives Considered
None — this is additive data modeling on an existing, proven pattern (`rulepack-registry.ts`). Introducing a new config format (JSON rate files, a rules engine, etc.) would contradict the existing convention and is explicitly not warranted for four small per-year TypeScript objects.

**Installation:** None required.

## Architecture Patterns

### Recommended Structure (no new files needed beyond what's implied)
```
src/modules/individual-tax/
├── types.ts                  # ADD: TravelDeemedCostBracket, ProvisionalTaxRules interfaces;
│                              #      extend IndividualTaxRulePack with travelDeemedCostTable, provisionalTax
├── rulepack-registry.ts       # UNCHANGED — resolution logic already correct
├── rules-2024.ts              # ADD new required fields (resolve per Open Questions)
├── rules-2025.ts              # ADD travelDeemedCostTable (2025 table below) + provisionalTax
├── rules-2026.ts              # ADD travelDeemedCostTable (2026 table below) + provisionalTax
├── rules-2027.ts              # FIX retirement.annualCap, cgt.* to Budget 2026 values;
│                              #      ADD travelDeemedCostTable (2027 table below) + provisionalTax
└── rulepack.test.ts           # FIX line 24 (year-aware retirement cap assertion);
                                #      ADD completeness test (every year has non-empty, non-duplicate,
                                #      non-placeholder travelDeemedCostTable + provisionalTax)

src/components/individual-tax/tax-tools.tsx
                                # REMOVE: TAX_BRACKETS, REBATES, MEDICAL_CREDITS, DEEMED_COST_TABLE,
                                #         CGT_EXCLUSION, CGT_DEATH_EXCLUSION, CGT_PRIMARY_RES,
                                #         CGT_INCLUSION_RATE, RETIRE_PERCENT, RETIRE_CAP,
                                #         hardcoded 1000000/0.9/0.8 safe-harbour literals
                                # ADD: tax-year selector state + UI control (2025/2026/2027)
                                # REPLACE: calcTax/getMarginalRate/getDeemedRate with rulepack-driven
                                #          equivalents, called with the selected year's rulepack
```

### Pattern 1: Extend the shared rulepack type with additive, year-varying fields
**What:** Add `travelDeemedCostTable` and `provisionalTax` as new required properties on `IndividualTaxRulePack` (types.ts), following the exact nested-object convention already used for `retirement`, `cgt`, `medicalTaxCredit`.
**When:** Always for this phase — this is the established pattern (confirmed in ARCHITECTURE.md Pattern 2) and the only one consistent with `rulepack-registry.ts`'s existing resolution mechanism.
**Example:**
```typescript
// src/modules/individual-tax/types.ts
export interface TravelDeemedCostBracket {
  min: number;
  max: number | null; // null = uncapped top bracket
  fixedCostAnnual: number;
  fuelCostPerKm: number;   // cents/km as published, or rand/km — pick ONE unit and document it
  maintenanceCostPerKm: number;
}

export interface ProvisionalTaxRules {
  basicAmountEscalationRate: number;       // 0.08 (8% per year, MEDIUM confidence — see Open Questions)
  basicAmountEscalationThresholdMonths: number; // ~18 months staleness trigger (MEDIUM confidence)
  safeHarbourTaxableIncomeThreshold: number;    // R1,000,000 (HIGH confidence)
  safeHarbourBasicAmountOrActualPctBelowThreshold: number; // 0.90 (HIGH confidence)
  safeHarbourActualPctAboveThreshold: number;              // 0.80 (HIGH confidence)
  underestimationPenaltyRate: number;                      // 0.20 (HIGH confidence per FEATURES.md text)
}

export interface IndividualTaxRulePack {
  // ...existing fields unchanged
  travelDeemedCostTable: TravelDeemedCostBracket[];
  provisionalTax: ProvisionalTaxRules;
}
```
**Unit decision needed:** FEATURES.md publishes fuel/maintenance as **cents per km** (e.g., 151.7 c/km). The existing (soon-to-be-deleted) `DEEMED_COST_TABLE` in tax-tools.tsx stores `fuel`/`maint` as plain numbers used directly in rand arithmetic (e.g., `159.3` used as if rand-cents-equivalent — actually on inspection those look like rand-per-100km or a pre-converted unit, NOT raw cents; they do not match FEATURES.md's SARS c/km values at all for any year, confirming the current component table is itself stale/wrong, not just undated). **The planner must decide and document one explicit unit convention** (recommend: store as rand-per-km, i.e. divide the published c/km figures by 100, since the rest of the codebase's monetary fields are in rand, and label the field name/comment accordingly to prevent a repeat of this exact confusion) — see Open Questions.

### Pattern 2: Rulepack completeness test as a build gate
**What:** A test (in `rulepack.test.ts` or a new `rulepack-completeness.test.ts`) that iterates `listIndividualTaxRulePacks()` and asserts, for every year: `travelDeemedCostTable.length > 0`, brackets cover a contiguous non-overlapping range starting at a sensible minimum with the last bracket having `max: null`, and no two years' tables are deep-equal to each other (catches copy-paste). Same for `provisionalTax` (non-zero, non-placeholder values).
**When:** Always — this is explicitly required by the phase's 4th success criterion ("fails the build if any year's table is missing, duplicated, or placeholder") and is the direct fix for PITFALLS.md Pitfall 1's stated verification strategy.
**Example:**
```typescript
// Pattern for the completeness assertion (deep-equality copy-paste detector)
import { listIndividualTaxRulePacks } from "@/modules/individual-tax/rulepack-registry";

it("has a distinct, non-empty deemed-cost travel table per year", () => {
  const packs = listIndividualTaxRulePacks();
  for (const pack of packs) {
    expect(pack.travelDeemedCostTable.length).toBeGreaterThan(0);
  }
  // pairwise inequality — catches accidental copy-paste across years
  for (let i = 0; i < packs.length; i++) {
    for (let j = i + 1; j < packs.length; j++) {
      expect(packs[i].travelDeemedCostTable).not.toEqual(packs[j].travelDeemedCostTable);
    }
  }
});
```

### Pattern 3: Tax-year selector drives rulepack lookup, not module-level constants
**What:** `tax-tools.tsx` currently has zero year-selection UI — every calculator implicitly uses whatever is hardcoded. Add a single piece of state (e.g. `const [assessmentYear, setAssessmentYear] = useState<SupportedAssessmentYear>(2026)`) at the top level, render a `<select>` (matching the existing `selectCls` pattern used for `prov.period`), and derive `const rulePack = getIndividualTaxRulePackByYear(assessmentYear)` once, passing `rulePack` (or specific slices of it) into each calculator's logic instead of the deleted module constants.
**When:** Required by RULE-03 and the phase's 1st success criterion ("Selecting tax year 2025/2026/2027 in a calculator produces figures matching..."). This is the one behavioral/UI change in an otherwise pure-data phase.
**Default year:** Recommend **2026** as default (the "current" filing year per STATE.md's "Current focus" framing and PROJECT.md's description of "current filing season"), with 2025/2026/2027 as the only offered options (2024 excluded from the selector per REQUIREMENTS.md scope, even though the registry technically still resolves it) — confirm with planner since this is a UX default not explicitly locked anywhere in PROJECT.md.

### Anti-Patterns to Avoid
- **Shared bracket boundaries across years:** FEATURES.md explicitly warns the 2027 table's brackets shifted to R115k increments vs. 2025/2026's R100k increments — do not build a single shared `min/max` bracket array with only rand amounts varying by year; each year needs its own complete bracket array (this is already the natural shape of a `TravelDeemedCostBracket[]` field per rulepack, just don't try to "optimize" it into a shared boundary list later).
- **Keeping `DEEMED_COST_TABLE`, `TAX_BRACKETS`, etc. "for now, will remove later":** RULE-03's success criterion is binary — no hardcoded table anywhere in tax-tools.tsx. Partial removal fails the criterion.
- **Silently changing the existing `rulepack.test.ts` assertion without updating its intent:** Line 24's `retirement.annualCap === 350000` for ALL years must become year-conditional (e.g., `2027 ? 430000 : 350000`), not simply deleted — deleting it would remove real regression coverage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Per-year rate resolution | A new lookup/config layer, JSON rate files, or a "rules engine" | The existing `getIndividualTaxRulePackByYear()` / `rulepack-registry.ts` | Already correct, tested, and the pattern every other calculator schedule already depends on; a parallel mechanism would create the exact two-sources-of-truth risk this phase exists to eliminate |
| Bracket lookup for deemed-cost table | A generic "range table" abstraction library | A plain `.find()` over `travelDeemedCostTable`, mirroring the existing `getDeemedRate`/`calcTax` `.find()` idiom already in the codebase | Consistent with existing code style (`TAX_BRACKETS.find(...)` pattern already used); no complexity justifies a library for ~9 rows |

**Key insight:** This phase's entire risk surface is data correctness and duplication elimination, not engineering complexity — resist any urge to introduce abstraction beyond what four flat TypeScript objects need.

## Common Pitfalls

### Pitfall 1: Wrong-year rate table silently used (PITFALLS.md Pitfall 1)
**What goes wrong:** A rulepack copy-pasted from the prior year without updating values, or the deemed-cost table stored as a standalone constant instead of per-year rulepack field.
**Why it happens:** The 2027 rulepack in this exact codebase is already exhibiting a version of this bug today (stale retirement cap/CGT values) — proof this is not a hypothetical risk.
**How to avoid:** Cite the exact SARS source (PAYE-GEN-01-G03-A01 revision number + effective date) in a code comment next to each year's `travelDeemedCostTable`, matching the existing `sourceReference` field convention. Run the completeness/distinctness test (Pattern 2) as a hard gate.
**Warning signs:** Any two years' tables being deep-equal; `sourceReference` string not updated per file.

### Pitfall 2: Unit mismatch between "cents per km" (SARS publication) and "rand" (codebase convention)
**What goes wrong:** FEATURES.md publishes fuel/maintenance costs in cents/km (e.g. `151.7`). If this raw number is used directly in a rand-denominated formula (`businessKm * fuelCostPerKm` intending rand), the deduction is inflated 100x, or if divided inconsistently across the codebase, is silently wrong in one direction or another.
**Why it happens:** The current (buggy) `DEEMED_COST_TABLE` in tax-tools.tsx uses numbers like `159.3` for `fuel` that don't match ANY year's actual SARS c/km figure — strong evidence this exact confusion already happened once in this codebase's history.
**How to avoid:** Pick rand-per-km as the stored unit (divide published c/km by 100 when transcribing into the rulepack files), name the field `fuelCostPerKm` with a doc comment stating "rand per km (SARS publishes in cents/km — already converted)", and add a sanity-range test (e.g., `fuelCostPerKm` between 0.5 and 5.0 rand/km for all brackets/years) to catch a future transcription slip.
**Warning signs:** Any per-km rate stored as a number > 10 (a rand-denominated per-km travel cost should never be in this range; a raw cents figure would be).

### Pitfall 3: Provisional tax hardcoded values duplicated instead of migrated
**What goes wrong:** `tax-tools.tsx` lines 485–486 hardcode `1000000`, `0.9`, `0.8` directly in the safe-harbour calculation. If the planner only handles the "named" constants (TAX_BRACKETS, DEEMED_COST_TABLE, etc.) and misses these inline literals, RULE-03's "no hardcoded tax tables in components" criterion is not fully met.
**Why it happens:** These aren't named as a table/constant block like the others — they're inline magic numbers inside a calculation function (`prov` state's derived `provResult`), easy to miss in a component-constant inventory that only greps for `const [A-Z_]+ =`.
**How to avoid:** Explicitly inventory inline numeric literals in calculation functions, not just the top-of-file constant block (see full inventory table below — this is called out explicitly).
**Warning signs:** `grep -n "1000000\|0\.9\|0\.8"` still matches after the "constants removed" claim.

### Pitfall 4: 2024 rulepack breaks compilation or silently gets wrong new-field values
**What goes wrong:** `IndividualTaxRulePack` is one shared interface. Adding required fields `travelDeemedCostTable`/`provisionalTax` means `rules-2024.ts` must also satisfy the type, but 2024 rate verification is explicitly out of scope for this milestone (REQUIREMENTS.md). If the planner isn't careful, this forces either (a) fabricating unverified 2024 deemed-cost/provisional data (violates the "no invented rates" constraint), or (b) a type design that silently allows 2024 to have empty/wrong data without the completeness test catching it.
**Why it happens:** TypeScript structural typing doesn't distinguish "verified" from "unverified" data — a required field is a required field.
**How to avoid:** See Open Questions — this needs an explicit planner decision (recommended options given below), not a default assumption.
**Warning signs:** 2024's new fields populated with copy-pasted 2025 values without an explicit code comment disclosing they're unverified/out-of-scope placeholders (which would itself violate the "no placeholder" completeness-test intent, RULE constraint, and Anti-Feature in FEATURES.md simultaneously).

## Full Inventory: tax-tools.tsx Hardcoded Constants → Rulepack Mapping

| Component constant (tax-tools.tsx line) | Current value(s) | Rulepack field (existing or new) | Notes |
|---|---|---|---|
| `TAX_BRACKETS` (line 8–16) | 7-bracket table, unlabeled year (matches 2025/2026 figures) | `rulePack.taxBrackets` (EXISTING field) | Already present per-year in rulepack; component just needs to stop redeclaring and call `getIndividualTaxRulePackByYear(assessmentYear).taxBrackets` |
| `REBATES` (line 17) | `{primary: 17235, secondary: 9444, tertiary: 3145}` | `rulePack.rebates` (EXISTING) | Matches 2025/2026 values exactly; would be WRONG for 2027 (18395/10077/3356) if left hardcoded — direct proof RULE-03 matters |
| `MEDICAL_CREDITS` (line 18) | `{mainPlus1: 364, additional: 246}` | `rulePack.medicalTaxCredit` (EXISTING) | Field names differ (`firstTwoMembersPerMonth`/`additionalMemberPerMonth` vs `mainPlus1`/`additional`) — mapping is 1:1 in meaning, rename at call sites |
| `DEEMED_COST_TABLE` (line 19–29) | 9-bracket table with values matching NEITHER 2025 nor 2026 nor 2027 official SARS figures (verified by cross-check against FEATURES.md tables) | `rulePack.travelDeemedCostTable` (NEW field, this phase) | **This existing table is simply wrong/stale for all three in-scope years** — not a "which year is this" ambiguity, the numbers don't match any verified year. Must be fully replaced with the verified tables below, not migrated/reused. |
| `CGT_EXCLUSION` (line 30) | `40000` | `rulePack.cgt.annualExclusion` (EXISTING) | Correct for 2025/2026, WRONG for 2027 (must be 50000) |
| `CGT_DEATH_EXCLUSION` (line 31) | `300000` | `rulePack.cgt.deathExclusion` (EXISTING) | Correct for 2025/2026, WRONG for 2027 (must be 440000 per FEATURES.md — note this exact field is NOT named in RULE-02's explicit list but IS in the verified table; flag for planner whether in-scope) |
| `CGT_PRIMARY_RES` (line 32) | `2000000` | `rulePack.cgt.primaryResidenceExclusion` (EXISTING) | Correct for 2025/2026, WRONG for 2027 (must be 3000000) |
| `CGT_INCLUSION_RATE` (line 33) | `0.40` | `rulePack.cgt.inclusionRate` (EXISTING) | Unchanged across all three years (40%) — no fix needed, just source from rulepack |
| `RETIRE_PERCENT` (line 34) | `0.275` | `rulePack.retirement.deductiblePercentageLimit` (EXISTING) | Unchanged across all years (27.5%) — no fix needed, just source from rulepack |
| `RETIRE_CAP` (line 35) | `350000` | `rulePack.retirement.annualCap` (EXISTING) | **Correct for 2025/2026, WRONG for 2027** (must be 430000) — the single highest-impact fix per FEATURES.md |
| `calcTax()` (line 37–42) | Uses `TAX_BRACKETS` directly | Should call into `src/modules/individual-tax/calculation-service.ts`'s existing bracket math, OR at minimum operate on `rulePack.taxBrackets` | ARCHITECTURE.md Anti-Pattern 2 explicitly flags re-implementing bracket math client-side as a duplication risk beyond just data — consider whether Phase 1 should redirect to the calculation-service function or just fix the data source (lower blast radius); flag for planner |
| `getMarginalRate()` (line 43–47) | Uses `TAX_BRACKETS` directly | Same as above | Same consideration |
| `getDeemedRate()` (line 48–50) | Uses `DEEMED_COST_TABLE` directly | Should use `rulePack.travelDeemedCostTable` | Straightforward field-source swap once new field exists |
| Inline `1000000` / `0.9` / `0.8` (line 485–486, provisional tax safe harbour) | `estTaxable > 1000000 ? priorTax * 0.9 : priorTax * 0.8` | `rulePack.provisionalTax.safeHarbourTaxableIncomeThreshold` / `...BelowThreshold` / `...AboveThreshold` (NEW field, this phase) | **Easy to miss** — not a named top-of-file constant, an inline magic-number calculation. Must be included in RULE-03's "no hardcoded tax tables" scope. |
| No tax-year selector exists anywhere in the file | N/A — implicitly locked to whichever year the hardcoded constants happen to match (appears to be 2025/2026-era values) | New UI state (`assessmentYear`) driving `getIndividualTaxRulePackByYear()` | This is the delivery mechanism for the phase's 1st success criterion; must be built new, not migrated |

**What was NOT found in tax-tools.tsx (confirms scope boundary):** No hardcoded medical s6B formula constants (25%/33.3%/3x/4x/7.5%) were found in the read portion of the file — these likely live in the medical credits calculator section further down (not yet read in full) and are explicitly a **Phase 7 (Calculator Audit)** concern per REQUIREMENTS.md traceability, not this phase's. Confirm during planning that Phase 1 does not need to touch s6B logic — RULE-01/02/03 only name deemed-cost, retirement, CGT, and (implicitly via provisional tax thresholds) para 19/20 basics as in-scope; medical s6B formula correctness is CALC-01 (Phase 7).

## Verified SARS Values for Rulepack Construction

Reproduced directly from `.planning/research/FEATURES.md` (already fetched and verified against official SARS PDFs by prior research — this phase does not need to re-fetch, only transcribe). **All confidence: HIGH** for deemed-cost tables (source: PAYE-GEN-01-G03-A01, all three years downloaded and read in full) and CGT/retirement (source: SARS Budget 2026 FAQ, direct fetch). **Confidence: MEDIUM** for provisional-tax escalation mechanics only (flagged below, does not block this phase per FEATURES.md's own guidance).

### 1. Deemed-cost travel table (PAYE-GEN-01-G03-A01) — values as published, in RAND (c/km ÷ 100) for codebase consistency

**2025 Tax Year** (Revision 17, effective 29 Feb 2024). Simplified rate: R4.84/km.

| Vehicle value bracket (R) | Fixed cost (R/year) | Fuel (R/km) | Maintenance (R/km) |
|---|---|---|---|
| 0 – 100,000 | 34,480 | 1.517 | 0.460 |
| 100,001 – 200,000 | 61,770 | 1.694 | 0.576 |
| 200,001 – 300,000 | 89,119 | 1.840 | 0.635 |
| 300,001 – 400,000 | 113,436 | 1.979 | 0.693 |
| 400,001 – 500,000 | 137,752 | 2.118 | 0.815 |
| 500,001 – 600,000 | 163,178 | 2.430 | 0.956 |
| 600,001 – 700,000 | 188,653 | 2.471 | 1.073 |
| 700,001 – 800,000 | 215,447 | 2.512 | 1.189 |
| > 800,000 (uncapped, max: null) | 215,447 | 2.512 | 1.189 |

**2026 Tax Year** (Revision 18, effective 1 March 2025). Simplified rate: R4.76/km.

| Vehicle value bracket (R) | Fixed cost (R/year) | Fuel (R/km) | Maintenance (R/km) |
|---|---|---|---|
| 0 – 100,000 | 33,940 | 1.467 | 0.474 |
| 100,001 – 200,000 | 60,688 | 1.638 | 0.593 |
| 200,001 – 300,000 | 87,497 | 1.779 | 0.654 |
| 300,001 – 400,000 | 111,273 | 1.914 | 0.714 |
| 400,001 – 500,000 | 135,048 | 2.048 | 0.839 |
| 500,001 – 600,000 | 159,934 | 2.349 | 0.985 |
| 600,001 – 700,000 | 184,867 | 2.389 | 1.105 |
| 700,001 – 800,000 | 211,121 | 2.429 | 1.225 |
| > 800,000 (uncapped, max: null) | 211,121 | 2.429 | 1.225 |

**2027 Tax Year** (Revision 19, effective 1 March 2026). Simplified rate: R4.95/km. **NOTE: bracket boundaries shifted to R115,000 increments — structurally different from 2025/2026's R100,000 increments. Do not reuse 2025/2026's bracket boundary list.**

| Vehicle value bracket (R) | Fixed cost (R/year) | Fuel (R/km) | Maintenance (R/km) |
|---|---|---|---|
| 0 – 115,000 | 38,344 | 1.329 | 0.491 |
| 115,001 – 230,000 | 68,487 | 1.484 | 0.614 |
| 230,001 – 345,000 | 98,689 | 1.612 | 0.678 |
| 345,001 – 460,000 | 125,393 | 1.734 | 0.740 |
| 460,001 – 575,000 | 152,097 | 1.855 | 0.869 |
| 575,001 – 690,000 | 180,078 | 2.128 | 1.020 |
| 690,001 – 805,000 | 208,106 | 2.165 | 1.145 |
| 805,001 – 920,000 | 237,679 | 2.201 | 1.261 |
| > 920,000 (uncapped, max: null) | 237,679 | 2.201 | 1.269 |

**Note on the last row's maintenance figure:** FEATURES.md shows `118.9` (capped) for the second-to-last bracket-echo row in 2025/2026 tables but `126.1`/`126.9` for 2027's last two rows respectively (not identical — verify this isn't a source-document typo when transcribing; FEATURES.md's own table shows `237,679 | 220.1 (capped) | 126.9` for the ">R920,000" row, i.e., fixed and fuel are capped/repeated from the row above but maintenance is NOT identical (126.1 vs 126.9) — this is unusual for a "capped" pattern and should be double-checked against the source PDF by the planner/implementer if possible, or transcribed exactly as FEATURES.md shows it since that document was read from the primary source.

### 2. Retirement fund cap (s11F)

| Tax year | Annual rand cap |
|---|---|
| 2025 | R350,000 (already correct in `rules-2025.ts`) |
| 2026 | R350,000 (already correct in `rules-2026.ts`) |
| 2027 | **R430,000** (currently WRONG in `rules-2027.ts` — shows R350,000, must be fixed) |

### 3. Capital Gains Tax

| Tax year | Annual exclusion | Primary residence exclusion | Death exclusion | Inclusion rate |
|---|---|---|---|---|
| 2025 | R40,000 (correct) | R2,000,000 (correct) | R300,000 (correct) | 40% |
| 2026 | R40,000 (correct) | R2,000,000 (correct) | R300,000 (correct) | 40% |
| 2027 | **R50,000** (currently WRONG, shows R40,000) | **R3,000,000** (currently WRONG, shows R2,000,000) | **R440,000** (currently WRONG, shows R300,000 — not explicitly named in RULE-02 but is part of the same verified Budget 2026 change set) | 40% (unchanged, already correct) |

Small business disposal exclusion (R1,800,000 → R2,700,000 for 2027) exists in FEATURES.md but has **no corresponding field on `IndividualTaxRulePack` today** — not named in RULE-02's explicit list. Flag as Open Question: add now (completeness) or defer (scope discipline)?

### 4. Provisional tax (para 19/20)

| Rule | Value | Confidence |
|---|---|---|
| Safe-harbour taxable income threshold | R1,000,000 | HIGH |
| Safe harbour below threshold | lesser of basic amount or 90% of actual final taxable income | HIGH |
| Safe harbour above threshold | 80% of actual final taxable income (basic-amount option unavailable) | HIGH |
| Underestimation penalty rate | 20% of shortfall | HIGH (stated directly in FEATURES.md prose) |
| Basic-amount escalation | +8% per year if assessment is >~18 months old | MEDIUM — flagged by FEATURES.md as needing Interpretation Note 1 (Issue 3) verification |

**Does this block Phase 1?** No — per the phase's explicit key research task ("Note which flagged-unverified values ... do NOT block this phase"), the R1,000,000/90%/80%/20% values are HIGH confidence and sufficient to replace the tax-tools.tsx hardcoded literals now. The 8%/18-month escalation mechanic is not currently implemented anywhere in tax-tools.tsx at all (no escalation logic exists in the read portion of the file) — so there is nothing to migrate for it in this phase; it can be added as a `provisionalTax.basicAmountEscalationRate`/`...ThresholdMonths` field populated with the MEDIUM-confidence values (8% / 18 months) now for forward-compatibility, OR left off the type entirely until Phase 7 (Calculator Audit, which owns CALC-04 "provisional tax follows para 19/20 rules") implements the actual escalation logic. **Recommend: add the fields to the rulepack now since RULE-01/02/03 are about the DATA being present and correct, but do not require tax-tools.tsx to implement escalation logic this phase** — that's a calculation-behavior change belonging to CALC-04/Phase 7, not a data-migration change belonging to Phase 1.

## Items That Do NOT Block This Phase (explicitly deferred per FEATURES.md/STATE.md)

These are LOW/MEDIUM confidence flags from `.planning/research/FEATURES.md` and `.planning/STATE.md`'s Blockers/Concerns — none are required inputs for RULE-01/02/03:

- **s6B medical credit multipliers** (3x/4x annual credit, 25%/33.3%, 7.5% threshold) — MEDIUM confidence, belongs to CALC-01 (Phase 7). Not touched by this phase; `medicalTaxCredit` field only carries s6A monthly amounts, which are already HIGH confidence and already correct in all rulepacks except needing the 2027 verification cross-check (376/752/254 — already correctly present in `rules-2027.ts`, confirmed by direct read).
- **ITR12 deduction codes 4014/4015** — LOW-MEDIUM confidence, belongs to Phase 3 (ITR12 Travel Schedule Integration). Not a rulepack field at all; this is a schedule-mapping concern in `travel-schedule.ts`, out of scope for Phase 1 entirely.
- **Actual-cost wear-and-tear R800,000 vehicle-value cap** — MEDIUM confidence, belongs to Phase 2 (Logbook Domain Module, actual-cost calculation). Not a rulepack concern for Phase 1 (Phase 1 only needs the DEEMED-cost table, which is fully HIGH-confidence verified above).
- **Provisional tax 8%/18-month escalation exact mechanics** — MEDIUM confidence; see above, does not block adding the HIGH-confidence R1m/90%/80%/20% values now.

## Open Questions

1. **Unit convention for deemed-cost per-km rates: rand or cents?**
   - What we know: SARS publishes in cents/km. The current buggy component constant appears to use neither raw cents nor a clean rand conversion (values don't match any verified year at all).
   - What's unclear: Whether the planner should store rand (my recommendation, for consistency with the rest of the codebase's rand-denominated fields) or cents (closer to the source document, less transcription risk of an off-by-100 error, but requires very careful downstream multiplication).
   - Recommendation: Store as rand-per-km (divide by 100 during transcription, values shown in the tables above are already pre-converted), name fields `fuelCostPerKm`/`maintenanceCostPerKm` with a doc comment noting the conversion and citing the source c/km figures for audit traceability. Add a sanity-bound test (0.5–5.0 range) as a transcription-error tripwire.

2. **Does the 2024 rulepack need real travel/provisional data, or can it be structurally exempted?**
   - What we know: 2024 rate verification is explicitly out of scope (REQUIREMENTS.md). `IndividualTaxRulePack` is currently one shared required-fields interface across all four years.
   - What's unclear: Whether to (a) make `travelDeemedCostTable`/`provisionalTax` optional fields (breaks the "fails build if missing" completeness-test intent for 2025-2027, unless the test explicitly excludes 2024), (b) populate 2024 with the 2025 values as a documented "not independently verified, carried from 2025 as an approximation, out of scope for this milestone" placeholder (technically violates the "no placeholder" success criterion if read literally, but the criterion's clear intent is about 2025/2026/2027), or (c) exclude 2024 entirely from `SUPPORTED_ASSESSMENT_YEARS` (highest blast radius — 2024 is currently used elsewhere, e.g. `rulepack.test.ts` line 9 explicitly tests it, so removal needs broader impact analysis than this phase should take on).
   - Recommendation: Option (b) with an explicit, loud code comment (`// NOT independently verified — 2024 excluded from this milestone's SARS compliance scope per REQUIREMENTS.md; carried from 2025 rates as a structural placeholder only, do not treat as compliance-verified`), and the completeness test should assert 2025/2026/2027 specifically (by year, not generically over all `listIndividualTaxRulePacks()`) for the "no placeholder" check, while a separate looser assertion (non-empty array) can still apply to 2024 for basic structural safety. Flag this explicitly for user/planner sign-off since it's a real interpretation call, not a pure implementation detail.

3. **Should `cgt.deathExclusion` (R440,000) and a new small-business-disposal-exclusion field (R2,700,000) be added/fixed in this phase?**
   - What we know: RULE-02 explicitly names only retirement cap, CGT annual exclusion, and primary residence exclusion. `deathExclusion` already exists as a field (just currently wrong for 2027) and small-business-disposal does not exist as a field at all.
   - What's unclear: Whether "no hardcoded tax tables... all values trace to rulepack-registry.ts" (success criterion 3) implies ALL CGT-related 2027 changes should be corrected now (since `deathExclusion` is a pre-existing field that would otherwise remain silently wrong), even though RULE-02's explicit list is narrower.
   - Recommendation: Fix `deathExclusion` now (zero extra complexity — it's an existing field, and leaving it wrong when the sibling fields in the same object are being corrected is inconsistent and likely to be flagged in review anyway). Defer adding a net-new `smallBusinessDisposalExclusion` field unless a calculator actually consumes it (none currently found in tax-tools.tsx) — adding an unused field has no test to anchor it and risks being exactly the kind of "placeholder" the completeness test is designed to catch. Flag both calls for planner confirmation.

4. **Should `calcTax()`/`getMarginalRate()` in tax-tools.tsx be redirected to `calculation-service.ts`'s bracket math, or just re-sourced to `rulePack.taxBrackets` with the existing local `.find()` logic kept?**
   - What we know: ARCHITECTURE.md Anti-Pattern 2 recommends eventually calling into `calculation-service.ts` to avoid duplicating bracket math logic (not just data) in the UI layer.
   - What's unclear: Whether that refactor belongs in Phase 1 (data correctness) or Phase 5 (component decomposition, which ARCHITECTURE.md's Build Order explicitly sequences the full UI restructuring into).
   - Recommendation: Phase 1 should only fix the DATA source (`TAX_BRACKETS` constant → `rulePack.taxBrackets`), keeping the existing local `.find()`-based `calcTax`/`getMarginalRate` functions structurally as-is (just parameterized by the resolved rulepack instead of a module constant). Redirecting to `calculation-service.ts` entirely is lower-risk to defer to Phase 5 alongside the broader decomposition, since it changes control flow, not just data plumbing, and Phase 1's success criteria are explicitly about data provenance, not code-path consolidation.

## Sources

### Primary (HIGH confidence)
- `.planning/research/FEATURES.md` — verified SARS deemed-cost tables (PAYE-GEN-01-G03-A01, all 3 years read in full from official PDFs), CGT/retirement Budget 2026 figures (direct SARS FAQ fetch), provisional tax R1m/90%/80%/20% (official SARS Guide for Provisional Tax)
- `src/modules/individual-tax/types.ts`, `rulepack-registry.ts`, `rules-2025.ts`, `rules-2026.ts`, `rules-2027.ts` — read directly; confirmed 2027's retirement cap and CGT values are currently WRONG (stale pre-Budget-2026 figures)
- `src/modules/individual-tax/rulepack.test.ts` — read directly; confirmed line 24's `retirement.annualCap === 350000` blanket assertion will need to become year-aware
- `src/components/individual-tax/tax-tools.tsx` (lines 1–150 read per task, plus targeted grep across full 2000+ line file for provisional-tax and year-selector patterns) — confirmed full constant inventory and absence of any tax-year selector
- `.planning/research/ARCHITECTURE.md` — confirmed Pattern 2 (rulepacks not components) and Build Order step 1 sequencing (rulepack extension is the foundational, zero-risk-to-existing-code first step)
- `.planning/research/PITFALLS.md` — Pitfall 1 (wrong-year tables) directly informs the completeness-test requirement

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md`'s own MEDIUM-confidence flags (provisional tax 8%/18-month escalation) — explicitly does not block this phase per the phase's own instructions

### Tertiary (LOW confidence)
- None used for this phase's in-scope values — all LOW/LOW-MEDIUM flagged items (4014/4015 codes, s6B multipliers, R800k actual-cost cap) belong to later phases and are excluded from this document's authoritative-value sections above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure extension of an existing, well-understood pattern
- Architecture: HIGH — directly confirmed against existing `rulepack-registry.ts`/`types.ts`/`rules-20XX.ts` code, no ambiguity in how to extend
- Rate values (deemed-cost, retirement, CGT, provisional safe-harbour): HIGH — sourced from prior research that read official SARS PDFs directly, cross-verified
- Pitfalls: HIGH — grounded in this exact codebase's current bugs (stale 2027 values, hardcoded inline literals, wrong-unit deemed-cost table), not generic advice

**Research date:** 2026-07-02
**Valid until:** Stable — SARS rate data doesn't change until the next Budget cycle; no re-research needed unless SARS issues a mid-year revision to PAYE-GEN-01-G03-A01 or a further Budget update. Recommend treating as valid for the remainder of this milestone.
