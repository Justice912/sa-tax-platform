# Phase 7: Calculator Audit - Research

**Researched:** 2026-07-07
**Domain:** SARS individual-tax compliance verification (2025/2026/2027) across seven calculators
**Confidence:** HIGH on SARS rules and rulepack-vs-hardcode mapping; MEDIUM on the exact mechanics of the two calculators SARS documents only in dense guides (s6B medical, para 19/20 provisional)

> No CONTEXT.md exists for this phase (`has_context: false`). There are no locked user decisions to honour beyond the ROADMAP success criteria and the STATE.md compliance flags, both reproduced below. This is an audit/correctness phase — the "stack" is the existing codebase; "research" here means the authoritative SARS rule per calculator per year and how the current code diverges.

## Summary

The eight tax-tools calculators were decomposed in Phase 5 into `src/components/individual-tax/tax-tools/*-tab.tsx`, each reading per-year figures from `useRulePack()` (which resolves `rules-2025.ts` / `rules-2026.ts` / `rules-2027.ts` via `rulepack-registry.ts`). Travel was already audited/wired in Phase 6. The remaining seven — Medical, Retirement, CGT, Provisional Tax, Rental, Home Office, and the Dashboard bracket/rebate sourcing — are this phase's scope (CALC-01..CALC-06).

**The single highest-impact finding is a rulepack DATA bug, not a calculator-logic bug:** `rules-2027.ts` carries tax brackets, rebates and thresholds that are pre-Budget-2026 *estimates*, not the gazetted 2026/2027 figures. Phase 1 (RULE-02) corrected the 2027 retirement cap (R430k), CGT annual exclusion (R50k) and primary-residence exclusion (R3m) — all confirmed correct — but did NOT correct the 2027 bracket table, rebates, or age thresholds. Because every calculator reads those values live from the rulepack, *all* of them (provisional tax, retirement marginal rate, CGT marginal rate, any threshold logic) silently produce wrong 2027 numbers. `rulepack.test.ts` even asserts the wrong values (`max: 247100`, `primary: 18395`), so the test currently locks the bug in. Fixing this one data file + its test corrects 2027 across the board.

Beyond that, the genuine calculator-logic gaps concentrate in exactly the two calculators STATE.md pre-flagged as MEDIUM confidence: the **Medical s6B** additional-credit formula (wrong 3×-vs-4× multiplier for under-65, plus a missing excess-contributions term and a floor-order issue) and the **Provisional Tax** para 19/20 model (no real "basic amount", no 8% escalation, a conflated safe-harbour comparison, and a P2 that omits the first-period payment). The other four (Retirement, CGT, Rental, Home Office) are essentially arithmetically correct and rulepack-sourced where they should be; their only defects are **hardcoded display strings** ("R350,000", "R2m exclusion", "R40k exclusion", "40%", "27.5%") that never change when the year changes. Those are display-only CALC gaps, cheap to fix, and each calculator should get a per-year regression test.

**Primary recommendation:** Fix the `rules-2027.ts` bracket/rebate/threshold data (and its test) FIRST as a standalone corrective plan — it unblocks the year-switch correctness that every other calculator's 2027 tests depend on. Then audit Medical and Provisional as real logic-change plans (both need human compliance sign-off), and treat Retirement/CGT/Rental/Home Office/Dashboard as "confirm math + fix hardcoded labels + add regression tests" plans.

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|-----------------------------------|------------------|
| CALC-01 | Medical credits calculator matches SARS s6A monthly amounts and s6B formulas per selected year | s6A rates verified per year (below); s6B formula bugs identified with SARS-cited correct formula — **logic change + sign-off** |
| CALC-02 | Retirement calculator applies correct s11F cap per year (R350k 2025/2026, R430k 2027) | Cap is correctly rulepack-sourced; only hardcoded label text + missing 3rd s11F leg — **confirm + label fix + test** |
| CALC-03 | CGT calculator applies correct per-year exclusions and inclusion rate | All four CGT figures rulepack-sourced and per-year-correct; only hardcoded select-label text — **confirm + label fix + test** |
| CALC-04 | Provisional tax calculator follows para 19/20 (basic amount, safe-harbour) per year | Current model is an approximate risk heuristic, not para 19/20 — **logic change + sign-off** |
| CALC-05 | Rental + Home Office match SARS deductible-expense rules incl. s23(b) | Rental expense set matches SARS; Home Office apportionment correct; salaried-gating is over-restrictive vs current SARS practice — **confirm + one rules-interpretation decision + test** |
| CALC-06 | Dashboard tax bracket/rebate figures sourced from rulepack for the selected year | Calc paths already rulepack-sourced (Phase 1); **but 2027 rulepack DATA is wrong** — fix `rules-2027.ts` + prove year-switch with a test |
</phase_requirements>

