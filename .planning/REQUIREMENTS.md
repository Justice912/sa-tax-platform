# Requirements: SA Tax Platform — Individual Tax SARS Compliance Milestone

**Defined:** 2026-07-02
**Core Value:** A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Rulepacks & Rates

- [x] **RULE-01**: Rulepacks for 2025, 2026 and 2027 contain verified per-year deemed-cost travel rate tables (fixed cost, fuel, maintenance by vehicle value bracket) from the official SARS PAYE-GEN-01-G03-A01 schedules
- [x] **RULE-02**: Rulepacks carry year-specific values including 2027 changes: retirement s11F cap R430,000, CGT annual exclusion R50,000, primary residence exclusion R3,000,000
- [x] **RULE-03**: All tax-tools calculators read rates from the rulepack for a user-selected tax year — no hardcoded tax tables in components

### Logbook

- [x] **LOG-01**: User can create a logbook per client + tax year with vehicle details (make, model, registration, cost/purchase price)
- [x] **LOG-02**: User can record tax-year opening and closing odometer readings for the vehicle
- [x] **LOG-03**: User can capture trips manually with SARS-required fields (date, business kilometres, from, to, reason; per-trip odometer readings optional per official SARS elogbook)
- [x] **LOG-04**: Logbook data persists in storage (like assessments) and survives page refresh and navigation
- [x] **LOG-05**: Logbook computes the travel deduction under BOTH the deemed-cost and actual-cost methods and shows a side-by-side comparison
- [x] **LOG-06**: User can export the logbook in a SARS-acceptable format for audit (CSV and printable summary)

### Import

- [ ] **IMP-01**: User can import trips from CSV with robust parsing (quoted fields, delimiter detection, SA DD/MM/YYYY date handling)
- [ ] **IMP-02**: User can import trips from Excel (.xlsx), including Excel serial-date handling
- [ ] **IMP-03**: The official SARS elogbook layout is auto-detected and columns mapped automatically; manual column mapping remains available for other layouts
- [x] **IMP-04**: Importing 10,000+ rows does not freeze the UI (parsing off the main thread, preview before commit)
- [x] **IMP-05**: Import validation flags odometer discontinuities, invalid dates and unparseable rows before the user finalises

### ITR12 Integration

- [x] **ITR-01**: Logbook result feeds the ITR12 travel schedule with correct source codes (3701/3702) and verified deduction codes, replacing the allowance×ratio estimate
- [x] **ITR-02**: Travel deduction follows SARS method rules (deemed vs actual, claim limited to allowance where applicable); all existing schedule tests keep passing

### Performance & UI

- [ ] **PERF-01**: `tax-tools.tsx` is decomposed into per-calculator components with colocated state — typing in one calculator does not re-render the others
- [ ] **PERF-02**: Trip tables (logbook and import preview) are virtualized
- [ ] **PERF-03**: A logbook with 10,000+ trips remains responsive for scroll, edit and filter operations

### Calculator Audit

- [ ] **CALC-01**: Medical credits calculator matches SARS s6A monthly amounts and s6B formulas per selected year
- [ ] **CALC-02**: Retirement calculator applies the correct s11F cap per year (R350k for 2025/2026, R430k for 2027)
- [ ] **CALC-03**: CGT calculator applies correct per-year exclusions and inclusion rate
- [ ] **CALC-04**: Provisional tax calculator follows paragraph 19/20 rules (basic amount, safe-harbour thresholds) per year
- [ ] **CALC-05**: Rental and home office calculators match SARS deductible-expense rules (s23(b) requirements for home office)
- [ ] **CALC-06**: Dashboard tax bracket/rebate figures come from the rulepack for the selected year

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Platform

- **PLAT-01**: SARS-compliance review of estates, clients and other modules
- **PLAT-02**: 2024 year of assessment rate verification (late/outstanding returns)
- **PLAT-03**: Direct SARS eFiling submission integration
- **PLAT-04**: GPS/mobile trip capture for logbooks

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Estates/trusts/company module changes | Separate milestone — user decision |
| 2024 rate updates | Only 2025–2027 in scope — user decision |
| eFiling submission | Platform prepares near-eFiling data, does not submit |
| Mobile app | Web + existing Electron desktop only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RULE-01 | Phase 1 - Rulepack Extension | Complete |
| RULE-02 | Phase 1 - Rulepack Extension | Complete |
| RULE-03 | Phase 1 - Rulepack Extension | Complete |
| LOG-01 | Phase 2 - Logbook Domain Module | Complete |
| LOG-02 | Phase 2 - Logbook Domain Module | Complete |
| LOG-03 | Phase 2 - Logbook Domain Module | Complete |
| LOG-04 | Phase 2 - Logbook Domain Module | Complete |
| LOG-05 | Phase 2 - Logbook Domain Module | Complete |
| LOG-06 | Phase 2 - Logbook Domain Module | Complete |
| ITR-01 | Phase 3 - ITR12 Travel Schedule Integration | Complete |
| ITR-02 | Phase 3 - ITR12 Travel Schedule Integration | Complete |
| IMP-01 | Phase 4 - Import Pipeline | Pending |
| IMP-02 | Phase 4 - Import Pipeline | Pending |
| IMP-03 | Phase 4 - Import Pipeline | Pending |
| IMP-04 | Phase 4 - Import Pipeline | Complete |
| IMP-05 | Phase 4 - Import Pipeline | Complete |
| PERF-01 | Phase 5 - Component Decomposition | Pending |
| PERF-02 | Phase 6 - Logbook UI, Import Wizard & Performance Hardening | Pending |
| PERF-03 | Phase 6 - Logbook UI, Import Wizard & Performance Hardening | Pending |
| CALC-01 | Phase 7 - Calculator Audit | Pending |
| CALC-02 | Phase 7 - Calculator Audit | Pending |
| CALC-03 | Phase 7 - Calculator Audit | Pending |
| CALC-04 | Phase 7 - Calculator Audit | Pending |
| CALC-05 | Phase 7 - Calculator Audit | Pending |
| CALC-06 | Phase 7 - Calculator Audit | Pending |

**Coverage:**
- v1 requirements: 25 total (corrected from initial count of 22 — recount of RULE/LOG/IMP/ITR/PERF/CALC categories in this file)
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-02*
*Last updated: 2026-07-02 after roadmap creation*
