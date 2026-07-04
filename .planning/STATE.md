---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 5
current_phase_name: Component Decomposition
current_plan: 2
status: executing
stopped_at: Completed 05-01-PLAN.md
last_updated: "2026-07-04T14:35:10.476Z"
last_activity: 2026-07-04
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 22
  completed_plans: 17
  percent: 77
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-02)

**Core value:** A tax practitioner can capture or import a client's travel logbook and complete an individual tax assessment knowing every figure and format matches current SARS requirements — without the app slowing down.
**Current focus:** Phase 5 - Component Decomposition

## Current Position

**Current Phase:** 5
**Current Phase Name:** Component Decomposition
**Total Phases:** 7
**Current Plan:** 2
**Total Plans in Phase:** 6
**Status:** Ready to execute
**Last Activity:** 2026-07-04

**Progress:** [████████░░] 77%

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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2/actual-cost: wear-and-tear mechanics and possible R800,000 vehicle-value cap need verification against SARS Interpretation Note IN47 (MEDIUM confidence, WebSearch-derived)
- Phase 3/ITR12: exact deduction codes 4014/4015 are LOW-MEDIUM confidence (contradictory signal — 4015 may be commission-income-specific); must confirm against PAYE-AE-06-G06 and IT-AE-36-G05 before hardcoding
- Phase 7/medical credits: s6B multipliers (3x/4x, 25%/33.3%, 7.5% threshold) are MEDIUM confidence; re-verify against SARS Guide IT07
- Phase 7/provisional tax: 8%/18-month basic-amount escalation mechanics are MEDIUM confidence; verify against Interpretation Note 1 (Issue 3)
- Phase 4/next build --webpack: pre-existing, unrelated route-export type error in the Estates filing-pack route fails `next build --webpack` specifically (not the project's actual Turbopack build); see `.planning/phases/04-import-pipeline/deferred-items.md`

## Session Continuity

**Last Session:** 2026-07-04T14:35:10.471Z
**Stopped At:** Completed 05-01-PLAN.md
**Resume File:** None
