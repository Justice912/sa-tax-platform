---
phase: 04-import-pipeline
plan: 02
subsystem: logbook
tags: [zod, atomic-write, audit-log, odometer-continuity, vitest]

# Dependency graph
requires:
  - phase: 02-logbook-core
    provides: ILogbookRepository/addTrip, tripInputSchema, validateOdometerContinuity, writeAuditLog conventions
provides:
  - "logbookRepository.addTrips: single-write bulk trip insert (demo + Prisma createMany paths)"
  - "importTripsToLogbook: validate -> merged-continuity-check -> single write -> single audit entry commit step for the import pipeline"
affects: [04-06-import-wizard-integration, 04-preview-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bulk mutator mirrors the single-item mutator's structure (parse -> load -> continuity-check merged set -> one repository write -> one audit entry) rather than looping the single-item path"
    - "Repository bulk method independently guards empty-batch input (\"No trips to import.\") so the service-layer guard is defense in depth, not the only guard"

key-files:
  created: []
  modified:
    - src/modules/logbook/repository.ts
    - src/modules/logbook/service.ts
    - src/modules/logbook/service.test.ts

key-decisions:
  - "Demo AuditLogRecord has no afterData field (writeAuditLog's demo path silently drops afterData/beforeData) — pre-existing, out of scope for this plan; tests assert audit-entry count and match tripCount/source via the human-readable summary string instead of afterData.tripCount"
  - "Import validation reuses the exact same assertOdometerContinuity call-site pattern as manual capture — no laxer bar for imported data"

patterns-established:
  - "Batch commit mutators: one parse, one load, one continuity check against the merged existing+new set, one repository write, one audit entry — regardless of batch size"

requirements-completed: [IMP-04, IMP-05]

# Metrics
duration: 10min
completed: 2026-07-04
---

# Phase 04 Plan 02: Bulk Trip Import Commit Path Summary

**Bulk `addTrips` repository method (single disk write / single `createMany`) plus `importTripsToLogbook` service function that validates, continuity-checks the merged trip set, and writes exactly one audit entry per batch.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-04T07:24:00Z (approx.)
- **Completed:** 2026-07-04T07:32:12Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `ILogbookRepository.addTrips` added and implemented in `DemoLogbookRepository`: demo path writes the whole batch to disk exactly once; Prisma path uses one `createMany` call plus one re-fetch
- `importTripsToLogbook(logbookId, trips, source)` added to the service layer: schema-validates the whole batch atomically, re-checks odometer continuity against the merged existing+imported trip set using the identical `assertOdometerContinuity` gate manual capture uses, writes the batch in one repository call, and logs exactly one `LOGBOOK_TRIPS_IMPORTED` audit entry
- 5 new tests covering happy-path atomicity/audit-count, merged-continuity rejection, atomic structural rejection, empty-batch rejection, and missing-logbook rejection — all passing alongside the full existing 320-test suite (325 total after this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bulk addTrips to ILogbookRepository and DemoLogbookRepository** - `b7f708c` (feat)
2. **Task 2: importTripsToLogbook service function with single audit entry** - `0e2ec41` (feat)
3. **Task 3: Bulk import service tests** - `bcad886` (test)

**Plan metadata:** (this commit, see final_commit below)

## Files Created/Modified
- `src/modules/logbook/repository.ts` - Added `addTrips` to `ILogbookRepository` and `DemoLogbookRepository` (demo: one disk write; Prisma: one `createMany` + one re-fetch; empty array throws)
- `src/modules/logbook/service.ts` - Added `importTripsToLogbook`, mirroring `addTripToLogbook`'s parse/load/continuity/write/audit structure for a whole batch
- `src/modules/logbook/service.test.ts` - Added a "bulk trip import" describe block with 5 cases

## Decisions Made
- Kept the demo-mode `AuditLogRecord`/`writeAuditLog` limitation (no `afterData` persisted) untouched since it's a pre-existing, codebase-wide gap unrelated to this plan's files; adapted the audit-entry assertions to check the entry count and the human-readable `summary` string instead of `afterData.tripCount`. See Deviations below.
- No HTTP route or server action added for `importTripsToLogbook`, per the plan objective — that wiring belongs to Phase 6's import wizard / Plan 04-06's integration test.

## Deviations from Plan

### Auto-fixed Issues (none — see Issues Encountered for the one adaptation)

None — no bugs, missing critical functionality, or blocking issues required fixing beyond what's noted below.

## Issues Encountered

- **Plan's test spec vs. runtime reality:** Task 3's spec suggested asserting `afterData.tripCount === 3` on entries filtered from `demoAuditLogs`. Inspection of `src/modules/audit/audit-writer.ts` showed the demo-mode `writeAuditLog` path never persists `afterData`/`beforeData` onto the `AuditLogRecord` it pushes to `demoAuditLogs` (only the Prisma path stores them, via `prisma.auditLog.create`) — and `AuditLogRecord` itself has no `afterData` field. This is a pre-existing gap affecting every existing audit-logged mutation in the codebase (logbook, individual-tax, clients, estates), not something introduced by or in scope for this plan's three files. Rather than widen scope by touching `audit-writer.ts`/`shared/types.ts` (a shared type used by many unrelated modules — an architectural change per Rule 4), the test was written to assert the audit-entry *count* (exactly 1) and match the trip count/source against the entry's `summary` string (`/Imported 3 trips from CSV import/`), which is populated identically in both demo and Prisma paths. The intent of the plan's must_have — "ONE persistence write and ONE audit entry, never N of each" — is fully verified either way.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `importTripsToLogbook` is ready for Plan 04-06 to call directly as the import wizard's commit step, with no further service-layer work needed
- Imported data passes through the identical continuity gate as manually captured data
- Flagged (not fixed, out of scope): the demo-mode audit writer silently drops `afterData`/`beforeData` for all callers — worth a dedicated fix if a future phase needs to assert on structured audit payloads in demo mode

---
*Phase: 04-import-pipeline*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: src/modules/logbook/repository.ts
- FOUND: src/modules/logbook/service.ts
- FOUND: src/modules/logbook/service.test.ts
- FOUND: .planning/phases/04-import-pipeline/04-02-SUMMARY.md
- FOUND commit: b7f708c
- FOUND commit: 0e2ec41
- FOUND commit: bcad886