<compliance_flags_from_state>
## Known Compliance Flags (STATE.md Blockers/Concerns) — verified

| Flag | Verdict after research | Confidence |
|------|------------------------|------------|
| Medical s6B multipliers (3×/4×, 25%/33.3%, 7.5% threshold) | **Confirmed real bug.** SARS: under-65 uses **4×** MTC + 25% + 7.5%-of-taxable floor; 65+/disabled uses **3×** MTC + 33.3%, no floor. Code uses `3×` in BOTH branches and the under-65 branch also drops the excess-contributions term. | HIGH (rule) / MEDIUM (exact code fix needs sign-off) |
| Provisional 8% / 18-month basic-amount escalation | **Confirmed rule, not implemented.** SARS: basic amount = prior YOA assessed taxable income, escalated 8%/yr (simple, not compound) only if the estimate is made >18 months after the end of the latest assessed year. Rulepack stores the fields (`basicAmountEscalationRate: 0.08`, `...ThresholdMonths: 18`) but the calculator applies no escalation and no real basic amount. | HIGH (rule) / MEDIUM (mechanics) |
| Actual-cost (travel) wear-and-tear + R800k vehicle cap (IN47) | **Out of scope for Phase 7.** Travel/actual-cost lives in the Phase 2 logbook domain engine (`src/modules/logbook`), already flagged there with a `TODO(compliance-review)`. It is not one of the seven tax-tools calculators. Note only. | N/A |
| ITR12 deduction codes 4014/4015 (Phase 3) | **Out of scope.** Report-transformer / near-eFiling schedule concern, not a tax-tools calculator UI figure. Note only. | N/A |
</compliance_flags_from_state>

---

## User Constraints

None recorded — no `*-CONTEXT.md` exists for this phase. The binding constraints are the six ROADMAP success criteria (reproduced per-requirement above) and the STATE.md flags (reproduced above). The planner must honour those verbatim.

## Standard Stack

This is an audit of existing code; no new libraries are required or wanted.

| Concern | Use (already in repo) | Notes |
|---------|-----------------------|-------|
| Per-year SARS constants | `src/modules/individual-tax/rules-2025.ts` / `rules-2026.ts` / `rules-2027.ts` via `rulepack-registry.ts` | Single source of truth (Phase 1 / RULE-03) |
| Rulepack access in components | `useRulePack()` from `tax-tools/rulepack-context.tsx` | Returns `{ assessmentYear, setAssessmentYear, rulePack }`; default year 2026 |
| Tax/marginal helpers | `tax-tools/calc-helpers.ts` (`calcTax`, `getMarginalRate`, `getDeemedRate`) | All parameterised on `rulePack` (Phase 1) |
| Dashboard summary flow | `tax-tools/summary-context.tsx` (`useSummaryWriter` / `useSummary`) | Write-only setter + value context |
| Tests | Vitest 4 + Testing Library + Profiler | `npm test` (= `vitest run`); existing pattern `render-isolation.test.tsx` |

**Do NOT** add a tax library, a decimal/money library, or new rulepack years. Do NOT re-architect the calculators — Phase 5/6 already gave them isolated, colocated state.

## Authoritative SARS Rules Per Year (the reference table the planner audits against)

All figures below are for **year of assessment** (YOA) N = 1 March (N-1) to 28/29 Feb N, matching each `rules-*.ts` `periodStart`/`periodEnd`.

### Tax brackets, rebates, thresholds
| Item | 2025 (YOA) | 2026 (YOA) | 2027 (YOA) — Budget 2026, gazetted |
|------|-----------|-----------|-----------|
| Bracket 1 ceiling @18% | R237,100 | R237,100 | **R245,100** |
| Bracket 2 | 42,678 + 26% > 237,100 | same as 2025 | **44,118 + 26% > 245,100** |
| Bracket 3 | 77,362 + 31% > 370,500 | same | **79,998 + 31% > 383,100** |
| Bracket 4 | 121,475 + 36% > 512,800 | same | **125,599 + 36% > 530,200** |
| Bracket 5 | 179,147 + 39% > 673,000 | same | **185,215 + 39% > 695,800** |
| Bracket 6 | 251,258 + 41% > 857,900 | same | **259,783 + 41% > 887,000** |
| Bracket 7 (45%) | 644,489 + 45% > 1,817,000 | same | **666,339 + 45% > 1,878,600** |
| Primary rebate | R17,235 | R17,235 | **R17,820** |
| Secondary (65+) | R9,444 | R9,444 | **R9,765** |
| Tertiary (75+) | R3,145 | R3,145 | **R3,249** |
| Threshold under 65 | R95,750 | R95,750 | **R99,000** |
| Threshold 65–74 | R148,217 | R148,217 | **R153,250** |
| Threshold 75+ | R165,689 | R165,689 | **R171,300** |
Confidence: **HIGH** (SARS "Rates of Tax for Individuals" + SARS Budget 2026 FAQ + independent third parties, all agreeing; 2026/27 brackets were adjusted 3.4% for inflation — first inflationary adjustment since 2023/24).

