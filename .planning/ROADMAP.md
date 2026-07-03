# Roadmap: SA Tax Platform — Individual Tax SARS Compliance Milestone

## Overview

This milestone takes the Individual Tax module from "crude travel estimate + monolithic freeze-prone UI" to a fully SARS-compliant, performant system. The build order follows the dependency chain: per-year rulepack constants first (everything else reads from them), then the logbook domain module and its ITR12 integration seam (the highest compliance and integration risk, resolved before any UI is built against it), then the import pipeline and component decomposition (architecturally independent of each other, buildable in parallel), then wiring the logbook UI and import wizard together with performance hardening validated at real scale, and finally auditing the remaining seven calculators against current SARS rules. By the end, a practitioner can capture or import a client's travel logbook, see deemed-vs-actual cost comparison, have it flow correctly into the ITR12 travel schedule, and use all eight calculators with confidence that every figure matches SARS requirements for 2025, 2026 and 2027 — without the app freezing on large imports.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Rulepack Extension** - Per-year SARS constants (deemed-cost travel table, medical, retirement, CGT, provisional tax) added to rulepacks as the single source of truth (completed 2026-07-02)
- [x] **Phase 2: Logbook Domain Module** - Vehicle/trip/logbook data model and deemed/actual cost calculation engine, persisted and unit-tested in isolation (completed 2026-07-03)
- [x] **Phase 3: ITR12 Travel Schedule Integration** - Logbook results feed the ITR12 travel schedule with correct source codes, without breaking existing schedule tests (completed 2026-07-03)
- [ ] **Phase 4: Import Pipeline** - CSV/XLSX import with SARS eLogbook auto-detection, off-main-thread parsing, and pre-commit validation
- [ ] **Phase 5: Component Decomposition** - The 2,148-line tax-tools monolith split into independent per-calculator components
- [ ] **Phase 6: Logbook UI, Import Wizard & Performance Hardening** - End-to-end logbook capture/import experience, virtualized and validated at 10,000+ row scale
- [ ] **Phase 7: Calculator Audit** - Remaining seven calculators verified against current SARS rules and rulepack-sourced values

## Phase Details

### Phase 1: Rulepack Extension
**Goal**: Every per-year SARS constant a calculator needs (travel deemed-cost brackets, medical credits, retirement cap, CGT exclusions, provisional tax thresholds) lives in the rulepack, verified for 2025/2026/2027, with no hardcoded tables left in components.
**Depends on**: Nothing (first phase)
**Requirements**: RULE-01, RULE-02, RULE-03
**Success Criteria** (what must be TRUE):
  1. Selecting any of tax years 2025, 2026, or 2027 in a calculator produces figures that match the official SARS PAYE-GEN-01-G03-A01 deemed-cost schedule for that year
  2. The 2027 rulepack reflects the changed retirement s11F cap (R430,000), CGT annual exclusion (R50,000), and primary residence exclusion (R3,000,000)
  3. No tax-tools component contains a hardcoded rate table — all values trace back to `rulepack-registry.ts`
  4. A rulepack-completeness test fails the build if any year's table is missing, duplicated, or a placeholder
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Extend rulepack types, populate verified 2025/2026/2027 travel + provisional tax data, fix stale 2027 retirement/CGT values
- [ ] 01-02-PLAN.md — Rulepack-completeness test as a build gate (presence, structure, distinctness, sanity ranges)
- [ ] 01-03-PLAN.md — Remove all hardcoded rate tables from tax-tools.tsx, add 2025/2026/2027 year selector wired to the rulepack

### Phase 2: Logbook Domain Module
**Goal**: A practitioner's logbook data (vehicle, odometers, trips) is captured, persisted, and correctly calculated under both SARS cost methods — independent of any UI.
**Depends on**: Phase 1
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04, LOG-05, LOG-06
**Success Criteria** (what must be TRUE):
  1. User can create a logbook per client + tax year with vehicle make, model, registration, and cost price
  2. User can record opening and closing odometer readings for the tax year, and manually capture trips with date, business km, from, to, and reason
  3. Logbook data survives page refresh and navigation (persisted like assessments, not lost to component state)
  4. The logbook shows a side-by-side deemed-cost vs actual-cost deduction comparison for the same trip data, with the two methods never mixed in one calculation
  5. User can export a logbook as CSV and a printable summary suitable for SARS audit
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Logbook domain contracts: types, Prisma Vehicle/Logbook/LogbookTrip models, Zod validation + odometer-continuity validator
- [ ] 02-02-PLAN.md — Deemed/actual travel cost calculation engines + side-by-side comparison (TDD)
- [ ] 02-03-PLAN.md — Repository + persistence: DemoLogbookRepository, storage/demo-logbooks.json, Prisma paths
- [ ] 02-04-PLAN.md — Service layer with audit trail + CSV export and SARS audit-summary data shape

