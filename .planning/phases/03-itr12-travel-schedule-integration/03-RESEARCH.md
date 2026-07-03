# Phase 3: ITR12 Travel Schedule Integration - Research

**Researched:** 2026-07-03
**Domain:** SA individual income tax calculation engine — wiring a new domain module (logbook, Phase 2) into an existing pure-function schedule calculator (`travel-schedule.ts`) and its async service orchestration layer; SARS source-code/deduction-code compliance verification
**Confidence:** HIGH for architecture/integration seam (direct codebase read of every file in the blast radius); HIGH for SARS source-code semantics (primary-source PDF text extracted and read directly, resolving a prior LOW-MEDIUM-confidence blocker); MEDIUM for the "claim limited to allowance" cap under the actual-cost method specifically (HIGH-confidence primary-source evidence exists for the deemed-cost method; extension to actual-cost is a defensible inference, not an explicit quote)

## Summary

This phase has two genuinely separate halves, and conflating them is the main planning risk. **Half one** is mechanical wiring: `src/modules/individual-tax/schedules/travel-schedule.ts` currently computes a crude `travelAllowance × (businessKm/totalKm)` estimate from manually-typed kilometre fields; it must instead accept an optional, already-resolved `LogbookTravelResult` (Phase 2's output, specifically its `claimedDeduction` field, added in Phase 2 *for this exact purpose*) and use it when present, falling back to the existing estimate when absent. The one non-trivial architectural fact here: `calculateNearEfilingIndividualTaxEstimate` (and everything it calls, including `calculateTravelSchedule`) is a **pure, synchronous function**, while the logbook lookup (`getLogbookForClientYear` → `getLogbookTravelResult`) is **async** (it hits the demo-file/Prisma repository). The only place in the codebase that is both async AND has the `clientId`+`assessmentYear` needed to resolve a logbook is `getIndividualTaxAssessmentResult(assessmentId)` in `src/modules/individual-tax/service.ts` — that is the single integration point where the logbook should be resolved and threaded down as an extra, optional parameter. No other call site needs to change (verified: every consumer of the near-eFiling calculation goes through `getIndividualTaxAssessmentResult`, not a bare form-preview path).

**Half two** is a SARS-compliance correction that the phase's own success criteria demand but that requires primary-source verification, not just plumbing. I fetched and locally text-extracted (via `pdftotext`, since WebFetch cannot parse SARS's PDFs — confirmed again this session, matching Phase 2's finding) the actual **2026-dated** SARS `PAYE-GEN-01-G03` (Guide for Employers in respect of Allowances), `PAYE-AE-06-G06` (Guide for Codes Applicable to Employees Tax Certificates, effective 19 Sept 2025), and `IT-AE-36-G05` (Comprehensive Guide to the ITR12 Income Tax Return, effective 29 June 2026). This resolved the STATE.md blocker directly: **the codebase's existing "4014" deduction code and the WebSearch-suggested "4015" are both being used incorrectly today.** Code 4015 is real but is *narrowly* scoped to commission-earners-without-an-allowance and no-vehicle/public-transport travel claims — not the general vehicle travel claim. Code "4014" does not appear anywhere in either 2026 SARS guide; it is very likely a fabricated placeholder. The standard vehicle-based travel claim (deemed-cost or actual-cost) has **no distinct source code exposed on the ITR12** at all — SARS's own guide describes it as "automatically calculated" from captured vehicle/kilometre/expense fields, the same way this codebase already handles other non-source-coded computed lines (`"NORMAL_TAX"`, `"MEDICAL_CREDIT"`, `"CGT"`, `"IRP6"` are all existing precedent for descriptive pseudo-codes in `calculation-service.ts`). I also confirmed, from a directly-quoted worked example in the 2026 ITR12 guide, a concrete calculation rule the current code does not implement: **the calculated travel claim is capped at the total allowance received** ("If the calculated amount exceeds the allowance received, the claim will be limited to the amount of the allowance") — this is exactly ITR-02's "claim limited to allowance where applicable" requirement, now backed by a primary-source quote instead of a guess.

**Primary recommendation:** Add an optional `logbookResult?: LogbookTravelResult | null` parameter to `calculateTravelSchedule` (and thread it through `calculateNearEfilingIndividualTaxEstimate`/`calculateNearEfilingEstimate`), resolve it in `getIndividualTaxAssessmentResult` via `assessment.clientId` + `assessment.assessmentYear`, apply `Math.min(logbookResult.claimedDeduction, travelAllowance)` as the deduction when a logbook is present, replace the fabricated `"4014"` code with a descriptive pseudo-code (e.g. `"TRAVEL_CLAIM"`), and add an `allowanceType: "FIXED" | "REIMBURSIVE"` field (default `"FIXED"`) to `IndividualTaxTravelInput` so the income line renders as `3701` or `3702` correctly — all as backward-compatible optional additions so every existing test in `schedules.test.ts` and `calculation-service.test.ts` (which never pass a second argument or set `allowanceType`) keeps passing unmodified.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| ITR-01 | Logbook result feeds the ITR12 travel schedule with correct source codes (3701/3702) and verified deduction codes, replacing the allowance×ratio estimate | Primary-source-verified code semantics (Standard Stack / Common Pitfalls below) resolve exactly which codes are correct; `LogbookTravelResult.claimedDeduction` (Phase 2 output) is the concrete data seam to consume; integration point identified at `getIndividualTaxAssessmentResult` |
| ITR-02 | Travel deduction follows SARS method rules (deemed vs actual, claim limited to allowance where applicable); all existing schedule tests keep passing | `costMethod`-driven `claimedDeduction` already resolves deemed-vs-actual per Phase 2's Pitfall-1 guarantee (never a data-presence fallback); the allowance cap is now a primary-source-quoted rule (Code Examples below); backward-compatible optional-parameter design keeps `schedules.test.ts`/`calculation-service.test.ts` green untouched |
</phase_requirements>

## Standard Stack

### Core
No new libraries. This phase is pure wiring inside the existing `src/modules/individual-tax/` and `src/modules/logbook/` modules (both already built, both already use Zod + Vitest + the `isDemoMode`/Prisma repository split). Zero new dependencies are needed.

### Don't-hand-roll items specific to this phase
| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Which SARS code applies to this travel allowance/deduction" | A new lookup table or ad hoc heuristic guessed from context | The verified mapping below (Common Pitfalls), taken directly from the 2026 `PAYE-GEN-01-G03` and `IT-AE-36-G05` guides | This exact question was already guessed wrong twice in this codebase's history (the existing `"4014"` code, and a WebSearch-only pass that suggested `"4015"`) — only primary-source text resolves it |
| Deemed/actual cost calculation | Re-deriving cost-per-km math inside `travel-schedule.ts` | `LogbookTravelResult.claimedDeduction` from `getLogbookTravelResult(logbookId)` (Phase 2, already unit-tested) | Phase 2 explicitly built `claimedDeduction` for this phase to consume; recomputing it here would duplicate logic and risk drift from the rulepack-driven engine |
| Resolving "does this client+year have a logbook" | A new lookup path or duplicated client/year matching logic | `getLogbookForClientYear(clientId, assessmentYear)` then `getLogbookTravelResult(logbook.id)`, both already exported from `src/modules/logbook/service.ts` | Exact existing API; no new repository method needed |

## Architecture Patterns

### The integration seam, precisely

```
src/modules/individual-tax/service.ts
  getIndividualTaxAssessmentResult(assessmentId)   <-- ONLY async function with clientId+assessmentYear
    │
    ├─ assessment = await individualTaxRepository.getAssessmentById(assessmentId)
    │     assessment.clientId        : string | undefined   (nullable — profile.clientId can be null)
    │     assessment.assessmentYear  : number
    │     assessment.assessmentMode  : "LEGACY_SCAFFOLD" | "NEAR_EFILING_ESTIMATE"
    │
    ├─ [NEW] if NEAR_EFILING_ESTIMATE && assessment.clientId:
    │     logbook = await getLogbookForClientYear(assessment.clientId, assessment.assessmentYear)
    │     logbookResult = logbook ? await getLogbookTravelResult(logbook.id) : null
    │
    └─ calc = assessment.assessmentMode === "NEAR_EFILING_ESTIMATE"
                ? calculateNearEfilingEstimate(assessment.nearEfilingInput, logbookResult)   <-- [NEW 2nd arg]
                : calculateLegacyIndividualTaxAssessment({...})                              <-- UNCHANGED, no travel-schedule.ts involvement at all
```

**Critical, easy-to-miss fact:** `calculateLegacyIndividualTaxAssessment` (the `LEGACY_SCAFFOLD` assessment mode, `calculateIndividualTax2026` in `calculation-service.ts`) does **not** call `calculateTravelSchedule` at all — it does flat arithmetic directly on a pre-computed `input.travelDeduction` number. Phase 3's changes are scoped entirely to the `NEAR_EFILING_ESTIMATE` mode / `calculateNearEfilingIndividualTaxEstimate` path. Do not touch `calculateIndividualTax2026`.

**Verified no other call site needs to change:** grepped every usage of `calculateNearEfilingEstimate`/`calculateNearEfilingIndividualTaxEstimate` across `src/` — all production call sites (`[assessmentId]/page.tsx`, `[assessmentId]/edit/page.tsx`, `reports/.../print/page.tsx`, the PDF route) go through `getIndividualTaxAssessmentResult`/`getIndividualTaxReportData`, both of which already have `assessmentId` in scope. There is no "live preview before save" flow that calls the calculation function directly with unsaved form data and no `clientId`.

### Pattern 1: Optional trailing parameter, not a new required input shape

**What:** Add `logbookResult?: LogbookTravelResult | null` as a second, optional parameter on `calculateTravelSchedule`, `calculateNearEfilingIndividualTaxEstimate`, and the `service.ts` wrapper `calculateNearEfilingEstimate`. Do not fold it into `IndividualTaxTravelInput` (that type is Zod-validated user input; a resolved server-side lookup result doesn't belong in a form-input schema) and do not make it a required parameter (would break every existing single-argument call in `schedules.test.ts` and `calculation-service.test.ts`).

**Why this satisfies success criteria 3 & 4 automatically:** Existing tests call `calculateTravelSchedule({...})` and `calculateNearEfilingIndividualTaxEstimate({...})` with exactly one argument. TypeScript/JS allow omitting a trailing optional parameter, so those calls keep compiling and keep their exact current behavior (the crude ratio estimate) with zero test changes — this *is* the "no logbook → unchanged legacy output" and "full existing test suite passes unmodified" criteria, satisfied by construction rather than by extra defensive code.

**Example signature change:**
```typescript
// src/modules/individual-tax/schedules/travel-schedule.ts
import type { LogbookTravelResult } from "@/modules/logbook/types";

export function calculateTravelSchedule(
  input: IndividualTaxTravelInput,
  logbookResult?: LogbookTravelResult | null,
): IndividualTaxScheduleResult {
  if (!input.hasTravelAllowance) {
    return { taxableIncome: 0, deductibleAmount: 0, taxCredits: 0, offsetAmount: 0, lines: [], warnings: [] };
  }

  const sourceCode = input.allowanceType === "REIMBURSIVE" ? "3702" : "3701";
  const sourceDescription =
    input.allowanceType === "REIMBURSIVE" ? "Reimbursive travel allowance" : "Travel allowance";

  let deductibleAmount: number;
  let warnings: IndividualTaxScheduleWarning[] = [];

  if (logbookResult) {
    // SARS-verified cap: the calculated claim can never exceed the allowance received.
    deductibleAmount = r2(Math.min(logbookResult.claimedDeduction, input.travelAllowance));
    warnings = logbookResult.warnings.map((w) => ({ code: w.code, message: w.message }));
  } else {
    // Legacy fallback — UNCHANGED from current behaviour.
    if (input.totalKilometres === 0 || input.businessKilometres === 0) {
      warnings.push({ code: "TRAVEL_LOGBOOK_REQUIRED", message: "Travel claim estimate requires business and total kilometres." });
    }
    const businessRatio = input.totalKilometres > 0 ? Math.min(1, input.businessKilometres / input.totalKilometres) : 0;
    deductibleAmount = r2(input.travelAllowance * businessRatio);
  }

  return {
    taxableIncome: r2(input.travelAllowance),
    deductibleAmount,
    taxCredits: 0,
    offsetAmount: 0,
    lines: [
      { code: sourceCode, description: sourceDescription, amount: r2(input.travelAllowance) },
      { code: "TRAVEL_CLAIM", description: "Travel claim against allowance", amount: deductibleAmount },
    ],
    warnings,
  };
}
```
This is illustrative, not a literal patch — the planner should verify exact field names against the live files at plan time, but the shape (optional 2nd param, cap via `Math.min`, pseudo-code instead of `"4014"`) is the verified-correct approach.

### Pattern 2: Downstream code-filter updates (the second- and third-order blast radius)

Two more files hardcode the exact strings `"3701"` and `"4014"` and must be updated in lockstep or the new `"3702"`/`"TRAVEL_CLAIM"` lines will silently vanish from the calculation totals and the printed report:

1. **`src/modules/individual-tax/calculation-service.ts`** (lines ~360, ~402 in the current file) filters `travel.lines` by `line.code === "3701"` for the income-line list and `line.code === "4014"` for the deduction-line list. These filters must become `line.code === "3701" || line.code === "3702"` and `line.code === "TRAVEL_CLAIM"` (or whatever pseudo-code is chosen) respectively — otherwise a reimbursive (3702) allowance's income line, or the renamed deduction line, drops out of the assembled `incomeLines`/`deductionLines` arrays entirely and the totals/warnings built from them go silently wrong.

2. **`src/modules/individual-tax/report-transformer.ts`** (`buildIncomeGroups` line ~118/145, `buildDeductionRows` line ~251/262) does the same `findLine(calc.incomeLines, "3701")` / `findLine(calc.deductionLines, "4014")` lookups to build the printed ITA34-style report, **and** hardcodes a fake, always-identical narrative string for the deduction row's `computations` field: `"Logbook submitted. Vehicle details: purchase date 2021-03-01, registration ND 458-221, cost price R 485000.00, total kilometres 36210, business kilometres 22140, deemed fuel/maintenance/wear expenditure applied."` — this text is entirely fabricated placeholder copy, unconditionally shown regardless of the actual assessment's real data. For success criterion 1 to be observably true on the artifact a practitioner actually looks at (the printed report, not just the raw `IndividualTaxCalculation` object), this hardcoded string needs to be replaced with the real `computations` value already present on the deduction line (the codebase's own established pattern elsewhere in this same function is `findLine(calc.incomeLines, "3704")?.computations ?? "fallback text"` — reuse that pattern here rather than a hardcoded literal).

### Anti-Patterns to Avoid

- **Making `calculateNearEfilingIndividualTaxEstimate` or `calculateTravelSchedule` async.** Every other schedule function in `src/modules/individual-tax/schedules/` is synchronous and pure; introducing one async schedule function breaks the uniform pattern the rest of `calculation-service.ts` relies on (it calls all seven schedule functions synchronously in sequence to build running totals). Resolve the logbook *before* calling into the calculation layer, in `service.ts`.
- **Recomputing deemed/actual cost inside `travel-schedule.ts`.** That work is Phase 2's, already done, already unit-tested, and exposed exactly for this purpose via `LogbookTravelResult.claimedDeduction`. Phase 3 should apply the allowance cap and pick the SARS code, nothing more.
- **Skipping the `report-transformer.ts`/`calculation-service.ts` filter updates.** These are not optional cleanup — if the deduction line's code changes from `"4014"` to anything else without updating the `findLine(...)` call sites, the travel deduction silently disappears from both the aggregate totals math and the printed report (a `?? 0` fallback masks the bug instead of erroring).
- **Treating `assessment.clientId` as always present.** It's `string | undefined` in `IndividualTaxAssessmentRecord` (backed by a nullable `IndividualTaxProfile.clientId` in `prisma/schema.prisma`). An assessment with no linked client cannot have a logbook looked up — this must resolve to `logbookResult = null` (the legacy-estimate fallback path), not throw.
- **Assuming multiple vehicles/logbooks per client per year.** `getLogbookForClientYear` returns a single `LogbookRecord | null` via `.find()`/`findFirst()` in the repository — the data model is one logbook per client+assessmentYear (matches LOG-01's phrasing). The 2026 ITR12 guide's own worked "Example 2" shows SARS supports multiple vehicles with combined-then-capped claims, but that is out of this phase's and Phase 2's scope; do not attempt to generalize to multiple logbooks per year without an explicit scope discussion.

## Common Pitfalls

### Pitfall 1: The existing "4014" deduction code is very likely fabricated — do not propagate it
**What goes wrong:** Assuming the pre-existing `"4014"`/`"Travel claim against allowance"` code in `travel-schedule.ts`, `calculation-service.ts`, and `report-transformer.ts` is correct simply because it's already there and "looks like" a plausible SARS code.
**Why it happens:** It has the right shape (`40xx`, a real deduction-code range — e.g. `4029` retirement, `4013` donations, `4028` home office all exist in that range) and nothing in the existing test suite challenges it.
**Evidence (HIGH confidence, primary source):** I fetched and `pdftotext`-extracted the full text of SARS's `IT-AE-36-G05` "Comprehensive Guide to the ITR12 Income Tax Return for Individuals" (Revision 40, **Effective Date: 29 June 2026** — current for this milestone's 2025–2027 scope) — a 144-page, ~10,100-line document. Grepping the entire extracted text for `4014` returns **zero matches**, anywhere in the document, including its section 10.5 ("TRAVEL CLAIM AGAINST ALLOWANCE - SECTION 8(1)(b)", the section that specifically describes the deemed-cost/actual-cost vehicle claim). The same zero-match result holds against `PAYE-AE-06-G06` (Guide for Codes Applicable to Employees Tax Certificates, effective 19 Sept 2025), which is the SARS document that catalogues numeric codes exhaustively.
**What the guide says instead:** Section 10.5.4 states the travel claim (whichever method — actual or fixed-cost/deemed) "will be automatically calculated" by SARS from the vehicle/kilometre/expense fields the taxpayer captures in the wizard — it is never itself entered against a manually-referenced source code the way, e.g., home office (`4028`) or donations (`4011`) are. The nearest real, documented "travel expense" deduction code is **`4015`**, but per section 10.8.5 ("TRAVEL EXPENSES (E.G. COMMISSION INCOME)"), `4015` is narrowly scoped to (a) commission earners with no travel allowance who kept a logbook, where commission income exceeds 50% of total IRP5 income, or (b) taxpayers with no vehicle who used public transport (Uber, Gautrain) for business travel, capped at the sum of codes 3701+3702+3722. **This is not the general vehicle travel claim** this codebase computes — this directly confirms and resolves the STATE.md blocker's suspicion ("4015 may be commission-income-specific").
**How to avoid:** Replace `"4014"` with a descriptive, non-numeric pseudo-code (e.g. `"TRAVEL_CLAIM"`), following the exact precedent already established elsewhere in `calculation-service.ts` for computed values that don't map to a single SARS source code (`"NORMAL_TAX"`, `"REBATES"`, `"MEDICAL_CREDIT"`, `"CGT"`, `"IRP6"`, `"PREV_ASSESSMENT"`, `"NET_RESULT"` are all existing non-numeric codes in the same file).
**Warning signs:** Any new test asserting `line.code === "4014"` — that would be locking in the same unverified guess rather than fixing it.

### Pitfall 2: Conflating 3701/3702 income-side labelling with the deduction calculation
**What goes wrong:** Assuming "distinct calculation paths" (ITR-01's phrasing) means the deemed/actual-cost math itself differs between a 3701 and a 3702 allowance.
**Why it happens:** The requirement text pairs "source codes 3701/3702" with "distinct calculation paths," which reads ambiguously.
**Evidence (HIGH confidence, primary source, `PAYE-GEN-01-G03` 2026 edition + `IT-AE-36-G05`):** 3701 is a **fixed** travel allowance (set periodic amount); 3702 is a **taxable reimbursive** travel allowance (paid per actual business km, taxable because it either exceeds the prescribed rate, exceeds — pre-2019 — a kilometre threshold, or is paid *alongside* a 3701 allowance). Critically: "On assessment of the individual's ... personal income tax return, SARS will combine the codes 3702 + 3722 + 3701 and the employee can be entitled to claim expenses incurred for business travel as a deduction on assessment against all values" (`PAYE-GEN-01-G03`, section 3.2, worked example). In other words: **the deduction math (deemed-cost or actual-cost, per the logbook's elected method) is identical regardless of whether the income was declared under 3701 or 3702** — what differs is only (a) which source code the income line is labelled with, and (b) the total "allowance received" figure the deduction gets capped against (which should be the sum of whichever codes are present, not just one).
**How to avoid:** Add an `allowanceType: "FIXED" | "REIMBURSIVE"` (or similarly named) field purely to control the **income line's** source code (`3701` vs `3702`) and description; feed the same `LogbookTravelResult.claimedDeduction`, capped at the same `travelAllowance` total, through both paths. Do not build two different deduction-calculation code branches.
**Warning signs:** A `switch (allowanceType)` inside the deduction-calculation logic itself, rather than only around the income-line construction.

### Pitfall 3: Forgetting the allowance cap is a real, quoted SARS rule — not a nice-to-have
**What goes wrong:** Wiring `LogbookTravelResult.claimedDeduction` straight into `deductibleAmount` without capping it against `input.travelAllowance`.
**Why it happens:** Phase 2's `claimedDeduction` is deliberately allowance-agnostic (the logbook module has no concept of "allowance received" at all — it only knows vehicle cost, kilometres, and elected method) — it's easy to assume the raw figure is already the final claim.
**Evidence (HIGH confidence for deemed-cost, primary source, `IT-AE-36-G05` section 10.5.4, two full worked examples):** Example 1: allowance R48,000, calculated deemed-cost claim R46,084.50 (below allowance, claim = R46,084.50, uncapped). Example 2 (two vehicles): allowance R48,000, combined calculated claim R66,425 — the guide states explicitly: *"As the calculated amount exceeds the allowance received the claim will be limited to the amount of the allowance (i.e. R48,000)."* This is a direct quote, not paraphrase.
**Extension to actual-cost method (MEDIUM confidence):** The same `IT-AE-36-G05` section does not re-state the cap explicitly under "TRAVELLING EXPENSES BASED ON ACTUAL EXPENSES" (10.5.4b) — both calculation methods live under the same statutory umbrella (section 8(1)(b), same section header, same "claim against allowance" framing), and secondary sources (e.g. taxconsulting.co.za, cross-referenced in Phase 2's research) treat the cap as applying regardless of method. Treat this as MEDIUM confidence and apply the cap uniformly to both methods; flag for a professional-review comment if the planner wants extra caution, consistent with this codebase's existing `reviewRequired`/TODO-flagging conventions (see Phase 2's finance-charge-cap flag for precedent).
**How to avoid:** `finalClaim = Math.min(logbookResult.claimedDeduction, input.travelAllowance)`, applied once, regardless of `costMethod`.
**Warning signs:** A test with a small allowance and a large logbook-computed deduction where the assertion expects the uncapped (larger) figure.

### Pitfall 4: `assessment.clientId` is optional — the "no client" case is a second fallback path, not an error
**What goes wrong:** `getLogbookForClientYear(assessment.clientId, ...)` called without a null-check, or wrapped in a try/catch that masks a real bug as "no logbook."
**Why it happens:** Most demo-mode fixture assessments probably do have a `clientId`, so this edge case is easy to miss until a real user creates a standalone assessment not linked to a client record.
**Evidence:** `IndividualTaxAssessmentRecord.clientId` is typed `string | undefined` (`src/modules/shared/types.ts` line 126); `IndividualTaxProfile.clientId` is `String?` (nullable) in `prisma/schema.prisma` line 1028; `getIndividualTaxReportData` in `service.ts` already defends this exact case (`result.assessment.clientId ? await getClientById(...) : null`) — reuse that same conditional pattern for the logbook lookup.
**How to avoid:** `const logbookResult = assessment.clientId ? await resolveLogbookResult(assessment.clientId, assessment.assessmentYear) : null;` — this is functionally the same code path as "logbook not found," which already correctly falls back to the legacy estimate (success criterion 3), so no special-casing is needed beyond the null guard.

### Pitfall 5: Two more hardcoded income-line codes in `report-transformer.ts` are also wrong, but are NOT this phase's problem
**What goes wrong:** Widening scope to "fix all the wrong codes in the report" once one is found.
**Evidence:** While verifying codes, I found `report-transformer.ts`'s always-zero placeholder rows `"3713"` ("Other travel payments") and `"3825"` ("Taxable benefits and allowances") are also mislabeled per `PAYE-AE-06-G06`: **3713** is actually "Other allowances" (a rollup of misc. non-travel allowances like computer/telephone use), and **3825** is actually "Non-taxable benefit on acquisition of immovable property." Neither has anything to do with travel or general taxable benefits.
**Why this is flagged but out of scope:** These rows are always `amountAssessed: 0` placeholders unconnected to any calculation-engine output (unlike 3701/4014 which this phase actively drives) and ITR-01/ITR-02 don't mention them. Fixing them is a reasonable adjacent cleanup but would expand this phase's diff surface without being required by its success criteria.
**Recommendation:** Leave a note for the planner/practitioner-review backlog; do not silently fix or silently ignore — flag explicitly so it isn't mistaken for "already verified."

## Code Examples

### Verified SARS source-code table (2026 editions of `PAYE-GEN-01-G03` and `PAYE-AE-06-G06`, both fetched and text-extracted this session)

| Code | Meaning | Taxable at payroll (PAYE)? | Can a logbook deduction be claimed against it on ITR12? |
|------|---------|------|------|
| **3701** | Fixed travel allowance (any allowance/advance paid at a set rate per pay period) | Yes — 80% (or 20% if employer certifies ≥80% business use) | Yes |
| **3702** | Reimbursive travel allowance, taxable case: used when the reimbursement rate exceeds the prescribed rate, OR the employee also receives a 3701 allowance | No PAYE withheld at payment time, but combined with 3701/3722 on assessment | Yes (combined with 3701/3722 for the "allowance received" total) |
| **3703** | Reimbursive travel allowance, non-taxable case: rate ≤ prescribed rate AND no other travel compensation paid | No | **No** — "You cannot claim any deductions against this allowance" (`IT-AE-36-G05` §10.5, verbatim) |
| **3722** | Taxable reimbursive travel allowance *above* the prescribed rate per km (the excess portion specifically) | Yes, on the excess only | Yes (combined with 3701/3702) |
| **4015** | "Travel expenses (e.g. commission income)" — narrow: commission earners w/o an allowance, or no-vehicle/public-transport claims | N/A (taxpayer-entered ITR12 field) | N/A — different claim type entirely, not the vehicle deemed/actual-cost claim |
| **"4014"** | **Not found in either 2026 SARS guide.** Currently hardcoded in this codebase. | — | Should be replaced with a descriptive pseudo-code; no verified numeric replacement exists because the standard vehicle claim has no exposed source code on the ITR12 (see Pitfall 1) |

### Deemed-cost table cross-check (informational — already Phase 1's responsibility, not this phase's)
The `IT-AE-36-G05` guide's own published 2026 and 2027 fixed-cost/fuel/maintenance cost-scale tables (section 10.5.4c) are present verbatim in the extracted text and match the bracket structure already implemented in Phase 1's rulepack (`travelDeemedCostTable`) — e.g. the 2027 table's first real bracket is `115 001 – 230 000: R38,344 fixed / 132.9c fuel / 49.1c maintenance`, consistent with Phase 1's R115k-increment bracket design noted in STATE.md. This is a nice independent confirmation that Phase 1's data is correct; no action needed in Phase 3, but worth knowing this is now independently corroborated against the actual 2026-dated guide rather than only secondary sources.

### Worked example confirming the allowance cap (quoted, `IT-AE-36-G05` p.115)
> "Total deduction claimed in respect of the full year: R42,912 + R23,513 = R66,425 ... As the calculated amount exceeds the allowance received the claim will be limited to the amount of the allowance (i.e. R48,000)."

## Open Questions

1. **Does the UI (`estimate-wizard.tsx`) need an `allowanceType` selector this phase, or can it default silently to `"FIXED"`/3701?**
   - What we know: `src/components/individual-tax/estimate-wizard.tsx` is a real, working client-side wizard (Step 3 "Travel") with hidden-input form fields feeding `parseNearEfilingEstimateFormData`. It currently has no allowance-type toggle. None of Phase 3's four stated success criteria mention UI.
   - What's unclear: Whether shipping 3702/reimbursive support with no way for a practitioner to actually select it (always defaulting to 3701/FIXED) is an acceptable phase boundary, deferring the UI toggle to Phase 6 ("Logbook UI, Import Wizard & Performance Hardening" per the roadmap), or whether a minimal radio/checkbox belongs in this phase for the feature to be reachable at all.
   - Recommendation: Default to backend-only (type + calculation support for both codes, UI defaults to FIXED, no wizard changes) to match this phase's stated scope and Phase 2's precedent (Phase 2 shipped a full service+repository layer with zero UI). Flag explicitly for the planner to confirm rather than assume.

2. **Exact form of the "linked logbook" signal on the near-eFiling assessment UI (success criterion 1's observability).**
   - What we know: `getIndividualTaxAssessmentResult` will now silently pick a logbook if one exists for the client+year; there's currently no UI affordance showing "a logbook was found and used" vs. "using the manual estimate."
   - What's unclear: Whether success criterion 1 ("shows a travel deduction ... computed from real logbook data") is satisfied by the *report* narrative text alone (fixed by Pitfall 2's `report-transformer.ts` correction) or whether the practitioner-facing assessment view/edit page also needs an indicator.
   - Recommendation: At minimum, ensure the `computations` string on the deduction line (surfaced in both the raw calculation and the printed report once Pitfall 2's fix lands) distinguishes "Logbook-based claim (DEEMED/ACTUAL method)" from "Estimated claim (no logbook on file)" — this alone makes the criterion observable without new UI surface area. Confirm with planner whether that's sufficient.

3. **Should `LogbookTravelResult.warnings` be surfaced as schedule-level warnings, and if so, does that change `reviewRequired` on the overall calculation?**
   - What we know: `IndividualTaxScheduleResult.warnings` already exists as a mechanism (used today for `TRAVEL_LOGBOOK_REQUIRED`); `calculateNearEfilingIndividualTaxEstimate` already sets `reviewRequired: warnings.length > 0` at the top level, folding in `travel.warnings`.
   - What's unclear: Whether surfacing e.g. an odometer-continuity warning from the logbook (a Phase 2 concept) should also flip `reviewRequired` to `true` on the whole assessment — almost certainly yes given the existing pattern, but worth an explicit plan-time decision rather than an implicit one.
   - Recommendation: Map `LogbookTravelResult.warnings` into `IndividualTaxScheduleWarning[]` and let them flow through the existing `warnings.length > 0 → reviewRequired` mechanism unchanged — no new logic needed, just confirm the mapping happens.

## Validation Architecture

Skipped — `.planning/config.json`'s `workflow` object contains only `research`, `plan_check`, and `verifier` keys; there is no `nyquist_validation` key, so per the researcher's own instructions this section is omitted. Standard guidance: this phase's tests should extend `src/modules/individual-tax/schedules/schedules.test.ts` (new cases: logbook present + deemed election, logbook present + actual election, logbook present but claim exceeds allowance → capped, no logbook → legacy path unchanged) and `src/modules/individual-tax/calculation-service.test.ts` (assert `line.code` values for both `3701`/`3702` paths and the new deduction pseudo-code), run via `npm run test` (Vitest 4, `vitest run`). The existing `schedules.test.ts` "estimates travel allowance claims and warnings" test and all of `calculation-service.test.ts`'s near-eFiling tests must be re-run and confirmed unchanged/green as the literal verification of success criterion 4 — they call the functions with exactly one argument today and must continue to do so untouched.

## Sources

### Primary (HIGH confidence)
- Direct codebase reads (this session, full-file or targeted): `src/modules/individual-tax/schedules/travel-schedule.ts`, `schedules/employment-schedule.ts`, `schedules/schedules.test.ts`, `calculation-service.ts`, `calculation-service.test.ts`, `service.ts`, `repository.ts`, `types.ts`, `validation.ts`, `near-efiling-form.ts`, `report-transformer.ts`, `report-transformer.test.ts`; `src/modules/logbook/types.ts`, `service.ts`, `repository.ts`; `src/modules/shared/types.ts`; `prisma/schema.prisma` (`IndividualTaxProfile`, `IndividualTaxAssessment`, `Vehicle`, `Logbook`, `LogbookTrip` models); `package.json` (test scripts)
- SARS `IT-AE-36-G05` — "Comprehensive Guide to the ITR12 Income Tax Return for Individuals," Revision 40, **Effective Date: 29 June 2026** — fetched via WebFetch (binary PDF, unparseable by the tool directly, same failure mode Phase 2 already documented) then locally converted with `pdftotext -layout` and read directly (section 10.5 "Travel Claim Against Allowance," section 10.5.4 "Travelling Expenses," section 10.8.5 "Travel Expenses (e.g. Commission Income)," and full-document grep for `4014`/`4015`/`3701`/`3702`/`3703`/`3722`)
- SARS `PAYE-GEN-01-G03` — "Guide for Employers in respect of Allowances," Revision 15, **Effective Date: 01 March 2026** — same fetch+extract method; sections 3.1–3.2 (Travel Allowance, Reimbursive Travel Allowance, worked examples with the 3701/3702/3722 combination rule)
- SARS `PAYE-AE-06-G06` — "Guide for Codes Applicable to Employees Tax Certificates," Revision 13, **Effective Date: 19 September 2025** — same fetch+extract method; full source-code definition table for 3701/3702/3703/3722/3713/3825
- `.planning/phases/02-logbook-domain-module/02-RESEARCH.md`, `02-*-SUMMARY.md` — Phase 2's completed output (`LogbookTravelResult`/`claimedDeduction`, `getLogbookTravelResult`, repository methods) consumed directly, no re-verification needed
- `.planning/STATE.md` — the exact blocker text this research resolves ("Phase 3/ITR12: exact deduction codes 4014/4015 are LOW-MEDIUM confidence...")

### Secondary (MEDIUM confidence)
- WebSearch cross-checks (multiple queries) on 3701/3702/3703 semantics and 4014/4015 — all secondary summaries were noisy/contradictory (one explicitly reversed 4014/4015's meanings relative to the verified primary source), which is exactly why the PDF text-extraction step was necessary rather than relying on WebSearch synthesis alone; retained here only as the reason the primary-source dive was triggered, not as evidence in its own right

### Tertiary (LOW confidence — not relied upon)
- Initial WebFetch attempts directly against the SARS PDF URLs (before local `pdftotext` conversion) returned "binary/unparseable" for all three guides — consistent with Phase 2's identical finding; superseded by the `pdftotext` extraction approach documented above

## Metadata

**Confidence breakdown:**
- Standard stack / architecture (integration seam, async boundary, blast-radius files): HIGH — every claim verified by direct, full-file codebase reads this session, not inference
- SARS source-code semantics (3701/3702/3703/3722, and the 4014→invalid / 4015→narrow-scope finding): HIGH — primary-source PDF text, current (2025/2026-dated) editions, cross-confirmed across two independent SARS guides
- Allowance-cap rule for deemed-cost method: HIGH — direct quote with two full worked numeric examples
- Allowance-cap rule extended to actual-cost method: MEDIUM — same statutory section, consistent secondary-source treatment, but not explicitly re-quoted for that specific method in the fetched text
- Open Questions (UI scope, warning-surfacing): not a confidence question — genuinely undecided phase-boundary calls for the planner

**Research date:** 2026-07-03
**Valid until:** The SARS-code findings are tied to specific, dated guide revisions (`IT-AE-36-G05` Rev 40 eff. 29 June 2026, `PAYE-GEN-01-G03` Rev 15 eff. 01 March 2026, `PAYE-AE-06-G06` Rev 13 eff. 19 Sept 2025) — stable for this milestone's 2025–2027 assessment-year scope; re-verify only if SARS issues a newer revision of any of these three guides before implementation. Architecture/integration findings have no expiry (internal codebase state, current as of this commit).