### Medical scheme fees credit (s6A), monthly
| | 2025 | 2026 | 2027 |
|--|------|------|------|
| Each of first two members (main + first dependant), per month | R364 | R364 | **R376** |
| Each additional dependant, per month | R246 | R246 | **R254** |
Confidence: **HIGH** (SARS Medical Credits page + Medical Tax Credit Rates page). Note: SARS also expresses this as "main+first = R728/mo" (2×364) or R752 (2×376).

### Retirement (s11F)
| | 2025 | 2026 | 2027 |
|--|------|------|------|
| Deductible % of higher of remuneration/taxable income | 27.5% | 27.5% | 27.5% |
| Annual monetary cap | R350,000 | R350,000 | **R430,000** |
Full s11F limit = lesser of (i) R350k/R430k, (ii) 27.5% × higher of remuneration or taxable income, (iii) taxable income before the s11F deduction. Confidence: **HIGH** (SARS s11F FAQ + Budget 2026: cap raised R350k→R430k, first increase in 10 years, effective 1 Mar 2026).

### CGT (individuals)
| | 2025 | 2026 | 2027 |
|--|------|------|------|
| Annual exclusion | R40,000 | R40,000 | **R50,000** |
| Primary residence exclusion | R2,000,000 | R2,000,000 | **R3,000,000** |
| Death-year exclusion (replaces annual) | R300,000 | R300,000 | **R440,000** |
| Inclusion rate | 40% | 40% | 40% |
Confidence: **HIGH** (SARS CGT page + Budget 2026: annual R40k→R50k, primary residence R2m→R3m, death R300k→R440k, all effective YOA 2027; inclusion rate unchanged at 40%).

### Provisional tax (para 19 basic amount / para 20 penalty safe harbour)
- **Basic amount** = taxable income assessed for the latest preceding YOA, reduced by prescribed amounts (per IN1 Issue 3). If the estimate is made **more than 18 months** after the end of that latest assessed year, the basic amount is **increased by 8% per year** (simple, not compound).
- **Para 20 underestimation safe harbour (second period):**
  - Actual taxable income **≤ R1,000,000**: no penalty if the second-period estimate is at least the **lesser of** (a) 90% of actual taxable income **or** (b) the basic amount.
  - Actual taxable income **> R1,000,000**: no penalty only if the second-period estimate is at least **80%** of actual taxable income (the basic-amount option falls away).
  - Penalty = **20%** of the shortfall tax.
Confidence: **HIGH** on the 90%/80%/R1m/20% thresholds and the "lesser of basic amount vs 90%" structure (SARS Guide for Provisional Tax + multiple firm summaries); **MEDIUM** on the precise IN1-prescribed reductions to the basic amount and the exact first/second-period payment arithmetic (SARS PDFs did not render for verbatim quoting — flag for sign-off).

### Rental deductible expenses (s11(a)/s23)
Deductible against rental income (only to the extent incurred in producing that income; capital/private excluded): rates & taxes, levies, insurance, **bond interest only** (not capital repayment), repairs & maintenance, agent commission, advertising, security, garden services, municipal utilities where borne by owner, wear-and-tear on furnishings/appliances, legal fees, and pro-rata travel to the property. Improvements are capital (not deductible). Confidence: **HIGH** (SARS "Tax on rental income" + examples page).

### Home office (s11 read with s23(b) and s23(m))
- **s23(b) gate:** deduction only if a part of the home is **regularly and exclusively** used for the trade **and is specifically equipped** for it.
- **Salaried (non-commission) employees:** additionally, duties must be performed **mainly (>50%)** in that home office. They CAN qualify (SARS accepts this post-COVID), but **s23(m)** restricts them to premises-type costs (rent, repairs, s11(a) home-office expenses) and disallows most other deductions and wear-and-tear on the building.
- **Commission earners (>50% commission) / self-employed:** more flexible; s23(m) restriction does not apply in the same way.
- Apportion shared premises costs by **floor area** (office m² / total m²). Confidence: **HIGH** (SARS Home Office Expenses page + Interpretation Note 28 Issue 3).

