# Project Research Summary

**Project:** SA Tax Platform — Individual Tax SARS Compliance Milestone (travel logbook, import pipeline, calculator refactor)
**Domain:** SA individual tax practice software — regulated compliance domain (SARS-audit-defensible calculations), not a UX-differentiation product
**Researched:** 2026-07-02
**Confidence:** HIGH overall, with explicit MEDIUM/LOW pockets flagged below

## Executive Summary

This milestone replaces a crude, non-compliant travel-allowance estimate (`allowance × ratio`) with a proper SARS-compliant logbook system (deemed-cost and actual-cost methods), fixes a real performance bug (10,000+ row CSV/XLSX imports freezing the UI), and decomposes a 2,148-line monolithic tax-tools component into per-calculator tabs. It is a brownfield integration, not a greenfield build: the codebase already has a proven domain-module pattern (types → validation → repository → service → pure calculation, with per-year rulepacks) that every deliverable should extend rather than bypass. The single highest-risk pattern already present in the codebase — SARS rate tables duplicated between UI components and rulepacks — must not be repeated for the new logbook/deemed-cost tables.

The recommended approach: build a new `src/modules/logbook/` domain module mirroring `individual-tax/`'s existing structure, extend per-year rulepacks (`rules-2025/2026/2027.ts`) with a `travelDeemedCostTable` field (values verified directly from official SARS PDFs), use SheetJS (CDN-distributed, not npm) for XLSX and PapaParse for CSV (both support Web Worker / off-main-thread parsing), and virtualize the trip table with `react-virtuoso`'s `TableVirtuoso`. The `travel-schedule.ts` integration point must stay backward-compatible with its existing test suite — this is the highest-risk seam in the whole milestone because it's the one place a new, larger data source (logbook) must feed an existing, tested, pure calculation contract without breaking four other schedules' tests.

Key risks: (1) compliance risk — two Budget 2026 rule changes (retirement fund cap R350k→R430k, CGT annual exclusion R40k→R50k and primary residence exclusion R2m→R3m) land exactly inside the 2025–2027 scope window, meaning "use current constants" is already wrong for 2027 on day one; (2) correctness risk — conflating SARS travel allowance codes 3701/3702/3703 (each needs distinct deduction handling) or leaking the in-year 80/20 PAYE withholding split into the year-end deduction formula; (3) performance/security risk — synchronous file parsing on the main thread, naive `new Date()` parsing of ambiguous DD/MM/YYYY dates, and unbounded file uploads. Every one of these has a concrete, cited mitigation in the research documents below, and several table-stakes figures (ITR12 deduction codes 4014/4015, s6B multiplier details, actual-cost wear-and-tear cap) are explicitly flagged as needing phase-level primary-source verification before being hardcoded.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.1.6, React 19.2.3, TypeScript 5.9.3, Tailwind 4, Prisma 6.16.2) is not re-litigated; this research is additive-only for the import/performance milestone.

**Core technologies:**
- **PapaParse 5.5.4** — robust CSV parsing (quoted fields, delimiter auto-detect, embedded newlines) with built-in `worker: true` mode; directly replaces the naive `.split(',')` bug named in the milestone.
- **SheetJS `xlsx` 0.20.3, installed from `cdn.sheetjs.com` (NOT the npm registry)** — parses arbitrary `.xlsx` including the official SARS eLogbook workbook. Critical gotcha: the npm-registry `xlsx@0.18.5` is abandoned with two unpatched high-severity CVEs; a naive `npm install xlsx` silently pulls the vulnerable version.
- **react-virtuoso 4.4.x (`TableVirtuoso`)** — virtualizes the 10,000+ row trip table using real `<table>` semantics and variable row heights out of the box, avoiding the manual `<div>`-as-grid workarounds required by `react-window`.
- **Native Web Worker API** (no wrapper needed for CSV; a small dedicated worker module for XLSX) — keeps parsing off the main thread. Comlink (4.4.2) only if the XLSX worker's messaging grows past simple request/response.

