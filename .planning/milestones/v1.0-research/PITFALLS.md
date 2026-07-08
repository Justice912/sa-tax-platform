# Pitfalls Research

**Domain:** SA individual tax compliance — SARS travel logbook (deemed/actual cost), large-file CSV/XLSX import, React monolith refactor, per-year rate tables
**Researched:** 2026-07-02
**Confidence:** HIGH (grounded in existing codebase files + verified current SARS rules); MEDIUM where noted (React refactor patterns are general-engineering, not SARS-specific)

## Critical Pitfalls

### Pitfall 1: Wrong-year rate table used for a calculation

**What goes wrong:**
SARS deemed-cost travel tables, tax brackets, rebates, medical credits, and the reimbursive "prescribed rate per kilometre" (R4.95/km from 1 March 2026 for the 2027 year, different from 2025/2026 values) all change on 1 March every year. A calculation silently uses the wrong year's table — either because the assessment year selector defaults wrong, because a rulepack was copy-pasted from the prior year without updating values, or because the deemed-cost table is looked up by calendar date instead of assessment year.

**Why it happens:**
This codebase already stores rulepacks per year (`rules-2024.ts`, `rules-2025.ts`, `rules-2026.ts`, `rules-2027.ts` via `rulepack-registry.ts`), which is the right structure — but the travel logbook is new and its deemed-cost table needs to plug into that same per-year structure. It's easy to create the table once, hardcode it into `travel-schedule.ts` unversioned, and forget it needs 3 separate tables for 2025/2026/2027 (which do differ — vehicle value brackets and c/km rates are re-gazetted annually). A trip spanning a tax-year boundary (e.g., logbook covering March 2025–Feb 2026) also needs to resolve to exactly one assessment year, not the calendar year of the trip date.

**How to avoid:**
- Add the deemed-cost table as a field on `IndividualTaxRulePack` (per `rules-20XX.ts` file), not a standalone constant in `travel-schedule.ts`.
- Resolve the applicable table via `getIndividualTaxRulePackByYear(assessmentYear)` — never via `new Date().getFullYear()` or trip date directly.
- Write a test per year (2025, 2026, 2027) asserting the deemed-cost table values differ and match the officially gazetted figures for that year (cite SARS PAYE-GEN-01-G03-A01 rate schedule in a code comment with source URL and effective date).
- Add a rulepack completeness test that fails the build if `SUPPORTED_ASSESSMENT_YEARS` contains a year whose rulepack has an empty/placeholder deemed-cost table.

**Warning signs:**
- Deemed-cost numbers identical across 2025/2026/2027 rulepacks (a copy-paste tell).
- Rate table stored as a module-level constant in `travel-schedule.ts` rather than in the rulepack files.
- No test asserting "2026 assessment uses 2026 table even if entered in July 2026 for a return covering March 2025–Feb 2026" (assessment year ≠ calendar year of data entry).

**Phase to address:**
Rate-tables phase (2025–2027 verification) — must land before/alongside the deemed-cost calculation phase, since the calculation has nothing correct to reference otherwise.

---

### Pitfall 2: Mixing deemed cost and actual cost claims (or letting the user do so silently)

**What goes wrong:**
SARS requires the taxpayer to choose ONE method — deemed cost OR actual cost — for the full tax year for that vehicle; you cannot claim fixed costs from the deemed table and then also claim actual fuel/maintenance receipts, or switch mid-year. A UI that lets both cost paths populate simultaneously (e.g., both are "filled in" from prior form state when a user toggles method) produces a claim that double-dips, understates, or silently changes without the user realizing.

**Why it happens:**
`CONCERNS.md` documents that today only the crude allowance×ratio method exists; adding both deemed AND actual cost methods as parallel form sections is a natural implementation shape — but if both stay populated in state and the calculation function picks "whichever has data" instead of an explicit, persisted method selector, a change to one field can silently switch methods, or worse, sum both.

**How to avoid:**
- Model `costMethod: "DEEMED" | "ACTUAL"` as a required, explicit, persisted field on the logbook record — not inferred from which fields are non-empty.
- `calculateByDeemedCost()` and `calculateByActualCost()` (per the CONCERNS.md fix-approach naming) must be two distinct pure functions; the schedule calculator picks exactly one based on `costMethod`, never both.
- Clear/disable the inactive method's inputs in the UI when the other is selected (don't just hide them — hidden-but-retained state is exactly how this bug reappears after a re-render).
- Add a warning banner + audit line item when a user switches method between tax years for the same vehicle (allowed, but worth a `reviewRequired` flag per the existing "review required" pattern in `calculation-service.ts`).

**Warning signs:**
- Both `deemedCostInputs` and `actualCostInputs` present with real (non-zero) values in the same saved logbook record.
- Calculation function accepts both input shapes and does `deemedResult ?? actualResult` fallback logic instead of an explicit switch.
- No Zod-level validation rejecting a payload where `costMethod === "DEEMED"` but actual-cost fields are populated (or vice versa).

**Phase to address:**
Travel logbook cost-method calculation phase. Verification: unit test asserting the schedule calculator throws/rejects on a payload with both method's fields populated, and a component test asserting the UI disables/clears the inactive method's fields on toggle.

---

### Pitfall 3: Treating code 3701 (fixed allowance) and 3702/3703 (reimbursive) as interchangeable

