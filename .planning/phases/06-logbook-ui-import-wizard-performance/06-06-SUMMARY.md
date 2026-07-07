---
phase: 06-logbook-ui-import-wizard-performance
plan: 06
subsystem: ui
tags: [react, nextjs-server-actions, tanstack-react-virtual, vitest, jsdom, logbook, keystone]

# Dependency graph
requires:
  - phase: 06-01
    provides: "src/modules/logbook/actions.ts Server Action boundary ({ record, travelResult } round trip) + mockScrollElementSize jsdom virtualization test recipe"
  - phase: 06-02
    provides: "TripTable / TripTableProps contract (trips, onEditTrip, onDeleteTrip, busy?) over the real LogbookTripRecord schema"
  - phase: 06-03
    provides: "LogbookImportWizard / LogbookImportWizardProps contract (logbook, onCommit, onClose) wrapping the real Phase 4 import pipeline"
  - phase: 06-04
    provides: "CostMethodPanel / CostMethodPanelProps contract (record, travelResult, onElectMethod, onSaveExpenses, busy?)"
  - phase: 06-05
    provides: "Printable SARS-audit route at /reports/logbook/[logbookId]/print"
provides:
  - "travel-logbook-tab.tsx rewritten as a thin wiring container: client+year resolution, real persisted-logbook load, trip CRUD modal, cost-method election, odometer editor, CSV export, print link, import wizard -- all through actions.ts"
  - "TaxTools({ clients? }) -> TravelLogbookTab({ clients? }) optional-prop threading; tools/page.tsx is now an async server component fetching individual clients via listClients()"
  - "shared.tsx cleaned of the prototype Trip/UploadData interfaces (superseded by the real LogbookTripRecord domain type)"
  - "Integration test proving load -> add-trip-updates-real-claimed-deduction -> import -> summary-publish -> CSV export, against a mocked Server Action boundary"
  - "Migrated Travel/Medical render-isolation proof (both directions) against the real container, replacing the removed prototype UI's assertions"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generic applyAction(mutate) helper: every logbook mutation sets busy, awaits the Server Action, merges the returned { record, travelResult } into local state, toasts on error, clears busy -- no client ever re-derives cost math or calls revalidatePath per edit"
    - "Row-callback stability for React.memo isolation: handleEditTrip/handleDeleteTrip/handleElectMethod/handleSaveExpenses/handleImportCommit are useCallback'd with [state, ...] dependencies so their identity only changes when the logbook itself changes, not on unrelated container re-renders (busy/toast/odometer-form edits) -- preserves 06-02's TripRow React.memo edit-isolation (PERF-03) end-to-end"
    - "Empty-state-first data loading: TravelLogbookTab fires getLogbookForClientAction only when selectedClientId is truthy, so the shell/isolation tests stay renderable with zero Server Action calls when clients defaults to []"

key-files:
  created:
    - src/components/individual-tax/tax-tools/travel-logbook-tab.test.tsx
  modified:
    - src/components/individual-tax/tax-tools/travel-logbook-tab.tsx
    - src/components/individual-tax/tax-tools/shared.tsx
    - src/components/individual-tax/tax-tools.tsx
    - "src/app/(protected)/individual-tax/tools/page.tsx"
    - src/components/individual-tax/tax-tools/render-isolation.test.tsx

key-decisions:
  - "clients prop is optional (default []) on both TaxTools and TravelLogbookTab; with no clients the container renders a 'no individual clients' empty state and fires zero Server Actions on mount -- keeps every existing no-prop <TaxTools />/<TravelLogbookTab /> render in the test suite working unchanged"
  - "Selecting a client resets state to null immediately (before the fetch resolves), not just on resolution, so a rapid client switch never flashes the previous client's stale logbook"
  - "Odometer editor form is a separate local useEffect-reseeded state (keyed on the whole `state` object), mirroring CostMethodPanel's own actualExpenses re-seed pattern from 06-04, rather than binding inputs directly to record.openingOdometer/closingOdometer"
  - "Import wizard's onCommit and the cost-method/expense/odometer/trip mutation handlers are all useCallback'd through the shared applyAction helper so a single edit's re-render scope stays bounded (PERF-03), not just at the TripRow level (06-02) but at the container's own callback identities"
  - "Render-isolation reverse-direction proof reaches a real input via the odometer editor field (not the '+ New Trip' modal) -- simpler DOM path, same proof value"