---

## Per-Calculator Audit Findings

Format per calculator: (a) SARS rule → (b) what the code does → (c) discrepancy/gap → (d) rulepack-sourced vs hardcoded → confidence.

### 1. Medical Credits — `medical-tab.tsx` (CALC-01)
- **(a) SARS rule:** s6A as table above. s6B: under-65/no-disability = `25% × [ (contributions − 4×s6A) + qualifying_oop − 7.5%×taxable_income ]`, floored at 0. 65+/disabled = `33.3% × [ (contributions − 3×s6A) + qualifying_oop ]`, no 7.5% floor.
- **(b) Code does:** s6A correct (`min(deps,2)×firstTwo + max(0,deps-2)×additional`, capped at annual contributions). s6B:
  - 65+/disabled branch: `qual = oop + max(0, contrib − 3*s6a); s6b = max(0, qual*0.333)`.
  - under-65 branch: `qual = oop − 0.075*taxInc − 3*s6a; s6b = max(0, qual*0.25)`.
- **(c) Gaps (fix):**
  1. **Under-65 uses `3×` s6A; must be `4×`.** (Clear rule breach.)
  2. **Under-65 drops the excess-contributions term** `+ max(0, contrib − 4×s6A)` entirely — only out-of-pocket is counted. Must add it.
  3. **65+/disabled floors the contribution excess at 0 before adding oop** (`max(0, contrib−3*s6a)`). SARS sums the bracket as one quantity, so a contribution shortfall should offset oop; the current floor is over-generous. Confirm intended treatment with sign-off.
  4. **The 3×/4× base uses the contribution-capped s6a** (`min(s6aMonthly*12, contrib)`) rather than the statutory annual MTC. In practice contributions exceed the MTC so this rarely bites, but it is technically the wrong base. Flag.
- **(d) Sourcing:** s6A rates ARE rulepack-sourced (`rulePack.medicalTaxCredit.*`). The 3/4 multipliers, 25%/33.3%, and 7.5% are **hardcoded literals in the component** — acceptable (they are statutory constants, not per-year), but must be corrected to 4× for under-65.
- **Verdict: logic change + human compliance sign-off. Confidence HIGH (rule) / MEDIUM (final formula wording).**

### 2. Retirement — `retirement-tab.tsx` (CALC-02)
- **(a) SARS rule:** limit = lesser of (i) annual cap (R350k/R350k/R430k), (ii) 27.5% × higher of remuneration/taxable income, (iii) taxable income before deduction.
- **(b) Code does:** `limit = min(income × 0.275_from_rulepack, annualCap_from_rulepack)`. Marginal rate via `getMarginalRate(rulePack, income)`.
- **(c) Gaps:** Cap and % ARE per-year-correct and rulepack-sourced — **core math already correct.** Minor: (i) the third s11F leg (taxable income before deduction) is omitted — only binds in the rare low-income/high-contribution case; document as accepted simplification or add. (ii) Single "income" input conflates remuneration and taxable income — acceptable for an optimizer. **Display bug:** heading subtitle `"27.5% cap / R350,000 annual limit"` and ResultCard `sub="27.5% or R350k"` are **hardcoded** — they show R350k even when 2027 (R430k) is selected. Fix to interpolate `rulePack.retirement.annualCap`.
- **(d) Sourcing:** cap/% rulepack-sourced ✅; the two label strings hardcoded ❌.
- **Verdict: already correct — fix hardcoded labels + add per-year regression test (assert R430k limit and marginal saving under year 2027). Confidence HIGH.**

### 3. CGT — `cgt-tab.tsx` (CALC-03)
- **(a) SARS rule:** annual exclusion R40k/R40k/R50k; death exclusion (replaces annual) R300k/R300k/R440k; primary residence R2m/R2m/R3m; inclusion 40%.
- **(b) Code does:** `exclusion = death ? deathExclusion : annualExclusion`; if primaryRes & gain>0 `exclusion += min(gain, primaryResidenceExclusion)`; `taxableGain = netGain × inclusionRate`; marginal via `getMarginalRate`. All four values from `rulePack.cgt.*`.
- **(c) Gaps:** Math and sourcing **already correct and per-year-reactive** (render-isolation test already proves 40k→50k on year switch). Minor modelling notes (not necessarily bugs): combining primary-residence and annual exclusions additively is a simplification (SARS applies primary-residence to the residence gain first, annual exclusion to the aggregate) — acceptable for a single-asset tool. **Display bugs (hardcoded):** select labels `"Yes — R2m exclusion"`, `"No — R40k exclusion"`, `"Yes — R300k exclusion"`, and ResultCard `"Taxable Portion (40%)"` are hardcoded and wrong for 2027. Fix to interpolate rulepack figures.
- **(d) Sourcing:** all figures rulepack-sourced ✅; three select labels + one card label hardcoded ❌.
- **Verdict: already correct — fix hardcoded labels + add per-year regression test (2027: 50k annual, 3m primary, 440k death). Confidence HIGH.**

