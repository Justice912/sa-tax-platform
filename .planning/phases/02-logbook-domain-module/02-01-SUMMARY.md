---
phase: 02-logbook-domain-module
plan: 01
subsystem: database
tags: [zod, prisma, typescript, logbook, sars-travel]

# Dependency graph
requires:
  - phase: 01-rulepack-extension
    provides: TravelDeemedCostBracket rulepack shape and demo-mode/Prisma dual-persistence convention this plan copies
provides:
  - LogbookRecord/VehicleDetails/LogbookTripRecord/ActualCostExpenses/LogbookTravelResult/LogbookAuditSummary domain contracts
  - Vehicle, Logbook, LogbookTrip Prisma models with cascade delete and client+vehicle+year uniqueness
  - Zod validation schemas (vehicle, trip, logbook create, actual expenses, odometer update)
  - validateOdometerContinuity pure function for reuse in Phase 4's import pipeline
affects: [02-02-calculation, 02-03-repository, 02-04-service, phase-3-itr12-travel-schedule, phase-4-import-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Interface-first foundation plan: types.ts + Prisma models + Zod validation shipped before any repository/service/calculation code, so parallel downstream plans build against a pinned contract"
    - "costMethod elected once per Logbook, never per LogbookTrip (Pitfall 1 guard)"
    - "Per-trip odometer readings nullable everywhere (type, schema, Prisma column) per official SARS eLogbook optional-field rule"
    - "validateOdometerContinuity built as a pure, framework-agnostic function so Phase 4's import pipeline can reuse it without re-implementing continuity checks"

key-files:
  created:
    - src/modules/logbook/types.ts
    - src/modules/logbook/validation.ts
    - src/modules/logbook/validation.test.ts
    - .planning/phases/02-logbook-domain-module/deferred-items.md
  modified:
    - prisma/schema.prisma

key-decisions:
  - "vehicleDetailsSchema includes id; logbookCreateSchema derives its vehicle input via vehicleDetailsSchema.omit({ id: true }) rather than a separate duplicated schema"
  - "ISO date validation uses a regex + Date round-trip check (rejects calendar-impossible dates like 2025-02-30), reused for trip date, acquisitionDate"
  - "Odometer/business-km comparisons use a 0.5km tolerance to avoid float noise false positives"
  - "actualExpensesSchema keeps all five expense categories required (no .optional()) so calculateActualCost (Plan 02-02) never runs on a partial set"

patterns-established:
  - "Domain module scaffold: types.ts (contracts) -> validation.ts (Zod + pure validators) -> [repository.ts/calculation.ts/service.ts in later plans], mirroring src/modules/individual-tax/ file-for-file"

requirements-completed: [LOG-01, LOG-02, LOG-03]

# Metrics
duration: 7min
completed: 2026-07-03
---

# Phase 02 Plan 01: Logbook Domain Contracts Summary

**Logbook domain foundation: seven TypeScript contracts, three cascade-deleted Prisma models (Vehicle/Logbook/LogbookTrip), and Zod validation with a pure odometer-continuity validator — all interface-only, zero business logic.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-03T08:08:42Z
- **Completed:** 2026-07-03T08:15:56Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- Pinned the exact shape of a logbook (vehicle, odometers, cost method, embedded trips) that Plans 02-02 (calculation), 02-03 (repository), and 02-04 (service) will build against without guessing contracts.
- Added Vehicle/Logbook/LogbookTrip to the Prisma schema using the same cascade-delete + unique-constraint pattern as EstateMatter/EstateAsset, keeping the demo-mode and database paths in sync from day one.
- Built a pure `validateOdometerContinuity` function now, so Phase 4's CSV/XLSX import pipeline can reuse it verbatim instead of re-implementing continuity checks (Pitfall 2 avoided).

## Task Commits

Each task was committed atomically:

1. **Task 1: Define logbook domain types (the contracts)** - `b4a9fa7` (feat)
2. **Task 2: Add Vehicle/Logbook/LogbookTrip Prisma models** - `36fa674` (feat)
3. **Task 3: Zod validation schemas + odometer-continuity validator with tests** - `690d5d8` (feat)

**Plan metadata:** (this commit) — docs: complete plan

## Files Created/Modified
- `src/modules/logbook/types.ts` - LogbookCostMethod, VehicleDetails, LogbookTripRecord, ActualCostExpenses, LogbookRecord, LogbookWarning, LogbookTravelResult, LogbookAuditSummary
- `prisma/schema.prisma` - Vehicle/Logbook/LogbookTrip models + LogbookCostMethod enum + Client back-relations (`vehicles`, `logbooks`)
- `src/modules/logbook/validation.ts` - vehicleDetailsSchema, tripInputSchema, logbookCreateSchema, actualExpensesSchema, updateOdometersSchema, validateOdometerContinuity
- `src/modules/logbook/validation.test.ts` - 24 tests covering every rejection/acceptance rule (217 lines)
- `.planning/phases/02-logbook-domain-module/deferred-items.md` - logged a pre-existing, unrelated tsconfig gap (see Issues Encountered)

## Decisions Made
- `vehicleDetailsSchema` is the canonical schema (includes `id`); `logbookCreateSchema` reuses it via `.omit({ id: true })` instead of duplicating field definitions, so validation rules for make/model/registrationNumber/costPrice/acquisitionDate live in exactly one place.
- ISO date strings are validated with a regex plus a `Date` round-trip check (`toISOString().slice(0,10) === value`) to reject calendar-impossible dates (e.g. `2025-02-30` silently rolling over to March), applied consistently to trip dates and vehicle acquisition dates.
- Odometer-continuity comparisons use a 0.5 km tolerance constant to prevent floating-point noise from producing false-positive errors/warnings.
- `actualExpensesSchema` requires all five expense fields (no partial capture allowed) so a future `calculateActualCost()` (Plan 02-02) can assume complete data whenever this schema has validated successfully.

## Deviations from Plan

None - plan executed exactly as written. Prisma models, types, and validation schemas match the plan's specified shapes and export names verbatim.

## Issues Encountered

- `npx prisma validate`/`npx prisma generate` initially failed with `Environment variable not found: DATABASE_URL` because no `.env` file exists in this repo (only `.env.example` and `.env.local`, and Prisma CLI reads `.env`, not `.env.local`). This is a pre-existing environment gap, not caused by this plan's schema changes. Resolved for verification purposes by passing `DATABASE_URL` inline from `.env.example`'s placeholder value to the two verification commands; no `.env` file was created or committed, since demo mode (this repo's runtime default per `STORAGE_ROOT`/`DEMO_MODE` in `.env.local`) does not require it. Both commands succeeded once the variable was supplied, confirming the schema itself is valid.
- `npx tsc --noEmit` reports 251 pre-existing errors in unrelated test files (`Cannot find name 'describe'/'it'/'expect'`) caused by a `tsconfig.json` gap (`vitest.config.ts` sets `test.globals: true` but `tsconfig.json` has no `"types": ["vitest/globals"]`). Confirmed zero of these errors touch `src/modules/logbook/`, and confirmed `npx vitest run` (the actual test runner) passes all 70 files / 267 tests including this plan's 24 new tests. Logged to `.planning/phases/02-logbook-domain-module/deferred-items.md` rather than fixed, per the scope-boundary rule (pre-existing, unrelated files).

## User Setup Required

None - no external service configuration required. (Note: a real `DATABASE_URL` will be needed by whoever runs this project against a live Postgres database rather than demo mode — this is pre-existing project setup, not introduced by this plan.)

## Next Phase Readiness
- Plans 02-02 (calculation), 02-03 (repository), and 02-04 (service) can now import `src/modules/logbook/types.ts` and `src/modules/logbook/validation.ts` directly — all listed exports exist and compile cleanly.
- `validateOdometerContinuity` is ready for Phase 4's import pipeline to reuse without modification.
- No blockers identified.

---
*Phase: 02-logbook-domain-module*
*Completed: 2026-07-03*

## Self-Check: PASSED

All claimed files exist and all task commits are present in git history:
- FOUND: src/modules/logbook/types.ts
- FOUND: src/modules/logbook/validation.ts
- FOUND: src/modules/logbook/validation.test.ts
- FOUND: .planning/phases/02-logbook-domain-module/deferred-items.md
- FOUND: model Vehicle in prisma/schema.prisma
- FOUND: commit b4a9fa7 (Task 1)
- FOUND: commit 36fa674 (Task 2)
- FOUND: commit 690d5d8 (Task 3)
