---
phase: 06-logbook-ui-import-wizard-performance
plan: 04
subsystem: ui
tags: [react, typescript, vitest, testing-library, logbook, travel-deduction]

# Dependency graph
requires:
  - phase: 06-logbook-ui-import-wizard-performance
    provides: "LogbookRecord/LogbookTravelResult types and setLogbookCostMethod/setLogbookActualExpenses service rules (Phase 2/3), shared.tsx UI primitives (Phase 5)"
provides:
  - "CostMethodPanel: pure-presentation React component rendering deemed-vs-actual comparison, method election, and actual-expense capture over a LogbookRecord + LogbookTravelResult"
  - "CostMethodPanelProps contract (record, travelResult, onElectMethod, onSaveExpenses, busy?) for the 06-06 container to wire against"
affects: [06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side guard mirrors server error message verbatim (no new error strings) so users never trigger a guaranteed server rejection blindly"
    - "Local expense-form state re-seeded via useEffect keyed on record.actualExpenses so a fresh server-confirmed record always overwrites in-progress local edits after a save/clear round trip"

key-files:
  created:
    - src/components/individual-tax/tax-tools/cost-method-panel.tsx
    - src/components/individual-tax/tax-tools/cost-method-panel.test.tsx
  modified: []

key-decisions:
  - "Recommended method surfaced as an inline ResultCard label suffix ('(recommended)') rather than a separate badge/icon element, keeping the component free of extra visual-state props"
  - "ACTUAL election guard and expense-clear guard both mirror service.ts's exact error strings ('Capture actual expenses before electing the actual-cost method.' / 'Cannot clear actual expenses while the actual-cost method is elected.') instead of writing new UI copy, keeping the UX message and the server's rejection message a single source of truth"
  - "busy prop disables both mutating buttons and the five expense inputs (not just buttons) to prevent local-form drift while a save/clear/elect call is in flight"

patterns-established:
  - "Presentation-only panels over a domain result type (LogbookTravelResult) perform zero derived math locally -- every displayed figure is read directly off the prop"

requirements-completed: [LOG-06]

# Metrics
duration: 12min
completed: 2026-07-05
---

# Phase 6 Plan 04: Cost-Method Comparison Panel Summary

**CostMethodPanel component surfacing side-by-side deemed/actual travel-deduction figures, a service-guarded method election toggle, and five-field actual-expense capture, with zero local cost arithmetic.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-05T11:20:00+02:00
- **Completed:** 2026-07-05T11:33:00+02:00
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- Built `CostMethodPanel` matching the exact `CostMethodPanelProps` contract the 06-06 container depends on
- Side-by-side deemed/actual `ResultCard`s with the higher (`recommendedMethod`) figure visually marked
- Method-election toggle that calls `onElectMethod`, with the ACTUAL option disabled and captioned with the service's own error string when `actualExpenses === null` -- no guaranteed-to-fail server round trip is ever triggered from the UI
- Five-field actual-expense form (fuel, maintenance, insurance, licence, financeCharges) seeded from `record.actualExpenses`; Save enabled only once all five are present and non-negative; Clear guarded (and captioned) while ACTUAL is elected, matching `setLogbookActualExpenses`'s own rejection rule
- `Highlight` for the `claimedDeduction` (the figure that flows to the ITR12 travel schedule), captioned with the elected method name
- Amber warnings list rendered from `travelResult.warnings`
- 7-test suite proving real side-by-side figures, recommended-method marking, guarded/unguarded ACTUAL election, five-field Save gating and payload shape, and warning rendering -- all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the deemed/actual comparison + election + expense-capture panel** - `281f572` (feat)
2. **Task 2: Test the panel rendering and callback dispatch** - `02db79c` (test)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `src/components/individual-tax/tax-tools/cost-method-panel.tsx` - `CostMethodPanel` component: deemed/actual comparison, election toggle with client-side guard, five-field expense form, claimed-deduction highlight, warnings list (265 lines)
- `src/components/individual-tax/tax-tools/cost-method-panel.test.tsx` - 7-test Vitest/RTL suite covering figures, recommendation marking, election guard, expense save/validation, and warnings (261 lines)

## Decisions Made
- Client-side ACTUAL-election and expense-clear guards reuse the service's exact error-message strings verbatim (`"Capture actual expenses before electing the actual-cost method."` / `"Cannot clear actual expenses while the actual-cost method is elected."`) rather than paraphrasing, so the UI copy and the server's own rejection reason can never drift apart.
- `busy` disables the five expense inputs in addition to the election/save/clear buttons, since an in-flight save could otherwise leave local form state momentarily inconsistent with the server-resolved record.
- Recommended-method marking is an inline label suffix on the existing `ResultCard`, avoiding a new visual-badge subcomponent for a single-word distinction.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched the plan's contract, guard-message, and test-coverage requirements without needing structural changes.

## Issues Encountered
None. `npx tsc --noEmit` surfaced only pre-existing, unrelated errors in other files (desktop test-runner globals, estates test fixtures) not touched by this plan and not referencing `cost-method-panel`; confirmed out of scope per the deviation rules' scope boundary.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
`CostMethodPanel` and its `CostMethodPanelProps` contract are ready for 06-06 (the logbook detail container) to wire against real `LogbookRecord`/`LogbookTravelResult` data and the `setLogbookCostMethod`/`setLogbookActualExpenses` Server Actions. No blockers.

---
*Phase: 06-logbook-ui-import-wizard-performance*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/cost-method-panel.tsx
- FOUND: src/components/individual-tax/tax-tools/cost-method-panel.test.tsx
- FOUND: .planning/phases/06-logbook-ui-import-wizard-performance/06-04-SUMMARY.md
- FOUND commit: 281f572 (Task 1)
- FOUND commit: 02db79c (Task 2)