### 4. Provisional Tax — `provisional-tax-tab.tsx` (CALC-04)
- **(a) SARS rule:** para 19 basic amount (prior-YOA assessed taxable income, +8%/yr if >18 months, less prescribed amounts) and para 20 safe harbour (≤R1m: lesser of basic amount or 90% of actual; >R1m: 80% of actual; 20% penalty on shortfall).
- **(b) Code does:** `fullTax = calcTax(rulePack, estTaxable) − rulePack.rebates.primary`; `netTax = max(0, fullTax − credits)`; P1 payment `= max(0, netTax*0.5 − paye*0.5)`, P2 `= max(0, netTax − paye)`. `safeHarbour = estTaxable > threshold(1m) ? priorTax*0.80 : priorTax*0.90`. Risk band from `payment` vs `safeHarbour`.
- **(c) Gaps (real work):**
  1. **No basic amount and no 8% escalation.** `priorTaxable` is captured but **never used**. Rulepack escalation fields are unused ("data only, no logic"). Para 19 is not implemented.
  2. **Safe harbour conflates prior-year *tax* with the basic-amount *taxable income* comparison.** SARS compares the *estimate of taxable income* to (lesser of basic amount or 90% of actual taxable income); the code multiplies prior-year **tax** by 0.90/0.80. It also keys off `estTaxable` rather than actual taxable income (only known at assessment) — inherent to an estimator, but the base amount is wrong.
  3. **P2 omits the first-period payment.** Standard second-period top-up subtracts the P1 payment already made; code subtracts only PAYE.
  4. **Rebate handling:** only `rebates.primary` is subtracted (no age-based secondary/tertiary) — acceptable simplification but note.
- **(d) Sourcing:** `calcTax`, `rebates.primary`, and all `provisionalTax.*` thresholds ARE rulepack-sourced ✅. The `0.5` split and risk multipliers are hardcoded literals. The safe-harbour 0.90/0.80 come from the rulepack ✅.
- **Verdict: substantive logic change + human compliance sign-off.** This is the calculator furthest from its SARS rule. Recommend the planner scope it as: implement a real basic amount (from `priorTaxable`) with the 18-month/8% escalation using the existing rulepack fields, correct the safe-harbour comparison to the "lesser of basic amount or 90% of actual" structure, and fix P2 to net off P1. **Confidence HIGH (rules) / MEDIUM (exact IN1 mechanics — flag).**

### 5a. Rental — `rental-tab.tsx` (CALC-05)
- **(a) SARS rule:** deductible expense set as listed above; net = income − allowable expenses; no per-year constants involved.
- **(b) Code does:** `gross = monthlyRent × months + otherIncome`; sums 13 expense fields (rates, levies, insurance, bondInterest, repairs, agentFees, advertising, security, garden, utilities, wearTear, legal, travelToProperty); `net = income − expenses`.
- **(c) Gaps:** Expense categories **all match SARS-allowable rental deductions** (confirmed). No improvements/capital field exists, so no capital-vs-revenue leak. Purely arithmetic; no discrepancy. Optional enhancement: a note that only the interest portion of the bond is deductible (field is already labelled "Bond Interest", so fine).
- **(d) Sourcing:** correctly **rulepack-free** (no per-year rates apply to a rental worksheet).
- **Verdict: already correct — add a regression test asserting net = income − Σexpenses. Confidence HIGH.**