### Phase 3: ITR12 Travel Schedule Integration
**Goal**: The travel schedule calculation uses real logbook data instead of the crude allowance×ratio estimate, correctly distinguishing SARS travel allowance codes, without breaking any other schedule.
**Depends on**: Phase 2
**Requirements**: ITR-01, ITR-02
**Success Criteria** (what must be TRUE):
  1. An assessment with a linked logbook shows a travel deduction on the ITR12 schedule computed from real logbook data (deemed or actual, per election), not the allowance×ratio estimate
  2. Source codes 3701/3702 are handled as distinct calculation paths with correct deduction codes, verified against official SARS code guides
  3. An assessment with no logbook still falls back to the legacy estimate path with unchanged output
  4. The full existing test suite (employment, medical, interest, rental, sole proprietor schedules) still passes unmodified
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Logbook-aware travel schedule (TDD): optional LogbookTravelResult param, allowance cap, verified 3701/3702 + TRAVEL_CLAIM codes, lockstep filter updates
- [ ] 03-02-PLAN.md — Thread logbook result through near-eFiling calculation; honest report rows (conditional 3702, real computations replacing fabricated narrative)
- [ ] 03-03-PLAN.md — Resolve client logbook in getIndividualTaxAssessmentResult; integration tests against seeded demo logbook; full-suite verification

### Phase 4: Import Pipeline
**Goal**: Practitioners can import a client's logbook from CSV or Excel — including the official SARS eLogbook template — quickly and safely, with bad data caught before it's committed.
**Depends on**: Phase 2
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. User can import a CSV with quoted fields, mixed delimiters, and SA DD/MM/YYYY dates without rows being silently mis-parsed
  2. User can import an .xlsx file, including files with Excel serial-date values, with dates converted correctly
  3. The official SARS eLogbook column layout is auto-detected and mapped automatically; user can manually map columns for other layouts
  4. Importing a 10,000+ row file keeps the UI responsive (parsing happens off the main thread, with a preview shown before commit)
  5. Odometer discontinuities, invalid dates, and unparseable rows are flagged in the preview before the user finalizes the import
**Plans**: 6 plans

Plans:
- [ ] 04-01-PLAN.md — Foundation: PapaParse + SheetJS (CDN) install, import type contracts, SA/Excel date utilities, worker-bundling spike
- [ ] 04-02-PLAN.md — Bulk import commit: repository.addTrips + service.importTripsToLogbook (one write, one audit entry, merged continuity gate)
- [ ] 04-03-PLAN.md — Robust CSV parsing: PapaParse wrapper (quoted fields, delimiter auto-detect, CRLF) + worker-backed File path + fixtures
- [ ] 04-04-PLAN.md — XLSX parsing: SheetJS wrapper with serial-date conversion + dedicated xlsx.worker.ts + programmatic workbook fixtures
- [ ] 04-05-PLAN.md — SARS eLogbook auto-detection + column-mapping application (TDD)
- [ ] 04-06-PLAN.md — Import validation preview (Phase 2 continuity reuse), guarded client entry with worker routing, end-to-end + 10k-row integration tests

### Phase 5: Component Decomposition
**Goal**: The 2,148-line tax-tools monolith is split so each calculator is independently stateful, eliminating the shared-state re-render freeze.
**Depends on**: Nothing new (architecturally independent; can run in parallel with Phases 2-4)
**Requirements**: PERF-01
**Success Criteria** (what must be TRUE):
  1. Each of the 8 calculators is its own component with colocated local state
  2. Typing in one calculator's input does not trigger a re-render of any other calculator
  3. All calculators read shared values (rates, selected tax year) from rulepack-derived context rather than duplicating constants locally
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Logbook UI, Import Wizard & Performance Hardening
**Goal**: The logbook module, ITR12 integration, and import pipeline come together as one working end-to-end feature that stays responsive at real-world scale.
**Depends on**: Phase 2, Phase 3, Phase 4, Phase 5
**Requirements**: LOG-06 (UI surface), PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. The travel logbook tab shows a virtualized trip table that scrolls smoothly with 10,000+ trips loaded
  2. The import wizard (file select → parse → detect/map → preview → commit) works end-to-end for both CSV and XLSX, including the SARS eLogbook template
  3. A logbook with 10,000+ trips remains responsive for scroll, edit, and filter operations
  4. Both deemed-cost and actual-cost results are real (not stubbed) and update correctly after edits or imports
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Calculator Audit
**Goal**: All remaining calculators are verified against current SARS rules for 2025-2027 and pull every figure from the rulepack, closing known compliance gaps.
**Depends on**: Phase 1 (Phase 5 recommended first for isolated files, but not a hard blocker)
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06
**Success Criteria** (what must be TRUE):
  1. Medical credits calculator produces s6A monthly amounts and s6B additional-credit results matching SARS Guide IT07 for the selected year
  2. Retirement calculator applies the correct s11F cap per year (R350,000 for 2025/2026, R430,000 for 2027)
  3. CGT calculator applies the correct per-year annual exclusion, primary residence exclusion, and inclusion rate
  4. Provisional tax calculator follows paragraph 19/20 basic-amount and safe-harbour rules per year
  5. Rental and home office calculators match SARS deductible-expense rules, including s23(b) requirements for home office
  6. Dashboard tax bracket and rebate figures are sourced from the rulepack for the selected year, not hardcoded
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7
(Phases 2-4 and Phase 5 are architecturally independent and may be executed in parallel once Phase 1 lands; Phase 6 requires 2, 3, 4, and 5 complete; Phase 7 requires Phase 1.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Rulepack Extension | 3/3 | Complete    | 2026-07-02 |
| 2. Logbook Domain Module | 4/4 | Complete   | 2026-07-03 |
| 3. ITR12 Travel Schedule Integration | 3/3 | Complete    | 2026-07-03 |
| 4. Import Pipeline | 0/TBD | Not started | - |
| 5. Component Decomposition | 0/TBD | Not started | - |
| 6. Logbook UI, Import Wizard & Performance Hardening | 0/TBD | Not started | - |
| 7. Calculator Audit | 0/TBD | Not started | - |