Both parsers and worker code should be lazy-loaded via `next/dynamic` behind the actual "Import Logbook" action, not bundled into the main tax-tools chunk — this directly supports the monolith-splitting goal.

### Expected Features

This is a compliance domain: "table stakes" means legally required for a defensible ITR12/audit trail, not merely user-expected.

**Must have (table stakes):**
- Per-vehicle logbook with year-level opening/closing odometer (mandatory); per-trip Date/business-km/From/To/Reason (the actual compulsory fields — per-trip odometer is explicitly *not* compulsory per the official SARS eLogbook)
- Exclusion of home-to-work commuting from business km
- Vehicle value capture per §8(1)(b) valuation rules, feeding the deemed-cost bracket lookup
- Deemed-cost method using the correct per-year table (verified 2025/2026/2027 figures, see PITFALLS/FEATURES)
- Actual-cost method (fuel, maintenance, licence, insurance, finance charges, 7-year wear-and-tear) — MEDIUM confidence on exact wear-and-tear mechanics, needs phase verification against IN47
- Correct handling of source codes 3701/3702/3703 as three distinct calculation paths (not one generic pipeline)
- 5-year data retention, SARS-audit-exportable
- Per-year rate tables for medical credits (s6A/s6B), retirement fund cap (s11F), CGT exclusions, provisional tax safe-harbour thresholds — all confirmed to change materially within the 2025–2027 window
- CSV/XLSX import matching the real official SARS eLogbook column layout

**Should have (differentiators):**
- Side-by-side deemed-vs-actual comparison with "best method" recommendation
- Simplified reimbursive rate auto-check (flagging employer over-reimbursement against the prescribed rate)
- Multi-year rate table comparison view
- Bulk logbook health-check report (gaps, missing fields, odometer discontinuities) before export

**Defer / anti-features:**
- Inventing/interpolating rate-table values for ungazetted years — block/warn instead
- Direct SARS eFiling integration (explicitly out of scope)
- Auto-deleting/silently "correcting" suspected commuting trips — flag for practitioner review only
- Treating per-trip odometer as mandatory (contradicts the official form)
- A blended "hybrid" deemed+actual calculation (SARS methods are mutually exclusive elections)
- Map-assisted trip entry and automated commuting-pattern flagging until the core calculation engine is verified correct

### Architecture Approach

Build a new `src/modules/logbook/` domain module as a sibling to `src/modules/individual-tax/`, following its exact existing file layout (types/validation/repository/service, plus a `calculation.ts` and an `import/` subfolder). The logbook has its own lifecycle (captured incrementally through the year, one per client+taxYear) distinct from a point-in-time assessment calculation, so it should not be nested inside `individual-tax/`. Deemed-cost rate tables move into per-year rulepacks (`rules-2025/2026/2027.ts`), never hardcoded in components. `travel-schedule.ts` gains an optional `logbook?: LogbookTravelResult` input alongside the existing legacy estimate path, keeping its contract backward-compatible and its existing test suite intact. The import pipeline (`parse-csv.ts`, `parse-xlsx.ts`, `detect-elogbook.ts`, `column-mapping.ts`) is pure, framework-free, independently unit-testable functions orchestrated by a thin wizard state machine. The 2,148-line `tax-tools.tsx` is split by tab (8 independent calculator components), each owning its own local state, with only tab-routing and read-only shared context in the shell.

**Major components:**
1. `src/modules/logbook/` (types, validation, repository, service, calculation, import/) — new domain module owning vehicle/trip/logbook CRUD and deemed/actual cost calculation
2. Per-year rulepacks (`rules-2025/2026/2027.ts` + `rulepack-registry.ts`) — extended with `travelDeemedCostTable` and other per-year compliance constants (s6A/s6B, s11F cap, CGT exclusions)
3. `travel-schedule.ts` — extended integration seam accepting logbook-derived results or falling back to the legacy estimate, unchanged output contract
4. `TaxToolsShell` + 8 per-calculator tab components — decomposed UI, each independently stateful, reading rulepack-derived values rather than local constants

