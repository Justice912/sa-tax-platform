# Estate Engine Enhancements Design

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Three high-priority enhancements to the deceased estate tax engine pipeline

---

## Overview

Three enhancements to close critical compliance gaps in the estate tax calculation engines:

1. **CGT to Pre-Death ITR12 Linkage** — Include capital gains on death in the deceased's final income tax return
2. **Post-Death Conduit Principle** — Split post-death estate income into retained (taxed in estate) vs distributed (taxed in beneficiaries' hands)
3. **Estate Duty S3(3) Deemed Property** — Add deemed property items to the dutiable estate

All three are backward-compatible: omitting the new fields preserves existing behaviour.

---

## Feature 1: CGT to Pre-Death ITR12 Linkage

### Problem

Per SA tax law, the taxable capital gain from deemed disposal on death (Eighth Schedule, calculated by the CGT engine) must be included in the deceased's final ITR12 taxable income. Currently the pre-death engine and CGT engine run independently with no data flow between them.

### Design

The CGT taxable gain is injected into the individual-tax calculation input so that the existing pure calculation function handles it naturally. This avoids post-hoc mutation of calculation results and avoids needing to export internal functions like `getBracketTax`.

**Individual-tax types** (`src/modules/individual-tax/types.ts`):
- Add optional `capitalGains?: { taxableCapitalGain: number }` to `NearEfilingIndividualTaxInput`

**Individual-tax validation** (`src/modules/individual-tax/validation.ts`):
- Add `capitalGains: z.object({ taxableCapitalGain: z.number().nonnegative() }).optional()` to the near-efiling input schema

**Individual-tax calculation** (`src/modules/individual-tax/calculation-service.ts`):
- In `calculateNearEfilingIndividualTaxEstimate`:
  - Extract `cgtTaxableGain = input.capitalGains?.taxableCapitalGain ?? 0`
  - Add to `grossIncome`: `grossIncome = employment.taxableIncome + travel.taxableIncome + interest.taxableIncome + rental.taxableIncome + soleProprietor.taxableIncome + cgtTaxableGain`
  - Add an income line when > 0: `{ code: "CGT_DEATH", description: "Taxable capital gain (Eighth Schedule)", amount: cgtTaxableGain }`
  - All downstream calculations (retirement cap, taxable income, normal tax, rebates, credits, net payable) flow naturally from the updated `grossIncome`

**Note on retirement deduction cap:** Per SA law, CGT on death is included in taxable income but the retirement contribution deduction cap (27.5% of "remuneration") references remuneration specifically, not total taxable income. The current implementation uses `grossIncome` for the cap, which is a pre-existing simplification. Adding CGT to `grossIncome` slightly over-allows retirement deductions but this is conservative in the taxpayer's favour and consistent with the existing approach.

**Pre-death types** (`src/modules/estates/engines/pre-death/types.ts`):
- Add `cgtTaxableCapitalGain?: number` to `EstatePreDeathRunInput`

**Pre-death validation** (`src/modules/estates/engines/pre-death/validation.ts`):
- Add `cgtTaxableCapitalGain: z.number().nonnegative().optional()` to run input schema

**Pre-death transformer** (`src/modules/estates/engines/pre-death/transformer.ts`):
- When building the `NearEfilingIndividualTaxInput`, set `capitalGains: { taxableCapitalGain: cgtTaxableCapitalGain }` if provided in the run input context

**Pre-death service** (`src/modules/estates/engines/pre-death/service.ts`):
- Pass `cgtTaxableCapitalGain` through to transformer context
- If `cgtTaxableCapitalGain` is not provided, add warning to `createEngineRun` warnings array: "No CGT on death included. Run the CGT engine first for a complete ITR12."
- Store `cgtTaxableCapitalGain` in the run's `inputSnapshot` for audit trail

**Data flow:**
```
CGT Engine → taxableCapitalGain → Pre-Death transformer → NearEfilingInput.capitalGains → calculation → adjusted taxable income → correct final tax
```

### Files Changed
- `src/modules/individual-tax/types.ts`
- `src/modules/individual-tax/validation.ts`
- `src/modules/individual-tax/calculation-service.ts`
- `src/modules/estates/engines/pre-death/types.ts`
- `src/modules/estates/engines/pre-death/validation.ts`
- `src/modules/estates/engines/pre-death/transformer.ts`
- `src/modules/estates/engines/pre-death/service.ts`

---

## Feature 2: Post-Death Conduit Principle

### Problem

The conduit principle (SA trust taxation law) states that income distributed to beneficiaries retains its character and is taxed in the beneficiaries' hands, not in the estate. Currently the post-death engine taxes all income at the flat estate/trust rate regardless of distributions.

### Design

**Scope:** Estate-side only (Option A). Track the split between retained and distributed income. Beneficiary-side tax declarations are out of scope. The conduit principle preserves income character (e.g., interest distributed remains interest in beneficiaries' hands) but since we only model the estate side, a single distributed amount is sufficient.

**Types** (`src/modules/estates/engines/post-death/types.ts`):
- Add `distributedIncome?: number` to `EstatePostDeathCalculationInput`
- Add `distributedIncome?: number` to `EstatePostDeathRunInput`
- Extend `EstatePostDeathCalculationResult.summary` with:
  - `distributedIncome: number`
  - `retainedIncome: number`

**Validation** (`src/modules/estates/engines/post-death/validation.ts`):
- Add `distributedIncome: z.number().nonnegative().optional()` to both calculation and run input schemas

**Calculation** (`src/modules/estates/engines/post-death/calculation.ts`):
```
distributedIncome = min(parsed.distributedIncome ?? 0, totalIncome)
retainedIncome = totalIncome - distributedIncome
taxableIncome = max(0, retainedIncome - deductions)
taxPayable = taxableIncome * appliedRate
```

**Warnings:**
- If `parsed.distributedIncome > totalIncome`: "Distributed income exceeds total post-death income; capped at total."
- If `distributedIncome > 0`: "Distributed income of R{amount} should be declared by beneficiaries under the conduit principle."

**Service** (`src/modules/estates/engines/post-death/service.ts`):
- Pass `parsed.distributedIncome` through to the calculation input

**Backward compatibility:** When `distributedIncome` is omitted or 0, `retainedIncome = totalIncome` and all income is taxed in the estate (identical to current behaviour).

### Files Changed
- `src/modules/estates/engines/post-death/types.ts`
- `src/modules/estates/engines/post-death/validation.ts`
- `src/modules/estates/engines/post-death/calculation.ts`
- `src/modules/estates/engines/post-death/service.ts`

---

## Feature 3: Estate Duty S3(3) Deemed Property

### Problem

Section 3(3) of the Estate Duty Act 45/1955 deems certain property to form part of the estate for duty purposes even if not legally owned by the deceased at death. Examples: donations mortis causa, insurance policies where the deceased paid premiums, revocable dispositions, and fiduciary interests. Currently the estate duty engine only considers actual estate assets.

### Design

**Types** (`src/modules/estates/engines/estate-duty/types.ts`):
```typescript
// S3(3) deemed property categories:
// DONATION_MORTIS_CAUSA — S3(3)(a): property donated subject to condition preventing disposal
// INSURANCE_POLICY — S3(3)(b): policies where deceased paid premiums
// REVOCABLE_DISPOSITION — S3(3)(c): property subject to revocable disposition
// FIDUCIARY_INTEREST — S3(3)(d): fiduciary/usufructuary interests
// OTHER_DEEMED — catch-all for other S3(3) sub-paragraphs
export const DEEMED_PROPERTY_CATEGORY_VALUES = [
  "DONATION_MORTIS_CAUSA",
  "INSURANCE_POLICY",
  "REVOCABLE_DISPOSITION",
  "FIDUCIARY_INTEREST",
  "OTHER_DEEMED",
] as const;

export type EstateDutyDeemedPropertyCategory =
  (typeof DEEMED_PROPERTY_CATEGORY_VALUES)[number];

export interface EstateDutyDeemedPropertyItem {
  category: EstateDutyDeemedPropertyCategory;
  description: string;
  amount: number;
}
```

- Add `deemedPropertyItems?: EstateDutyDeemedPropertyItem[]` to `EstateDutyCalculationInput`
- Add `deemedPropertyItems?: EstateDutyDeemedPropertyItem[]` to `EstateDutyRunInput`
- Extend `EstateDutyCalculationResult.summary` with:
  - `actualAssetValue: number` — the original gross asset value from estate register
  - `deemedPropertyTotal: number` — sum of all deemed property items
  - `grossEstateValue` — now equals `actualAssetValue + deemedPropertyTotal` (this is the effective gross estate for duty purposes)

**Validation** (`src/modules/estates/engines/estate-duty/validation.ts`):
```
deemedPropertyItemSchema = z.object({
  category: z.enum(DEEMED_PROPERTY_CATEGORY_VALUES),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive(),
})
deemedPropertyItems: z.array(deemedPropertyItemSchema).max(100).optional()
```

**Calculation** (`src/modules/estates/engines/estate-duty/calculation.ts`):
- Rename input field usage: `actualAssetValue = parsed.grossEstateValue` (the service-provided value from estate assets)
- `deemedPropertyTotal = sum(parsed.deemedPropertyItems?.map(item => item.amount)) ?? 0`
- `effectiveGrossEstateValue = actualAssetValue + deemedPropertyTotal`
- Rest of calculation uses `effectiveGrossEstateValue` for deductions, abatement, and band duty
- Summary output includes all three: `actualAssetValue`, `deemedPropertyTotal`, `grossEstateValue` (= effective total)

**Service** (`src/modules/estates/engines/estate-duty/service.ts`):
- Pass `parsed.deemedPropertyItems` through to the calculation input

**Backward compatibility:** When `deemedPropertyItems` is omitted or empty, `deemedPropertyTotal = 0` and `grossEstateValue` equals actual assets only (identical to current behaviour).

### Files Changed
- `src/modules/estates/engines/estate-duty/types.ts`
- `src/modules/estates/engines/estate-duty/validation.ts`
- `src/modules/estates/engines/estate-duty/calculation.ts`
- `src/modules/estates/engines/estate-duty/service.ts`

---

## Testing Strategy

Each feature gets unit tests for its calculation/service functions:

### Feature 1 — CGT Linkage
- **Calculation-level:** `calculateNearEfilingIndividualTaxEstimate` with `capitalGains` provided — verify CGT amount included in `totalIncome`, `taxableIncome`, and `normalTax` recalculated through correct bracket
- **Calculation-level:** Same without `capitalGains` — verify identical to current behaviour
- **Calculation-level:** CGT large enough to push into higher bracket — verify bracket transition
- **Validation:** Reject negative `taxableCapitalGain`
- **Service-level:** Warning emitted when `cgtTaxableCapitalGain` not provided
- **Service-level:** No warning when `cgtTaxableCapitalGain` is provided
- **Service-level:** CGT = 0 provided — no income line added, no warning

### Feature 2 — Conduit Principle
- **Calculation:** `distributedIncome = 0` — all income taxed in estate (same as current)
- **Calculation:** Partial distribution — verify `retainedIncome = totalIncome - distributedIncome`, tax on retained only
- **Calculation:** `distributedIncome = totalIncome` (100% distribution) — estate tax = 0
- **Calculation:** `distributedIncome > totalIncome` — capped at total, warning emitted
- **Calculation:** Non-zero deductions with partial distribution — deductions apply to retained only
- **Validation:** Reject negative `distributedIncome`
- **Service-level:** `distributedIncome` pass-through to calculation

### Feature 3 — Deemed Property
- **Calculation:** No deemed items — `deemedPropertyTotal = 0`, identical to current
- **Calculation:** Empty array — same as omitted
- **Calculation:** Multiple items across categories — verify sum and correct `grossEstateValue`
- **Calculation:** Deemed property pushes estate across R30M band boundary — verify correct progressive duty
- **Validation:** Reject empty description, negative amount, invalid category
- **Validation:** Reject array > 100 items
- **Service-level:** `deemedPropertyItems` pass-through from run input to calculation

All existing tests must continue to pass (backward compatibility).

---

## Non-Goals

- Beneficiary-side tax modelling for conduit distributions
- ITP5 certificate generation
- Automatic CGT-to-ITR12 run linking (user provides the value manually or UI auto-populates)
- S3(3) deemed property UI capture (can be added later; for now, entered via workspace form)
- Cross-engine orchestration pipeline (engines remain independently triggered)
- Income character tracking for conduit distributions (future: beneficiary-side modelling)