### 5b. Home Office — `home-office-tab.tsx` (CALC-05)
- **(a) SARS rule:** s23(b) exclusivity + specific equipping; salaried >50%-at-home; floor-area apportionment of shared costs; s23(m) limits salaried non-commission earners to premises-type costs.
- **(b) Code does:** `ratio = min(office/total, 1)`; `shared = rentOrInterest + rates + electricity + cleaning`; `direct = repairs + internet`; `monthly = shared×ratio + direct`; `annual = monthly×12`; `qualifies = empType !== "salaried"`. Salaried shows a red warning and `qualifies=false`.
- **(c) Gaps (one rules-interpretation decision + notes):**
  1. **Salaried gating is over-restrictive.** SARS DOES allow salaried employees who meet s23(b) + >50%-at-home to claim. The code hard-blocks them (`qualifies=false`, "Unlikely"). Decide: keep conservative block-with-warning, or allow-with-warning + apply s23(m) restriction. **Needs a documented decision (light sign-off).**
  2. **`internet` treated as 100% direct-deductible** — internet is normally a mixed/apportioned cost; consider moving to the ratio-apportioned bucket or labelling as "work portion" (label already says "work portion", acceptable).
  3. No enforcement of the exclusivity/specific-equipping precondition (inherent UI simplification; the warning text covers it).
- **(d) Sourcing:** correctly **rulepack-free** (apportionment, not per-year rates). No hardcoded per-year figures.
- **Verdict: mostly correct — one interpretation decision on salaried eligibility + regression test on ratio/apportionment. Confidence HIGH (rule) / MEDIUM (salaried-eligibility policy).**

### 6. Dashboard bracket/rebate sourcing — `dashboard-tab.tsx` + rulepack data (CALC-06)
- **(a) SARS rule:** brackets/rebates must be the correct per-year figures.
- **(b) Code does:** `DashboardTab` renders only summary totals (travel/medical/retirement/rental/home-office) and a year label `{assessmentYear-1}/{assessmentYear}`. It displays **no** bracket or rebate figures directly. The actual bracket/rebate consumption is in `calc-helpers.ts` (`calcTax`, `getMarginalRate`) and `provisional-tax-tab.tsx` (`rebates.primary`) — **all rulepack-sourced since Phase 1** (the hardcoded `TAX_BRACKETS`/`REBATES` block was deleted in commit `30da5c8`).
- **(c) Gap — the critical one:** No hardcoded brackets/rebates remain in components ✅, BUT **`rules-2027.ts` contains the WRONG bracket/rebate/threshold DATA** (pre-Budget-2026 estimates). See the reference table: code has bracket-1 ceiling R247,100 (should be R245,100), base-tax R44,478 (R44,118), a fabricated 6th-bracket boundary at R1,578,100 that does not exist in the gazette, primary rebate R18,395 (R17,820), secondary R10,077 (R9,765), tertiary R3,356 (R3,249), thresholds R104,758/R162,689/R182,850 (should be R99,000/R153,250/R171,300). `rulepack.test.ts` asserts these wrong values and must be updated in lockstep. The 2027 **medical, retirement cap, CGT** values in the rulepack are all **correct** — only brackets/rebates/thresholds are wrong.
- **(d) Sourcing:** components ✅ rulepack-sourced; rulepack 2027 DATA ❌ wrong.
- **Verdict: fix `rules-2027.ts` bracket/rebate/threshold data + update `rulepack.test.ts` + add a year-switch regression test that a bracket-derived figure (e.g. provisional `fullTax` or retirement marginal) changes correctly for 2027. Confidence HIGH.**

## Concrete Change List (what the planner turns into tasks)

**A. Rulepack data correction (do first — unblocks 2027 tests everywhere):**
- [ ] `rules-2027.ts`: replace all 7 tax brackets with gazetted 2026/27 values (ceilings 245,100 / 383,100 / 530,200 / 695,800 / 887,000 / 1,878,600; base-tax 0 / 44,118 / 79,998 / 125,599 / 185,215 / 259,783 / 666,339; rates unchanged).
- [ ] `rules-2027.ts`: rebates → primary 17,820, secondary 9,765, tertiary 3,249.
- [ ] `rules-2027.ts`: thresholds → under65 99,000, age65To74 153,250, age75Plus 171,300.
- [ ] `rulepack.test.ts`: update the 2027 assertions to the corrected values.
- [ ] Leave 2027 medical (376/254), retirement cap (430,000) and CGT (50k/3m/440k, 40%) **unchanged — already correct.**
- [ ] Confirm 2025 and 2026 brackets/rebates/thresholds/medical against the reference table (they match — regression-test only).

**B. Medical (logic + sign-off):**
- [ ] Under-65 s6B: change `3*s6a` → `4*s6a` and add the `+ max(0, contrib − 4*s6a)` excess-contributions term.
- [ ] Decide/adjust the 65+/disabled floor-order (`max(0, contrib−3*s6a)` vs summing before flooring).
- [ ] Decide whether the 3×/4× base should be the uncapped statutory MTC rather than `min(annualMTC, contrib)`.
- [ ] Per-year s6A regression tests (2025/2026 = 364/246, 2027 = 376/254) + s6B worked example per branch.