**Build order (critical path):** rulepack extension → logbook module (isolated, unit-tested) → travel-schedule.ts integration seam → (import pipeline and component decomposition can run in parallel) → wire logbook UI → wire import wizard → performance hardening pass. Remaining 7 calculator tabs' rulepack-audit work can proceed in parallel once decomposition lands.

### Critical Pitfalls

1. **Wrong-year rate table used** — deemed-cost/medical/retirement/CGT tables must resolve via `getIndividualTaxRulePackByYear(assessmentYear)`, never `new Date().getFullYear()` or trip date; add a rulepack-completeness test that fails the build on placeholder/duplicate tables across years.
2. **Deemed and actual cost methods mixed or silently switched** — `costMethod` must be an explicit, persisted, required field (not inferred from which fields are populated); Zod-level validation must reject payloads with both methods' fields populated; UI must clear (not just hide) the inactive method's inputs.
3. **3701/3702/3703 treated as interchangeable** — each needs a distinct calculation branch (3701: PAYE 80/20-aware but deduction computed independent of that split; 3702: deduction only against the prescribed-rate portion, excess is fully taxable with no deduction; 3703: no deduction calculation at all, already non-taxable). The 80/20 PAYE withholding basis must never scale the year-end deduction formula — it's a separate, informational field.
4. **FileReader/parsing blocking the main thread on large imports** — must use PapaParse's `worker: true` and a dedicated Web Worker for XLSX, with chunked/batched processing and a visible progress indicator; test explicitly with a synthetic 10,000-row fixture confirming UI responsiveness during import, not just eventual correctness.
5. **Date parsing ambiguity (DD/MM/YYYY vs MM/DD/YYYY) and Excel serial dates** — never use `new Date(dateString)` on raw CSV strings; use an explicit DD/MM/YYYY-first parser, flag ambiguous dates for manual review, and explicitly detect/convert Excel serial date numbers for XLSX imports.

Additional pitfalls documented in PITFALLS.md worth flagging: odometer continuity validation (cross-trip, not just within-trip), floating-point currency drift across thousands of trips (round only at output boundaries, not per-trip), breaking other schedules' tests via shared-type changes to `travel-schedule.ts` (requires a full `npm test` gate, not just travel-specific tests), React re-render traps when splitting the monolith (state must be colocated, not merely relocated to a shared context), and brittle SARS eLogbook auto-detection (fuzzy header matching + data-type sanity checks + user-confirmed preview, never silent auto-import).

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Per-Year Rulepack Extension
**Rationale:** Every other calculation (deemed cost, medical credits, retirement, CGT, provisional tax) depends on correct per-year constants. This is the foundation and is purely additive/low-risk to existing code.
**Delivers:** `travelDeemedCostTable`, s6A/s6B values, s11F cap, CGT exclusions added to `rules-2025/2026/2027.ts` and exposed via `rulepack-registry.ts`, with per-year completeness tests.
**Addresses:** Table-stakes rate-table features from FEATURES.md (deemed-cost tables, medical credits, retirement cap, CGT exclusions, provisional tax thresholds).
**Avoids:** Pitfall 1 (wrong-year rate table) via structural test coverage.

### Phase 2: Logbook Domain Module (Data Model + Calculation Core)
**Rationale:** Can be built and unit-tested in complete isolation from the UI monolith; depends only on Phase 1's rulepack values. Establishes the vehicle/trip/logbook persistence lifecycle that everything else (import, UI) builds on.
**Delivers:** `src/modules/logbook/` (types, validation, repository, calculation, service) with demo-mode file storage mirroring `individual-tax/repository.ts`; `calculateDeemedCost()`/`calculateActualCost()`/`compareTravelMethods()` as pure, independently tested functions.
**Addresses:** Core compliance table-stakes (deemed/actual cost methods, vehicle value capture, per-trip mandatory fields, method exclusivity).
**Avoids:** Pitfall 2 (deemed/actual mixing) via an explicit `costMethod` field and Zod-level exclusivity validation; Pitfall 5 (odometer continuity) via a dedicated cross-trip validation pass; Pitfall 7 (floating-point drift) via round-only-at-output convention.