patterns-established:
  - "Keystone integration pattern: a thin 'use client' container resolves an external identity (client + tax year) via a prop, loads domain state through a Server Action module, and composes presentation-only sub-components (TripTable/CostMethodPanel/LogbookImportWizard) that themselves perform zero persistence or cost math"

requirements-completed: [LOG-06, PERF-02, PERF-03]

# Metrics
duration: ~35min
completed: 2026-07-05
---

# Phase 6 Plan 06: Travel Logbook Keystone Integration Summary

**Rewrote `travel-logbook-tab.tsx` from a 964-line local-state prototype into a thin container that loads a real per-client, per-tax-year persisted logbook via Server Actions and wires TripTable + CostMethodPanel + LogbookImportWizard end-to-end -- trip CRUD, cost-method election, CSV export, and the printable audit summary all round-trip through `actions.ts`, and the Dashboard now shows the real claimed deduction.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-05 (session start, file discovery + context reading)
- **Completed:** 2026-07-05T12:12:35+02:00
- **Tasks:** 3 completed
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- `travel-logbook-tab.tsx` is now a ~510-line wiring container (not a calculator prototype): client selector, empty/create/loading states, odometer summary + editor, `CostMethodPanel`, `TripTable`, a real-schema trip CRUD modal, CSV export, a print/audit-summary link, and the `LogbookImportWizard` -- every mutation crosses `src/modules/logbook/actions.ts` and merges the returned `{ record, travelResult }` via a single `applyAction` helper
- `tools/page.tsx` is now an async server component fetching individual clients via `listClients()` (mirroring `new/page.tsx`'s existing pattern) and passing them to `<TaxTools clients={clients} />`
- `TaxTools`/`TaxToolsInner` thread an optional `clients` prop through to `TravelLogbookTab` only; the other 7 calculator tabs remain untouched, client-agnostic sandboxes
- `shared.tsx`'s prototype `Trip`/`UploadData` interfaces are deleted -- the real `LogbookTripRecord` domain type (from `@/modules/logbook/types`) is the only trip shape referenced anywhere in the UI now
- New `travel-logbook-tab.test.tsx` proves the full keystone wiring against a mocked Server Action boundary: load renders real trips + cost-method figures; adding a trip calls `addTripAction` and the displayed claimed deduction updates to the mock's real recomputed value (60,000, not the unchanged 45,000); committing an import (through the real, unmocked Phase 4 pipeline up to the worker boundary) calls `importTripsAction` with the valid trips + `"CSV"` source and the returned trip appears; the published Dashboard summary value equals the mocked `travelResult.claimedDeduction`; Export CSV triggers `getLogbookCsvAction`
- `render-isolation.test.tsx`'s Travel/Medical block is migrated off the removed "Determined Value (R)"/`newTrip`/`tripType` prototype UI: the primary must_have direction (typing in another calculator never re-renders the travel tab) needs no travel input at all, since the no-`clients`-prop empty state is stable and fires zero Server Actions; a reverse-direction proof (mocked actions + a one-client prop reaching the real odometer input) shows the inverse holds too
- Grep-confirmed `travel-logbook-tab.tsx` contains no `tripType`/`mixedSplit`/`getDeemedRate`/`FileReader` and no per-km rate arithmetic (only a doc comment describing their intentional absence)
- Full `src/components/individual-tax/tax-tools` + `src/modules/logbook` suites: 195 tests passing across 19 files; `npm run build` (Turbopack) compiles cleanly with no "Failed to compile"

## Task Commits

Each task was committed atomically:

1. **Task 1: Plumbing -- type cleanup, async page, shell prop threading** - `3d00358` (feat)
2. **Task 2: Rewrite travel-logbook-tab.tsx as the wiring container** - `4d4f3d7` (feat)
3. **Task 3: Integration test + preserve isolation; full suite green** - `77b81c2` (test)

**Plan metadata:** (this commit) `docs(06-06): complete travel logbook keystone integration plan`

## Files Created/Modified
- `src/components/individual-tax/tax-tools/travel-logbook-tab.tsx` - Rewritten wiring container: client/year resolution, empty/create/loading states, odometer editor, `CostMethodPanel`/`TripTable`/`LogbookImportWizard` composition, trip CRUD modal (real schema), CSV export, print link, summary publish
- `src/components/individual-tax/tax-tools/shared.tsx` - Removed the prototype `Trip`/`UploadData` interfaces
- `src/components/individual-tax/tax-tools.tsx` - `TaxTools`/`TaxToolsInner` accept and thread an optional `clients` prop to `TravelLogbookTab` only
- `src/app/(protected)/individual-tax/tools/page.tsx` - Now an async server component: fetches, filters (`INDIVIDUAL`), and sorts clients via `listClients()`, passes them to `<TaxTools clients={clients} />`
- `src/components/individual-tax/tax-tools/travel-logbook-tab.test.tsx` (new) - 5-test integration suite against a mocked `@/modules/logbook/actions` boundary
- `src/components/individual-tax/tax-tools/render-isolation.test.tsx` - Migrated Travel/Medical isolation block (primary + reverse direction); removed the two tests that depended on the deleted prototype UI

## Decisions Made
- `clients` defaults to `[]` on both `TaxTools` and `TravelLogbookTab`; the empty state fires no Server Action on mount, preserving every existing no-prop render in the test suite
- Selecting a client clears `state` to `null` immediately (not only on fetch resolution) to avoid flashing a stale previous client's logbook during a rapid switch
- The odometer editor's local form state is re-seeded via a `useEffect` keyed on the whole `state` object (mirroring `CostMethodPanel`'s own `actualExpenses` re-seed pattern from 06-04) rather than binding directly to `record.openingOdometer`/`closingOdometer`
- All row/panel mutation callbacks (`handleEditTrip`, `handleDeleteTrip`, `handleElectMethod`, `handleSaveExpenses`, `handleImportCommit`) are `useCallback`'d with `state`-keyed dependencies so their identity is stable across unrelated container re-renders (busy toggling, toast, odometer-form typing) -- this preserves `TripRow`'s `React.memo` edit-isolation (06-02's PERF-03 proof) all the way up through the real container, not just in isolation
- The render-isolation reverse-direction proof reaches a real input via the odometer editor field rather than opening the "+ New Trip" modal -- simpler DOM path, equivalent proof value

## Deviations from Plan

None -- plan executed exactly as written. Tasks 1 and 2 were implemented and type-checked together before committing (Task 2's `TravelLogbookTab({ clients })` signature and Task 1's `<TravelLogbookTab clients={clients} />` call site are mutually dependent for a clean `tsc --noEmit` pass), then committed as two separate atomic commits containing only each task's own designated files, per the plan's file lists.

## Issues Encountered
- `npx tsc --noEmit -p tsconfig.json` surfaces many pre-existing, unrelated errors across the repo (missing vitest globals in `src/desktop/**/*.test.ts`, estate-engine fixture/type mismatches, etc.) -- confirmed via targeted grep that none reference any of this plan's five touched files. Out of scope per the deviation rules' scope boundary, not fixed.
- jsdom logs a benign `Not implemented: navigation to another Document` console warning during the Export-CSV test (from the mocked `blob:` anchor's `.click()`) -- does not affect the test result or assertions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 6 (Logbook UI, Import Wizard & Performance Hardening) is now feature-complete end-to-end: the travel logbook tab loads a real persisted, per-client/per-year logbook; trip CRUD, import, cost-method election, and expense capture all round-trip through Server Actions returning real recomputed deemed/actual results; CSV export and the printable audit summary work; the Dashboard shows the real claimed deduction; calculator render isolation is preserved with the real container in place.
- No blockers for subsequent phases. This was the final plan (wave 3) of Phase 6.

---
*Phase: 06-logbook-ui-import-wizard-performance*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: src/components/individual-tax/tax-tools/travel-logbook-tab.tsx
- FOUND: src/components/individual-tax/tax-tools/travel-logbook-tab.test.tsx
- FOUND: src/components/individual-tax/tax-tools/shared.tsx
- FOUND: src/components/individual-tax/tax-tools.tsx
- FOUND: src/app/(protected)/individual-tax/tools/page.tsx
- FOUND: src/components/individual-tax/tax-tools/render-isolation.test.tsx
- FOUND commit: 3d00358 (Task 1)
- FOUND commit: 4d4f3d7 (Task 2)
- FOUND commit: 77b81c2 (Task 3)