**C. Provisional (logic + sign-off):**
- [ ] Implement real para-19 basic amount from `priorTaxable`, with the 8% / 18-month escalation using existing rulepack fields.
- [ ] Correct the para-20 safe-harbour comparison (lesser of basic amount or 90% of actual for ≤R1m; 80% for >R1m).
- [ ] Fix P2 to net off the P1 payment already made.
- [ ] Per-year regression tests including the R1,000,000 boundary and the safe-harbour branch orientation (the existing 0.90/0.80 branch test must survive).

**D. Retirement / CGT (label fixes + tests, no math change):**
- [ ] Retirement: interpolate `rulePack.retirement.annualCap` into the subtitle and ResultCard `sub` (remove hardcoded "R350,000"/"R350k").
- [ ] CGT: interpolate rulepack figures into the three select labels and the "Taxable Portion (40%)" card (remove hardcoded R2m/R40k/R300k/40%).
- [ ] Per-year regression tests (Retirement 2027 cap R430k; CGT 2027 50k/3m/440k).

**E. Rental / Home Office (confirm + one decision + tests):**
- [ ] Rental: regression test net = income − Σexpenses; confirm expense set (no change expected).
- [ ] Home Office: decide salaried eligibility policy (block-with-warning vs allow-with-warning + s23(m)); regression test on floor-area apportionment.

**F. Dashboard (CALC-06):**
- [ ] Add a year-switch test proving a bracket/rebate-derived figure updates correctly for 2027 (guards the rulepack fix from regressing).

## Testing & Regression Approach

- **Framework:** Vitest 4 + @testing-library/react (+ Profiler for isolation). Run: `npm test` (`vitest run`); watch: `npm run test:watch`.
- **Existing anchor:** `src/components/individual-tax/tax-tools/render-isolation.test.tsx` already contains per-calculator math-preservation and year-switch proofs (e.g. CGT 40k→50k on 2026→2027). **These tests assert current math — the audit must confirm each expected value is SARS-correct and CHANGE any that encodes a bug** (notably any 2027-dependent expectation once `rules-2027.ts` is fixed, and any medical s6B expectation).
- **en-ZA gotcha (from Phase 5):** `fmt()` uses a non-breaking-space thousands separator; assert with `getByText(..., { normalizer: (t) => t })` or the default normalizer silently fails exact-string matches.
- **New tests per calculator:** one per-year correctness test (2025/2026/2027) asserting the exact SARS figure from the reference table, plus a boundary test where relevant (provisional R1m; retirement cap; medical age/disability branch). Prefer testing the pure calc where extractable; several calc functions are currently inline in the component and only reachable via rendered inputs.
- **Suggested plan grouping (for the planner):** (1) Rulepack 2027 data fix + completeness test; (2) Medical audit; (3) Provisional audit; (4) Retirement + CGT (label + tests, paired — both rulepack-dependent, both label-only); (5) Rental + Home Office (paired, both rulepack-free); (6) Dashboard/CALC-06 year-switch guard (can fold into plan 1).

## Needs Human Compliance Sign-Off

1. **Medical s6B final formula wording** — the corrected under-65 (4×, +excess contributions, 7.5% floor) and 65+/disabled (3×, 33.3%, no floor) expressions, and whether the 3×/4× base is capped or statutory. (SARS IT07 PDF did not render for verbatim quoting; formula reconstructed from the SARS AMTC page + IT07-derived third-party worked examples.)
2. **Provisional para 19/20 mechanics** — the exact IN1 Issue 3 reductions to the basic amount, the 8%/18-month application, and the first/second-period payment arithmetic. (SARS provisional-tax PDFs did not render.)
3. **Home Office salaried eligibility policy** — block vs allow-with-s23(m) for salaried non-commission earners.
4. **2027 gazetted brackets/rebates/thresholds** — HIGH confidence from three independent sources, but as it is a correctness-critical data change, have a practitioner confirm against the final SARS 2026/27 tax tables before merge.

## Open Questions

1. **Should the 65+/disabled s6B floor the contribution-excess separately, or sum first?** Impacts taxpayers whose contributions are below 3× MTC. Recommendation: sum-then-floor per SARS bracket structure; confirm with sign-off.
2. **Does CALC-06 expect the Dashboard to *display* brackets/rebates, or merely that consumed figures are rulepack-sourced?** Current dashboard shows neither. Recommendation: read as "no hardcoded brackets/rebates anywhere + correct 2027 data"; add a display of the active bracket table only if the practitioner wants it (out of strict scope).
3. **2025/2026 travel deemed-cost tables** were transcribed in Phase 1 and travel was audited in Phase 6 — out of Phase 7 scope; only note if a discrepancy surfaces.