### Phase 3: ITR12 Travel Schedule Integration
**Rationale:** The highest-risk integration seam in the milestone — must absorb a much richer data source (logbook) while keeping `travel-schedule.ts`'s existing contract and test suite intact for four other schedules. Resolving this shape early, before UI is built against it, prevents rework.
**Delivers:** `travel-schedule.ts` extended with optional `logbook` input, distinct 3701/3702/3703 handling, backward-compatible legacy fallback path.
**Uses:** `LogbookTravelResult` shape from Phase 2.
**Implements:** The `travel-schedule.ts` ↔ `calculation-service.ts` integration boundary from ARCHITECTURE.md.
**Avoids:** Pitfall 3 (code conflation), Pitfall 4 (PAYE-basis leakage into deduction math), Pitfall 8 (breaking other schedules — requires full `npm test` gate before marking done).

### Phase 4: Import Pipeline (CSV/XLSX + SARS Auto-Detection)
**Rationale:** Depends on Phase 2's trip/validation types to convert parsed rows into persisted data; independent of Phase 3 and of the UI decomposition, so can run in parallel with Phase 5.
**Delivers:** `parse-csv.ts` (PapaParse), `parse-xlsx.ts` (SheetJS, CDN-installed), `detect-elogbook.ts` (fuzzy header matching + data-type sanity checks), `column-mapping.ts` — all pure, fixture-tested functions.
**Addresses:** CSV/XLSX import table-stakes feature matching the real official SARS eLogbook column layout.
**Avoids:** Pitfall 6 (date parsing ambiguity/Excel serials), Pitfall 10 (main-thread blocking — Web Worker/PapaParse `worker: true`), Pitfall 11 (brittle auto-detection — fuzzy matching + confirmation preview, tested against both canonical and varied templates).

### Phase 5: Component Decomposition (Split the Monolith)
**Rationale:** Pure UI restructuring, independent of Phases 1–4's backend work, but should land before new logbook UI is wired in so the new feature is built clean rather than extracted mid-refactor.
**Delivers:** `TaxToolsShell` (tab routing + shared read-only context only) + 8 independent per-calculator tab components, each with local `useState`, reading rulepack values rather than local duplicated constants.
**Avoids:** Pitfall 9 (re-render traps — state colocated per tab, not lifted into a shared context; verified via Profiler/render-count measurement, not just file count) and the duplicated-rate-table anti-pattern from ARCHITECTURE.md.

### Phase 6: Wire Logbook UI + Import Wizard + Performance Hardening
**Rationale:** Depends on Phases 2, 3, 4, and 5 all being in place; this is where the virtualized trip table, vehicle form, deemed/actual comparison view, and import wizard (file → parse → detect/map → preview → commit) come together end-to-end.
**Delivers:** `TravelLogbookTab` with persisted, virtualized (`react-virtuoso` `TableVirtuoso`) trip table; `LogbookImportWizard` multi-step flow; verified against a synthetic 10,000-row fixture for both correctness and UI responsiveness.
**Avoids:** Pitfall 10 (main-thread blocking) validated end-to-end at scale; the "looks done but isn't" checklist items from PITFALLS.md (both cost methods real, not stubbed; continuity validated on import path too, not just manual entry).

### Phase 7: Remaining Calculator Tabs — Rulepack Audit
**Rationale:** Independent of the logbook work; can proceed in parallel with Phases 2–6 once Phase 5 (decomposition) lands, since each tab is now an isolated file.
**Delivers:** Medical (s6A/s6B), retirement (s11F), CGT, provisional tax, rental, home office tabs each audited against current SARS rules and rulepack-sourced values, removing any locally-duplicated constants.
**Addresses:** Remaining table-stakes compliance features (medical credits, retirement deduction, CGT schedule, provisional tax safe-harbour, rental income deductions, home office s23(b)).

