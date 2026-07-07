---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 7
current_phase_name: Calculator Audit
current_plan: Not started
status: completed
stopped_at: Completed 07-05-PLAN.md
last_updated: "2026-07-07T14:27:10.893Z"
last_activity: 2026-07-07
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 33
  completed_plans: 33
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-02)

**Core value:** A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.
**Current focus:** Phase 7 - Calculator Audit

## Current Position

**Current Phase:** 7
**Current Phase Name:** Calculator Audit
**Total Phases:** 7
**Current Plan:** Not started
**Total Plans in Phase:** 5
**Status:** Milestone complete
**Last Activity:** 2026-07-07

**Progress:** [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 9min | 3 tasks | 6 files |
| Phase 01 P02 | 27min | 2 tasks | 2 files |
| Phase 01 P03 | 30 | 3 tasks | 1 files |
| Phase 02 P01 | 7min | 3 tasks | 4 files |
| Phase 02 P02 | 9min | 3 tasks | 2 files |
| Phase 02 P03 | 20min | 3 tasks | 3 files |
| Phase 02 P04 | 12min | 3 tasks | 5 files |
| Phase 03 P01 | 12min | 3 tasks | 6 files |
| Phase 03 P02 | 8min | 3 tasks | 3 files |
| Phase 03 P03 | 7min | 3 tasks | 2 files |
| Phase 04 P02 | 10min | 3 tasks | 3 files |
| Phase 04 P01 | 25min | 3 tasks | 6 files |
| Phase 04 P05 | 8min | 2 tasks | 4 files |
| Phase 04 P03 | 22 | 2 tasks | 5 files |
| Phase 04 P04 | 15min | 2 tasks | 3 files |
| Phase 04 P06 | 18min | 3 tasks | 6 files |
| Phase 05 P01 | 9min | 3 tasks | 3 files |
| Phase 05 P02 | 7min | 3 tasks | 4 files |
| Phase 05 P03 | 15min | 3 tasks | 4 files |
| Phase 05 P04 | 12min | 3 tasks | 4 files |
| Phase 05 P05 | 9min | 3 tasks | 4 files |
| Phase 05 P06 | 13min | 3 tasks | 3 files |
| Phase 06 P04 | 12min | 2 tasks | 2 files |
| Phase 06 P05 | 10min | 2 tasks | 3 files |
| Phase 06 P01 | 12min | 3 tasks | 7 files |
| Phase 06 P02 | 7min | 2 tasks | 2 files |
| Phase 06 P03 | 14min | 2 tasks | 2 files |
| Phase 07 P02 | 15 | 2 tasks | 2 files |
| Phase 07-calculator-audit P03 | 12min | 2 tasks | 3 files |
| Phase 07 P01 | 8min | 3 tasks | 3 files |
| Phase 07 P04 | 12min | 3 tasks | 3 files |
| Phase 07 P05 | 15min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Full SARS elogbook format (vehicle details, year odometers, both cost methods) — deemed-only shortcut fails audit requirements
- Logbooks persist per client + tax year, independent of assessment lifecycle
- Import supports CSV + XLSX + SARS elogbook auto-detect
- Split tax-tools.tsx monolith rather than patch (root cause is architecture, not one hot loop)
- Individual Tax only this milestone; estates/trusts/company modules deferred
- Tax years 2025-2027 in scope (2024 excluded)
- [Phase 01]: Fixed 2027 retirement/CGT values as a live compliance bug in this plan rather than deferring (Budget 2026 change set)
- [Phase 01]: 2024 rulepack carries 2025 travel/provisionalTax values verbatim as a flagged, non-compliance-verified structural placeholder
- [Phase 01]: Rulepack completeness build gate proven via mutation testing: copy-paste and unconverted-cents corruptions both independently fail the gate; no assertion strengthening needed
- [Phase 01]: Fixed inverted provisional-tax safe-harbour branch orientation while wiring rulepack fields (0.90 at/below R1m, 0.80 above, per SARS para 20)
- [Phase 02]: vehicleDetailsSchema includes id; logbookCreateSchema derives vehicle input via .omit({ id: true }) rather than a duplicated schema
- [Phase 02]: ISO date validation uses regex + Date round-trip check to reject calendar-impossible dates (e.g. 2025-02-30)
- [Phase 02]: Odometer/business-km comparisons use a 0.5km tolerance to avoid float-noise false positives
- [Phase 02]: actualExpensesSchema requires all five expense categories so calculateActualCost never runs on partial data
- [Phase 02]: Deemed/actual-cost engines share a resolveKilometreDenominator helper: totalKm floored at businessKm when the closing odometer is not yet recorded
- [Phase 02]: Actual-cost finance charges pro-rated by cappedValue/vehicleCostPrice above the R665,000 cap — flagged TODO(compliance-review), exact SARS mechanics underdocumented
- [Phase 02]: buildTravelResult resolves claimedDeduction via explicit if/else on costMethod, never a data-presence fallback chain; ACTUAL election with null expenses claims 0, not the deemed figure
- [Phase 02]: Prisma createLogbook reuses an existing Vehicle row by clientId+registrationNumber instead of creating a new vehicle per logbook, relying on the @@unique([clientId, vehicleId, assessmentYear]) constraint
- [Phase 02]: Split tripInputSchema into base tripFieldsSchema + refined tripInputSchema, added tripPatchSchema (partial) since Zod v4 refinements cannot be .partial()-ed
- [Phase 03]: Allowance cap (min(claimedDeduction, travelAllowance)) applies uniformly to both DEEMED and ACTUAL cost methods rather than branching by method
- [Phase 03]: allowanceType only changes the income line code/description (3701 vs 3702) -- deduction math is identical for both
- [Phase 03]: report-transformer keeps a 4014 fallback for the legacy calculateIndividualTax2026 path; only the near-eFiling schedule layer moved to TRAVEL_CLAIM
- [Phase 03]: Travel deduction computations text built once from logbookResult presence and passed as the makeScheduleLines computations prefix (logbook-based vs km-ratio estimate wording)
- [Phase 03]: report-transformer's 3702 income row is spliced in only when the calc emits one, preserving the legacy report's exact income-code list untouched
- [Phase 03]: Logbook resolution in getIndividualTaxAssessmentResult guarded by assessmentMode + hasTravelAllowance + clientId, skipping repository I/O when the travel section or client link is absent
- [Phase 03]: Async logbook lookup left unguarded by try/catch -- a throwing lookup is a real bug that must surface, not be masked as no-logbook
- [Phase 04]: Batch import mutators mirror single-item mutator structure (parse -> load -> merged-set continuity check -> one write -> one audit entry) rather than looping the single-item path
- [Phase 04]: Demo-mode writeAuditLog silently drops afterData/beforeData (pre-existing, codebase-wide gap, out of scope for this plan); import tests assert audit-entry count and match the human-readable summary string instead
- [Phase 04]: xlsx installed from cdn.sheetjs.com tarball, not npm registry (0.18.5 has unpatched CVEs) -- lockfile confirmed resolving to the CDN URL
- [Phase 04]: parse-dates.ts uses date-fns format() rather than .toISOString() for locally-parsed dates to avoid a UTC-shift timezone bug
- [Phase 04]: Worker bundling spike verdict: CONFIRMED under both Turbopack and webpack -- 04-04/04-06 proceed with dedicated xlsx.worker.ts, no fallback needed
- [Phase 04]: Ambiguity check in detect-elogbook.ts applies to all seven mapped fields (5 mandatory + 2 optional odometer), not just mandatory ones -- stricter never-guess safety
- [Phase 04]: parseNumericCell disambiguates comma meaning by co-occurring dot presence: comma+dot = thousands separator, comma-only = SA decimal separator
- [Phase 04]: CSV fixtures pinned as -text in .gitattributes to stop core.autocrlf from corrupting byte-exact CRLF/embedded-newline test fixtures
- [Phase 04]: XLSX date cells normalized via UTC getters, confirmed by tracing xlsx.js's datenum/numdate source (Date.UTC-based epoch math) rather than assumption -- timezone-independent
- [Phase 04]: Headers and rows in parse-xlsx.ts built via positional indexing into sheet_to_json header:1 output, not the default object-keyed mode, to avoid a latent header-whitespace key mismatch
- [Phase 04]: TRIP_ODOMETER_REVERSED cannot come from a candidate CSV row surviving buildImportPreview's per-row pass -- tripInputSchema's refine is identical to validateOdometerContinuity's per-trip reversed check, so a hand-crafted existingTrips entry proves the shared-checker code path instead
- [Phase 04]: Integration tests reload committed logbooks via logbookRepository.getLogbookById, not getLogbookForClientYear, since the demo seed's pre-existing client_001/2026 logbook makes a clientId+year lookup ambiguous
- [Phase 05]: calcTax/getMarginalRate/getDeemedRate relocated verbatim into tax-tools/calc-helpers.ts, NOT consolidated with calculation-service.ts's private getBracketTax (cross-module merge stays out of scope for this phase)
- [Phase 05]: TabKey moved to tax-tools/shared.tsx (not left in the monolith) since shell, nav, and DashboardTab's onNavigate prop all reference it; NAV array and tab state remain shell-owned
- [Phase 05]: tab/setTab remains plain shell-local useState in TaxToolsInner, never moved into any context (research Open Q3)
- [Phase 05]: Two-context write-only summary design (stable setter context for calculators + separate value context for Dashboard) prevents calculator re-renders on Dashboard total changes
- [Phase 05]: Shell split into TaxTools (provider wrapper, named export) + TaxToolsInner (calculator logic); all 5 dashboard totals published via useEffect until each calculator is extracted in later waves
- [Phase 05]: Rental and Home Office extracted first (both rulepack-free) to prove the colocated-state + CSS-hide + summary-publish + Profiler-verified render-isolation pattern before touching rulepack-dependent calculators
- [Phase 05]: en-ZA currency assertions in tests must pass { normalizer: (text) => text } to getByText/getAllByText -- the default normalizer collapses the NBSP thousands separator on the DOM side only, silently breaking exact-string matches against fmt() output
- [Phase 05]: CGT and Retirement extracted first among rulepack-dependent calculators, proving useRulePack() consumption and year-switch reactivity survive extraction before travel/medical/provisional
- [Phase 05]: CgtTab has no useSummaryWriter() call -- CGT is not a Dashboard total, so it is the first extracted tab with zero summary-context coupling
- [Phase 05]: Year-switch context proof written against the full TaxTools shell (real tax-year select, real nav) rather than an isolated component, to genuinely prove rates are read live from context
- [Phase 05]: Medical and Provisional Tax extracted together as the phase's second rulepack-dependent pair, both carrying prior-phase correctness content (Medical's untouched-by-design s6B formula constants, Provisional's Phase-1-corrected safe-harbour orientation) that must survive extraction verbatim
- [Phase 05]: Added a Dashboard medicalTotal-flow test beyond the plan's explicit task-3 list, mirroring 05-04's retirementHeadroom-flow test, to give the must-have truth 'Medical total still flows to the Dashboard' its own automated proof
- [Phase 05]: Safe-harbour spot-check asserts both ternary branches (0.90 at/below R1m, 0.80 above) in one test against a fixed priorTax, directly targeting the Phase-1 branch-orientation regression rather than only checking output preservation for one input
- [Phase 05]: Travel Logbook extracted as a pure relocation (in-memory Trip[] + naive FileReader upload), explicitly not wiring in the Phase 4 import pipeline or Phase 2/3 logbook domain module -- deferred to Phase 6
- [Phase 05]: Toast state/effect/notify and the hidden file input, previously shell-level, moved wholesale into TravelLogbookTab since grep confirmed notify() was exclusively called from Travel/Logbook functions
- [Phase 05]: tripStats/filteredTrips/monthlyData+maxMon wrapped in useMemo during extraction to pre-empt a per-keystroke O(n) recompute before Phase 6 virtualization work begins
- [Phase 06]: Client-side ACTUAL-election and expense-clear guards in CostMethodPanel reuse setLogbookCostMethod/setLogbookActualExpenses's exact error-message strings verbatim, keeping the UI guard message and the server rejection reason a single source of truth
- [Phase 06]: LogbookAuditSummaryView kept as a client component solely to host the screen-only window.print() button, matching the IndividualTaxIta34 precedent -- it still receives all data via props and performs zero fetching
- [Phase 06]: mockScrollElementSize stubs offsetWidth/offsetHeight (not just getBoundingClientRect/clientHeight/scrollHeight) -- virtual-core's getRect() reads the offset properties, traced directly from installed library source
- [Phase 06]: TripTable row height fixed at 40px, scroll container fixed at 480px, matching the 06-01 mockScrollElementSize recipe defaults -- dynamic row-height measurement out of scope
- [Phase 06]: data-virtual-row lives on the virtualizer's positioning wrapper div, not inside TripRow itself -- TripRow stays presentational so it can mount standalone in the Profiler isolation test
- [Phase 06]: Profiler-isolation proof requires memoizing at a per-item wrapper (ProfiledRow) above the Profiler, not just a memo'd leaf beneath a bare Profiler under a re-rendering mapper -- otherwise onRender still fires (near-zero duration) for bailed-out siblings
- [Phase 06]: filterAndSortTrips exported standalone from trip-table.tsx so PERF-03 throughput is measured directly, decoupled from React render timing
- [Phase 06]: LogbookImportWizard's step model is 0|1|2 (select, map, preview) not a literal 0..4 range -- commit is the Import button's async action on the preview screen, not a separate rendered step, since onClose() fires immediately after a successful onCommit
- [Phase 06]: Preview-table virtualization tests must call mockScrollElementSize() whenever asserting on rendered row content (not just summary counts) -- jsdom's zero-size viewport otherwise makes the virtualizer render zero data-virtual-row nodes
- [Phase 07]: [Phase 07]: Adopted SARS s6B interpretation (under-65 4x MTC + excess-contributions term + 7.5% floor; 65+/disability 3x MTC + 33.3% sum-then-floor, no 7.5% floor) -- MEDIUM confidence, sign-off #1 outstanding, not blocking
- [Phase 07-calculator-audit]: Rental required zero code change (13 expense categories already SARS-correct, no capital-leak field); Home Office salaried-eligibility policy (block vs allow-with-s23(m)) left unresolved as an open compliance decision -- only the warning copy was corrected to state s23(b)/s23(m) accurately
- [Phase 07]: [Phase 07]: Corrected 2027 rulepack tax brackets/rebates/thresholds to gazetted Budget-2026 figures (HIGH confidence, three independent sources) -- pending practitioner sign-off #4 against final SARS 2026/27 tables before release
- [Phase 07]: [Phase 07]: Left 2027 medicalTaxCredit, retirement.annualCap, cgt, travelDeemedCostTable, provisionalTax byte-unchanged -- Phase 1 already verified these correct
- [Phase 07]: [Phase 07]: Reworked provisional-tax-tab.tsx to a real para 19/20 model (basic amount + 8%/18-month escalation, taxable-income safe-harbour floor, P2 nets P1); removed unused priorTax input -- MEDIUM confidence sign-off #2 outstanding, not blocking
- [Phase 07]: [Phase 07]: Retirement/CGT display labels interpolate rulepack values (annualCap, cgt.*); calc math left untouched -- already correct and rulepack-sourced per 07-01

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2/actual-cost: wear-and-tear mechanics and possible R800,000 vehicle-value cap need verification against SARS Interpretation Note IN47 (MEDIUM confidence, WebSearch-derived)
- Phase 3/ITR12: exact deduction codes 4014/4015 are LOW-MEDIUM confidence (contradictory signal — 4015 may be commission-income-specific); must confirm against PAYE-AE-06-G06 and IT-AE-36-G05 before hardcoding
- Phase 7/medical credits: s6B multipliers (3x/4x, 25%/33.3%, 7.5% threshold) are MEDIUM confidence; re-verify against SARS Guide IT07
- Phase 7/provisional tax: 8%/18-month basic-amount escalation mechanics are MEDIUM confidence; verify against Interpretation Note 1 (Issue 3)
- Phase 4/next build --webpack: pre-existing, unrelated route-export type error in the Estates filing-pack route fails `next build --webpack` specifically (not the project's actual Turbopack build); see `.planning/phases/04-import-pipeline/deferred-items.md`

## Session Continuity

**Last Session:** 2026-07-07T14:16:30.239Z
**Stopped At:** Completed 07-05-PLAN.md
**Resume File:** None