**What goes wrong:**
Per SARS: **3701** = fixed/regular travel allowance (subject to 80%, or 20% if <20% of use is private, PAYE withholding during the year); **3702** = reimbursive travel allowance where the employer's rate paid PER KM EXCEEDS the SARS-prescribed rate (this excess is fully taxable, no logbook deduction available against it — it's just extra income); **3703** = reimbursive allowance at or below the SARS-prescribed rate (non-taxable, no deduction needed, effectively already "netted out"). SARS also enforces that 3703 must not co-appear on the same IRP5 alongside 3701/3702 (mutually exclusive allowance types since the 2019 year). A common and serious bug: treating all three codes as "travel allowance income" and running them all through the same deemed/actual-cost deduction logic. 3703 amounts should never have a logbook deduction calculated against them — they're already tax-free reimbursements up to the prescribed rate.

**Why it happens:**
The existing `travel-schedule.ts` only knows about 3701 in its current crude form (per PROJECT.md: "replacing the crude allowance×ratio estimate ... source codes 3701/3702, deductions 4014/4015"). When adding 3702/3703 handling, it's tempting to genericize "any travel-related income code" into one deduction pipeline. That's wrong: 3701 needs the 80/20 PAYE-vs-assessment-treatment split (see Pitfall 4) plus deemed/actual cost deduction; 3702 needs the deduction applied only against the SARS-prescribed-rate portion, with the excess-over-prescribed-rate portion remaining fully taxable with NO deduction against it; 3703 needs no deduction calculation at all (already non-taxable) and should not appear in the deductible travel schedule at all.

**How to avoid:**
- Model income codes as a discriminated union/enum in the travel schedule input type: `{ code: "3701" } | { code: "3702"; ratePerKm: number } | { code: "3703"; ratePerKm: number }`, each with distinct calculation branches.
- For 3702: apply logbook deduction only against km reimbursed at/below the SARS prescribed rate portion conceptually captured in the allowance; the excess-over-prescribed-rate component is not eligible for a further deduction — flag it clearly in the output line rather than silently zeroing or double-counting.
- For 3703: skip deduction calculation entirely and surface a line explaining why (non-taxable, no logbook deduction required/available).
- Add a validation rule rejecting an input payload where 3703 is combined with 3701/3702 for the same employer/period (matches actual SARS IRP5 rules), at minimum as a warning surfaced to the practitioner.
- Unit test each code path independently with SARS worked examples (from the SARS guide for employers PAYE-GEN-01-G03) as fixtures.

**Warning signs:**
- Single function computing "deduction" from any of the three codes using the same formula.
- No distinct handling/warning when 3702's excess-over-prescribed-rate portion is present.
- UI presents 3701/3702/3703 as one dropdown "travel allowance type" feeding one calculation path with only a label change.