## Sources

### Primary (HIGH confidence)
- SARS Rates of Tax for Individuals — https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ (2025/2026/2027 brackets, rebates, thresholds)
- SARS Budget 2026 FAQ — https://www.sars.gov.za/about/sars-tax-and-customs-system/budget/budget-2026-frequently-asked-questions/ (3.4% bracket adjustment, rebate/threshold increases for 2026/27)
- SARS Medical Credits — https://www.sars.gov.za/types-of-tax/personal-income-tax/medical-credits/ and Medical Tax Credit Rates — https://www.sars.gov.za/tax-rates/medical-tax-credit-rates/ (s6A per-year)
- SARS Additional Medical Expenses Tax Credit — https://www.sars.gov.za/types-of-tax/personal-income-tax/additional-medical-expenses-tax-credit/ (s6B 3×/4×, 33.3%/25%, 7.5% floor)
- SARS s11F FAQ — https://www.sars.gov.za/faq/faq-what-are-s11f-annual-allowable-deductions/ and Retirement Fund Contribution Deductions s11F(2)(a) — https://www.sars.gov.za/latest-news/retirement-fund-contribution-deductions-section-11f2a/ (R350k/R430k cap)
- SARS Capital Gains Tax — https://www.sars.gov.za/tax-rates/income-tax/capital-gains-tax-cgt/ (annual/primary-residence/death exclusions, 40% inclusion)
- SARS Guide for Provisional Tax — https://www.sars.gov.za/wp-content/uploads/Ops/Guides/GEN-PT-01-G01-Guide-for-Provisional-Tax-External-Guide.pdf (para 19/20; PDF not machine-rendered)
- SARS Interpretation Note 1 (Issue 3) — https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2012-01-Provisional-Tax-Estimates.pdf (8%/18-month basic amount)
- SARS Tax on rental income — https://www.sars.gov.za/types-of-tax/personal-income-tax/tax-on-rental-income/ (deductible expenses)
- SARS Home Office Expenses — https://www.sars.gov.za/types-of-tax/personal-income-tax/filing-season/home-office-expenses/ and Interpretation Note 28 Issue 3 — https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2012-28-Home-Office-Expenses-Deductions.pdf (s23(b)/s23(m))

### Secondary (MEDIUM confidence — corroboration only)
- TaxTim guides (medical, provisional, rental) — https://www.taxtim.com/za/guides/medical-expenses-tax ; https://www.taxtim.com/za/guides/rental-income-tax-guide/
- PwC Tax Summaries — https://taxsummaries.pwc.com/south-africa/individual/other-tax-credits-and-incentives
- Cliffe Dekker Hofmeyr provisional-tax alert (2026) — https://www.cliffedekkerhofmeyr.com/en/news/publications/2026/South-Africa/Tax-Exchange-Control/
- SAIT / Nwanda / firm summaries on para 20 penalty (90%/80%/R1m)
- ftomasek.com SA income tax rates 2019–2027 (independent third-party corroboration of the 2027 bracket table)

### Codebase (HIGH — inspected directly)
- `src/modules/individual-tax/rules-2025.ts` / `rules-2026.ts` / `rules-2027.ts`, `types.ts`, `rulepack-registry.ts`, `rulepack.test.ts`
- `src/components/individual-tax/tax-tools/*-tab.tsx` (medical, retirement, cgt, provisional-tax, rental, home-office, dashboard), `calc-helpers.ts`, `rulepack-context.tsx`, `summary-context.tsx`, `render-isolation.test.tsx`
- git `30da5c8` (Phase 1 removal of hardcoded tables), `8d222b5` (Phase 1 2027 retirement/CGT fix)

## Metadata

**Confidence breakdown:**
- SARS rules per year (brackets/rebates/medical/retirement/CGT): HIGH — multiple independent sources agree.
- 2027 rulepack data bug: HIGH — three independent sources; correctness-critical, flagged for practitioner confirm.
- Medical s6B and Provisional para 19/20 code fixes: MEDIUM — rules HIGH but exact SARS-guide wording unverified verbatim (PDFs did not render); sign-off required.
- Rental/Home Office/Retirement/CGT/Dashboard: HIGH — mostly confirm-and-test with cheap label fixes.

**Research date:** 2026-07-07
**Valid until:** ~2026-08-07 for the tax-rule facts (stable within a tax year; re-check after any interim SARS/Treasury announcement). The 2027 figures are Budget-2026 gazetted and stable for YOA 2027.
