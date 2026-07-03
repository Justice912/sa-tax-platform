---
phase: 02-logbook-domain-module
plan: 03
subsystem: database
tags: [prisma, vitest, demo-mode-persistence, crypto-randomuuid, repository-pattern]

# Dependency graph
requires:
  - phase: 02-logbook-domain-module (plan 01)
    provides: LogbookRecord/VehicleDetails/LogbookTripRecord types, Vehicle/Logbook/LogbookTrip Prisma models
provides:
  - ILogbookRepository interface with 11 CRUD methods
  - DemoLogbookRepository (isDemoMode branch) covering demo-file and Prisma persistence
  - demoLogbooks seed fixture in src/server/demo-data.ts
  - logbookRepository singleton export
affects: [02-04-service-layer, phase-3-itr12-travel-schedule, phase-6-logbook-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Demo-mode file persistence via storage/demo-logbooks.json, mirroring individual-tax/repository.ts's read/write-to-disk helper shape exactly"
    - "crypto.randomUUID() for every new logbook/vehicle/trip id (no Date.now()+Math.random())"
    - "Trips embedded as an array inside the demo-mode LogbookRecord JSON blob; normalized parent/child Prisma tables on the DB side"
    - "Clone-on-read/clone-on-return (cloneLogbook/cloneDemoLogbooks) prevents callers from mutating stored records via returned references"

key-files:
  created:
    - src/modules/logbook/repository.ts
    - src/modules/logbook/repository.test.ts
  modified:
    - src/server/demo-data.ts

key-decisions:
  - "Vehicle registration-number uniqueness enforced by clientId+assessmentYear+registrationNumber (case-insensitive, trimmed) in both branches; Prisma path reuses an existing Vehicle row for the same client+registration instead of creating a duplicate, then relies on @@unique([clientId, vehicleId, assessmentYear]) for the DB-level guarantee"
  - "Test-mode contract (NODE_ENV === 'test'): reads return the demoLogbooks array by reference and writes are no-ops, so all mutators mutate the found record in place before returning a clone — same discipline as individual-tax/repository.ts"

requirements-completed: [LOG-04]

# Metrics
duration: 20min
completed: 2026-07-03
---

# Phase 2 Plan 3: Logbook Persistence Layer Summary

**ILogbookRepository + DemoLogbookRepository with isDemoMode branching — demo-file JSON persistence (trips embedded) and Prisma Vehicle/Logbook/LogbookTrip queries, both using crypto.randomUUID() and enforcing client+vehicle+year uniqueness.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-03T10:15:00+02:00 (approx.)
- **Completed:** 2026-07-03T10:34:23+02:00
- **Tasks:** 3 completed
- **Files modified:** 3 (1 created new, 1 created new test, 1 modified)

## Accomplishments
- `ILogbookRepository` interface (11 methods) + `DemoLogbookRepository` implementation covering both `isDemoMode` branches, matching the proven `individual-tax/repository.ts` structure
- `storage/demo-logbooks.json` demo-file persistence with trips embedded in each `LogbookRecord` blob; first-run seeding, corrupt-file re-seed guard, and test-mode in-memory contract all mirrored from the existing pattern
- Prisma path implemented against the plan 02-01 `Vehicle`/`Logbook`/`LogbookTrip` models: vehicle reuse by registration number, `include: { vehicle, trips }` reads, Decimal/DateTime → number/ISO-string mapping in `mapRow`
- Every new id (logbook, vehicle, trip) generated via `crypto.randomUUID()` — verified by regex-matching test and a `grep` for `Math.random` returning nothing
- Client + vehicle registration + assessment-year uniqueness enforced in both branches (demo: in-array find; Prisma: `findFirst` pre-check + reused unique constraint)
- `demoLogbooks` seed fixture added to `src/server/demo-data.ts` referencing `demoClients[0]` (`client_001`), with 2 trips (one with per-trip odometers, one without) demonstrating the optional-field rule
- 9 new repository tests covering create/read round trip, duplicate rejection, per-year uniqueness, trip embedding, trip mutators, odometer/cost-method/expenses mutators, UUID format, and clone-on-return isolation — all passing
- Full `npm run test` (72 files / 293 tests) passes, confirming the additive `demo-data.ts` seed did not disturb any existing suite (including the parallel plan 02-02 `calculation.test.ts`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed array + demo file I/O helpers + repository interface** - `f2cb47c` (feat)
2. **Task 2: Implement DemoLogbookRepository (demo + Prisma paths)** - `fe05d57` (feat)
3. **Task 3: Repository tests (test-mode persistence semantics)** - `56add9d` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/modules/logbook/repository.ts` (677 lines) - `ILogbookRepository`, `CreateLogbookInput`/`UpdateTripInput`, `DemoLogbookRepository` class (demo + Prisma branches), `mapRow`, demo-file I/O helpers, `logbookRepository` singleton
- `src/modules/logbook/repository.test.ts` (269 lines) - Vitest coverage per plan's 8 required scenarios (9 test cases)
- `src/server/demo-data.ts` - added `LogbookRecord` type import and `demoLogbooks` seed array (1 fixture logbook, 2 trips) near `demoIndividualTaxAssessments`

## Decisions Made
- Prisma `createLogbook` reuses an existing `Vehicle` row (matched by `clientId` + case-insensitive `registrationNumber`) rather than creating a new vehicle per logbook, so the same physical vehicle across multiple tax years maps to one `Vehicle` record with multiple `Logbook` children — consistent with the `@@unique([clientId, vehicleId, assessmentYear])` constraint from plan 02-01
- Used fixed literal UUID-format strings for all seed ids (`demoLogbooks`) to keep the deterministic-seed convention used by other demo arrays, while still satisfying the UUID-format truth (seed ids aren't generated at runtime, so they're excluded from the `crypto.randomUUID()` requirement by design — only newly *created* records go through `randomUUID()`)

## Deviations from Plan

None - plan executed exactly as written. Task 1 shipped with a stubbed class body (methods throwing `"Not implemented"`) exactly as the plan's `done` criteria anticipated ("class implementation may still be stubbed at this point"), then Task 2 replaced every stub with the full demo/Prisma implementation.

## Issues Encountered

None. `npx tsc --noEmit` showed zero errors attributable to `src/modules/logbook/` or `src/server/demo-data.ts` (the 251 pre-existing Vitest-globals errors in unrelated `*.test.ts` files were already flagged as out-of-scope in `deferred-items.md` during plan 02-01 and remain unchanged by this plan). `npm run lint` showed zero warnings/errors in the files this plan touched.

## User Setup Required

None - no external service configuration required. (Note: this phase's Prisma path assumes a `DATABASE_URL`-backed Postgres instance and a migration applying plan 02-01's `Vehicle`/`Logbook`/`LogbookTrip` models before non-demo-mode use; demo mode requires no setup.)

## Next Phase Readiness
- LOG-04 persistence layer complete: logbooks survive process restart/refresh in demo mode (`storage/demo-logbooks.json`) and are structurally ready for the Prisma-backed path once a migration is run
- `logbookRepository` singleton is ready for plan 02-04 (service layer) to consume — trip odometer-continuity validation (from 02-01's `validation.ts`) and audit logging are explicitly deferred to that plan, matching the existing layering convention
- No blockers identified for plan 02-04

---
*Phase: 02-logbook-domain-module*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/modules/logbook/repository.ts
- FOUND: src/modules/logbook/repository.test.ts
- FOUND: src/server/demo-data.ts
- FOUND commit: f2cb47c
- FOUND commit: fe05d57
- FOUND commit: 56add9d