### Phase Ordering Rationale

- Rulepack extension must come first because every downstream calculation (deemed cost, medical, retirement, CGT) reads from it — a dependency confirmed independently in both ARCHITECTURE.md's build order and PITFALLS.md's phase mapping.
- The logbook module and travel-schedule integration are sequenced before any UI work because they are the highest-compliance-risk and highest-integration-risk pieces respectively; getting their contracts right early avoids expensive UI rework.
- Import pipeline and component decomposition are architecturally independent of each other and of the calculation core (once types exist), so they can run in parallel to shorten the critical path — both ARCHITECTURE.md and the research converge on this.
- Performance hardening is deliberately sequenced last (after the real logbook + import UI exists end-to-end) because virtualization and worker-based parsing are easiest to validate against a real data path rather than a synthetic one built in isolation.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:research-phase`):
- **Phase 2 / Actual-cost calculation:** wear-and-tear mechanics and the possible R800,000 vehicle-value cap need verification against SARS Interpretation Note IN47 — current research is MEDIUM confidence, WebSearch-derived only.
- **Phase 3 / ITR12 integration:** exact deduction codes 4014/4015 are LOW-MEDIUM confidence (contradictory WebSearch signal — 4015 may be commission-income-specific, not general travel-allowance) and must be confirmed against the current SARS "Guide for Codes Applicable to Employees Tax Certificates" and the Comprehensive ITR12 Guide before hardcoding.
- **Phase 7 / Medical credits (s6B):** exact multipliers (3×/4× annual s6A credit, 25%/33.3%, 7.5% threshold) are MEDIUM confidence, WebSearch-only — recommend direct verification against SARS Guide IT07 before implementation.
- **Phase 7 / Provisional tax:** the exact 8%-per-year/18-month basic-amount escalation mechanics are MEDIUM confidence — recommend verification against Interpretation Note 1 (Issue 3).
- **Phase 4 / Worker bundling under Turbopack:** Next.js 16.2 Worker-origin fixes are documented, but no explicit worked example of `new Worker(new URL(...))` syntax was found for this exact Next.js version (16.1.6) — recommend a small spike/smoke test early in this phase.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (rulepack extension):** deemed-cost, medical s6A, retirement cap, and CGT figures are HIGH confidence, verified directly from official SARS PDFs for all three years in scope.
- **Phase 5 (component decomposition):** standard React architecture pattern, already proven elsewhere in this codebase.
- **Phase 6 (virtualization/worker parsing libraries):** SheetJS, PapaParse, and react-virtuoso usage patterns are HIGH/MEDIUM-HIGH confidence with official documentation and version-verified installation steps already established in STACK.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified directly against npm registry and official SheetJS/PapaParse/react-virtuoso docs; one MEDIUM caveat on Turbopack + Web Worker bundling syntax for this exact Next.js version, flagged for a smoke test. |
| Features | HIGH for deemed-cost tables, medical s6A, retirement cap, CGT exclusions, rental/home-office rules (all read directly from official SARS PDFs/pages). MEDIUM/LOW-MEDIUM for actual-cost wear-and-tear mechanics, s6B multipliers, and ITR12 deduction codes 4014/4015 (WebSearch-only, explicitly flagged as gaps). | Four explicit gaps documented — see Research Flags above. |
| Architecture | HIGH | Grounded in direct inspection of the existing codebase (`individual-tax/` module, `tax-tools.tsx`, rulepack registry) — recommendations are extensions of proven, already-in-use patterns, not novel design. |
| Pitfalls | HIGH for codebase-grounded pitfalls (rate-table duplication, naive CSV parsing, monolith re-render risk — all cite specific existing file/line references). MEDIUM for general React performance guidance (standard engineering practice, not SARS-specific) and for two SARS PDF sources surfaced via WebSearch rather than direct fetch. | |

**Overall confidence:** HIGH — the core stack, architecture, and majority of compliance figures are verified against primary sources or direct codebase inspection. The gaps are narrow, specifically named, and already mapped to the phases that must resolve them before implementation.

### Gaps to Address

- ITR12 deduction codes 4014/4015 — confirm exact scope against SARS "Guide for Codes Applicable to Employees Tax Certificates" (PAYE-AE-06-G06) and the Comprehensive ITR12 Guide (IT-AE-36-G05) during Phase 3 planning; do not hardcode from this research alone.
- Section 6B (Additional Medical Expenses Tax Credit) exact multipliers/thresholds — re-verify against SARS Guide IT07 directly during Phase 7 planning (the primary-source PDF fetch failed in this research pass; findings are WebSearch-synthesis only).
- Actual-cost wear-and-tear vehicle-value cap (R800,000 figure) — possible conflation with the deemed-cost table's top bracket; verify independently against Interpretation Note IN47 during Phase 2 planning.
- Provisional tax basic-amount 8%/18-month escalation mechanics — verify against Interpretation Note 1 (Issue 3) during Phase 7 planning.
- Next.js 16.1.6 + Turbopack Web Worker bundling syntax — no explicit worked example found; run a small spike during Phase 4 before committing to a worker-wrapping approach.
- SheetJS CDN-sourced package lockfile hygiene — no `npm outdated` auto-detection applies to the CDN tarball install; document the manual version-check process during Phase 4 setup.

## Sources

### Primary (HIGH confidence)
- SARS official PDFs: `PAYE-GEN-01-G03-A01` Rate per Kilometre Schedule (2025/2026/2027 tax years, all three downloaded and read in full), 2025/26 SARS Travel Logbook (eLogbook) template
- sars.gov.za: Budget 2026 FAQ (CGT, retirement fund cap changes), Medical Tax Credit Rates page, Retirement Fund Contribution Deductions s11F(2)(a) page, Tax on Rental Income pages, Home Office Expenses / Interpretation Note 28
- https://cdn.sheetjs.com/ and docs.sheetjs.com — official SheetJS installation/migration guidance
- https://www.papaparse.com/docs — official PapaParse API (worker mode, streaming)
- https://virtuoso.dev/react-virtuoso/table-virtuoso/ — official react-virtuoso `TableVirtuoso` docs
- npm registry direct version queries (papaparse, react-virtuoso, comlink, etc.), 2026-07-02
- Direct codebase inspection: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`, `src/modules/individual-tax/*`, `src/components/individual-tax/tax-tools.tsx`

