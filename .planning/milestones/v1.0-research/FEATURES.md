# Feature Landscape: SARS Individual Tax Compliance (Travel Logbook + Calculators)

**Domain:** South African individual tax practice software — SARS-compliant travel logbook and individual tax calculators (2025–2027 years of assessment)
**Researched:** 2026-07-02

This is a compliance domain, not a UX-differentiation domain. "Table stakes" here means **legally required to survive a SARS audit or produce a correct ITR12** — not merely expected by users. Sources are official SARS PDFs/pages unless noted; every numeric value below has a confidence level per the research protocol.

---

## Table Stakes

Features required for the platform's outputs to be legally defensible on SARS audit and for the ITR12 travel schedule to be arithmetically correct. Missing any of these means the product's core compliance claim is false.

| Feature | Why Required | Complexity | Notes |
|---|---|---|---|
| Per-vehicle logbook with opening/closing odometer readings for the full tax year (1 March–end Feb) | SARS: "Without these readings, you cannot claim a tax deduction." Confirmed in the official 2025/26 eLogbook PDF as the primary compulsory data point. | Low | One vehicle = one logbook; a second vehicle used in-year requires a separate logbook (SARS eLogbook, p.2). |
| Per-trip fields: Date, business kilometres, From, To, Reason | These are the **compulsory minimum fields** per the official SARS eLogbook template. Per-trip opening/closing odometer are explicitly marked "*not compulsory*" on the official form — only the date + business km + from/to/reason are mandatory. | Low | Confirmed verbatim from official 2025/26 SARS eLogbook PDF, "PRIMARY INFORMATION TO BE FURNISHED BY A TAXPAYER AS REQUIRED BY SARS" section. HIGH confidence — this corrects an over-strict assumption; per-trip odometer is a nice-to-have, not mandatory. |
| Exclusion of home-to-work travel | SARS explicitly disallows ordinary commuting as business travel; a logbook/tool that lets this be claimed produces a defective return. | Low | Must be enforced/flagged in UI, not just documented. |
| Vehicle value capture (cost price/value) at acquisition, per SARS §8(1)(b) valuation rules | The deemed-cost table lookup and wear-and-tear base both depend on vehicle "value" as legally defined (cash cost incl. VAT, excl. finance charges; or market value + notional VAT if not arm's-length/purchased). | Medium | Three distinct valuation rules depending on how the vehicle was acquired (purchase, instalment-sale/lease, other) — see official Rate per Kilometre Schedule §1.3. Needs a value source field, not just a number. |
| Deemed cost method: correct per-year cost-scale table (fixed cost, fuel c/km, maintenance c/km) by vehicle value bracket | This IS the calculation SARS mandates for the deemed method — wrong table/wrong year materially misstates the deduction. See exact tables below. | Medium | Must be selected by year of assessment, not just "current". Existing crude allowance×ratio estimate in `travel-schedule.ts` must be replaced entirely, not patched. |
| Actual cost method: fuel, maintenance/repairs, licence, insurance, finance charges (capped to deemed-value finance base), wear-and-tear over vehicle's value (7-year write-off), pro-rated by business-km ratio | Alternative statutory method under §8(1)(b); practitioners need it because deemed cost disadvantages high-mileage/low-value-vehicle taxpayers. Wear-and-tear governed by s11(e); write-off period for travel-allowance vehicles is 7 years (SARS Wear & Tear guidance, IN47). | High | MEDIUM confidence on exact wear-and-tear mechanics/vehicle-value cap for actual-cost claims — recommend phase-level verification against SARS Interpretation Note on wear-and-tear (IN47) and Binding General Ruling on travel deductions before implementation. |
| Correct source-code handling: 3701 (fixed travel allowance), 3702 (taxable reimbursive, over prescribed rate or >certain km), 3703 (non-taxable reimbursive, at/under prescribed rate) | These are the actual IRP5/ITR12 codes that determine which part of a travel allowance is even eligible for a logbook-based deduction claim, vs. already tax-free. | Medium | HIGH confidence on 3701/3702/3703 definitions (cross-verified: SARS PAYE-GEN-01-G03 guide + TaxTim + Tax Faculty). **4014/4015 need phase-level verification** — search evidence suggests 4015 = "Travel expenses (e.g. commission income)" used by commission earners claiming actual-cost travel against `3606`/`3616` commission income, not necessarily the standard employee travel-allowance deduction code. PROJECT.md's assumption that 4014/4015 are "the" travel deduction codes for the 3701/3702 schedule should be checked against the current SARS "Guide for Codes Applicable to Employees Tax Certificates" and the ITR12 comprehensive guide before being hard-coded. |
| 80%/20% PAYE inclusion rule surfaced (even though it's an employer-side PAYE concern, not an ITR12 input) | Confirms user/practitioner understanding of why 3701 already had PAYE withheld at 80% (default) or 20% (if employer pre-approved ≥80% business use) — relevant to reconciling IRP5 figures during ITR12 capture. | Low | Not a calculation the platform performs, but a validation/explanation the UI should surface so practitioners aren't confused by IRP5 PAYE totals. |
| Logbook data retained ≥5 years, exportable in a form suitable for SARS audit submission | SARS: "you must keep your logbook for a period of at least five years... you may be required to submit it to SARS." | Low | Matches PROJECT.md's persistence/export requirement. Electronic logbooks are explicitly accepted by SARS ("SARS accepts electronic logbooks as an acceptable record."). |
| Per-year rate table selection (2025, 2026, 2027) with no manual override of official figures | Compliance constraint: rates change every year of assessment (Budget-driven); a hardcoded or stale table produces wrong deductions. | Low | Tables below are the actual published values — treat as data, versioned by year, not constants baked into logic. |
| Medical Schemes Fees Tax Credit (s6A) — correct monthly R value × months covered, per year | Direct rand-for-rand credit; wrong monthly rate directly misstates final tax payable. | Low | See exact table below. HIGH confidence (SARS official rates page, cross-verified with 2 independent SA tax sources). |
| Additional Medical Expenses Tax Credit (s6B) — correct formula by age/disability | Two distinct formulas (65+/disabled vs. under 65 no disability); using the wrong one over/understates the credit substantially. | Medium | MEDIUM confidence on the multipliers (4× vs 3× annual MTC, 25% vs 33.3%, 7.5% of taxable income threshold) — recommend confirming exact wording against SARS "Guide on the Determination of Medical Tax Credits" (IT07) PDF during phase research, as the WebFetch text extraction failed and this was WebSearch-only. |
| Retirement fund deduction (s11F): lesser of 27.5% of (remuneration or taxable income, whichever greater), annual rand cap, or taxable income | Statutory formula; the rand cap changes materially between years in scope. | Low | **Cap differs by year in scope — see below; this is the single highest-impact "gotcha" found in this research.** |
| CGT: annual exclusion, primary residence exclusion, 40% inclusion rate for individuals | Core CGT schedule inputs; Budget 2026 changed two of these three figures for the 2027 year — using the old figures for 2027 returns is a hard compliance bug. | Low | **Values differ between 2026 and 2027 — see below.** |
| Provisional tax: para 19 "basic amount" (last assessed taxable income, +8%/year if >18 months stale) and para 20 safe-harbour thresholds (R1m taxable income split; 90%/80% actual-income tests; 10%/20% underestimation penalty) | Governs whether the IRP6 estimate the platform proposes will trigger an underestimation penalty — a real financial consequence for the client. | Medium | HIGH confidence on the R1m threshold and 90%/80% tests (official SARS Guide for Provisional Tax, cross-verified). MEDIUM confidence on exact 18-month/8% escalation mechanics — flag for phase research against Interpretation Note 1. |
| Rental income: deduct only revenue-nature expenses in production of income (bond interest — not capital repayment, rates/levies, agent commission, repairs/maintenance, insurance, advertising); exclude capital improvements and private-use apportionment | Wrong categorization (e.g., claiming capital repayments or improvements) is a common, SARS-flagged error. | Low | HIGH confidence — direct from SARS "Tax on Rental Income" and "Examples for tax on rental income" pages. |
| Home office (s23(b)): "regularly AND exclusively" used, mainly (>50%) for trade if remuneration is salary-only, calculated as (room m² / total home m²) × qualifying costs | Narrow, frequently-audited deduction; SARS explicitly polices the exclusivity test and the room must be specifically equipped for trade. | Medium | HIGH confidence on the core test and apportionment formula (SARS Interpretation Note 28, official page). Note ongoing policy debate about removing the "exclusive use" requirement — not yet law, do not build around a repeal that hasn't happened. |
| CSV/XLSX import correctness matching the actual SARS eLogbook column layout | If the "auto-detect SARS format" feature exists, it must match the real official template: Date, *Opening Km, *Closing Km, Total Business Km, From, To, Reason, Actual Fuel & Oil Costs, Actual Repairs & Maintenance Costs. | Medium | Confirmed exact column headers from the official 2025/26 eLogbook PDF (downloaded and read directly). Any auto-detection heuristic should target these exact headers/order first. |

---

## Differentiators

Valuable but not SARS-mandated. These make the practitioner's life easier without being audit-required.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Side-by-side deemed vs. actual cost comparison with automatic "best method" recommendation | SARS allows the taxpayer to choose whichever method is more favourable (subject to record-keeping); most competitors/manual spreadsheets don't automate the comparison. | Medium | High practitioner value — this is the natural product wedge once both methods are correctly implemented (a table-stakes prerequisite). |
| Simplified reimbursive rate auto-check (495c/km for 2027, 476c/km for 2026, 484c/km for 2025) vs. actual reimbursement rate, flagging when employer's reimbursement rate exceeds the prescribed rate (triggers 3702 taxable portion) | Helps practitioners catch under/over-taxed reimbursive allowances on the IRP5 before they become ITR12 errors. | Low | Values are HIGH confidence, official SARS "Simplified method" clause in each year's Rate per Kilometre Schedule. |
| Map/geocoding-assisted "From/To" distance suggestion for manual trip capture | Speeds up manual capture without compromising the compulsory From/To/Reason fields SARS requires. | Medium | Nice-to-have; must not replace practitioner-entered reason/purpose, which SARS requires to be substantive. |
| Automated flagging of home-to-work-pattern trips (same From/To recurring on weekday cadence) for practitioner review | Surfaces likely-disallowed commuting claims before submission rather than at audit. | Medium | Judgment call feature — must remain a flag/warning, not an automatic deletion, since practitioners may have legitimate context. |
| Multi-year rate table view / historical comparison in the UI | Practitioners handling provisional and final assessments across years benefit from seeing 2025 vs 2026 vs 2027 rates side by side. | Low | Straightforward once the per-year data model exists (a table-stakes prerequisite). |
| Bulk logbook health-check report (gaps in date sequence, missing reason field, odometer discontinuities) before SARS export | Reduces audit risk beyond the bare minimum; a proactive practitioner tool. | Medium | Depends on virtualized trip table (performance fix) being done first. |

---

## Anti-Features

Explicitly do not build these — they add risk, scope, or false confidence without SARS requiring them.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Inventing or estimating rate-table values for years not yet gazetted, or interpolating between known years | Any fabricated rate is a compliance defect — this is the one domain where "close enough" is a bug, not a shortcut. | Hardcode only officially published values (2025/2026/2027 confirmed below); when a future year's table isn't yet published, block/warn rather than guess. |
| Direct SARS eFiling submission/integration | PROJECT.md explicitly scopes this out; SARS eFiling has no public submission API for third-party software of this kind, and building toward it invites scope creep and security/compliance surface the milestone doesn't need. | Continue producing "near-eFiling" data for practitioner-assisted capture, as already scoped. |
| Auto-deleting or silently "correcting" trips that look like commuting | False positives would corrupt legitimate client data; SARS logbook data must remain an accurate record of what the taxpayer entered. | Flag for practitioner review only (see Differentiators). |
| Treating per-trip opening/closing odometer as mandatory input and blocking save without it | Contradicts the actual official SARS eLogbook, where these fields are marked "*not compulsory*" at the trip level (only the year-level opening/closing readings are mandatory). Over-strict validation would make legitimate manual-entry workflows (where only total business km per trip is known) impossible. | Require year-level opening/closing odometer (mandatory) and per-trip business km/date/from/to/reason (mandatory); make per-trip odometer optional, matching the official form. |
| A single combined "deemed+actual" hybrid calculation not sanctioned by SARS | SARS methods are mutually exclusive elections per vehicle per year — a "best of both worlds" blended number would misstate the claim. | Show both methods' results independently; let the practitioner pick one per SARS rules (actual cost requires actual cost records for the whole year, not spot-mixing). |
| Building CGT/retirement/medical logic with a single "current year" constant instead of a per-year rulepack | Confirmed policy: Budget 2026 changed the CGT annual exclusion, primary residence exclusion, and retirement fund cap specifically for the 2027 year — a single-constant design will already be wrong for one of the three in-scope years on day one. | Extend the existing per-year rulepack pattern (`rulepack-registry.ts`) to carry these values, exactly as brackets/rebates already are. |

---

## Feature Dependencies

```
Per-year rulepack extension (deemed-cost tables, s6A/s6B, s11F cap, CGT exclusions, provisional tax basic-amount logic)
  → Deemed cost method calculation (needs correct per-year table)
  → Actual cost method calculation (needs wear-and-tear s11(e) 7-year schedule, independent of deemed table)
      → Deemed vs. actual comparison / recommendation (differentiator; needs both methods correct first)

Vehicle details capture (value, acquisition type/date) 
  → Deemed cost table bracket lookup (value determines which row applies)
  → Wear-and-tear base for actual cost method

Logbook persistence (per client + tax year, replacing useState)
  → CSV/XLSX import (data must land somewhere durable)
  → Performance fix (virtualization/pagination) — needed once real persisted datasets can reach 10,000+ rows
  → Audit export (needs durable, retrievable per-year data)

CSV/XLSX import + SARS elogbook auto-detect
  → Must target the exact official column layout (Date, *Opening Km, *Closing Km, Total Business Km, From, To, Reason, Actual Fuel & Oil Costs, Actual Repairs & Maintenance Costs) confirmed from the official template

Corrected travel-schedule.ts (deemed/actual, not allowance×ratio estimate)
  → Feeds ITR12 travel schedule source codes (3701/3702/3703 on the income side; deduction codes need phase-level confirmation)
  → Must not break other schedules' existing tests (employment, medical, interest, rental, sole proprietor) per PROJECT.md constraint
```

---

## Verified SARS Values by Year of Assessment (2025–2027)

All values below sourced directly from official SARS PDF documents (fetched and read primary-source), except where marked otherwise. **This section is the authoritative input for rulepack construction.**

### 1. Deemed-cost travel table (Rate per Kilometre Schedule, PAYE-GEN-01-G03-A01)

**Confidence: HIGH** — read directly from official SARS PDFs (all three years) and cross-verified the 2025 table against an independent SA tax-table site (yourtax.co.za), which matched exactly.

**2025 Tax Year** (1 March 2024 – 29 Feb 2024/... effective 29 February 2024; applies to years of assessment commencing on/after 1 March 2024). Simplified rate: **484 c/km**.

| Vehicle value | Fixed cost (R/year) | Fuel cost (c/km) | Maintenance cost (c/km) |
|---|---|---|---|
| ≤ R100,000 | 34,480 | 151.7 | 46.0 |
| R100,001–R200,000 | 61,770 | 169.4 | 57.6 |
| R200,001–R300,000 | 89,119 | 184.0 | 63.5 |
| R300,001–R400,000 | 113,436 | 197.9 | 69.3 |
| R400,001–R500,000 | 137,752 | 211.8 | 81.5 |
| R500,001–R600,000 | 163,178 | 243.0 | 95.6 |
| R600,001–R700,000 | 188,653 | 247.1 | 107.3 |
| R700,001–R800,000 | 215,447 | 251.2 | 118.9 |
| > R800,000 | 215,447 (capped) | 251.2 (capped) | 118.9 (capped) |

Source: `PAYE-GEN-01-G03-A01` Rate per Kilometre Schedule, Revision 17, effective 29 Feb 2024 (2025 Tax Year) — downloaded directly from sars.gov.za; cross-confirmed against the official 2025/26 SARS eLogbook PDF cost table (which republishes the *2026* tax year table — note these are two different years, do not conflate).

**2026 Tax Year** (effective 1 March 2025). Simplified rate: **476 c/km**.

| Vehicle value | Fixed cost (R/year) | Fuel cost (c/km) | Maintenance cost (c/km) |
|---|---|---|---|
| ≤ R100,000 | 33,940 | 146.7 | 47.4 |
| R100,001–R200,000 | 60,688 | 163.8 | 59.3 |
| R200,001–R300,000 | 87,497 | 177.9 | 65.4 |
| R300,001–R400,000 | 111,273 | 191.4 | 71.4 |
| R400,001–R500,000 | 135,048 | 204.8 | 83.9 |
| R500,001–R600,000 | 159,934 | 234.9 | 98.5 |
| R600,001–R700,000 | 184,867 | 238.9 | 110.5 |
| R700,001–R800,000 | 211,121 | 242.9 | 122.5 |
| > R800,000 | 211,121 (capped) | 242.9 (capped) | 122.5 (capped) |

Source: `PAYE-GEN-01-G03-A01`, Revision 18, effective 1 March 2025 — downloaded directly from sars.gov.za and read in full.

**2027 Tax Year** (effective 1 March 2026 — note the value brackets themselves shifted, not just the rand amounts). Simplified rate: **495 c/km**.

| Vehicle value | Fixed cost (R/year) | Fuel cost (c/km) | Maintenance cost (c/km) |
|---|---|---|---|
| ≤ R115,000 | 38,344 | 132.9 | 49.1 |
| R115,001–R230,000 | 68,487 | 148.4 | 61.4 |
| R230,001–R345,000 | 98,689 | 161.2 | 67.8 |
| R345,001–R460,000 | 125,393 | 173.4 | 74.0 |
| R460,001–R575,000 | 152,097 | 185.5 | 86.9 |
| R575,001–R690,000 | 180,078 | 212.8 | 102.0 |
| R690,001–R805,000 | 208,106 | 216.5 | 114.5 |
| R805,001–R920,000 | 237,679 | 220.1 | 126.1 |
| > R920,000 | 237,679 (capped) | 220.1 (capped) | 126.9 |

Source: `PAYE-GEN-01-G03-A01`, Revision 19, effective 1 March 2026 — downloaded directly from sars.gov.za and read in full.

**Implementation note:** the 2027 table's value bracket boundaries (R115k increments) differ structurally from 2025/2026 (R100k increments) — a rulepack that hardcodes bracket boundaries as a shared constant across years will break. Each year needs its own bracket table, not a shared bracket list with year-specific rand amounts.

### 2. Actual cost method components

**Confidence: MEDIUM** (WebSearch-verified across multiple sources, not from a single official PDF fetch — recommend phase-level confirmation against SARS Interpretation Note IN47 "Wear-and-Tear or Depreciation Allowance" and the Comprehensive ITR12 Guide).

- Qualifying costs: fuel/oil, maintenance/repairs, licence fee, insurance, finance charges/interest on the vehicle, lease costs (if leased instead of owned), wear-and-tear.
- Wear-and-tear (s11(e)): motor vehicles used for travel-allowance purposes are written off over **7 years** (straight-line, per SARS wear-and-tear guidance); depreciable base excludes VAT (if vendor) and excludes finance charges.
- Business-use portion = business km ÷ total km for the year, applied to each cost category consistently.
- A vehicle-value cap of **R800,000** was cited by one source for actual-cost wear-and-tear purposes — this figure is suspiciously identical to the 2025/2026 deemed-cost table's top bracket ceiling and needs independent verification; it may be a conflation rather than a genuine separate cap. **Flag for phase research.**

### 3. ITR12 / IRP5 source codes

**Confidence: HIGH** for 3701/3702/3703 (cross-verified: SARS PAYE-GEN-01-G03 Guide for Employers, TaxTim, Tax Faculty). **Confidence: LOW-MEDIUM** for 4014/4015 (WebSearch only, contradictory signal on 4015's exact scope) — **must be verified during phase research** against the current SARS "Guide for Codes Applicable to Employees Tax Certificates" (PAYE-AE-06-G06) and the "Comprehensive Guide to the ITR12 Income Tax Return for Individuals" (IT-AE-36-G05, effective 19 August 2025) before being hardcoded as deduction codes in `travel-schedule.ts`.

- **3701**: Allowance/advance for travel expenses (fixed travel allowance, petrol/garage/maintenance cards). Full amount reflected; 80% included in PAYE by default, reduced to 20% if employer is satisfied ≥80% of use is for business.
- **3702**: Reimbursive travel allowance where reimbursement exceeds the prescribed rate per km, or other conditions apply (e.g., >certain km reimbursed, or other compensation also received) — the excess portion is taxable.
- **3703**: Non-taxable reimbursive travel allowance — reimbursement at or below the prescribed rate per km, with no other allowance/compensation.
- **3722**: "Portion above the prescribed rate" (referenced in one source; treat as needing confirmation).
- **4015**: Evidence suggests this is "Travel expenses (e.g. commission income)" — used in the "Other Deductions" section, likely for commission earners' actual-cost travel claims against commission income (3606/3616), not necessarily the general employee travel-allowance deduction. **Do not assume 4014/4015 map directly onto the standard salaried travel-allowance deduction without confirming against the current ITR12 guide.**
- **4014**: Could not confirm exact definition from available sources — **explicit gap, needs phase research.**

### 4. Medical tax credits

**Confidence: HIGH** for s6A monthly amounts (SARS official "Medical Tax Credit Rates" page, directly fetched). **Confidence: MEDIUM** for s6B formula specifics (WebSearch-derived, not directly fetched from the official IT07 guide PDF — recommend re-verification during phase research since the WebFetch of the IT07 PDF was not attempted/failed).

**Section 6A — Medical Scheme Fees Tax Credit (monthly):**

| Tax year | Main member | +1st dependant (combined) | Each additional dependant |
|---|---|---|---|
| 2025 | R364 | R728 | R246 |
| 2026 | R364 | R728 | R246 |
| 2027 | R376 | R752 | R254 |

Source: sars.gov.za "Medical Tax Credit Rates" page, fetched directly.

**Section 6B — Additional Medical Expenses Tax Credit (formula, not yet independently re-verified against primary PDF):**

- Taxpayer (or spouse/child) 65+ or has a SARS-recognised disability: **33.3%** of (qualifying out-of-pocket medical expenses + (contributions paid − 3× annual s6A credit)), no taxable-income threshold.
- Taxpayer under 65, no disability: **25%** of (qualifying out-of-pocket medical expenses + (contributions paid − 4× annual s6A credit)) **exceeding 7.5% of taxable income**.
- **Flag for phase research:** confirm exact multipliers (3×/4×) and percentages (25%/33.3%) and the 7.5% threshold against SARS Guide IT07 directly — this research relied on WebSearch synthesis, not a direct primary-source read (the WebFetch attempt on the IT07 PDF was not completed in this pass).

### 5. Retirement fund contributions (s11F)

**Confidence: HIGH** — confirmed via direct WebFetch of the official SARS Budget 2026 FAQ page, which explicitly states the change and effective year.

Deduction = lesser of: (a) 27.5% of the greater of remuneration or taxable income, (b) the annual rand cap, (c) taxable income itself.

| Tax year | Annual rand cap |
|---|---|
| 2025 | R350,000 |
| 2026 | R350,000 |
| 2027 | **R430,000** (increased per Budget 2026 — first change since 2016) |

**This is the highest-impact single finding in this research** — R350k is the figure "everyone knows," and a rulepack hardcoding R350k for all three in-scope years will be silently wrong for 2027. Source: sars.gov.za Budget 2026 FAQ page (direct fetch), independently corroborated by Old Mutual and SARS's own "Retirement Fund Contribution Deductions Section 11F(2)(a)" news page (which still shows R350,000 as the pre-2027 figure and confirms the pro-rata mechanics for short years of assessment).

### 6. Capital Gains Tax

**Confidence: HIGH** — confirmed via direct WebFetch of the official SARS Budget 2026 FAQ page.

| Tax year | Annual exclusion | Primary residence exclusion | Death exclusion | Small business disposal exclusion | Inclusion rate (individuals) |
|---|---|---|---|---|---|
| 2025 | R40,000 | R2,000,000 | R300,000 | R1,800,000 | 40% |
| 2026 | R40,000 | R2,000,000 | R300,000 | R1,800,000 | 40% |
| 2027 | **R50,000** | **R3,000,000** | **R440,000** | **R2,700,000** | 40% (unchanged) |

Effective 2 March 2026 (i.e., first applies to the 2027 year of assessment). This is the first increase to the annual exclusion since 2017 and to the primary residence exclusion since 2012, per SARS's own Budget 2026 FAQ wording. **Second highest-impact finding** — same pattern as retirement cap: long-stable figures changing exactly within the 2025–2027 scope window.

### 7. Provisional tax (para 19/20, Fourth Schedule)

**Confidence: HIGH** for the R1m split and 90%/80% tests (official SARS Guide for Provisional Tax, effective 27 June 2025, referenced). **Confidence: MEDIUM** for the exact 8%-escalation/18-month basic-amount mechanics (WebSearch-derived from secondary commentary, not a direct primary-text quote in this pass — recommend confirming against Interpretation Note 1, Issue 3, during phase research).

- **Basic amount** (para 19(1)(d)): the taxpayer's SARS-assessed taxable income for the latest preceding year of assessment for which an assessment was issued not less than 14 days before the provisional payment date; escalated by 8% per year for each year since that assessment **if** the assessment is more than approximately 18 months old (i.e., if the taxpayer is up to date with filing, no escalation applies).
- **Second-period safe harbour, taxable income ≤ R1 million:** estimate must not be less than the lesser of the basic amount or 90% of actual final taxable income; underpayment below this triggers a 20% penalty on the shortfall.
- **Second-period safe harbour, taxable income > R1 million:** basic amount safe harbour is unavailable; estimate must be at least 80% of actual final taxable income, or a 20% penalty applies to the shortfall.

### 8. Rental income deductible expenses

**Confidence: HIGH** — direct from SARS "Tax on Rental Income" and "Examples for tax on rental income" official pages.

Deductible (revenue-nature, in production of rental income): bond/mortgage **interest only** (not capital repayment), rates and taxes, levies, agent's commission, repairs and maintenance (restoring to original condition, not improving), advertising, insurance, garden services, electricity/water (if landlord-paid). Not deductible: capital improvements, private-use portion, VAT on residential letting (exempt supply). Apportionment required for mixed-use properties (e.g., partially private, partially let; or let for only part of the year).

### 9. Home office (s23(b))

**Confidence: HIGH** — direct from SARS Interpretation Note 28 (Issue 3) and official "Home Office Expenses" page.

Requirements: room must be used **regularly and exclusively** for trade purposes and specifically equipped for it; if income is salary-only, duties must be **mainly** (>50%) performed in that home office. Calculation: (room area m² ÷ total home area m²) × qualifying home costs (rent, bond interest [not capital], rates, utilities pro-rata, cleaning, wear-and-tear on the room's furniture/fittings — not the whole home). Note: there is active legal-academic debate (Potchefstroom Electronic Law Journal) about removing the "exclusive use" requirement, but this is not current law — do not build for a repeal that hasn't happened.

---

## MVP Recommendation

Prioritize, in this order:

1. **Per-year rulepack extension** for all the tables above (deemed-cost, s6A, s11F cap, CGT exclusions) — this is the foundation every calculator depends on, and the R350k→R430k and R40k/R2m→R50k/R3m year-boundary changes make "just use current constants" actively wrong.
2. **Vehicle details + year-level odometer capture + per-trip Date/Business-km/From/To/Reason** (the actual compulsory SARS fields) — replaces the crude allowance×ratio estimate and is the flagship deliverable per PROJECT.md.
3. **Deemed cost method calculation** using the verified per-year tables — the simpler of the two methods, delivers immediate compliance value.
4. **Logbook persistence per client+tax year** — required before CSV/XLSX import is safe to build (no point importing into a component that loses data on refresh).
5. **CSV/XLSX import matching the real SARS eLogbook column layout**, plus the performance fix (virtualization) — these are explicitly bundled together in PROJECT.md and are correctly sequenced after persistence.
6. **Actual cost method** (fuel/maintenance/insurance/licence/finance charges/wear-and-tear) — higher complexity, build after deemed cost is solid and verified.
7. **Deemed-vs-actual comparison** (differentiator) — natural next step once both methods are correct.

Defer: automated commuting-pattern flagging and map-assisted trip entry (differentiators, not required for the core compliance claim) until the table-stakes calculation engine is verified correct — building UX polish on top of an unverified engine risks compounding errors.

**Explicit gaps requiring phase-level research before implementation** (do not hardcode from this document alone):
- Exact ITR12 deduction codes for the travel schedule (4014 definition unconfirmed; 4015's scope may be commission-income-specific, not general travel-allowance)
- Exact s6B multipliers/percentages (25%/33.3%, 3×/4× annual credit, 7.5% threshold) — re-verify against SARS Guide IT07 directly
- Actual-cost wear-and-tear vehicle-value cap (R800,000 figure needs independent confirmation — may be a conflation with the deemed-cost table's top bracket)
- Exact provisional-tax basic-amount 8%/18-month mechanics — re-verify against Interpretation Note 1 (Issue 3) directly

## Sources

- SARS official PDF: `PAYE-GEN-01-G03-A01` Rate per Kilometre Schedule — 2025 Tax Year (Revision 17, effective 29 Feb 2024), 2026 Tax Year (Revision 18, effective 1 March 2025), 2027 Tax Year (Revision 19, effective 1 March 2026) — all three downloaded directly from sars.gov.za and read in full (HIGH confidence, primary source)
- SARS official PDF: 2025/26 SARS Travel Logbook (eLogbook) — downloaded and read in full, confirming exact compulsory/non-compulsory fields and column layout
- sars.gov.za — Budget 2026 Frequently Asked Questions (direct fetch): CGT exclusion changes, retirement fund cap change, tax bracket/rebate changes
- sars.gov.za — Medical Tax Credit Rates page (direct fetch)
- sars.gov.za — Retirement Fund Contribution Deductions Section 11F(2)(a) news page (direct fetch)
- sars.gov.za — Tax on Rental Income / Examples for tax on rental income (official pages)
- sars.gov.za — Home Office Expenses page; Interpretation Note 28 (Issue 3) references
- sars.gov.za — Travel e-log book official page; Rates per kilometre official page
- SARS PAYE-GEN-01-G03 "Guide for Employers in respect of Allowances" (referenced, not fully fetched — recommend direct read during phase research for 3701/3702/3703/3722 precision)
- Cross-verification (MEDIUM confidence secondary sources): TaxTim calculators, Tax Faculty FAQs, yourtax.co.za tax tables (matched official 2025 PDF exactly, validating its reliability as a secondary cross-check), Old Mutual retirement savings article, accountingacademy.co.za, PAGSA payroll authors group
- Explicit LOW confidence flags: ITR12 deduction codes 4014/4015 (WebSearch only, contradictory/incomplete); s6B exact multipliers (WebSearch only); actual-cost wear-and-tear vehicle cap (single WebSearch source); provisional tax 8%-escalation exact mechanics (secondary commentary only)