**Phase to address:**
ITR12 travel schedule integration phase (the one replacing `travel-schedule.ts`'s crude logic). Verification: three separate fixture-based unit tests, one per code, checked against SARS guide worked examples with source citation in test comments.

---

### Pitfall 4: Ignoring the 80% (or 20%) PAYE withholding vs. year-end assessment treatment distinction for code 3701

**What goes wrong:**
During the year, employers withhold PAYE on 80% of a fixed travel allowance by default (or only 20% if the employer is satisfied at least 80% of the vehicle's use will be for business — an employer-level election, not an employee one). At **year-end assessment**, this 80/20 PAYE withholding split is irrelevant to the deduction calculation — the actual deduction is computed from the logbook's real business-km ratio (deemed or actual cost method), completely independent of what fraction was subject to PAYE during the year. A common mistake is carrying the 80% (or 20%) PAYE figure into the assessment-time deduction formula, e.g., "deduction = 80% × allowance × cost-per-km" — that 80% has no place in the year-end deduction calculation at all; it only affected in-year cash flow (how much tax was already withheld), which nets out via the assessed tax vs. PAYE credit, not via the deduction formula.

**Why it happens:**
The 80/20 figure is prominent on payslips and IRP5s, so it "looks like" it belongs in the tax calculation, and reusing an already-captured field feels efficient. But it's a withholding-timing concept, not a deduction-eligibility concept.

**How to avoid:**
- Keep the "PAYE withholding basis" (80% or 20%, informational, from the IRP5) as a separate, clearly-labeled field from the logbook-derived business-use ratio used in the deduction formula.
- Deduction formula for 3701 should use: `deemedOrActualCostPerKm × businessKilometres` (subject to the deemed table's total-km cap logic), full stop — not scaled by the PAYE withholding percentage.
- Add an explicit code comment/docstring at the deduction function stating "PAYE withholding basis (80/20) is informational only and must not scale this deduction" to prevent future regression.
- Add a regression test with a case where PAYE withholding basis is 20% but actual logbook business-use ratio is 40%, asserting the deduction uses 40%, not 20%.

**Warning signs:**
- Any deduction formula referencing an "80%" or "employerWithholdingBasis" field.
- Field named ambiguously (e.g., `businessPercentage`) used both for PAYE display and deduction math.

**Phase to address:**
ITR12 travel schedule integration phase, same phase as Pitfall 3 (they touch the same code path). Verification: the regression test above must exist and pass.

---

### Pitfall 5: Odometer continuity not validated (trip start ≠ previous trip end)

**What goes wrong:**
A SARS-compliant logbook is a continuous odometer record: opening odometer for the year, then each trip's start reading should equal (or be consistent with) the previous trip's end reading, ending at the closing odometer for the year. Total business km + private km should reconcile to (closing − opening). Without continuity validation, imported or manually-entered trips can have gaps, overlaps, or reversed readings (end < start) that silently produce a nonsensical total-km figure, which then corrupts the business-ratio and deemed-cost-per-km calculations (deemed cost tables cap out and change bracket based on annual total km).

**Why it happens:**
CSV imports in particular append rows without any coherence check (see Pitfall 6/7). Manual capture UIs often let users add a trip without pre-filling the start odometer from the prior trip's end, so gaps accumulate. It's also tempting to validate only within a single trip (`end > start`) and skip the cross-trip continuity check because it requires sorting and stateful comparison across the whole trip list — more effort than a single-row validation.

**How to avoid:**
- Validate: `trip[i].startOdometer >= trip[i-1].endOdometer` when trips are sorted by date, and `trip[i].startOdometer <= trip[i-1].endOdometer` allowing exact equality (gaps as unexplained private km are normal and expected — SARS logbooks are not required to have zero gaps, but a trip's start reading should never be LESS than the prior trip's end reading, which would imply an impossible odometer rollback).
- Validate `closingOdometer - openingOdometer >= sum(businessKm) ` (private km fills the remainder; business km can never exceed total annual km).
- Surface continuity violations as reviewable warnings (consistent with the existing `reviewRequired` pattern), not silent auto-corrections — a practitioner needs to see and resolve odometer discrepancies, not have the app guess.
- This validation must run efficiently on large imports (10,000+ trips) — a single sorted pass, O(n log n) for the sort plus O(n) for the continuity check, not O(n²) pairwise comparison.

**Warning signs:**
- Trip type/schema has `startOdometer`/`endOdometer` but no cross-record validation function exists.
- Total business km computed by summing trip distances without ever cross-checking against `closingOdometer - openingOdometer`.
- Large CSV imports "succeed" with zero warnings even when the source file obviously has date-order or odometer inconsistencies (test this explicitly with a deliberately broken fixture file).

**Phase to address:**
Travel logbook data model + import phase. Verification: unit test with an intentionally discontinuous trip list (gap, overlap, and reversed-reading cases) asserting each is caught and surfaced, not silently accepted.

---

### Pitfall 6: Date parsing breaks across CSV conventions (DD/MM/YYYY vs MM/DD/YYYY) and Excel serial dates

**What goes wrong:**
South African CSV exports (and the SARS elogbook template) use DD/MM/YYYY. `new Date("03/04/2026")` in JavaScript is ambiguous/locale-dependent and commonly parsed as MM/DD (March 4) rather than the intended DD/MM (April 3) — a silent, wrong-answer bug, not a crash. Separately, when a user imports an actual `.xlsx` file (not CSV), Excel stores dates as serial numbers (days since 1899-12-30, with the well-known 1900 leap-year bug), and a naive read from a library like `xlsx`/`SheetJS` can return either a formatted string, a raw serial number (e.g., `46020`), or a JS Date depending on cell formatting and library options — code that only handles one of these will silently corrupt dates from real-world files.

**Why it happens:**
`new Date(dateString)` "usually works" in developer testing because dates are often typed/tested in an unambiguous or single-convention way. The bug only surfaces with real client data (dates like 03/04/2026 that are valid-but-wrong in either convention) and is very easy to miss because both interpretations parse "successfully" — there's no error, just wrong data silently feeding tax calculations.

**How to avoid:**
- Never use `new Date(dateString)` on user-supplied CSV date strings. Use an explicit parser (e.g., a small DD/MM/YYYY-first parser, or a library like `date-fns`'s `parse()` with an explicit format string) and make the expected format an explicit, documented assumption shown in the import UI ("Dates expected as DD/MM/YYYY").
- For ambiguous rows (both interpretations valid, e.g., day and month both ≤ 12), flag for manual review rather than guessing.
- For XLSX imports, detect Excel serial numbers explicitly (numeric cell value with date-formatted cell) and convert using the correct epoch (`(serial - 25569) * 86400 * 1000` for Unix ms, accounting for the 1900 leap-year quirk) — most parsing libraries (SheetJS/xlsx with `cellDates: true`) handle this if configured correctly; verify library output type explicitly with a test rather than assuming.
- Add fixture tests with real ambiguous dates (e.g., "05/06/2026") for both CSV and XLSX paths, asserting the parsed result matches the DD/MM/YYYY-first assumption.
- Reject/flag out-of-range results (date in the future beyond today, or predating the vehicle's plausible ownership) as a sanity check, since a swapped day/month often produces a wildly wrong-but-not-obviously-invalid date (e.g., 13/02 → invalid catches when day>12, but 03/04 does not).

**Warning signs:**
- `new Date(...)` called anywhere on a raw string from CSV/XLSX cell values.
- No explicit date-format documentation shown to the user in the import UI.
- No test fixture with an ambiguous day/month pair (both ≤ 12).
- XLSX import path never tested against an actual `.xlsx` file with real Excel date-formatted cells (only CSV strings tested).

**Phase to address:**
CSV/XLSX import phase. This directly extends `CONCERNS.md` item #3 (date parsing performance) — fix format ambiguity and performance together by parsing once at import time into a normalized `dateISO`/`dateParsed` field, per the existing fix-approach recommendation.

---

### Pitfall 7: Floating-point currency math accumulating error across thousands of trips

**What goes wrong:**
Deemed/actual cost calculations multiply cents-level per-km rates (e.g., R1.48/km fuel cost) across potentially 10,000+ trips, then sum, then combine with fixed annual costs, then apply to a tax bracket calculation. Native JS floating point (`0.1 + 0.2 !== 0.3`) accumulates small errors that, summed across thousands of rows, can shift a final Rand-and-cent figure by meaningful amounts — and worse, can produce inconsistent results depending on summation order (batch import vs. incremental add).

**Why it happens:**
The codebase's existing pattern (`r2()` — round to 2 decimals) is applied at the end of a calculation, which is good practice for display, but if intermediate per-trip amounts are also rounded to 2 decimals before summing (rather than keeping full precision until the final total), rounding error compounds across thousands of trips. Conversely, if nothing is rounded until the very end but summation happens via naive `+=` in a loop over 10,000 floats, precision loss can occur at the far end of IEEE-754 precision for very large aggregate totals.

**How to avoid:**
- Keep per-trip intermediate calculations at full floating-point precision; only round with `r2()` at the point of producing a final schedule line/output value, matching the existing codebase convention — don't round per-trip amounts before summing.
- For summation over large arrays, use a straightforward reduce/sum (10,000 additions is nowhere near the precision-loss threshold for typical Rand amounts — this is a real but secondary concern vs. per-row premature rounding, which is the actual risk here).
- Add a test that sums many small trip amounts (e.g., 10,000 trips × R47.23 fuel cost) and asserts the total matches a precisely-computed expected value to the cent, catching regressions from premature rounding.
- Consider integer cents internally for the travel module if the team wants to eliminate float risk entirely — but note this would be inconsistent with the rest of the codebase's float+`r2()` convention (`CONVENTIONS.md`), so weigh consistency vs. rigor; at minimum, standardize on "round only at output boundaries" project-wide for this milestone.

**Warning signs:**
- `r2()` (or equivalent rounding) called inside a per-trip loop before accumulation, rather than once on the final total.
- No test with a large trip count asserting cent-level accuracy of the aggregate.

**Phase to address:**
Deemed/actual cost calculation phase. Verification: large-N summation unit test as described above.

---

### Pitfall 8: Changing `travel-schedule.ts` inputs/output shape breaks other schedules' tests and the calculation-service integration

**What goes wrong:**
PROJECT.md explicitly flags this: "changes to `travel-schedule.ts` must not break other schedules' tests." The current `IndividualTaxTravelInput`/`IndividualTaxScheduleResult` types are shared/consistent with employment, medical, interest, rental, and sole-proprietor schedules (per `CONVENTIONS.md`'s discriminated-union/shared-type patterns). Replacing the crude ratio calculation with deemed/actual cost methods will likely need new input fields (vehicle value, cost method, odometer readings, per-trip data) — if these are added by widening the shared `IndividualTaxScheduleResult`/`IndividualTaxTravelInput` type in a way other schedules also consume, or if `calculation-service.ts`'s orchestration assumes travel always returns the old 2-line shape (3701/4014 only), other schedules' snapshot/unit tests can fail even though they didn't touch travel logic.

**Why it happens:**
Shared types across schedule modules are convenient but create implicit coupling. A field added to satisfy travel's new needs (e.g., a `warnings` array reused generically) can change default/optional-ness in a way TypeScript accepts but which breaks another schedule's test expecting exact object shape via `toEqual`.

**How to avoid:**
- Prefer additive, optional fields on shared types over restructuring; if travel truly needs a distinct shape (likely, given vehicle/odometer/cost-method complexity), give it its own `IndividualTaxTravelInput`/`TravelScheduleResult` types rather than forcing it into the generic schedule shape, and adapt at the `calculation-service.ts` boundary.
- Run the full test suite (`npm test`) after each incremental change to `travel-schedule.ts`, not just travel-specific tests — this is a fast, cheap check that should be part of the phase's verification step every time this file changes.
- Add/keep integration test at the `calculation-service.ts` level (per `CONCERNS.md` item #13's recommended fix) asserting the full assessment calculation (all schedules combined) still produces a correct total after travel schedule changes.
- Version the rename suggested in `CONCERNS.md` (`estimateByAllowanceRatio()` kept as a named function, not deleted) if any other code path or test still depends on the old crude estimate behavior for a transition period.

**Warning signs:**
- Other schedule test files start failing after a travel-only change (immediate signal — must not be dismissed as "unrelated flakiness").
- `calculation-service.ts` destructures travel schedule output positionally or assumes exactly 2 lines (3701, 4014) without checking `lines.length` or code values first.

**Phase to address:**
ITR12 travel schedule integration phase. Verification: full `npm test` run (not just the travel test file) required as an explicit gate before marking this phase done.

---

### Pitfall 9: React re-render traps when splitting the tax-tools.tsx monolith

**What goes wrong:**
Splitting a 2,148-line monolithic component into sub-components (TravelLogbook, MedicalCredits, etc., per `CONCERNS.md`'s recommended approach) can accidentally make performance worse if state is merely relocated rather than properly colocated, or if memoization boundaries are drawn in the wrong place. Three specific traps: (1) lifting all sub-component state back up into a shared parent/context "to keep them in sync" recreates the exact monolith re-render problem one level up; (2) wrapping sub-components in `React.memo` without stable prop references (inline object/array/function literals passed as props defeat memoization silently — no error, just no speedup); (3) putting the 10,000-row trip table inside the same component as form inputs for vehicle details, so every keystroke in an unrelated field still re-renders the (unvirtualized-until-fixed) table.

**Why it happens:**
"Splitting into components" is often done for code organization/readability first, with performance treated as a side effect that "should" follow — but React re-renders are driven by where state lives and how props are referenced, not by file/component boundaries alone. A naive split can pass the same monolithic state object down to every child via context, in which case every child still re-renders on every change regardless of how many files the JSX lives in.

**How to avoid:**
- Colocate state with the component that owns it: trip list state lives in/near the TravelLogbook component, not the top-level tax-tools shell; medical credit inputs live in the Medical component, etc. Each tab's state should be independent — a keystroke in Medical must not re-render Travel.
- For the trip table specifically: extract `filteredTrips`/`monthlyData` derivations into `useMemo` with correct dependency arrays (per `CONCERNS.md` item #1's fix step 2) — this is necessary regardless of component splitting and should not be skipped as "the split will handle it."
- When using `React.memo` on row/list-item components, ensure callback props passed down are stable (`useCallback`) and object/array props are memoized or primitive — otherwise `memo` silently provides zero benefit while adding a shallow-comparison cost on every render.
- Virtualize the trip table (react-virtual/`@tanstack/react-virtual` or similar, per existing recommendation) independent of the component-split work — splitting alone does not fix an unvirtualized 10,000-row map.
- Use React DevTools Profiler (or a simple render-count log during development) to verify, after the split, that editing a field in one tab does NOT trigger a re-render in a sibling tab's component tree — don't assume the split worked; measure it.

**Warning signs:**
- A shared "TaxToolsContext" or single large state object still passed to every sub-component after the split (state moved, not decomposed).
- `React.memo` added to row components with inline arrow functions (`onClick={() => ...}`) or inline object literals (`style={{...}}`) still passed as props.
- No profiler measurement taken before/after the split to confirm the fix actually reduced re-render count — "it's split into files now" is not evidence of a performance fix.
- Derived values (`filteredTrips`, `monthlyData`) still recalculated inline in JSX or render body without `useMemo` after the split.

**Phase to address:**
React performance refactor phase. Verification: Profiler-based before/after comparison (or explicit render-count assertion in a component test) demonstrating that editing one tab's field does not re-render other tabs' trip tables; large-trip-count (1,000+ row) interaction (typing in a filter, scrolling) must remain responsive in manual verification.

---

### Pitfall 10: FileReader blocking the main thread on large CSV/XLSX imports

**What goes wrong:**
Reading a large file with `FileReader.readAsText()`/`readAsArrayBuffer()` is asynchronous at the I/O level, but the subsequent parsing (splitting into rows, mapping headers, running per-row validation like odometer continuity) typically happens synchronously on the main thread in the `onload` callback. For a 10,000+ trip CSV/XLSX (explicitly named as the target scale in PROJECT.md's constraints), synchronous parsing of that size can freeze the UI for seconds — the exact symptom (`"large logbook imports must not freeze the UI"`) this milestone exists to fix, and it's easy to fix the rendering-side performance (virtualization, memoization) while leaving the import-time parsing itself still blocking.

**Why it happens:**
`FileReader` being "async" (it fires an event) creates a false sense that the whole import pipeline is non-blocking. In reality, once `onload` fires, everything inside it — CSV parsing, XLSX sheet-to-JSON conversion, per-row date parsing, per-row odometer validation — runs synchronously unless explicitly chunked or offloaded.

**How to avoid:**
- Parse large files in chunks (yield control back to the event loop periodically, e.g., via `requestIdleCallback`/`setTimeout(0)` batching, or process rows in batches of ~500 with a `await new Promise(r => setTimeout(r))` yield between batches) so the UI thread isn't blocked continuously.
- Prefer a Web Worker for CSV/XLSX parsing + validation of large files — this fully removes the blocking risk rather than just reducing it, and is the more robust fix for the "10,000+ trips" scale explicitly named in the requirements. Libraries like `papaparse` (recommended in `CONCERNS.md`) support a `worker: true` option specifically for this.
- Show a progress indicator during import (row count processed / total) — this also surfaces to the user that large imports take real time, managing expectations and providing a natural point to test "does the tab stay responsive during import" (spinner animating = thread not blocked).
- Test explicitly with a synthetic 10,000-row fixture file (both CSV and XLSX) and confirm the page remains interactive (e.g., a click handler still responds) during the import, not just that the import eventually completes correctly.

**Warning signs:**
- CSV/XLSX parsing code has no `worker: true` option, no chunking, and no progress indicator — a strong sign it's a single synchronous pass regardless of file size.
- Manual testing only ever done with small (<100 row) sample files; large-file testing skipped because "it's basically the same code path."
- Import UI has no loading state distinguishable from "frozen" (no progress bar, spinner, or row counter) — even if parsing is technically non-blocking, a UI with no feedback during a multi-second import looks broken to the user.

**Phase to address:**
CSV/XLSX import phase (performance sub-goal shared with the React refactor phase). Verification: synthetic 10,000-row import fixture test asserting completion within an acceptable time budget, plus a manual/E2E check that the UI remains responsive (e.g., a button click during import registers) during the operation.

---

### Pitfall 11: SARS elogbook auto-detection is brittle against real-world header/format variance

**What goes wrong:**
PROJECT.md requires "auto-detection of the official SARS elogbook layout." The official SARS template's column headers, sheet name, and layout can vary slightly by year of publication (SARS periodically revises its published elogbook workbook), and users frequently modify the template (reorder columns, rename headers, add extra columns, merge cells for readability, add a title row above the header row). Auto-detection logic written against one exact snapshot of the template will silently fail to detect (falling back to manual mapping, which is fine) or — worse — misdetect and silently map the wrong columns (e.g., treating a "notes" column as "purpose" because it's in the expected position), corrupting data without any visible error.

**Why it happens:**
Auto-detection is typically built and tested against one clean reference file (the current year's official template downloaded once), then never re-tested against variations. The temptation is to hardcode column positions/exact header strings rather than fuzzy-matching header names and validating detected columns against expected data types (e.g., "does this column actually contain numeric odometer readings" as a sanity check on top of header-name matching).

**How to avoid:**
- Auto-detect by header name matching (case-insensitive, whitespace-tolerant, fuzzy/partial match) rather than fixed column position, and independently validate detected columns by sampling data type (dates parse as dates, odometer columns parse as increasing numbers) before trusting the detection.
- Always show the user a mapping preview/confirmation step (map detected columns to fields, editable) rather than silently importing on "detected" confidence — matches the existing `CONCERNS.md` recommendation ("Show preview with auto-detection confidence scores").
- Keep manual column-mapping as a first-class fallback path (not just an error state) since SARS template variance across years/versions is expected, not exceptional.
- Test against at least two real-world variations: the exact official template, and a plausibly-modified version (reordered columns, renamed header casing) — not just the single golden-path file.

**Warning signs:**
- Detection logic keyed to column index/position rather than header text.
- No confidence score or preview shown before import commits.
- Only one fixture file used in tests (the "perfect" template).

**Phase to address:**
CSV/XLSX import phase. Verification: test fixtures covering both the canonical SARS template and at least one deliberately varied version.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Ship deemed-cost method only, defer actual-cost method | Faster delivery of the flagship feature | Practitioners can't compare methods to pick the more beneficial one; audit risk if SARS expects the comparison to have been considered | Never for this milestone — PROJECT.md explicitly requires both methods |
| Keep logbook trip state in `useState` a little longer while persistence is built separately | Simpler incremental PRs | Re-introduces the exact "lost on refresh" bug (`CONCERNS.md` #4) that this milestone must fix | Only as a very short-lived intermediate commit within a single phase, never merged as a stopping point |
| Round every intermediate travel-cost calculation to 2 decimals for "cleaner" debugging output | Easier to eyeball numbers while developing | Compounds floating-point rounding error across thousands of trips (Pitfall 7) | Never in production code paths; acceptable only in a throwaway debug log statement |
| Validate odometer continuity only within a single trip row (end > start), skip cross-trip continuity | Simpler validation logic, faster to ship | Misses gaps/overlaps that corrupt total-km and deemed-cost bracket selection (Pitfall 5) | Acceptable only as an interim MVP if explicitly flagged with a follow-up task; not acceptable as the final state given SARS audit requirements |
| Use `new Date(dateString)` for CSV date parsing "since most test dates work" | Zero extra code, ships faster | Silently swaps day/month for real SA-format dates (Pitfall 6) — a correctness bug, not a crash, so it can ship unnoticed | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|--------------|------------------|---------------------|
| SARS elogbook (.xlsx) auto-detection | Hardcoding exact header strings/column positions from one downloaded template | Fuzzy header matching + data-type sanity checks + user-confirmed mapping preview (Pitfall 11) |
| CSV/XLSX date columns | Assuming a single date format/type across all rows and both file types | Explicit DD/MM/YYYY parser for CSV strings; explicit Excel-serial-number detection and conversion for XLSX cells (Pitfall 6) |
| `travel-schedule.ts` ↔ `calculation-service.ts` | Assuming the schedule always returns exactly 2 lines (3701/4014) as today | Have `calculation-service.ts` branch on line `code` values rather than positional/count assumptions, so new lines (3702/3703/4015/deemed-vs-actual variants) don't silently misalign (Pitfall 8) |
| Rulepack registry ↔ new deemed-cost table | Adding the deemed-cost table as a standalone constant outside the per-year rulepack files | Add it as a field on each `rules-20XX.ts` rulepack, resolved via the existing `getIndividualTaxRulePackByYear()` (Pitfall 1) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Synchronous CSV/XLSX parsing in `FileReader.onload` | UI freezes/unresponsive during import; browser "page unresponsive" warning | Chunked parsing with yields, or Web Worker (`papaparse` `worker: true`) | Noticeable from a few hundred rows, severe at the 10,000+ row scale this milestone targets |
| `new Date()` parsing per row per render/filter | Typing in a filter or sorting the trip table lags/freezes | Parse dates once at import time into a numeric `dateParsed` field; never reparse during render (`CONCERNS.md` #3) | 200+ trips noticeable lag, 500+ trips freeze (per existing CONCERNS.md measurement) |
| Unvirtualized trip table `.map()` over all rows | Scroll jank, slow initial render, memory growth | Virtualize with react-virtual/@tanstack/react-virtual for lists >100 items | Directly tied to trip count; becomes severe well before 10,000 rows |
| Recalculating `filteredTrips`/`monthlyData` inline every render | Lag on every keystroke anywhere in the component, not just travel-related fields | `useMemo` with correct, minimal dependency arrays | Present even at moderate trip counts once the monolith re-renders on unrelated state changes |
| Cross-trip odometer continuity validation via naive pairwise (O(n²)) comparison | Import step itself becomes slow/freezes independent of parsing | Sort once, then single linear pass comparing adjacent trips | Becomes noticeable well before 10,000 rows if implemented as nested loops |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting uploaded XLSX/CSV content without size/row limits | A crafted or accidentally huge file (millions of rows, or a zip-bomb-style XLSX) can exhaust memory/CPU during import, a DoS vector on a single-user/demo deployment and worse on any shared instance | Enforce a maximum file size and row count at the very start of import, before full parsing; reject with a clear error rather than attempting to process |
| Storing full vehicle registration/odometer/logbook detail in the same weakly-collision-prone ID scheme flagged in `CONCERNS.md` #6 (`Date.now() + Math.random()`) | Logbook trip records could collide/overwrite silently, corrupting a client's SARS-audit-facing record without any error surfaced | Use `crypto.randomUUID()` for all new logbook/trip/vehicle record IDs introduced in this milestone, per the existing recommended fix — don't propagate the weak pattern into new code |
| Import file path/name handling reusing the existing minimal sanitization (`CONCERNS.md` #10) for newly-added XLSX uploads | Same low-but-nonzero path traversal / resource exhaustion risk extended to a new upload type | Apply `path.basename()`, extension whitelist (`.csv`, `.xlsx`), and max-size enforcement consistently to the new import upload path, not just existing document uploads |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Silently guessing ambiguous CSV dates or auto-detected columns | Practitioner unknowingly files an ITR12 with wrong trip dates/columns, discovered only on SARS query/audit | Always surface an editable preview/confirmation step before committing an import, flagging any ambiguous/low-confidence detections explicitly |
| No feedback during large-file import (spinner-less, progress-less) | User assumes the app crashed/froze and reloads mid-import, losing all progress and possibly re-uploading duplicates (`CONCERNS.md` #12) | Progress indicator (row count or percentage) plus disabling the upload control during processing to prevent duplicate submissions |
| Switching cost method (deemed↔actual) without warning what happens to already-entered data | User loses entered actual-cost receipts data by toggling to deemed and back, or believes both are being claimed | Explicit confirmation dialog on method switch explaining data retention/clearing behavior, consistent with Pitfall 2's data model |
| Presenting odometer/continuity warnings as blocking hard errors with no explanation | Practitioner can't figure out which trip row is the problem, abandons import | Inline, per-row warning highlighting with a plain-language message ("Trip 47's start reading (52,300 km) is less than trip 46's end reading (52,450 km)") rather than a generic "validation failed" |

## "Looks Done But Isn't" Checklist

- [ ] **Both cost methods implemented:** Often only deemed cost gets built (it's table-lookup-simple) while actual cost (which needs expense reconciliation, receipts, wear-and-tear schedules) is stubbed or deferred — verify `calculateByActualCost()` produces a real, tested, non-placeholder result, not just a UI form that doesn't feed the calculation.
- [ ] **Per-year rate tables for all three years:** Often 2026 gets real gazetted figures (the "current" year) while 2025 and/or 2027 are placeholder/estimated — verify all three years' deemed-cost tables cite an official source and differ from each other.
- [ ] **Logbook persistence survives the full lifecycle:** Often "persistence" is verified only for "save then reload the same page," not for the full flow (import → classify → edit → navigate away → return → still-editable → finalize into assessment → still retrievable from the assessment). Verify each transition explicitly, matching `CONCERNS.md` #4's stated priority.
- [ ] **CSV/XLSX import handles quoted fields, commas-in-fields, AND large files AND SARS auto-detect together:** Often each is tested in isolation (a quoted-field fixture, a large fixture, a SARS-template fixture) but never in combination — verify a single large, quoted-field-containing file matching the SARS template layout imports correctly and performantly in one test.
- [ ] **3701/3702/3703 all handled, not just 3701:** Often only the fixed allowance (3701) gets full treatment since it's the "main" case, while reimbursive codes are left as before or ignored — verify each code has its own tested calculation path (Pitfall 3).
- [ ] **React split actually reduces re-renders, not just file count:** Often the monolith is split into multiple files that still share one big state object/context — verify with a Profiler measurement or render-count test, not just by counting new component files (Pitfall 9).
- [ ] **Odometer continuity validated on import, not just on manual entry:** Manual-entry validation is often built (since it's the original UI) while the newer bulk-import path bypasses the same checks — verify the identical continuity validation runs on imported trips, not only manually-added ones.
- [ ] **Existing schedule tests still pass after travel-schedule.ts changes:** Verify with a full `npm test` run, not just the travel-schedule test file, per Pitfall 8.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|-----------------|
| Wrong-year rate table shipped and used in live assessments | MEDIUM | Identify affected assessments via rulepack version stamp (if tracked per `CONCERNS.md` #19's audit-trail recommendation); recalculate affected travel schedules with the correct year's table; notify practitioners of affected clients; add the missing per-year completeness test going forward |
| Deemed+actual cost double-claimed due to missing method exclusivity validation | MEDIUM | Add the missing Zod-level exclusivity validation; run a data migration/audit script over existing persisted logbooks to detect and flag any record with both method's fields populated for manual practitioner review |
| Date-format swap corrupted imported trip dates (day/month reversed) | HIGH if already fed into a finalized assessment; LOW if caught in review | Add explicit DD/MM/YYYY parsing with ambiguous-date flagging; for already-imported data, re-run detection against the raw stored source file (if retained) or require re-import; never attempt automatic "un-swap" heuristics on data already in the system, since a heuristic fix risks a second silent corruption |
| React split didn't actually fix re-render performance | LOW–MEDIUM | Profile to find the actual remaining coupling point (likely a shared context/state object or missing memoization); this is iterative — no need to redo the whole split, just isolate and fix the specific unmemoized boundary |
| Odometer continuity issues discovered only after many logbooks already saved | MEDIUM | Add the validation function; run it as a read-only audit pass over existing persisted logbooks to generate a report of affected records; surface as a review queue rather than blocking existing data retroactively |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Wrong-year rate tables (#1) | Rate-tables verification phase (2025–2027) | Per-year unit tests with cited SARS source; rulepack completeness test |
| Deemed/actual cost mixing (#2) | Travel logbook cost-method calculation phase | Zod validation test rejecting mixed-method payloads; UI test for field clearing on toggle |
| 3701 vs 3702/3703 conflation (#3) | ITR12 travel schedule integration phase | Three independent fixture tests against SARS worked examples |
| 80/20 PAYE basis leaking into deduction math (#4) | ITR12 travel schedule integration phase | Regression test: PAYE basis ≠ logbook business ratio, deduction uses the latter |
| Odometer continuity unvalidated (#5) | Travel logbook data model + import phase | Discontinuous-fixture unit test (gap/overlap/reversed) |
| Date parsing format ambiguity + Excel serials (#6) | CSV/XLSX import phase | Ambiguous-date fixture test; real `.xlsx` fixture with Excel-formatted dates |
| Floating-point currency drift (#7) | Deemed/actual cost calculation phase | Large-N (10,000 trip) summation precision test |
| Breaking other schedules via shared type changes (#8) | ITR12 travel schedule integration phase | Full `npm test` run gate, not travel-only tests |
| React re-render traps in monolith split (#9) | React performance refactor phase | Profiler/render-count before-after comparison |
| FileReader blocking on large imports (#10) | CSV/XLSX import phase | 10,000-row import fixture with responsiveness check during processing |
| Brittle SARS elogbook auto-detection (#11) | CSV/XLSX import phase | Canonical + varied-template fixture tests |

## Sources

- `.planning/PROJECT.md` — milestone scope, known bugs/gaps, constraints (project-internal, HIGH confidence — reflects actual current codebase state)
- `.planning/codebase/CONCERNS.md` — detailed existing-code analysis of `tax-tools.tsx`, CSV import, date parsing, persistence gaps, ID generation, travel-schedule.ts crude estimate (project-internal, HIGH confidence — direct code citations with line numbers)
- `.planning/codebase/TESTING.md`, `.planning/codebase/CONVENTIONS.md` — existing test/code patterns to follow so new travel logic integrates consistently (project-internal, HIGH confidence)
- `src/modules/individual-tax/schedules/travel-schedule.ts` (read directly) — confirms current crude `allowance × businessRatio` logic and the exact lines to be replaced
- `src/modules/individual-tax/rulepack-registry.ts` (read directly) — confirms existing per-year rulepack resolution pattern that the deemed-cost table must plug into
- [SARS Travel e-log book (official)](https://www.sars.gov.za/types-of-tax/personal-income-tax/travel-e-log-book/) — MEDIUM confidence (WebSearch-surfaced, official domain)
- [SARS Guide for Employers in respect of Allowances, PAYE-GEN-01-G03 (2027 tax year edition)](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/PAYE-GEN-01-G03-Guide-for-Employers-in-respect-of-Allowances-External-Guide.pdf) — MEDIUM confidence (official SARS PDF, surfaced via WebSearch, not directly fetched/verified in full — recommend fetching in full during the rate-tables phase to extract exact 2025/2026/2027 deemed-cost bracket tables)
- [SARS Guide for Codes Applicable to Employees Tax Certificates 2026](https://www.sars.gov.za/wp-content/uploads/Ops/Guides/PAYE-AE-06-G06-Guide-for-Codes-Applicable-to-Employees-Tax-Certificates-2026-External-Guide.pdf) — MEDIUM confidence, confirms 3701/3702/3703 definitions and the 2019-onward mutual-exclusivity rule between 3703 and 3701/3702
- [New SARS Tax-Free Rate Per Km 2026 (R4.95), Accounting Academy](https://accountingacademy.co.za/news/read/new-sars-tax-free-rate-per-km-5) — LOW-MEDIUM confidence (secondary source, cites the R4.95/km prescribed rate effective 1 March 2026); cross-verify against the official SARS PDF during the rate-tables phase before hardcoding
- [Tax Faculty FAQ on 3701 80% allowance and reimbursive rate interaction](https://taxfaculty.ac.za/faq/general_faqs/solution/1036) — LOW confidence (community/secondary source), used only to corroborate the 80/20 PAYE-withholding-vs-deduction distinction (Pitfall 4), which is a well-established SARS rule independently confirmed by the official guides above
- General React performance guidance (re-render colocation, memoization boundaries) — MEDIUM confidence, standard/well-established React engineering practice rather than SARS/domain-specific; not separately re-verified via WebSearch since it is not a "fast-moving" fact but a stable architectural pattern

---
*Pitfalls research for: SA individual tax platform — travel logbook, large-file import, React refactor, per-year rate tables*
*Researched: 2026-07-02*