### Secondary (MEDIUM confidence)
- SARS Guide for Employers in respect of Allowances (PAYE-GEN-01-G03, 2027 edition) — surfaced via WebSearch, not fully fetched
- SARS Guide for Codes Applicable to Employees Tax Certificates 2026 (PAYE-AE-06-G06) — confirms 3701/3702/3703 definitions and mutual-exclusivity rule
- yourtax.co.za tax tables — cross-verified exactly against official 2025 PDF, validating reliability as secondary cross-check
- TanStack Virtual vs react-window vs react-virtuoso community comparisons (GitHub discussions, pkgpulse.com 2026 guides)
- Next.js official Turbopack docs confirming general Worker support, with 16.2 Worker-origin fixes (no exact worked example for this repo's Next.js version)

### Tertiary (LOW confidence, explicitly flagged for verification)
- ITR12 deduction codes 4014/4015 — WebSearch only, contradictory signal on 4015's scope
- Section 6B multipliers/thresholds (25%/33.3%, 3×/4×, 7.5%) — WebSearch synthesis, primary IT07 PDF fetch failed
- Actual-cost wear-and-tear R800,000 vehicle-value cap — single WebSearch source, possible conflation
- Provisional tax 8%/18-month escalation mechanics — secondary commentary only

---
*Research completed: 2026-07-02*
*Ready for roadmap: yes*
